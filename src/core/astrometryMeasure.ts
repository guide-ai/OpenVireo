/** E08 Object X web position-measuring tool (X3). The original hands measurement to external programs (\Toolkit\CLEA_TLK.EXE
 * 0x5a2df0, CLEA_AST.EXE 0x57fda8, DS9 0x5a2e10); none of them is ported or executed. This module is a NEW web tool designed
 * from the CLEA Astrometry user guide (ASTUG.PDF, CLEA_Labex1.zip, read statically under the 2026-10-27 decision D6):
 *  - centroid (guide §VI-2): brightest pixel within radius 8 of the cursor, then an average of pixel positions within radius
 *    8 of it, weighted by the display range (below low → 0, above high → 1000, linear in between) with the weights cubed;
 *  - astrometric solution (§VI-3): standard coordinates about a field centre, six plate constants X = ax+by+c, Y = dx+ey+f
 *    by least squares from at least three reference stars, inverse gnomonic projection for the target;
 *  - blinking (Astrometry of Asteroids manual): two images alternated at 10..1000 ms (500 default), aligned on the first two
 *    reference marks of each image when both have them (otherwise raw frames from the same pointing, labelled in the UI).
 * Also: inverse TAN WCS from the FITS header (web adaptation for images whose header carries a WCS) and motion rate/position
 * angle between two measured positions. Pixel coordinates are FITS 1-based (pixel centres at integers). Pure. */

import {fitsPixel,type FitsImage} from './fitsImage';

export type MeasureErrorCode='bounds'|'range'|'no-signal'|'references'|'degenerate'|'wcs'|'time';
export class MeasureError extends Error{
 constructor(readonly code:MeasureErrorCode){super(`Astrometry ${code}`);this.name='MeasureError';}
}
const fail=(code:MeasureErrorCode):never=>{throw new MeasureError(code);};
const D2R=Math.PI/180;

/** Read-only image access: value at 1-based (x, y), or null for non-finite pixels. */
export type MeasureImage=Readonly<{width:number;height:number;value:(x:number,y:number)=>number|null}>;
export type DisplayRange=Readonly<{low:number;high:number}>;
export type Centroid=Readonly<{x:number;y:number;peakX:number;peakY:number;peak:number;weightSum:number}>;
export const CENTROID_RADIUS=8,CENTROID_MAX_WEIGHT=1000;

/** Guide weighting: 0 below low, 1000 above high, proportional in between; cubed. */
export function centroidWeight(value:number,range:DisplayRange):number{
 if(!(range.high>range.low))return fail('range');
 const w=value<=range.low?0:value>=range.high?CENTROID_MAX_WEIGHT:(value-range.low)/(range.high-range.low)*CENTROID_MAX_WEIGHT;
 return w*w*w;
}

/** Centroid of the source nearest the cursor (x, y). Pixels outside the image or non-finite are skipped. */
export function centroid(image:MeasureImage,x:number,y:number,range:DisplayRange,radius=CENTROID_RADIUS):Centroid{
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0.5||y<0.5||x>image.width+0.5||y>image.height+0.5)return fail('bounds');
 const cx=Math.round(x),cy=Math.round(y),r2=radius*radius;
 let peak=-Infinity,px=cx,py=cy;
 for(let j=cy-radius;j<=cy+radius;j++)for(let i=cx-radius;i<=cx+radius;i++){
  if(i<1||j<1||i>image.width||j>image.height||(i-cx)**2+(j-cy)**2>r2)continue;
  const v=image.value(i,j);if(v!==null&&v>peak){peak=v;px=i;py=j;}
 }
 if(peak===-Infinity)return fail('no-signal');
 let sw=0,sx=0,sy=0;
 for(let j=py-radius;j<=py+radius;j++)for(let i=px-radius;i<=px+radius;i++){
  if(i<1||j<1||i>image.width||j>image.height||(i-px)**2+(j-py)**2>r2)continue;
  const v=image.value(i,j);if(v===null)continue;
  const w=centroidWeight(v,range);sw+=w;sx+=w*i;sy+=w*j;
 }
 if(!(sw>0))return fail('no-signal');
 return Object.freeze({x:sx/sw,y:sy/sw,peakX:px,peakY:py,peak,weightSum:sw});
}

