import {describe,expect,it} from 'vitest';
import {parseFitsImage} from './fitsImage';
import {BLINK_INTERVAL,MeasureError,alignFromTwoStars,angularSeparationArcsec,applyPlate,centroid,centroidWeight,clampBlinkInterval,fromStandardCoordinates,measureImageFromFits,motionBetween,pixelToSky,plateSolution,skyToPixel,standardCoordinates,tanWcsFromCards,addMeasurement,formatSexagesimal,parseSexagesimal,removeMeasurement,solveTarget,targetMotion,MEASUREMENT_LIMIT,type MeasurementLog,type TanWcs} from './astrometryMeasure';

// Authored synthetic FITS fixture (not a CLEA image): 96×80 float32, sky 100 counts, Gaussian stars (σ 1.4 px) at exact
// sub-pixel positions placed by a TAN WCS centred on Eros' 2009-06-01 position, 1.2″/px, rotated 3°.
const WCS_CARDS=["CTYPE1  = 'RA---TAN'","CTYPE2  = 'DEC--TAN'",'CRVAL1  = 340.83','CRVAL2  = -8.04','CRPIX1  = 48.5','CRPIX2  = 40.5','CDELT1  = -3.333333333333333E-4','CDELT2  = 3.333333333333333E-4','CROTA2  = 3.0'];
const card=(s:string)=>s.padEnd(80,' ');
function syntheticFits(stars:readonly {x:number;y:number;flux:number}[],width=96,height=80):Uint8Array{
 const cards=['SIMPLE  =                    T','BITPIX  =                  -32','NAXIS   =                    2',`NAXIS1  = ${String(width).padStart(20)}`,`NAXIS2  = ${String(height).padStart(20)}`,...WCS_CARDS,'END'].map(card);
 const header=cards.join('').padEnd(Math.ceil(cards.length*80/2880)*2880,' ');
 const dataBytes=width*height*4,out=new Uint8Array(header.length+Math.ceil(dataBytes/2880)*2880),view=new DataView(out.buffer);
 for(let i=0;i<header.length;i++)out[i]=header.charCodeAt(i);
 for(let y=1;y<=height;y++)for(let x=1;x<=width;x++){
  let v=100;for(const s of stars)v+=s.flux*Math.exp(-((x-s.x)**2+(y-s.y)**2)/(2*1.4*1.4));
  view.setFloat32(header.length+4*((y-1)*width+x-1),v,false);
 }
 return out;
}
const wcs:TanWcs=tanWcsFromCards(WCS_CARDS.map(card));
const stars=[{x:20.3,y:15.7,flux:4000},{x:75.6,y:22.2,flux:3000},{x:30.1,y:66.4,flux:5000},{x:80.4,y:61.9,flux:2500},{x:50.25,y:41.6,flux:1800}];
const image=measureImageFromFits(parseFitsImage(syntheticFits(stars)));
const range={low:120,high:2000};

describe('centroid (CLEA Astrometry guide §VI-2 design)',()=>{
 it('weights 0 below the low cut, 1000³ above the high cut and proportionally (cubed) in between',()=>{
  expect([centroidWeight(119,range),centroidWeight(2500,range),centroidWeight(1060,range)]).toEqual([0,1e9,500**3]);
  expect(()=>centroidWeight(5,{low:3,high:3})).toThrow(MeasureError);
 });
 it.each(stars)('recovers the synthetic star at ($x, $y) within 0.1 px (cubed weights pull toward the peak pixel) from a cursor up to 5 px away',s=>{
  for(const [dx,dy] of [[0,0],[3,-2],[-5,0],[2,4]]){const c=centroid(image,s.x+dx,s.y+dy,range);expect(Math.hypot(c.x-s.x,c.y-s.y)).toBeLessThan(0.1);}
 });
 it('refuses a cursor outside the image and an empty region',()=>{
  expect(()=>centroid(image,0,10,range)).toThrow(MeasureError);
  const flat=measureImageFromFits(parseFitsImage(syntheticFits([])));
  expect(()=>centroid(flat,40,40,range)).toThrow(/no-signal/);
 });
});

