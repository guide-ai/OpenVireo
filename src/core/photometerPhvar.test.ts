import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,describe,expect,it} from 'vitest';
import {assembleFieldPack,type AssemblySources} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';
import {buildFieldPopulation,FIELD_HALF_DEGREES,FIELD_VARIABLE_JD_DOMAIN,OUTSIDE_VIEW,type FieldVariableTime} from './fieldEngine';
import {clearTiledPhotometerFields,photometerFieldFromPopulation,queryPhotometerNeighbors,registerTiledPhotometerField,tiledPhotometerTarget,tiledPhotometerTargetId,TILED_PHOTOMETER_JD_DOMAIN,PHOTOMETER_QSO_MERGE_GUARD_DEGREES,PhotometerFieldError,type PinnedPleiadesField} from './photometerField';
import {buildPinnedPleiadesUbvField} from './photometerUbvField';
import {attenuatePhotometerMagnitude,combinePhotometerMagnitudes,photometerPointFraction,photometerSeparation} from './photometerSource';
import {photometerApertureGeometry} from './photometerAperture';
import {photometerTelescope} from './photometerTelescope';
import {decodeNativeCompactRecord} from './pinnedNativeField';
import {variableDispatchAt,variableRecordFromHex,variableModelStatic} from './variableDispatch';

// Front PHVAR (analysis/front-phvar/RECOVERY.md): time-dependent CLEA_VStrs.dat variables at tiled photometer pointings. VIREO's
// field build reads the observatory clock (0x487bcc at 0x5986ab / 0x59878b) and the photometer reads the selected record's V (+0x29,
// 0x4ffbd7) as that build left it; the web passes the clock JD frozen when the frame is prepared. Real catalogue stars; the expected
// values are recomputed from the raw CLEA_VStrs.dat and GSC bytes with the dispatch model (a check of the port against the reading,
// not of the original).
const f=(p:string)=>new Uint8Array(readFileSync(p)),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const glx=f('public/original/catalogs/CLEA_GLX.DAT'),qso=f('public/original/catalogs/CLEA_QSO.DAT'),vars=f('public/original/variables/CLEA_VStrs.dat');
const sources:AssemblySources={index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch,capacity:64}),variables:vars,variablesSha256:sha(vars),qso,qsoSha256:sha(qso),glimages:f('public/original/images/GLIMAGES.LST')};
const vview=new DataView(vars.buffer,vars.byteOffset,vars.byteLength);
const variableAt=(i:number)=>({ra:vview.getFloat64(i*92+11,true),dec:vview.getFloat64(i*92+19,true),rawHex:[...vars.subarray(i*92,i*92+92)].map(b=>b.toString(16).padStart(2,'0')).join('')});
// 2009-06-01 04:00 UT (Object X's default time) and one day later.
const JD1=2454983.6666666665,JD2=JD1+1;
const time=(jd:number):FieldVariableTime=>({jd,source:'observatory-clock'});
async function built(p:Readonly<{ra:number;dec:number}>,variableTime?:FieldVariableTime){
 const pack=await assembleFieldPack(p,sources,undefined,FIELD_HALF_DEGREES.photometer);
 const b=buildFieldPopulation(pack,glx,p,{fieldHalfDegrees:FIELD_HALF_DEGREES.photometer,variableDispatch:'recovered',qso:'merge',qsoCatalog:{bytes:qso,sha256:sha(qso)},...(variableTime?{variableTime}:{})});
 return {b,r:photometerFieldFromPopulation(b.population,b.reasons,p,'object',{qso,glx})};
}
const R10=photometerApertureGeometry(10).radiusDegrees,SEEING=photometerTelescope(0).seeingWidthDegrees;
/** 0x4ffbc8..0x4ffee0 recomputed: the selected V attenuated by its fraction, then each differently named neighbour folded in. */
function expectedV(field:PinnedPleiadesField){
 const fr=(s:Readonly<{ra:number;dec:number}>)=>photometerPointFraction(R10,photometerSeparation(field.pointing.ra,field.pointing.dec,s.ra,s.dec),SEEING);
 let v=attenuatePhotometerMagnitude(field.selected.magnitude,fr(field.selected));
 for(const n of queryPhotometerNeighbors(field.pointing,R10,field.stars,field.qsos??[]))if(n.nativeName!==field.selected.nativeName&&fr(n)>0)v=combinePhotometerMagnitudes(attenuatePhotometerMagnitude(n.magnitude,fr(n)),v);
 return v;
}
afterEach(()=>clearTiledPhotometerFields());