export type SkyPosition=Readonly<{raHours:number;decDeg:number}>;
const normHours=(h:number)=>((h%24)+24)%24;

/** Standard coordinates of (α, δ) about the field centre (A, D), guide §VI-3 sign convention (X grows to the west). */
export function standardCoordinates(p:SkyPosition,centre:SkyPosition):Readonly<{X:number;Y:number}>{
 const a=p.raHours*15*D2R,d=p.decDeg*D2R,A=centre.raHours*15*D2R,Dc=centre.decDeg*D2R;
 const den=Math.cos(Dc)*Math.cos(d)*Math.cos(a-A)+Math.sin(Dc)*Math.sin(d);
 if(!(den>0))return fail('degenerate');
 return Object.freeze({X:-(Math.cos(d)*Math.sin(a-A))/den,Y:-(Math.sin(Dc)*Math.cos(d)*Math.cos(a-A)-Math.cos(Dc)*Math.sin(d))/den});
}
/** Inverse of standardCoordinates. */
export function fromStandardCoordinates(X:number,Y:number,centre:SkyPosition):SkyPosition{
 const A=centre.raHours*15*D2R,Dc=centre.decDeg*D2R;
 const a=A+Math.atan2(-X,Math.cos(Dc)-Y*Math.sin(Dc));
 const d=Math.asin((Math.sin(Dc)+Y*Math.cos(Dc))/Math.sqrt(1+X*X+Y*Y));
 return Object.freeze({raHours:normHours(a/D2R/15),decDeg:d/D2R});
}

export type ReferenceStar=Readonly<{x:number;y:number}&SkyPosition>;
export type PlateSolution=Readonly<{
 centre:SkyPosition;
 /** X = a x + b y + c, Y = d x + e y + f. */
 constants:Readonly<{a:number;b:number;c:number;d:number;e:number;f:number}>;
 /** Per reference star: residual in arcseconds (solution minus catalogue). */
 residualsArcsec:readonly number[];rmsArcsec:number;
 /** Mean plate scale (arcsec per pixel) from the determinant of the linear part. */
 scaleArcsecPerPixel:number;
}>;

/** Mean direction of the reference stars, used as the field centre when none is supplied. */
export function meanDirection(points:readonly SkyPosition[]):SkyPosition{
 let x=0,y=0,z=0;
 for(const p of points){const a=p.raHours*15*D2R,d=p.decDeg*D2R;x+=Math.cos(d)*Math.cos(a);y+=Math.cos(d)*Math.sin(a);z+=Math.sin(d);}
 const n=Math.hypot(x,y,z);if(!(n>0))return fail('degenerate');
 return Object.freeze({raHours:normHours(Math.atan2(y,x)/D2R/15),decDeg:Math.asin(z/n)/D2R});
}

/** 3×3 linear solve (Cramer); throws 'degenerate' for a (near-)singular system. */
function solve3(m:readonly number[][],v:readonly number[]):[number,number,number]{
 const det=(a:readonly number[][])=>a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]);
 const d=det(m),scale=Math.max(...m.flat().map(Math.abs))**3;
 if(!(Math.abs(d)>1e-12*scale))return fail('degenerate');
 const col=(k:number)=>m.map((row,i)=>row.map((x,j)=>j===k?v[i]:x));
 return [det(col(0))/d,det(col(1))/d,det(col(2))/d];
}

/** Least-squares plate constants from ≥3 non-collinear reference stars (normal equations, pixel coordinates centred on the
 * reference mean for conditioning). */