describe('astrometric solution (guide §VI-3) and TAN WCS',()=>{
 const sky=stars.map(s=>pixelToSky(wcs,s.x,s.y));
 it('round-trips pixels through the TAN WCS and standard coordinates',()=>{
  for(const s of stars){const p=skyToPixel(wcs,pixelToSky(wcs,s.x,s.y));expect(p.x).toBeCloseTo(s.x,9);expect(p.y).toBeCloseTo(s.y,9);}
  const centre={raHours:340.83/15,decDeg:-8.04},X=standardCoordinates(sky[0],centre);
  expect(angularSeparationArcsec(fromStandardCoordinates(X.X,X.Y,centre),sky[0])).toBeLessThan(1e-6);
  expect(pixelToSky(wcs,48.5,40.5).raHours*15).toBeCloseTo(340.83,10);
 });
 it('measures the target from four reference stars to 0.1″ with the expected plate scale',()=>{
  const refs=[0,1,2,3].map(i=>{const c=centroid(image,stars[i].x+1,stars[i].y-1,range);return {x:c.x,y:c.y,...sky[i]};});
  const plate=plateSolution(refs);
  const t=centroid(image,50,42,range);
  expect(angularSeparationArcsec(applyPlate(plate,t.x,t.y),sky[4])).toBeLessThan(0.1);
  expect(plate.rmsArcsec).toBeLessThan(0.1);expect(plate.scaleArcsecPerPixel).toBeCloseTo(1.2,2);
 });
 it('needs at least three non-collinear reference stars',()=>{
  const r=[0,1,2].map(i=>({x:stars[i].x,y:stars[i].y,...sky[i]}));
  expect(()=>plateSolution(r.slice(0,2))).toThrow(/references/);
  expect(()=>plateSolution([r[0],{...r[1],x:r[0].x+10,y:r[0].y+10},{...r[2],x:r[0].x+20,y:r[0].y+20}])).toThrow(/degenerate/);
 });
 it('reads CD matrices and refuses headers without a TAN WCS',()=>{
  const cd=tanWcsFromCards(["CTYPE1  = 'RA---TAN'","CTYPE2  = 'DEC--TAN'",'CRVAL1  = 10','CRVAL2  = 20','CRPIX1  = 1','CRPIX2  = 1','CD1_1   = -1E-4','CD2_2   = 1E-4'].map(card));
  expect(cd.cd).toEqual([-1e-4,0,0,1e-4]);
  expect(()=>tanWcsFromCards(['SIMPLE  =                    T'].map(card))).toThrow(/wcs/);
 });
});

describe('motion and blinking',()=>{
 it('gives rate and position angle (north through east) for known displacements',()=>{
  const p={raHours:22.72,decDeg:-8.04,jd:2454983.5};
  const north=motionBetween(p,{raHours:p.raHours,decDeg:p.decDeg+10/3600,jd:p.jd+1/24});
  expect(north.rateArcsecPerHour).toBeCloseTo(10,6);expect(north.positionAngleDeg).toBeCloseTo(0,6);
  const east=motionBetween(p,{raHours:p.raHours+20/3600/15/Math.cos(p.decDeg*Math.PI/180),decDeg:p.decDeg,jd:p.jd+0.5/24});
  expect(east.positionAngleDeg).toBeCloseTo(90,3);expect(east.rateArcsecPerHour).toBeCloseTo(40,3);
  expect(motionBetween(p,{raHours:p.raHours,decDeg:p.decDeg-5/3600,jd:p.jd+1}).positionAngleDeg).toBeCloseTo(180,6);
  expect(()=>motionBetween(p,{...p})).toThrow(/time/);
 });
 it('aligns a shifted, rotated second image from two stars on each',()=>{
  const th=2*Math.PI/180,move=(q:{x:number;y:number})=>({x:Math.cos(th)*q.x-Math.sin(th)*q.y+4.5,y:Math.sin(th)*q.x+Math.cos(th)*q.y-3});
  const a=[stars[0],stars[3]] as const,b=[move(stars[0]),move(stars[3])] as const;
  const al=alignFromTwoStars(a,b);// image-2 → image-1
  const back=al.map(move(stars[2]).x,move(stars[2]).y);
  expect(back.x).toBeCloseTo(stars[2].x,9);expect(back.y).toBeCloseTo(stars[2].y,9);expect(al.rotationDeg).toBeCloseTo(-2,9);expect(al.scale).toBeCloseTo(1,12);
 });
 it('keeps the blink interval within the manual range',()=>{
  expect([clampBlinkInterval(1),clampBlinkInterval(5000),clampBlinkInterval(Number.NaN),clampBlinkInterval(250.4)]).toEqual([10,1000,BLINK_INTERVAL.default,250]);
 });
});

