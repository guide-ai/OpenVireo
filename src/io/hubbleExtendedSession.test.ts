import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {buildObservableList,movingPairs} from '../core/asteroidField';
import {setObjectXResources,type ObjectXInvestigation} from './objectXInvestigation';
import umi from '../../data/hubble/umi-cached-provenance.json';
import {createGalaxyObservation} from './galaxyObservation';
import {serializeGalaxySession} from './galaxySession';
import {activateGalaxy,createGalaxyExposure,deactivateGalaxy,pauseGalaxy,startGalaxy,tickGalaxy} from '../core/galaxyExposure';
import {serializeAnalysisSession,readAnalysisSession,HUBBLE_EXTENDED_SESSION_POLICY,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {emptyExposureWorkspace,type ObservingWorkspace} from '../core/observingWorkspace';
import {HUBBLE_EXTENDED_BANKS,extendedBankKey} from '../core/hubbleEngineTargets';
import {EXTENDED_MAX_ACQUISITION_ARCHIVE,MAX_ACQUISITION_ARCHIVE} from '../core/acquisitionArchive';
import en from '../i18n/en.json';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const read=(s:string)=>readAnalysisSession(new File([s],'extended.json'));
const acquire=(id:string,seed=1)=>createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(seed,id))),1000)));
const UMI3=extendedBankKey('36805',0);
const banks=(over:Record<string,ObservingWorkspace['sky']>={})=>({...Object.fromEntries(HUBBLE_EXTENDED_BANKS.map(k=>[k,emptyExposureWorkspace()])),...over});
function observing(context:Partial<ObservingWorkspace['context']>={},extendedGalaxies?:ObservingWorkspace['extendedGalaxies']):ObservingWorkspace{
 return {context:{domeOpen:false,mode:'finder',selectedId:'36805-acquisition',pointing:{ra:11.796,dec:55.77194444444444},raText:'',decText:'',hasPointed:true,galaxyTargetId:'36805',...context},sky:emptyExposureWorkspace(),star:emptyExposureWorkspace(),galaxies:{'36747':emptyExposureWorkspace(),'36773':emptyExposureWorkspace(),'54876':emptyExposureWorkspace()},...(extendedGalaxies?{extendedGalaxies}:{})};
}
async function session(targets:readonly (readonly [string,number])[],withObserving=true,context:Partial<ObservingWorkspace['context']>={}):Promise<AnalysisSession>{
 const acquisitions=[];for(const [id,seed] of targets)acquisitions.push(await acquire(id,seed));
 const control={...INITIAL_CONTROL,step:.001},rows=acquisitions.map((p,i)=>createMeasurement(i+1,`Operator label ${i+1}`,p.name,p.sha256,{...control,position:i+1},'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId,targetId:p.targetId}));
 const umiAt=targets.findIndex(([id])=>id==='36805');
 return {observation:acquisitions.at(-1)!,acquisitions,rows,control,stepInput:'.001',reference:'galaxy',wide:false,object:'Edited',hubble:EMPTY_HUBBLE,...(withObserving?{observing:observing(context,umiAt>=0?banks({[UMI3]:{state:acquisitions[umiAt].state,seedText:'1'}}):undefined)}:{})};
}
describe('v29 sessions for the extended Hubble.HTL targets (Front F)',()=>{
 it('saves and freshly restores UM-I – 3 with its 0.4 m bank, outermost over an unchanged base',async()=>{
  const s=await session([['36773',1],['36805',1]]),saved=await serializeAnalysisSession(s),data=JSON.parse(saved);
  expect(data.version).toBe(29);expect(Object.keys(data).sort()).toEqual(['base','binarySHA256','extendedGalaxies','extendedPolicy','format','numericalPolicy','version']);
  expect([data.extendedPolicy,data.binarySHA256]).toEqual([HUBBLE_EXTENDED_SESSION_POLICY,umi.binarySHA256]);
  expect(data.base.version).toBe(9);expect(data.base.acquisitions).toHaveLength(2);expect(data.base.observing).not.toHaveProperty('extendedGalaxies');
  expect(Object.keys(data.extendedGalaxies)).toEqual([...HUBBLE_EXTENDED_BANKS]);expect(data.extendedGalaxies[UMI3].source.kind).toBe('archive');
  const restored=await read(saved);expect(restored.rows).toEqual(s.rows);expect(restored.acquisitions!.map(a=>a.state.exposure)).toEqual(s.acquisitions!.map(a=>a.state.exposure));
  expect(restored.observing!.extendedGalaxies![UMI3].state!.exposure).toEqual(s.acquisitions![1].state.exposure);expect(restored.observing!.context.galaxyTargetId).toBe('36805');
  expect(await serializeAnalysisSession(restored)).toBe(saved);
 });
 it('a context alone requires v29; a session without extended use keeps its version',async()=>{
  const context=JSON.parse(await serializeAnalysisSession({observation:null,rows:[],control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',hubble:EMPTY_HUBBLE,observing:observing()}));
  expect(context.version).toBe(29);for(const k of HUBBLE_EXTENDED_BANKS)expect(context.extendedGalaxies[k].source.kind).toBe('empty');
  await expect(read(JSON.stringify(context.base))).rejects.toThrow();expect((await read(JSON.stringify(context))).observing!.context.galaxyTargetId).toBe('36805');
  const plain=JSON.parse(await serializeAnalysisSession(await session([['36773',1]],true,{selectedId:'36773-acquisition',pointing:{ra:11.789361111111111,dec:55.68888888888889},galaxyTargetId:'36773'})));expect(plain.version).toBe(9);expect(JSON.stringify(plain)).not.toContain('extended');
  const noObserving=JSON.parse(await serializeAnalysisSession(await session([['36805',1]],false)));expect(noObserving.version).toBe(29);expect(noObserving.extendedGalaxies).toBeNull();expect(noObserving.base.version).toBe(3);
 });
 it('more than 12 (up to 16) acquisitions only inside v29; 17 is refused',async()=>{
  const thirteen=await session(Array.from({length:13},(_,i)=>['36773',i+1] as const),false),data=JSON.parse(await serializeAnalysisSession(thirteen));
  expect(MAX_ACQUISITION_ARCHIVE).toBe(12);expect(EXTENDED_MAX_ACQUISITION_ARCHIVE).toBe(16);
  // Review 2 finding 6: the student texts state the real limit (16, with the v29 format above 12).
  for(const k of ['continuity.archiveFull','lab.recover.limits'] as const){expect(en[k]).toContain('16 snapshots');expect(en[k]).toContain('more than 12');expect(en[k]).not.toMatch(/(supports|full \() ?12 ?snapshots/);}
  expect(data.version).toBe(29);expect(data.base.acquisitions).toHaveLength(13);expect((await read(JSON.stringify(data))).acquisitions).toHaveLength(13);
  await expect(read(JSON.stringify(data.base))).rejects.toThrow();
  const seventeen=await session(Array.from({length:17},(_,i)=>['36773',i+1] as const),false);await expect(serializeAnalysisSession(seventeen)).rejects.toThrow();
 },60000);
 it('wraps the LSS v27 and the Object X v28 unchanged (outermost)',async()=>{
  const s=await session([['36805',1]]),lss={field:null,telescope:0 as const,records:[],description:'notes',wedgeOptions:null};
  const inner=JSON.parse(await serializeAnalysisSession({...s,observing:undefined,lss}));expect(inner.version).toBe(29);expect(inner.base.version).toBe(27);
  const restored=await read(JSON.stringify(inner));expect(restored.lss?.description).toBe('notes');expect(restored.acquisitions).toHaveLength(1);
  const v27=structuredClone(inner.base);await expect(read(JSON.stringify(v27))).rejects.toThrow();// the extended acquisition fails closed outside v29
  // Object X v28 (its own minimal moving-pair investigation, as in objectXInvestigation.test.ts) under v29, over the v27.
  const orbit=(id:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/orbit/${id}`,import.meta.url))),sav=orbit('ObjX_MPC.CMO.sav');
  setObjectXResources({orbit:async id=>{if(id==='ObjX_MPC.CMO.sav')return sav;throw Error('not in test');}});
  try{
   const JD=2454983.5+4/24,EROS={ra:22.722017,dec:-8.03989},list=buildObservableList(sav,1,JD)!;
   const e=(jd:number)=>({jd,seconds:120,filter:2,gain:2,telescope:0 as const,ra:EROS.ra,dec:EROS.dec,seed:12345,catalogMode:'live' as const,catalogSha256:'a'.repeat(64),extractId:null,listJd:JD,orbitFile:'ObjX_MPC.CMO.sav' as const,limit:16,pairs:movingPairs(sav,list,EROS,jd,120).pairs.length,skipped:[] as readonly ('moving-pair-budget')[],fitsSha256:'b'.repeat(64)});
   const objectX={orbitFile:'ObjX_MPC.CMO.sav' as const,id:'42',target:'X-1ABCD',startUtc:'2009-06-01T04:00:00',clockSet:true,listJd:JD,limit:16,exposures:[e(JD)],images:[{sha256:'b'.repeat(64),label:'ObjX-42-01',jd:JD,exposure:0}],measure:null,log:[],answer:null,description:'',revealed:false} as unknown as ObjectXInvestigation;
   const all=JSON.parse(await serializeAnalysisSession({...s,observing:undefined,lss,objectX}));
   expect([all.version,all.base.version,all.base.base.version]).toEqual([29,28,27]);
   const back=await read(JSON.stringify(all));expect(back.objectX).toBeDefined();expect(back.lss?.description).toBe('notes');expect(back.acquisitions).toHaveLength(1);
   await expect(read(JSON.stringify(all.base))).rejects.toThrow();
  }finally{setObjectXResources(null);}
 },60000);
 it('wraps older wrappers; rejects nesting, forged identity and extended data outside v29 atomically',async()=>{
  const data=JSON.parse(await serializeAnalysisSession(await session([['36773',1],['36805',1]])));
  await expect(read(JSON.stringify(data.base))).rejects.toThrow();
  const nested=structuredClone(data);nested.base=structuredClone(data);await expect(read(JSON.stringify(nested))).rejects.toThrow();
  const second=deactivateGalaxy(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(7,'36805'))),500)));
  const changes:((v:any)=>void)[]=[v=>v.extendedPolicy='openvireo-hubble-extended-targets-v30',v=>v.binarySHA256='b'.repeat(64),v=>v.extendedGalaxies=null,v=>delete v.extendedGalaxies[UMI3],v=>v.extendedGalaxies['1:36805']=v.extendedGalaxies[UMI3],
   v=>v.base.acquisitions[1].journal.domain.view.pointing.ra+=1e-9,v=>v.base.acquisitions[1].journal.fieldSnapshotSHA256='c'.repeat(64),v=>v.base.measurements[1].origin.targetId='36773',
   v=>v.base.observing.galaxies['36773']={seedText:'1',source:{kind:'journal',journal:JSON.parse(serializeGalaxySession(second))}},v=>v.version=28,v=>v.extra=1];
  for(const change of changes){const x=structuredClone(data);change(x);await expect(read(JSON.stringify(x))).rejects.toThrow();}
 });
});
describe('v29 replay budget is counted before any replay (review 1, item 6)',()=>{
 it('an over-budget extended bank is rejected as size, before its journal is replayed',async()=>{
  const data=JSON.parse(await serializeAnalysisSession(await session([['36805',1]])));
  const journal=structuredClone(data.base.acquisitions[0].journal);journal.events=Array.from({length:24001},()=>({kind:'tick',deltaMs:1}));
  data.extendedGalaxies[UMI3]={seedText:'1',source:{kind:'journal',journal}};
  await expect(read(JSON.stringify(data))).rejects.toMatchObject({code:'size'});
  // The same journal under the budget fails only at replay (a different code), so the size check came first.
  journal.events=journal.events.slice(0,13000);await expect(read(JSON.stringify(data))).rejects.toMatchObject({code:'state'});
 },60000);
});