export function plateSolution(references:readonly ReferenceStar[],centre?:SkyPosition):PlateSolution{
 if(references.length<3)return fail('references');
 const c=centre??meanDirection(references);
 const mx=references.reduce((s,r)=>s+r.x,0)/references.length,my=references.reduce((s,r)=>s+r.y,0)/references.length;
 const rows=references.map(r=>({u:r.x-mx,v:r.y-my,...standardCoordinates(r,c)}));
 const N=[[0,0,0],[0,0,0],[0,0,0]],bx=[0,0,0],by=[0,0,0];
 for(const r of rows){const g=[r.u,r.v,1];for(let i=0;i<3;i++){for(let j=0;j<3;j++)N[i][j]+=g[i]*g[j];bx[i]+=g[i]*r.X;by[i]+=g[i]*r.Y;}}
 const [a,b,c0]=solve3(N,bx),[d,e,f0]=solve3(N,by);
 // Back to uncentred pixels: X = a(x−mx) + b(y−my) + c0.
 const constants=Object.freeze({a,b,c:c0-a*mx-b*my,d,e,f:f0-d*mx-e*my});
 const solution={centre:c,constants};
 const residualsArcsec=references.map(r=>{const p=applyPlate(solution,r.x,r.y);return angularSeparationArcsec(p,r);});
 const rmsArcsec=Math.sqrt(residualsArcsec.reduce((s,x)=>s+x*x,0)/residualsArcsec.length);
 const scaleArcsecPerPixel=Math.sqrt(Math.abs(a*e-b*d))/D2R*3600;
 return Object.freeze({centre:c,constants,residualsArcsec:Object.freeze(residualsArcsec),rmsArcsec,scaleArcsecPerPixel});
}
export function applyPlate(solution:Pick<PlateSolution,'centre'|'constants'>,x:number,y:number):SkyPosition{
 const k=solution.constants;
 return fromStandardCoordinates(k.a*x+k.b*y+k.c,k.d*x+k.e*y+k.f,solution.centre);
}

/** TAN WCS read from FITS cards (CTYPE RA---TAN / DEC--TAN, CRVAL, CRPIX and either CD i_j or CDELT with optional CROTA2). */
export type TanWcs=Readonly<{crval1:number;crval2:number;crpix1:number;crpix2:number;cd:readonly [number,number,number,number]}>;
export function tanWcsFromCards(cards:readonly string[]):TanWcs{
 const map=new Map<string,string>();
 for(const card of cards){const key=card.slice(0,8).trim();if(card.slice(8,10)==='= ')map.set(key,card.slice(10).split('/')[0].trim());}
 const text=(k:string)=>(map.get(k)??'').replace(/^'|'\s*$/g,'').trim();
 const num=(k:string,fallback?:number)=>{const s=map.get(k);if(s===undefined){if(fallback===undefined)return fail('wcs');return fallback;}const n=Number(s.replace(/[dD]/,'E'));if(!Number.isFinite(n))return fail('wcs');return n;};
 if(text('CTYPE1')!=='RA---TAN'||text('CTYPE2')!=='DEC--TAN')return fail('wcs');
 let cd:[number,number,number,number];
 if(map.has('CD1_1'))cd=[num('CD1_1'),num('CD1_2',0),num('CD2_1',0),num('CD2_2')];
 else{const c1=num('CDELT1'),c2=num('CDELT2'),rot=num('CROTA2',0)*D2R;cd=[c1*Math.cos(rot),-c2*Math.sin(rot),c1*Math.sin(rot),c2*Math.cos(rot)];}
 if(!(Math.abs(cd[0]*cd[3]-cd[1]*cd[2])>0))return fail('wcs');
 return Object.freeze({crval1:num('CRVAL1'),crval2:num('CRVAL2'),crpix1:num('CRPIX1'),crpix2:num('CRPIX2'),cd:Object.freeze(cd) as TanWcs['cd']});
}
/** Pixel (1-based) → sky through the TAN projection (FITS WCS paper II). */
export function pixelToSky(w:TanWcs,x:number,y:number):SkyPosition{
 const dx=x-w.crpix1,dy=y-w.crpix2;
 const xi=(w.cd[0]*dx+w.cd[1]*dy)*D2R,eta=(w.cd[2]*dx+w.cd[3]*dy)*D2R;
 const a0=w.crval1*D2R,d0=w.crval2*D2R,den=Math.cos(d0)-eta*Math.sin(d0);
 const a=a0+Math.atan2(xi,den),d=Math.atan2(Math.sin(d0)+eta*Math.cos(d0),Math.hypot(xi,den));
 return Object.freeze({raHours:normHours(a/D2R/15),decDeg:d/D2R});
}
/** Sky → pixel (1-based) through the TAN projection; inverse of pixelToSky. */
export function skyToPixel(w:TanWcs,p:SkyPosition):Readonly<{x:number;y:number}>{
 const a=p.raHours*15*D2R,d=p.decDeg*D2R,a0=w.crval1*D2R,d0=w.crval2*D2R;
 const den=Math.sin(d)*Math.sin(d0)+Math.cos(d)*Math.cos(d0)*Math.cos(a-a0);
 if(!(den>0))return fail('degenerate');
 const xi=Math.cos(d)*Math.sin(a-a0)/den/D2R,eta=(Math.sin(d)*Math.cos(d0)-Math.cos(d)*Math.sin(d0)*Math.cos(a-a0))/den/D2R;
 const det=w.cd[0]*w.cd[3]-w.cd[1]*w.cd[2];
 return Object.freeze({x:w.crpix1+(w.cd[3]*xi-w.cd[1]*eta)/det,y:w.crpix2+(-w.cd[2]*xi+w.cd[0]*eta)/det});
}

