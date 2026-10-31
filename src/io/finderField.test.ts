import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import profiles from '../../data/observatory/compiled-optical-profiles.json';
import {assembleFieldPack} from './assembledFieldPack';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {buildFieldPopulation,evaluateFinderView,FIELD_FINDER_STAR_SHIFTS,FIELD_HALF_DEGREES,freshFieldArea,type FinderFieldStar} from '../core/fieldEngine';
import {catalogObjectView,catalogRecords,catalogRecordFromStar} from '../core/catalogObject';
import {nativeFieldCacheHolds,nativeFieldCacheOrigin,FINDER_FIELD_CACHE,FIELD_CACHE} from '../core/fieldCache';

// Front G5: the finder field (0x53bae4, FSCFieldObj 0x59b374/0x59b894) on the published compact GSC tiles, read from disk.
const file=(p:string)=>new Uint8Array(readFileSync(p));
const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
const diskFetch=(async(input:RequestInfo|URL)=>new Response(file('public'+String(input)))) as typeof fetch;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const variables=file('public/original/variables/CLEA_VStrs.dat'),qso=file('public/original/catalogs/CLEA_QSO.DAT'),glimages=file('public/original/images/GLIMAGES.LST'),glx=file('public/original/catalogs/CLEA_GLX.DAT');
const sources=()=>({index,tiles:createGscTileStore({fetcher:diskFetch,capacity:64}),variables,variablesSha256:sha(variables),qso,qsoSha256:sha(qso),glimages});
const p={ra:12.5,dec:27};

