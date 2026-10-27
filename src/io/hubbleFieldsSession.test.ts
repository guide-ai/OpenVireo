import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import cached from '../../data/hubble/corbor-cached-provenance.json';
import {createGalaxyObservation} from './galaxyObservation';
import {serializeGalaxySession} from './galaxySession';
import {activateGalaxy,createGalaxyExposure,deactivateGalaxy,pauseGalaxy,startGalaxy,tickGalaxy,replayGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {analyzeHubble,EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {emptyExposureWorkspace,type ObservingWorkspace} from '../core/observingWorkspace';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const read=(s:string)=>readAnalysisSession(new File([s],'hubble-fields.json'));
const ids=['36747','36773','54876','54875','54891'],magnitudes=['15.6','15.8','16.0','16.9','16.3'],cells=['C2','C3','C9','C10','C11'];
const acquire=(id:string,seed=1)=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(seed,id))),1000)));
function observing(context:Partial<ObservingWorkspace['context']>,cachedGalaxies?:ObservingWorkspace['cachedGalaxies']):ObservingWorkspace{
 return {context:{domeOpen:false,mode:'finder',selectedId:'54875-acquisition',pointing:{ra:15.3735,dec:27.738888888888887},raText:'',decText:'',hasPointed:true,galaxyTargetId:'54875',...context},sky:emptyExposureWorkspace(),star:emptyExposureWorkspace(),galaxies:{'36747':emptyExposureWorkspace(),'36773':emptyExposureWorkspace(),'54876':emptyExposureWorkspace()},...(cachedGalaxies?{cachedGalaxies}:{})};
}
async function fiveTargets():Promise<AnalysisSession>{
 const acquisitions=[];for(const id of ids)acquisitions.push(await acquire(id));
 const control={...INITIAL_CONTROL,step:.001},rows=acquisitions.map((p,i)=>createMeasurement(i+1,`Operator label ${i+1}`,p.name,p.sha256,{...control,position:10*(i+1)},'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId,targetId:p.targetId}));
 const hubble={recipeId:'vireo' as const,rows:rows.map((m,i)=>({id:i+1,input:{kind:'measurement' as const,measurementId:m.id,apparentVText:magnitudes[i],magnitudeSource:`Hubble Data.xls · Sheet1!${cells[i]}`,targetId:ids[i]}}))};
 const second=deactivateGalaxy(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(7,'54891'))),500)));
 const banks={'54875':{state:acquisitions[3].state,seedText:'1'},'54891':{state:second,seedText:'7'}};
 return {observation:acquisitions[4],acquisitions,rows,control,stepInput:'.001',reference:'galaxy',wide:false,object:'Edited',hubble,observing:observing({},banks)};
}
describe('v24 sessions for the cached-pan Hubble targets',()=>{
 it('saves and freshly restores five acquired targets, their measurements, Hubble inputs and the 0.4 m banks',async()=>{
  const session=await fiveTargets(),saved=await serializeAnalysisSession(session),data=JSON.parse(saved);
  expect(data.version).toBe(24);expect(Object.keys(data).sort()).toEqual(['base','binarySHA256','cachedBaseFieldSHA256','cachedFieldPolicy','cachedGalaxies','format','numericalPolicy','version']);
  expect([data.cachedFieldPolicy,data.cachedBaseFieldSHA256,data.binarySHA256]).toEqual([cached.policy,cached.baseFieldSnapshotSHA256,cached.binarySHA256]);
  expect(data.base.version).toBe(9);expect(data.base.observing).not.toHaveProperty('cachedGalaxies');expect(data.base.acquisitions).toHaveLength(5);
  expect(data.cachedGalaxies['54875'].source.kind).toBe('archive');expect(data.cachedGalaxies['54891'].source.kind).toBe('journal');expect(data.cachedGalaxies['54891'].seedText).toBe('7');
  const restored=await read(saved);expect(restored.rows).toEqual(session.rows);expect(restored.hubble).toEqual(session.hubble);
  expect(restored.acquisitions!.map(a=>a.state.exposure)).toEqual(session.acquisitions!.map(a=>a.state.exposure));expect(restored.acquisitions!.map(a=>a.kind==='catalog-galaxy-acquisition'?a.targetId:'')).toEqual(ids);
  expect(restored.observing!.cachedGalaxies!['54891'].state!.exposure).toEqual(session.observing!.cachedGalaxies!['54891'].state!.exposure);expect(restored.observing!.cachedGalaxies!['54875'].state!.exposure).toEqual(session.acquisitions![3].state.exposure);expect(restored.observing!.context.galaxyTargetId).toBe('54875');
  const result=analyzeHubble(restored.hubble,restored.rows);expect(result.rows.map(r=>r.acquiredTargetId)).toEqual(ids);expect(result.rows.every(r=>r.issues.length===0)).toBe(true);expect(result.value).toBeDefined();
  expect(await serializeAnalysisSession(restored)).toBe(saved);
 });
 it('rejects new-target journals, banks or context in any pre-24 file, and forged identity/policy/domain atomically',async()=>{
  const data=JSON.parse(await serializeAnalysisSession(await fiveTargets()));
  await expect(read(JSON.stringify(data.base))).rejects.toThrow();
  const nested=structuredClone(data);nested.base=structuredClone(data);await expect(read(JSON.stringify(nested))).rejects.toThrow();
  const changes:((v:any)=>void)[]=[v=>v.cachedFieldPolicy='OpenVireo-cached-galaxy-workspace-v2',v=>v.cachedBaseFieldSHA256='a'.repeat(64),v=>v.binarySHA256='b'.repeat(64),v=>v.cachedGalaxies=null,v=>v.cachedGalaxies['36773']=v.cachedGalaxies['54875'],v=>delete v.cachedGalaxies['54891'],
   v=>v.cachedGalaxies['54891'].source.journal.policy=cached.targets[0].policyId,v=>v.cachedGalaxies['54891'].source.journal.domain.view.pointing.ra+=1e-9,v=>v.cachedGalaxies['54891'].source.journal.domain.pointing={...v.cachedGalaxies['54891'].source.journal.domain.view.pointing},v=>v.cachedGalaxies['54891'].source.journal.fieldSnapshotSHA256='c'.repeat(64),
   v=>v.cachedGalaxies['54875'].source.acquisitionId=v.base.acquisitions[4].id,v=>v.base.acquisitions[3].journal.policy=v.base.acquisitions[2].journal.policy,v=>v.base.acquisitions[4].journal.domain.view.baseFieldId='36773',v=>v.base.measurements[3].origin.targetId='54891',v=>v.extra=1];
  for(const change of changes){const x=structuredClone(data);change(x);await expect(read(JSON.stringify(x))).rejects.toThrow();}
  // A cached-target context alone also requires v24.
  const contextOnly=JSON.parse(await serializeAnalysisSession({observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing({selectedId:'54876-acquisition',galaxyTargetId:'54891'})}));
  expect(contextOnly.version).toBe(24);expect(contextOnly.cachedGalaxies['54875'].source.kind).toBe('empty');await expect(read(JSON.stringify(contextOnly.base))).rejects.toThrow();
  expect((await read(JSON.stringify(contextOnly))).observing!.context.galaxyTargetId).toBe('54891');
 });
 it('sessions without the new targets keep their existing version and content unchanged',async()=>{
  const acquisitions=[await acquire('36773'),await acquire('54876')];
  const session:AnalysisSession={observation:acquisitions[0],acquisitions,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing({selectedId:'54876-acquisition',pointing:{ra:15.3735,dec:27.72222222222222},galaxyTargetId:'54876'})};
  const saved=JSON.parse(await serializeAnalysisSession(session));expect(saved.version).toBe(9);expect(saved.observing).not.toHaveProperty('cachedGalaxies');
  const restored=await read(JSON.stringify(saved));expect(restored.observing).not.toHaveProperty('cachedGalaxies');expect(restored.acquisitions!.map(a=>a.acquisitionId)).toEqual(acquisitions.map(a=>a.acquisitionId));
  expect(JSON.parse(await serializeAnalysisSession({...session,observing:undefined,acquisitions})).version).toBe(3);
  // A legacy galaxy-bank slot cannot carry a cached-target journal.
  const forged=structuredClone(saved);forged.observing.galaxies['54876']={seedText:'1',source:{kind:'journal',journal:JSON.parse(serializeGalaxySession(deactivateGalaxy(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(3,'54875'))),100)))))}};
  await expect(read(JSON.stringify(forged))).rejects.toThrow();
 });
 it('rejects a combined old+cached budget above24000 before replay, and accepts the exact boundary',async()=>{
  const blank:AnalysisSession={observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing({selectedId:'54876-acquisition',galaxyTargetId:'54876'},{'54875':emptyExposureWorkspace(),'54891':emptyExposureWorkspace()})};
  const data=JSON.parse(await serializeAnalysisSession(blank));
  const slot=(id:string,count:number)=>{const journal=JSON.parse(serializeGalaxySession(createGalaxyExposure(1,id)));journal.events=Array.from({length:count},(_,i)=>({kind:i%2?'pause':'start'}));return {seedText:'1',source:{kind:'journal',journal}};};
  data.base.observing.galaxies['54876']=slot('54876',10000);data.cachedGalaxies['54875']=slot('54875',10000);data.cachedGalaxies['54891']=slot('54891',10000);
  await expect(read(JSON.stringify(data))).rejects.toMatchObject({code:'size'});
  data.base.observing.galaxies['54876']=slot('54876',8000);data.cachedGalaxies['54875']=slot('54875',8000);data.cachedGalaxies['54891']=slot('54891',8000);
  const exact=await read(JSON.stringify(data));expect(exact.observing!.galaxies['54876'].state!.events).toHaveLength(8000);expect(exact.observing!.cachedGalaxies!['54891'].state!.events).toHaveLength(8000);
  // Writer enforces the same combined bound. Individually valid journal lengths are insufficient.
  const extraState=replayGalaxy(1,Array.from({length:8002},(_,i)=>({kind:i%2?'pause' as const:'start' as const})),'54891');
  const over:AnalysisSession={...exact,observing:{...exact.observing!,cachedGalaxies:{...exact.observing!.cachedGalaxies!,'54891':{state:extraState,seedText:'1'}}}};
  await expect(serializeAnalysisSession(over)).rejects.toMatchObject({code:'size'});
  const raw=JSON.parse(await serializeAnalysisSession(exact));raw.cachedGalaxies['54891']=slot('54891',8002);
  await expect(read(JSON.stringify(raw))).rejects.toMatchObject({code:'size'});
 });

});