export function angularSeparationArcsec(p:SkyPosition,q:SkyPosition):number{
 const a=p.raHours*15*D2R,b=q.raHours*15*D2R,x=p.decDeg*D2R,y=q.decDeg*D2R;
 const h=Math.sin((y-x)/2)**2+Math.cos(x)*Math.cos(y)*Math.sin((b-a)/2)**2;
 return 2*Math.asin(Math.min(1,Math.sqrt(h)))/D2R*3600;
}

export type TimedPosition=SkyPosition&Readonly<{jd:number}>;
/** Motion between two measured positions: total angle (arcsec), rate (arcsec per hour), position angle (degrees from north
 * through east, [0, 360)) and the components in RA·cos δ and Dec (arcsec). */
export type Motion=Readonly<{arcsec:number;hours:number;rateArcsecPerHour:number;positionAngleDeg:number;eastArcsec:number;northArcsec:number}>;
export function motionBetween(first:TimedPosition,second:TimedPosition):Motion{
 const hours=(second.jd-first.jd)*24;
 if(!(Math.abs(hours)>0)||!Number.isFinite(hours))return fail('time');
 // Tangent plane at the first position: east and north offsets of the second.
 const a0=first.raHours*15*D2R,d0=first.decDeg*D2R,a=second.raHours*15*D2R,d=second.decDeg*D2R;
 const den=Math.sin(d)*Math.sin(d0)+Math.cos(d)*Math.cos(d0)*Math.cos(a-a0);
 const east=Math.cos(d)*Math.sin(a-a0)/den/D2R*3600,north=(Math.sin(d)*Math.cos(d0)-Math.cos(d)*Math.sin(d0)*Math.cos(a-a0))/den/D2R*3600;
 const arcsec=angularSeparationArcsec(first,second);
 const pa=((Math.atan2(east,north)/D2R)%360+360)%360;
 return Object.freeze({arcsec,hours,rateArcsecPerHour:arcsec/Math.abs(hours),positionAngleDeg:pa,eastArcsec:east,northArcsec:north});
}

/** Blink alignment from two stars marked on each image (manual Part I): the similarity transform (scale, rotation,
 * translation) taking image-2 pixels onto image-1 pixels. */
export type Alignment=Readonly<{scale:number;rotationDeg:number;dx:number;dy:number;map:(x:number,y:number)=>Readonly<{x:number;y:number}>}>;
type P=Readonly<{x:number;y:number}>;
export function alignFromTwoStars(image1:readonly [P,P],image2:readonly [P,P]):Alignment{
 const v1={x:image1[1].x-image1[0].x,y:image1[1].y-image1[0].y},v2={x:image2[1].x-image2[0].x,y:image2[1].y-image2[0].y};
 const l2=v2.x*v2.x+v2.y*v2.y;if(!(l2>0)||!(v1.x*v1.x+v1.y*v1.y>0))return fail('degenerate');
 // Complex ratio v1 / v2 = s·e^{iθ}.
 const re=(v1.x*v2.x+v1.y*v2.y)/l2,im=(v1.y*v2.x-v1.x*v2.y)/l2;
 const dx=image1[0].x-(re*image2[0].x-im*image2[0].y),dy=image1[0].y-(im*image2[0].x+re*image2[0].y);
 return Object.freeze({scale:Math.hypot(re,im),rotationDeg:Math.atan2(im,re)/D2R,dx,dy,map:(x:number,y:number)=>Object.freeze({x:re*x-im*y+dx,y:im*x+re*y+dy})});
}