describe('Front PHVAR: a time-dependent variable at a tiled pointing',()=>{
 // GM And, CLEA_VStrs.dat record 0 (class 0, a Cepheid): its TRUE dispatch hits a compact GSC star (0x59864d..0x59869b).
 const GM_AND=variableAt(0),GM_POINT={ra:GM_AND.ra,dec:GM_AND.dec};
 it('is typed without a clock time and measured at two JDs with two magnitudes (hit: the GSC star renamed to the GCVS ID)',async()=>{
  expect(variableModelStatic(variableRecordFromHex(GM_AND.rawHex,0)).class).toBe(0);
  const untimed=await built(GM_POINT);
  expect(untimed.r).toEqual({reason:'photometer-variable',detail:'variable-time-required'});
  const fields=[];
  for(const jd of [JD1,JD2]){
   const {b,r}=await built(GM_POINT,time(jd));if(!r.field)throw new Error(r.reason);
   const s=r.field.selected;expect(s.nativeName).toBe('GM And');expect(s.variable).toEqual({recordIndex:0,gcvsId:'GM And',path:'hit',valuesAvailable:true});
   // The hit keeps the GSC star's id and position; V, B−V and U−B are the model's at this JD, read with the star's own colours.
   const star=b.population!.stars.find(x=>x.id===s.id)!as {rawHex:string;band:string;recordIndex:number};
   const gsc=decodeNativeCompactRecord(star.rawHex,star.band,star.recordIndex);expect([s.ra,s.dec]).toEqual([gsc.ra,gsc.dec]);
   const o=variableDispatchAt(variableRecordFromHex(GM_AND.rawHex,0),jd,{bMinusV:gsc.photometry2Single,uMinusB:gsc.photometry3Single});
   if(!o.result)throw new Error('dispatch false');
   expect([s.magnitude,s.photometry2Single,s.photometry3Single]).toEqual([o.v,o.bMinusV,o.uMinusB]);
   expect(r.field.variableTime).toEqual({jd,source:'observatory-clock'});
   expect(r.field.sourceMagnitude).toBe(expectedV(r.field));fields.push(r.field);
  }
  expect(fields[0].selected.magnitude).not.toBe(fields[1].selected.magnitude);
  expect(fields[0].sourceMagnitude).not.toBe(fields[1].sourceMagnitude);
  // Both frames register side by side: the target id names the pointing and the JD.
  const ids=fields.map(registerTiledPhotometerField);
  expect(ids).toEqual([JD1,JD2].map(jd=>`gsc:${GM_POINT.ra},${GM_POINT.dec}:JD${jd}`));
  const v=ids.map(id=>buildPinnedPleiadesUbvField('object','V',id,10,0).sourceMean);expect(v[0]).not.toBe(v[1]);
 },120_000);
 it('a miss inserts a type-0 star named by the GCVS ID at the variable position (0x59873e..0x5987a9)',async()=>{
  // KU And, CLEA_VStrs.dat record 63 (class 1): no GSC star near enough, so the dispatch's object is inserted.
  const KU=variableAt(63),p={ra:KU.ra,dec:KU.dec};
  expect(variableModelStatic(variableRecordFromHex(KU.rawHex,63)).class).toBe(1);
  expect((await built(p)).r.reason).toBe('photometer-variable');
  const {r}=await built(p,time(JD1));if(!r.field)throw new Error(r.reason);
  const s=r.field.selected;expect(s).toMatchObject({id:'CLEA_VStrs.dat@63',nativeName:'KU And',ra:KU.ra,dec:KU.dec,type:0,variable:{recordIndex:63,path:'miss',valuesAvailable:true}});
  const o=variableDispatchAt(variableRecordFromHex(KU.rawHex,63),JD1,'residue');if(!o.result)throw new Error('dispatch false');
  expect([s.magnitude,s.photometry2Single,s.photometry3Single]).toEqual([o.v,o.bMinusV,o.uMinusB]);
  expect(r.field.sourceMagnitude).toBe(expectedV(r.field));
 },120_000);
 it('review 1 L1: a variable without values near a QSO of the field needs the time (the merge reads its V, 0x597fda)',async()=>{
  // Synthetic: CLEA_QSO.DAT record 2's own field (ready, the QSO selected) with one injected miss star whose values are unavailable,
  // outside the selection radius and the aperture-150 reach. Within the QSO merge guard radius it blocks; beyond it, it does not.
  const q=new DataView(qso.buffer,qso.byteOffset,qso.byteLength),p={ra:q.getFloat64(2*52+0x12,true),dec:q.getFloat64(2*52+0x1a,true)};
  const {b,r}=await built(p);expect(r.field?.selected.type).toBe(3);
  const inject=(offset:number)=>{
   const id='CLEA_VStrs.dat@99999',star={id,band:'CLEA_VStrs.dat' as const,recordIndex:99999,ra:p.ra,dec:p.dec+offset,magnitude:12,photometry2Single:NaN,photometry3Single:NaN,type:0 as const,variableInserted:true as const};
   const entry={starId:id,recordIndex:99999,gcvsId:'SYN',path:'miss' as const,ra:star.ra,dec:star.dec,riseWordDefaulted:false,values:{status:'unavailable' as const,reason:'variable-time-required' as const},nearGalaxyOrQso:true};
   return photometerFieldFromPopulation({...b.population!,stars:[...b.population!.stars,star],variableStars:[entry]},b.reasons,p,'object',{qso,glx});
  };
  expect(inject(.02)).toEqual({reason:'photometer-variable',detail:'variable-time-required'});
  // Closure check: an entry whose star the QSO replaced or pruned in this build (no longer in the list) still counts, at its own
  // position: at another V the QSO would have been inserted and the variable kept.
  const removed={starId:'CLEA_VStrs.dat@99998',recordIndex:99998,gcvsId:'SYN2',path:'miss' as const,ra:p.ra,dec:p.dec+.0003,riseWordDefaulted:false,values:{status:'unavailable' as const,reason:'variable-time-required' as const},nearGalaxyOrQso:true};
  expect(photometerFieldFromPopulation({...b.population!,variableStars:[removed]},b.reasons,p,'object',{qso,glx})).toEqual({reason:'photometer-variable',detail:'variable-time-required'});
  // A removed entry beyond the guard radius does not block, and neither does one whose values were computed.
  expect(photometerFieldFromPopulation({...b.population!,variableStars:[{...removed,dec:p.dec+PHOTOMETER_QSO_MERGE_GUARD_DEGREES+.002}]},b.reasons,p,'object',{qso,glx}).field?.selected.id).toBe(r.field!.selected.id);
  expect(photometerFieldFromPopulation({...b.population!,variableStars:[{...removed,values:{status:'computed' as const}}]},b.reasons,p,'object',{qso,glx}).field?.selected.id).toBe(r.field!.selected.id);
  const far=inject(PHOTOMETER_QSO_MERGE_GUARD_DEGREES+.002);expect(far.field?.selected.id).toBe(r.field!.selected.id);expect(far.field?.sourceMagnitude).toBe(r.field!.sourceMagnitude);
 },120_000);
 it('the frozen JD domain and the QSO merge guard are the field engine\'s; target ids round-trip with and without a JD',()=>{
  expect(TILED_PHOTOMETER_JD_DOMAIN).toEqual(FIELD_VARIABLE_JD_DOMAIN);expect(PHOTOMETER_QSO_MERGE_GUARD_DEGREES).toBe(OUTSIDE_VIEW.mergeRadiusDegrees);
  const p={ra:0.0009929221987460951,dec:35.362846359336615};
  expect(tiledPhotometerTargetId(p)).toBe(`gsc:${p.ra},${p.dec}`);expect(tiledPhotometerTarget(tiledPhotometerTargetId(p))).toEqual({pointing:p});
  expect(tiledPhotometerTarget(tiledPhotometerTargetId(p,JD1))).toEqual({pointing:p,jd:JD1});
  for(const bad of [NaN,Infinity,FIELD_VARIABLE_JD_DOMAIN.minimum-1,FIELD_VARIABLE_JD_DOMAIN.maximum+1])expect(()=>tiledPhotometerTargetId(p,bad)).toThrow(PhotometerFieldError);
  for(const bad of [`gsc:${p.ra},${p.dec}:JD`,`gsc:${p.ra},${p.dec}:JD1e7`,`gsc:${p.ra},${p.dec}:JD2454983.50`,`gsc:${p.ra},${p.dec},JD${JD1}`])expect(tiledPhotometerTarget(bad)).toBeNull();
 });
});
