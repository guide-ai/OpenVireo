import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import pegasus from '../../data/hubble/pegasus-cached-provenance.json';
import corbor from '../../data/hubble/corbor-cached-provenance.json';
import {createGalaxyObservation} from './galaxyObservation';
import {serializeGalaxySession} from './galaxySession';
import {activateGalaxy,createGalaxyExposure,deactivateGalaxy,pauseGalaxy,startGalaxy,tickGalaxy,replayGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {analyzeHubble,EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {emptyExposureWorkspace,CACHED_GALAXY_IDS,PEGASUS_GALAXY_IDS,type ObservingWorkspace} from '../core/observingWorkspace';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const read=(s:string)=>readAnalysisSession(new File([s],'pegasus.json'));
// Operator workflow inputs: alignment positions are chosen controls and V values are the documented workbook references.
const ids=['36747','36773','54876','54875','54891','NGC 7499','NGC 7501','NGC 7503'],magnitudes=['15.6','15.8','16.0','16.9','16.3','14.1','14.7','14.4'],cells=['C2','C3','C9','C10','C11','C12','C13','C14'];
const acquire=(id:string,seed=1)=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(seed,id))),1000)));
const empty=(list:readonly string[])=>Object.fromEntries(list.map(id=>[id,emptyExposureWorkspace()]));
type Banks=Pick<ObservingWorkspace,'cachedGalaxies'|'pegasusGalaxies'>;
function observing(context:Partial<ObservingWorkspace['context']>,banks:Banks={}):ObservingWorkspace{
 return {context:{domeOpen:false,mode:'finder',selectedId:'NGC 7503-acquisition',pointing:{ra:23.17838888888889,dec:7.5675},raText:'',decText:'',hasPointed:true,galaxyTargetId:'NGC 7503',...context},sky:emptyExposureWorkspace(),star:emptyExposureWorkspace(),galaxies:{'36747':emptyExposureWorkspace(),'36773':emptyExposureWorkspace(),'54876':emptyExposureWorkspace()},...banks};
}
async function session(targets:readonly string[],banks:(a:Awaited<ReturnType<typeof acquire>>[])=>Banks):Promise<AnalysisSession>{
 const acquisitions=[];for(const id of targets)acquisitions.push(await acquire(id));
 const control={...INITIAL_CONTROL,step:.001},rows=acquisitions.map((p,i)=>createMeasurement(i+1,`Operator label ${i+1}`,p.name,p.sha256,{...control,position:5*(i+1)},'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId,targetId:p.targetId}));
 const hubble={recipeId:'vireo' as const,rows:rows.map((m,i)=>{const k=ids.indexOf(targets[i]);return {id:i+1,input:{kind:'measurement' as const,measurementId:m.id,apparentVText:magnitudes[k],magnitudeSource:`Hubble Data.xls · Sheet1!${cells[k]}`,targetId:targets[i]}};})};
 return {observation:acquisitions.at(-1)!,acquisitions,rows,control,stepInput:'.001',reference:'galaxy',wide:false,object:'Edited',hubble,observing:observing({},banks(acquisitions))};
}
const second=()=>deactivateGalaxy(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(7,'NGC 7499'))),500)));
const eight=()=>session(ids,a=>({cachedGalaxies:{'54875':{state:a[3].state,seedText:'1'},'54891':emptyExposureWorkspace()},pegasusGalaxies:{'NGC 7499':{state:second(),seedText:'7'},'NGC 7501':{state:a[6].state,seedText:'1'},'NGC 7503':emptyExposureWorkspace()}}));
describe('v25 sessions for the Pegasus Hubble targets',()=>{
 it('saves and freshly restores eight acquired targets, measurements, Hubble inputs and both 0.4 m bank groups',async()=>{
  const s=await eight(),saved=await serializeAnalysisSession(s),data=JSON.parse(saved);
  expect(data.version).toBe(25);expect(Object.keys(data).sort()).toEqual(['base','binarySHA256','format','numericalPolicy','pegasusBaseFieldSHA256','pegasusFieldPolicy','pegasusGalaxies','version']);
  expect([data.pegasusFieldPolicy,data.pegasusBaseFieldSHA256,data.binarySHA256]).toEqual([pegasus.policy,pegasus.baseFieldSnapshotSHA256,pegasus.binarySHA256]);
  // The inner CorBor v24 wrapper and its unchanged base.
  expect(data.base.version).toBe(24);expect(data.base.cachedBaseFieldSHA256).toBe(corbor.baseFieldSnapshotSHA256);expect(data.base.base.version).toBe(9);expect(data.base.base.acquisitions).toHaveLength(8);
  expect(data.base.base.observing).not.toHaveProperty('cachedGalaxies');expect(data.base.base.observing).not.toHaveProperty('pegasusGalaxies');
  expect(data.base.cachedGalaxies['54875'].source.kind).toBe('archive');expect(Object.keys(data.pegasusGalaxies)).toEqual([...PEGASUS_GALAXY_IDS]);
  expect(data.pegasusGalaxies['NGC 7501'].source.kind).toBe('archive');expect(data.pegasusGalaxies['NGC 7499'].source.kind).toBe('journal');expect(data.pegasusGalaxies['NGC 7499'].seedText).toBe('7');expect(data.pegasusGalaxies['NGC 7503'].source.kind).toBe('empty');
  const restored=await read(saved);expect(restored.rows).toEqual(s.rows);expect(restored.hubble).toEqual(s.hubble);
  expect(restored.acquisitions!.map(a=>a.state.exposure)).toEqual(s.acquisitions!.map(a=>a.state.exposure));expect(restored.acquisitions!.map(a=>a.kind==='catalog-galaxy-acquisition'?a.targetId:'')).toEqual(ids);
  const banks=restored.observing!.pegasusGalaxies!;
  expect(banks['NGC 7499'].state!.exposure).toEqual(s.observing!.pegasusGalaxies!['NGC 7499'].state!.exposure);expect(banks['NGC 7499'].seedText).toBe('7');expect(banks['NGC 7501'].state!.exposure).toEqual(s.acquisitions![6].state.exposure);expect(banks['NGC 7503'].state).toBeNull();
  expect(restored.observing!.cachedGalaxies!['54875'].state!.exposure).toEqual(s.acquisitions![3].state.exposure);expect(restored.observing!.context.galaxyTargetId).toBe('NGC 7503');
  const result=analyzeHubble(restored.hubble,restored.rows);expect(result.rows.map(r=>r.acquiredTargetId)).toEqual(ids);expect(result.rows.every(r=>r.issues.length===0)).toBe(true);expect(result.value).toBeDefined();
  expect(await serializeAnalysisSession(restored)).toBe(saved);
 });
 it('a Pegasus-only session wraps an unchanged v9 base; a Pegasus context alone also requires v25',async()=>{
  const s=await session(['36773','NGC 7501'],a=>({pegasusGalaxies:{'NGC 7499':emptyExposureWorkspace(),'NGC 7501':{state:a[1].state,seedText:'1'},'NGC 7503':emptyExposureWorkspace()}}));
  const saved=await serializeAnalysisSession(s),data=JSON.parse(saved);
  expect(data.version).toBe(25);expect(data.base.version).toBe(9);expect(data.base.acquisitions).toHaveLength(2);expect(JSON.stringify(data)).not.toContain('cachedGalaxies');
  const restored=await read(saved);expect(restored.observing).not.toHaveProperty('cachedGalaxies');expect(restored.observing!.pegasusGalaxies!['NGC 7501'].state!.exposure).toEqual(s.acquisitions![1].state.exposure);expect(await serializeAnalysisSession(restored)).toBe(saved);
  const contextOnly=JSON.parse(await serializeAnalysisSession({observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing({selectedId:'54876-acquisition',galaxyTargetId:'NGC 7499'})}));
  expect(contextOnly.version).toBe(25);expect(contextOnly.base.version).toBe(9);for(const id of PEGASUS_GALAXY_IDS)expect(contextOnly.pegasusGalaxies[id].source.kind).toBe('empty');
  await expect(read(JSON.stringify(contextOnly.base))).rejects.toThrow();expect((await read(JSON.stringify(contextOnly))).observing!.context.galaxyTargetId).toBe('NGC 7499');
  // No observing workspace: the wrapper carries no banks.
  const plain=JSON.parse(await serializeAnalysisSession({...s,observing:undefined}));expect(plain.version).toBe(25);expect(plain.pegasusGalaxies).toBeNull();expect(plain.base.version).toBe(3);
  expect((await read(JSON.stringify(plain))).acquisitions).toHaveLength(2);
 });
 it('rejects Pegasus journals, banks or context outside v25, nested wrappers and forged identity/policy/domain atomically',async()=>{
  const data=JSON.parse(await serializeAnalysisSession(await eight()));
  await expect(read(JSON.stringify(data.base))).rejects.toThrow();await expect(read(JSON.stringify(data.base.base))).rejects.toThrow();
  const nested=structuredClone(data);nested.base=structuredClone(data);await expect(read(JSON.stringify(nested))).rejects.toThrow();
  const inverted=structuredClone(data.base);inverted.base={...structuredClone(data),base:structuredClone(data.base.base)};await expect(read(JSON.stringify(inverted))).rejects.toThrow();
  const journal=(v:any)=>v.pegasusGalaxies['NGC 7499'].source.journal;
  const changes:((v:any)=>void)[]=[v=>v.pegasusFieldPolicy='OpenVireo-cached-galaxy-workspace-v2',v=>v.pegasusBaseFieldSHA256='a'.repeat(64),v=>v.pegasusBaseFieldSHA256=corbor.baseFieldSnapshotSHA256,v=>v.binarySHA256='b'.repeat(64),v=>v.pegasusGalaxies=null,
   v=>v.pegasusGalaxies['54875']=v.pegasusGalaxies['NGC 7503'],v=>delete v.pegasusGalaxies['NGC 7499'],v=>v.base.cachedGalaxies['NGC 7501']=v.pegasusGalaxies['NGC 7501'],
   v=>journal(v).policy=pegasus.targets[1].policyId,v=>journal(v).domain.view.pointing.ra+=1e-9,v=>journal(v).domain.pointing={...journal(v).domain.view.pointing},v=>journal(v).fieldSnapshotSHA256='c'.repeat(64),v=>delete journal(v).domain.view,
   v=>v.pegasusGalaxies['NGC 7501'].source.acquisitionId=v.base.base.acquisitions[5].id,v=>v.base.base.acquisitions[6].journal.policy=v.base.base.acquisitions[5].journal.policy,v=>v.base.base.acquisitions[6].journal.domain.telescopeRecord=1,
   v=>v.base.base.measurements[6].origin.targetId='NGC 7503',v=>v.base.base.observing.galaxies['54876']=v.pegasusGalaxies['NGC 7499'],v=>v.version=24,v=>v.extra=1];
  for(const change of changes){const x=structuredClone(data);change(x);await expect(read(JSON.stringify(x))).rejects.toThrow();}
  // A legacy 0.4 m galaxy-bank slot cannot carry a Pegasus journal, even inside a valid v25.
  const forged=structuredClone(data);forged.base.base.observing.galaxies['36773']={seedText:'1',source:{kind:'journal',journal:JSON.parse(serializeGalaxySession(second()))}};await expect(read(JSON.stringify(forged))).rejects.toThrow();
 });
 it('sessions without Pegasus targets keep their existing version and content',async()=>{
  const s=await session(['36773','54875'],()=>({cachedGalaxies:empty(CACHED_GALAXY_IDS) as NonNullable<Banks['cachedGalaxies']>}));
  const data=JSON.parse(await serializeAnalysisSession({...s,observing:observing({selectedId:'54875-acquisition',pointing:{ra:15.3735,dec:27.738888888888887},galaxyTargetId:'54875'},{cachedGalaxies:s.observing!.cachedGalaxies})}));
  expect(data.version).toBe(24);expect(JSON.stringify(data)).not.toContain('pegasus');expect((await read(JSON.stringify(data))).observing).not.toHaveProperty('pegasusGalaxies');
 });
 it('counts base, CorBor and Pegasus journals against one 24000-event budget before replay, accepting the exact boundary',async()=>{
  const blank:AnalysisSession={observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing({selectedId:'54876-acquisition',pointing:{ra:15.3735,dec:27.72222222222222},galaxyTargetId:'54876'},{cachedGalaxies:empty(CACHED_GALAXY_IDS) as NonNullable<Banks['cachedGalaxies']>,pegasusGalaxies:empty(PEGASUS_GALAXY_IDS) as NonNullable<Banks['pegasusGalaxies']>})};
  const data=JSON.parse(await serializeAnalysisSession(blank));expect([data.version,data.base.version,data.base.base.version]).toEqual([25,24,9]);
  const slot=(id:string,count:number)=>{const journal=JSON.parse(serializeGalaxySession(createGalaxyExposure(1,id)));journal.events=Array.from({length:count},(_,i)=>({kind:i%2?'pause':'start'}));return {seedText:'1',source:{kind:'journal',journal}};};
  data.base.base.observing.galaxies['54876']=slot('54876',8000);data.base.cachedGalaxies['54875']=slot('54875',8000);data.pegasusGalaxies['NGC 7501']=slot('NGC 7501',8000);
  const exact=await read(JSON.stringify(data));expect(exact.observing!.galaxies['54876'].state!.events).toHaveLength(8000);expect(exact.observing!.cachedGalaxies!['54875'].state!.events).toHaveLength(8000);expect(exact.observing!.pegasusGalaxies!['NGC 7501'].state!.events).toHaveLength(8000);
  for(const over of [(v:any)=>v.pegasusGalaxies['NGC 7501']=slot('NGC 7501',8002),(v:any)=>v.base.cachedGalaxies['54875']=slot('54875',8002),(v:any)=>v.base.base.observing.galaxies['54876']=slot('54876',8002),(v:any)=>v.pegasusGalaxies['NGC 7499']=slot('NGC 7499',2)]){
   const x=structuredClone(data);over(x);await expect(read(JSON.stringify(x))).rejects.toMatchObject({code:'size'});
  }
  // The writer enforces the same combined bound; individually valid journal lengths are insufficient.
  const extra=replayGalaxy(1,Array.from({length:8002},(_,i)=>({kind:i%2?'pause' as const:'start' as const})),'NGC 7501');
  await expect(serializeAnalysisSession({...exact,observing:{...exact.observing!,pegasusGalaxies:{...exact.observing!.pegasusGalaxies!,'NGC 7501':{state:extra,seedText:'1'}}}})).rejects.toMatchObject({code:'size'});
 });
});