describe('measurement log',()=>{
 it('solves a target by plate constants once three references are on its frame, else by the header WCS, else not at all',()=>{
  const sky=stars.map(s=>pixelToSky(wcs,s.x,s.y));let log:MeasurementLog=[];
  expect(solveTarget(log,0,stars[4].x,stars[4].y,null)).toBeNull();
  expect(solveTarget(log,0,stars[4].x,stars[4].y,wcs)!.method).toBe('wcs');
  for(const i of [0,1,2])log=addMeasurement(log,{frame:0,role:'reference',x:stars[i].x,y:stars[i].y,jd:1,sky:null,catalog:sky[i]});
  const s=solveTarget(log,0,stars[4].x,stars[4].y,null)!;expect(s.method).toBe('plate');expect(angularSeparationArcsec(s.sky,sky[4])).toBeLessThan(1e-6);
  expect(solveTarget(log,1,stars[4].x,stars[4].y,null)).toBeNull();
  expect(removeMeasurement(log,0)).toHaveLength(2);
 });
 it('reports motion between the earliest and latest solved target marks and bounds the log',()=>{
  let log:MeasurementLog=[];
  log=addMeasurement(log,{frame:1,role:'target',x:0,y:0,jd:2454983.7,sky:{raHours:22.72,decDeg:-8.0}});
  expect(targetMotion(log)).toBeNull();
  log=addMeasurement(log,{frame:0,role:'target',x:0,y:0,jd:2454983.6,sky:{raHours:22.72,decDeg:-8.0-24/3600}});
  const mo=targetMotion(log)!;expect(mo.rateArcsecPerHour).toBeCloseTo(10,6);expect(mo.positionAngleDeg).toBeCloseTo(0,6);
  let full:MeasurementLog=[];for(let i=0;i<MEASUREMENT_LIMIT;i++)full=addMeasurement(full,{frame:0,role:'target',x:0,y:0,jd:i,sky:null});
  expect(()=>addMeasurement(full,full[0])).toThrow(MeasureError);
 });
 it('parses and formats sexagesimal coordinates',()=>{
  expect(parseSexagesimal('22 43 19.3','ra')).toBeCloseTo(22.722027777,8);expect(parseSexagesimal('-08:02:23','dec')).toBeCloseTo(-8.039722,6);
  expect([parseSexagesimal('24 0 0','ra'),parseSexagesimal('-1 0 0','ra'),parseSexagesimal('10 61 0','dec'),parseSexagesimal('abc','dec')]).toEqual([null,null,null,null]);
  expect(formatSexagesimal(22.722027777,'ra')).toBe('22 43 19.30');expect(formatSexagesimal(-8.0397222,'dec')).toBe('-08 02 23.0');expect(formatSexagesimal(5.99999999,'ra')).toBe('06 00 00.00');
 });
});