/** Blink interval policy from the manual: 10..1000 ms, default 500. */
export const BLINK_INTERVAL=Object.freeze({min:10,max:1000,default:500});
export function clampBlinkInterval(ms:number):number{return Number.isFinite(ms)?Math.min(BLINK_INTERVAL.max,Math.max(BLINK_INTERVAL.min,Math.round(ms))):BLINK_INTERVAL.default;}

/** Adapter for an admitted single-plane FITS image (src/core/fitsImage.ts). */
export function measureImageFromFits(image:FitsImage):MeasureImage{
 return Object.freeze({width:image.width,height:image.height,value:(x:number,y:number)=>fitsPixel(image,x,y).value});
}

/** One mark on a frame, in pixels only: a target, or a reference star with its catalogue position. Sky positions are never
 * stored; they are derived from the current log (deriveTargets), so editing reference stars re-solves every target. */
export type Measurement=Readonly<{frame:number;role:'target'|'reference';x:number;y:number;jd:number;catalog?:SkyPosition}>;
export type MeasurementLog=readonly Measurement[];
/** Maximum marks kept per log (web input bound). */
export const MEASUREMENT_LIMIT=64;
export function addMeasurement(log:MeasurementLog,m:Measurement):MeasurementLog{
 if(log.length>=MEASUREMENT_LIMIT)return fail('references');
 if(m.role==='reference'&&!m.catalog)return fail('references');
 return Object.freeze([...log,Object.freeze(m)]);
}
export function removeMeasurement(log:MeasurementLog,index:number):MeasurementLog{return Object.freeze(log.filter((_,i)=>i!==index));}
const frameReferences=(log:MeasurementLog,frame:number)=>log.filter(m=>m.frame===frame&&m.role==='reference'&&m.catalog).map(m=>({x:m.x,y:m.y,...m.catalog!}));
/** Plate solution of one frame from its current reference marks (≥3), or null; 'degenerate' geometry also gives null with
 * the reason. */
export function framePlate(log:MeasurementLog,frame:number):Readonly<{plate:PlateSolution|null;reason:MeasureErrorCode|null;references:number}>{
 const refs=frameReferences(log,frame);
 if(refs.length<3)return Object.freeze({plate:null,reason:'references',references:refs.length});
 try{return Object.freeze({plate:plateSolution(refs),reason:null,references:refs.length});}
 catch(e){if(e instanceof MeasureError)return Object.freeze({plate:null,reason:e.code,references:refs.length});throw e;}
}
/** Sky position of a pixel on a frame: the frame's current plate solution when it has ≥3 usable references, otherwise the
 * frame's TAN WCS when supplied, otherwise null (not measurable yet). */
export function solveTarget(log:MeasurementLog,frame:number,x:number,y:number,wcs:TanWcs|null):Readonly<{sky:SkyPosition;method:'plate'|'wcs'}>|null{
 const {plate}=framePlate(log,frame);
 if(plate)return Object.freeze({sky:applyPlate(plate,x,y),method:'plate'});
 return wcs?Object.freeze({sky:pixelToSky(wcs,x,y),method:'wcs'}):null;
}
export type DerivedTarget=Readonly<{index:number;mark:Measurement;sky:SkyPosition|null;method:'plate'|'wcs'|null}>;
/** Every target mark solved against the CURRENT log; wcsOf gives each frame's header WCS (or null). */
export function deriveTargets(log:MeasurementLog,wcsOf:(frame:number)=>TanWcs|null):readonly DerivedTarget[]{
 return Object.freeze(log.flatMap((mark,index)=>{
  if(mark.role!=='target')return [];
  const s=solveTarget(log,mark.frame,mark.x,mark.y,wcsOf(mark.frame));
  return [Object.freeze({index,mark,sky:s?.sky??null,method:s?.method??null})];
 }));
}
/** Motion between the earliest and the latest solved target marks of the current log. */
export function targetMotion(log:MeasurementLog,wcsOf:(frame:number)=>TanWcs|null):Motion|null{
 const t=deriveTargets(log,wcsOf).filter(d=>d.sky).slice().sort((a,b)=>a.mark.jd-b.mark.jd);
 if(t.length<2||t[0].mark.jd===t[t.length-1].mark.jd)return null;
 return motionBetween({...t[0].sky!,jd:t[0].mark.jd},{...t[t.length-1].sky!,jd:t[t.length-1].mark.jd});
}
/** Catalogue positions closer than this (″) name the same reference star on two frames. */
export const SAME_STAR_ARCSEC=1;
/** Blink alignment of frame `second` onto frame `first` from the first two reference stars marked on both frames, paired by
 * their catalogue coordinates (not by marking order), or null. */