describe('Front G5: finder field on the GSC tiles',()=>{
 it('area: half 3.75° (factor 3 × finder 2.50°), limit 14, folded once',()=>{
  const a=freshFieldArea(p,FIELD_HALF_DEGREES.finder,14);
  expect([a.minimumDec,a.maximumDec,a.limitingMagnitude]).toEqual([23.25,30.75,14]);
  expect(a.maximumRa-a.minimumRa).toBeCloseTo(2*3.75/(Math.cos(27*Math.PI/180)*15),12);
  expect(()=>freshFieldArea(p,1,20)).toThrow();expect(()=>freshFieldArea(p,.375,12)).toThrow();
 });
 it('admits exactly the band records in the area at V ≤ 11.5, stored as FSC records (B−V/U−B 30, flags 1, code 0); galaxies to 12; no QSO or photograph gate',async()=>{
  const pack=await assembleFieldPack(p,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const {population,reasons}=buildFieldPopulation(pack,glx,p,{finder:{magnitudeLimit:11.5}});
  expect(reasons).toEqual([]);if(!population)throw Error();
  // Independent count from the pack's whole records: inside the area (inclusive) and V ≤ min(11.5, 14).
  const a=population.area;let expected=0;
  for(const b of pack.bands)for(const [,h] of b.reads)if(h.length===54){
   const v=new DataView(Uint8Array.from(h.match(/../g)!,x=>parseInt(x,16)).buffer),ra=v.getInt32(0,true)/1e7,dec=v.getInt32(4,true)/1e5,m=Math.fround(v.getInt16(12,true)/1000);
   if(ra>=a.minimumRa&&ra<=a.maximumRa&&dec>=a.minimumDec&&dec<=a.maximumDec&&m<=Math.fround(11.5))expected++;
  }
  expect(population.initialStarIds.length).toBe(expected);expect(expected).toBeGreaterThan(100);
  const gsc=population.stars.filter((s):s is FinderFieldStar=>'fsc' in s);
  expect(gsc.length).toBeGreaterThan(0);
  for(const s of gsc){expect(s.magnitude).toBeLessThanOrEqual(Math.fround(11.5));expect([s.photometry2Single,s.photometry3Single,s.qualityByte]).toEqual([30,30,15]);}
  const r=catalogRecordFromStar(gsc[0]);expect([r.bv,r.ub,r.code,r.flags.bv,r.flags.ub,r.flags.spectral]).toEqual([30,30,0,true,true,true]);
  for(const g of population.galaxies)expect(Math.fround(g.magnitude)).toBeLessThanOrEqual(12);
  expect(population.qsoStage).toBeUndefined();expect(population.photographAssociations).toBeUndefined();
 },120000);
 it('paints a 936² finder cache with the finder star shift (+0x6f4 = the profiles\' finderFactorMag)',async()=>{
  expect([...FIELD_FINDER_STAR_SHIFTS]).toEqual(profiles.records.map(r=>r.finderFactorMag));
  const pack=await assembleFieldPack(p,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const v=evaluateFinderView(pack,glx,p,0,{finderMagnitudeLimit:11.5,variableTime:{jd:2455000.5,source:'observatory-clock'}});
  expect(v.reasons).toEqual([]);expect([v.raster?.width,v.raster?.height]).toEqual([936,936]);
  expect(v.raster!.rgb.some(x=>x>0)).toBe(true);
 },120000);
 it('cache rule and crop: the finder keeps its field within 2.5° per axis; the crop origin follows the projection',()=>{
  expect(nativeFieldCacheHolds(p,{ra:p.ra,dec:p.dec+2.4},FINDER_FIELD_CACHE)).toBe(true);
  expect(nativeFieldCacheHolds(p,{ra:p.ra,dec:p.dec+2.6},FINDER_FIELD_CACHE)).toBe(false);
  expect(nativeFieldCacheHolds(p,{ra:p.ra,dec:p.dec+.26},FIELD_CACHE)).toBe(false);
  expect(nativeFieldCacheOrigin(p,p)).toEqual({x:312,y:312});
  // A pointing 0.1° north appears 0.1·1248 = 124.8 px higher in the telescope cache, so the crop moves up.
  expect(nativeFieldCacheOrigin(p,{ra:p.ra,dec:p.dec+.1})).toEqual({x:312,y:187});
 });
});

describe('Front G5 review 1: finder galaxies, variables and large stamps',()=>{
 it('M2: finder galaxy records hold 30.0 colours (shown blank, no residue reason), from 0x59b894',async()=>{
  const at={ra:9.9258,dec:69.0653},pack=await assembleFieldPack(at,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const {population}=buildFieldPopulation(pack,glx,at,{finder:{magnitudeLimit:11.5}});if(!population)throw Error();
  const g=catalogRecords(population).galaxies;expect(g.length).toBeGreaterThan(0);
  for(const r of g){expect(r.fsc).toBe(true);const v=catalogObjectView(r,(x)=>String(x));expect([v.bv,v.ub]).toEqual(['','']);expect(v.reasons).not.toContain('galaxy-colour-residue');}
  // The telescope field's galaxies keep the loader's per-type colours (no mark).
  const tp=await assembleFieldPack(at,sources());const tel=buildFieldPopulation(tp,glx,at,{});
  for(const r of catalogRecords(tel.population!).galaxies)expect(r.fsc).toBeUndefined();
 },120000);
 it('M1: M31 is drawn in its own finder field (VIREO\'s 0x53b058 has no size bound); nothing else is left unpainted',async()=>{
  const at={ra:0.7123,dec:41.27},pack=await assembleFieldPack(at,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const v=evaluateFinderView(pack,glx,at,0,{finderMagnitudeLimit:11.5,variableTime:{jd:2455000.5,source:'observatory-clock'}});
  expect(v.reasons).toEqual([]);expect(v.population!.galaxies.map(g=>g.id)).toContain('NGC 224');expect(v.unpaintedGalaxies).toEqual([]);
  const i=v.population!.galaxies.findIndex(g=>g.id==='NGC 224'),p=v.scene!.galaxies[i],r=v.raster!;
  expect(r.rgb[(Math.round(p.y)*r.width+Math.round(p.x))*3]).toBeGreaterThan(0);
 },120000);
 it('M3: a TRUE-dispatch variable whose values are unavailable types the finder field (as the telescope view), never painted silently',async()=>{
  const at={ra:5.5,dec:-5},pack=await assembleFieldPack(at,sources(),undefined,FIELD_HALF_DEGREES.finder);
  const none=evaluateFinderView(pack,glx,at,0,{finderMagnitudeLimit:11.5});
  expect(none.reasons.length).toBe(1);expect(none.raster).toBeNull();
  const timed=evaluateFinderView(pack,glx,at,0,{finderMagnitudeLimit:11.5,variableTime:{jd:2455000.5,source:'observatory-clock'}});
  const pending=(timed.population?.variableStars??[]).filter(e=>e.values.status==='unavailable');
  if(pending.length)expect(timed.reasons.length).toBe(1);else expect(timed.reasons).toEqual([]);
 },120000);
});

describe('G5 closure N1: every V ≤ 12 catalogue galaxy at the finder scale',()=>{
 it('each one is drawn (stamp within the 1200 px finder bound) or has a 0 px minor axis; the in-place paint equals the composed stamp',async()=>{
  const {admitFieldGalaxies}=await import('../core/fieldEngine');
  const {galaxyStampGeometry,paintAdaptedGalaxy,paintAdaptedGalaxyInPlace,GALAXY_STAMP_SCALES}=await import('../core/galaxyScene');
  const {galaxyCatalogAxes}=await import('../core/galaxyCatalogAxes');
  const {galaxies}=admitFieldGalaxies(glx,{minimumRa:0,maximumRa:24,minimumDec:-90,maximumDec:90,limitingMagnitude:12});
  expect(galaxies.length).toBe(551);
  const minorZero:string[]=[];let largest=0,largestId='';
  for(const g of galaxies)for(const shift of [-2,0,3]){
   try{const s=galaxyStampGeometry(g,shift,GALAXY_STAMP_SCALES.finder);if(s.major>largest){largest=s.major;largestId=g.id;}}
   catch{const a=galaxyCatalogAxes(g),r=Math.max(3,a.major*GALAXY_STAMP_SCALES.finder.pixelsPerArcminute/2);expect(Math.round(r*a.ratio)).toBe(0);minorZero.push(g.id);}
  }
  // Only these four, whose minor axis rounds to 0 px at the finder scale, are left unpainted [I]; every other stamp (1010-0122
  // included, whose catalogue axes fall back to a drawable shape) is within the bound.
  expect([...new Set(minorZero)]).toEqual(['A0341-1431','A0839-2008','A0956-3000','A1832-3759']);
  expect(largestId).toBe('A0524-6948');expect(largest).toBeGreaterThan(1000);expect(largest).toBeLessThanOrEqual(GALAXY_STAMP_SCALES.finder.maxMajor);
  // In-place paint (clipped to the cache) and the full stamp composed onto the same raster give the same pixels.
  const blank=()=>({width:936,height:936,rgb:new Uint8Array(936*936*3)});
  for(const id of ['NGC 224','NGC 3031']){
   const g=galaxies.find(x=>x.id===id)!,a=blank(),centre={x:468,y:300};
   const composed=paintAdaptedGalaxy(a,g,centre,0,GALAXY_STAMP_SCALES.finder).image;
   const b=blank();paintAdaptedGalaxyInPlace(b,g,centre,0,GALAXY_STAMP_SCALES.finder);
   expect(Buffer.from(b.rgb).equals(Buffer.from(composed.rgb))).toBe(true);
  }
  // The LMC paints in place without building its full stamp.
  const lmc=galaxies.find(x=>x.id==='A0524-6948')!,c=blank();
  paintAdaptedGalaxyInPlace(c,lmc,{x:468,y:468},0,GALAXY_STAMP_SCALES.finder);expect(c.rgb.some(v=>v>0)).toBe(true);
 },120000);
});
