import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {createGalaxyObservation} from './galaxyObservation';
import {activateGalaxy,createGalaxyExposure,pauseGalaxy,startGalaxy,tickGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession,OBSERVATION_LIST_POLICY,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {confirmHubbleObservation,openHubbleObservation,type HubbleObservation} from '../core/hubbleObservation';
import {hubbleObservationTarget} from './hubbleObservationTarget';
import {createPhotometer,photometerEvent as step,photometerStructReading,releasePhotometer,type PhotometerState} from '../core/photometer';
import {migrateObservationList,observationListClassifier,observationListFindOrAdd,observationListOk,portableObservationList,sameObservationList,type ObservationList} from '../core/sharedObservationList';
// Front ONERESULTS: session v35 carries VIREO's one Observational Results list around an unchanged v1..34 base, only when the list
// differs from what the migration derives from that base; older files load with the migration and re-save byte for byte.
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const read=(s:string)=>readAnalysisSession(new File([s],'observation-list.json'));
const acquire=(id:string)=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,id))),1000)));
async function hubbleSession():Promise<AnalysisSession>{
 const a=await acquire('36773'),control={...INITIAL_CONTROL,step:.001,position:17};
 const m=createMeasurement(1,'36773',a.name,a.sha256,control,'GLXYLNS.LST',{kind:a.kind,acquisitionId:a.acquisitionId,targetId:a.targetId});
 const t=hubbleObservationTarget(a),d=openHubbleObservation({id:t.id,jd:2455000.5,ra:t.ra,dec:t.dec,zSingle:m.zFloat32,targetMagnitude:t.magnitude,computeRedshiftVelocity:false,reused:null});
 const r=confirmHubbleObservation(d,{velocityText:'',remarks:'galaxy',spText:''});if(!r.ok)throw Error(r.message);const observation:HubbleObservation=r.observation;
 const hubble={recipeId:'vireo' as const,rows:[{id:1,input:{kind:'measurement' as const,measurementId:1,apparentVText:'15.8',magnitudeSource:'Hubble Data.xls · Sheet1!C3',targetId:'36773'}}]};
 return {observation:a,acquisitions:[a],rows:[{...m,observation}],control,stepInput:'.001',reference:'galaxy',wide:false,object:'36773',hubble};
}
const complete=(s:PhotometerState)=>step(step(s,{type:'start'}),{type:'complete'});
function photometry():PhotometerState{
 let s=step(createPhotometer(42),{type:'activate'});s=complete(step(s,{type:'point',kind:'sky'}));s=complete(step(s,{type:'point',kind:'object'}));
 s=step(s,{type:'nativeRecord',readingId:photometerStructReading(s)!.id,id:'HII 1234',jd:2455001.25,ra:3.75,dec:24.1,timeDependent:false,ok:true,remarks:'phot',spectralCode:0});
 return releasePhotometer(s);
}
const empty:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
/** A classification Record of the galaxy's own ID, as Classification Results writes it (TD off: reuses the Hubble record). */
function withClassification(list:ObservationList,id:string):ObservationList{
 const p=observationListFindOrAdd(list,id,null,false);return observationListOk(observationListClassifier(p.list,p.index,{ra:0,dec:0}),p.index,{remarks:'classified',spectralCode:0});
}

describe('Front ONERESULTS session v35 (one Observational Results list)',()=>{
 it('older files load with the migrated list and re-save byte for byte (Hubble v32 records, photometer owner 15 rows)',async()=>{
  const h=await hubbleSession(),hubbleText=await serializeAnalysisSession(h);expect(JSON.parse(hubbleText).version).toBe(32);
  const restored=await read(hubbleText);
  expect(restored.observationList!.records.map(r=>[r.id,r.remarks,r.jd])).toEqual([['36773','galaxy',2455000.5]]);
  expect(await serializeAnalysisSession(restored)).toBe(hubbleText);
  const photoText=await serializeAnalysisSession({...empty,photometry:photometry()}),photo=await read(photoText);
  expect(JSON.parse(photoText).version).toBe(8);
  expect(photo.observationList!.records.map(r=>[r.id,r.remarks,r.ra,r.dec])).toEqual([['HII 1234','phot',3.75,24.1]]);
  expect(await serializeAnalysisSession(photo)).toBe(photoText);
  // Both together: photometer rows, then Hubble records, each by time (the Hubble JD is earlier, so it comes first).
  const both=await serializeAnalysisSession({...h,photometry:photometry()}),b=await read(both);
  expect(b.observationList!.records.map(r=>r.id)).toEqual(['36773','HII 1234']);expect(await serializeAnalysisSession(b)).toBe(both);
  // A session with neither keeps no list.
  expect((await read(await serializeAnalysisSession(empty))).observationList).toBeUndefined();
 },60000);
 it('a list that differs from the migration is written as v35 around the unchanged base and round-trips byte-stably',async()=>{
  const h=await hubbleSession(),base=await serializeAnalysisSession(h),restored=await read(base);
  const list=withClassification(restored.observationList!,'36773');
  expect(list.records).toHaveLength(1);expect(list.records[0]!.remarks).toBe('classified');
  const text=await serializeAnalysisSession({...restored,observationList:list}),v=JSON.parse(text);
  expect(v.version).toBe(35);expect(v.observationListPolicy).toBe(OBSERVATION_LIST_POLICY);expect(JSON.stringify(v.base,null,2)+'\n').toBe(base);
  expect(v.observationList).toEqual(portableObservationList(list));
  const back=await read(text);expect(sameObservationList(back.observationList!,list)).toBe(true);
  expect(await serializeAnalysisSession(back)).toBe(text);
  // The same list as the migration is the base alone.
  expect(await serializeAnalysisSession({...restored,observationList:migrateObservationList({photometer:[],hubble:[{id:'36773',jd:2455000.5,ra:restored.observationList!.records[0]!.ra,dec:restored.observationList!.records[0]!.dec,zSingle:restored.rows[0]!.zFloat32,velocitySingle:0,spectralCode:0,remarks:'galaxy',vMagnitude:restored.observationList!.records[0]!.bands[2]||null}]})})).toBe(base);
  // An empty list over a base without records is the base alone too.
  expect(await serializeAnalysisSession({...empty,observationList:{records:[]}})).toBe(await serializeAnalysisSession(empty));
 },60000);
 it('refuses a non-canonical, nested, foreign or malformed v35',async()=>{
  const h=await hubbleSession(),restored=await read(await serializeAnalysisSession(h));
  const v=JSON.parse(await serializeAnalysisSession({...restored,observationList:withClassification(restored.observationList!,'36773')}));
  const bad=(f:(c:typeof v)=>void)=>{const c=structuredClone(v);f(c);return read(JSON.stringify(c));};
  await expect(bad(c=>{c.observationList=portableObservationList(restored.observationList!);})).rejects.toThrow();// equals the migration
  await expect(bad(c=>{c.observationListPolicy='other';})).rejects.toThrow();
  await expect(bad(c=>{c.base={...c};})).rejects.toThrow();
  await expect(bad(c=>{c.observationList[0].kind=7;})).rejects.toThrow();
  await expect(bad(c=>{c.extra=1;})).rejects.toThrow();
  // An empty list differs from a non-empty migration, so it is a valid v35 (the student's list was emptied by nothing else here,
  // but the format holds it).
  const emptied=await read(JSON.stringify({...v,observationList:[]}));expect(emptied.observationList!.records).toEqual([]);
 },60000);
});