export function blinkAlignment(log:MeasurementLog,first:number,second:number):Alignment|null{
 const refs=(f:number)=>log.filter(m=>m.frame===f&&m.role==='reference'&&m.catalog);
 const b=refs(second),pairs:[Measurement,Measurement][]=[];
 for(const m of refs(first)){
  const match=b.find(n=>angularSeparationArcsec(m.catalog!,n.catalog!)<SAME_STAR_ARCSEC&&!pairs.some(p=>p[1]===n));
  if(match&&!pairs.some(p=>angularSeparationArcsec(p[0].catalog!,m.catalog!)<SAME_STAR_ARCSEC))pairs.push([m,match]);
  if(pairs.length===2)break;
 }
 if(pairs.length<2)return null;
 try{return alignFromTwoStars([pairs[0][0],pairs[1][0]],[pairs[0][1],pairs[1][1]]);}catch{return null;}
}

/** Display stretch for the measuring view: linear between the centroid cuts (the guide ties the centroid weights to the
 * displayed range), grey RGBA; non-finite pixels magenta. */
export function stretchRaster(image:MeasureImage,range:DisplayRange):Uint8ClampedArray{
 const out=new Uint8ClampedArray(image.width*image.height*4),span=range.high-range.low;
 for(let y=1;y<=image.height;y++)for(let x=1;x<=image.width;x++){
  const v=image.value(x,y),at=((y-1)*image.width+x-1)*4;
  if(v===null){out[at]=190;out[at+1]=20;out[at+2]=120;}
  else{const g=span>0?Math.round(Math.min(1,Math.max(0,(v-range.low)/span))*255):128;out[at]=out[at+1]=out[at+2]=g;}
  out[at+3]=255;
 }
 return out;
}
/** Web default centroid cuts: 5 % and 50 % of the image's finite range. */
export function defaultDisplayRange(minimum:number|null,maximum:number|null):DisplayRange{
 if(minimum===null||maximum===null||!(maximum>minimum))return Object.freeze({low:0,high:1});
 return Object.freeze({low:minimum+(maximum-minimum)*0.05,high:minimum+(maximum-minimum)*0.5});
}

/** "h m s" / "± d m s" (spaces or colons) → decimal hours/degrees; null when malformed or out of range. */
export function parseSexagesimal(text:string,kind:'ra'|'dec'):number|null{
 const m=/^\s*([+-])?\s*(\d{1,3})(?:[\s:]+(\d{1,2}))?(?:[\s:]+(\d{1,2}(?:\.\d+)?))?\s*$/.exec(text);
 if(!m)return null;
 const [a,b,c]=[Number(m[2]),Number(m[3]??0),Number(m[4]??0)];
 if(b>=60||c>=60)return null;
 const v=(a+b/60+c/3600)*(m[1]==='-'?-1:1);
 if(kind==='ra'?(m[1]!==undefined||v>=24):Math.abs(v)>90)return null;
 return v;
}
export function formatSexagesimal(value:number,kind:'ra'|'dec'):string{
 const sign=value<0?'-':kind==='dec'?'+':'',v=Math.abs(value),decimals=kind==='ra'?2:1;
 let a=Math.floor(v),b=Math.floor((v-a)*60),c=Number(((v-a-b/60)*3600).toFixed(decimals));
 if(c>=60){c=0;b++;}if(b>=60){b=0;a++;}
 if(kind==='ra'&&a>=24)a-=24;
 return `${sign}${String(a).padStart(2,'0')} ${String(b).padStart(2,'0')} ${c.toFixed(decimals).padStart(3+decimals,'0')}`;
}
