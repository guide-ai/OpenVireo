import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createPhotometer,photometerEvent as step,releasePhotometer} from '../core/photometer';
import {serializePhotometerSession} from './photometerSession';
import {readAnalysisSession,serializeAnalysisSession,type AnalysisSession} from './analysisSession';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
const empty:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const read=(text:string)=>readAnalysisSession(new File([text],'investigation.json'));
function photo(){let s=step(createPhotometer(42),{type:'activate'});for(const e of [{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'},{type:'record',readingId:2,value:9.647,note:'My <b>{value}</b> σ'},{type:'filter',filter:'B'},{type:'point',kind:'sky'},{type:'start'},{type:'complete'},{type:'point',kind:'object'},{type:'start'},{type:'complete'},{type:'record',readingId:4,value:10.207,note:''},{type:'color',bReadingId:4,vReadingId:2},{type:'target',targetId:'N2230.DAT@144496'}]as const)s=step(s,e);return releasePhotometer(s);}
describe('P02 integrated photometry journal, strict v8 and old analysis compatibility',()=>{
 it('stores original bounded journal and replays current target, manual entries and per-object color without trusting cached results',async()=>{
  const p=photo(),text=await serializeAnalysisSession({...empty,photometry:p}),r=JSON.parse(text),restored=await read(text);expect(r.version).toBe(8);expect(r.classification).toBeNull();expect(r.acquisitions).toEqual([]);expect(r.photometry).toEqual(JSON.parse(serializePhotometerSession(p)));expect(restored.photometry).toEqual(p);expect(restored.photometry?.skies).toEqual({U:null,B:null,V:null});expect(restored.photometry?.colors['N2230.DAT@145877'].acquired).toBeCloseTo(.559889252,9);expect(await serializeAnalysisSession(restored)).toBe(text);
 });
 it('cannot serialize an active or pending photometer, nor silently downgrade a legacy analysis marker',async()=>{
  let p=step(createPhotometer(42),{type:'activate'});await expect(serializeAnalysisSession({...empty,photometry:p})).rejects.toThrow();p=step(p,{type:'start'});await expect(serializeAnalysisSession({...empty,photometry:p})).rejects.toThrow();const r=JSON.parse(await serializeAnalysisSession({...empty,photometry:photo()}));for(const version of [1,2,3,4,5,6,7])await expect(read(JSON.stringify({...r,version}))).rejects.toThrow();
 });
 it('rejects an entire investigation for a bad nested proof, target/pair, cached data or unsupported field',async()=>{
  const good=JSON.parse(await serializeAnalysisSession({...empty,photometry:photo()}));for(const mutate of [(v:any)=>delete v.photometry,(v:any)=>v.photometry=null,(v:any)=>v.photometry.targetFieldsSHA256='a'.repeat(64),(v:any)=>v.photometry.counts=[999],(v:any)=>v.photometry.events.push({type:'activate'},{type:'target',targetId:'N2230.DAT@999'},{type:'deactivate'}),(v:any)=>v.photometry.events.push({type:'color',bReadingId:2,vReadingId:4}),(v:any)=>v.photometry.events=Array(257).fill({type:'activate'}),(v:any)=>v.classification={cachedAnswer:'G0'}]){const v=structuredClone(good);mutate(v);await expect(read(JSON.stringify(v))).rejects.toThrow();}expect((await read(JSON.stringify(good))).photometry?.entries).toHaveLength(2);
 });
 it('retains the established analysis schema/bytes when photometry is absent; existing standalone v1/v2 journals stay exact',async()=>{
  const text=await serializeAnalysisSession(empty);expect(JSON.parse(text).version).toBe(2);const restored=await read(text);expect(restored.photometry).toBeUndefined();expect(await serializeAnalysisSession(restored)).toBe(text);for(const n of [1,2]){const {parsePhotometerSession}=await import('./photometerSession');const standalone=readFileSync(new URL(`../../tests/fixtures/photometer-v${n}.json`,import.meta.url),'utf8');expect(serializePhotometerSession(parsePhotometerSession(JSON.parse(standalone)))).toBe(standalone);}
 });
});

describe('v8 keeps each earlier classification profile and raw acquired identity',()=>{
 it('retains profiles4/5/6/7 instead of claiming all classification work contains imports',async()=>{
  const {vi}=await import('vitest'),{webcrypto}=await import('node:crypto');vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',async(url:string)=>new Response(readFileSync(new URL('../../public'+url,import.meta.url))));
  try{
   const {EMPTY_CLASSIFICATION_WORKSPACE:blank,INITIAL_CLASSIFICATION:initial,openImportedClassification}=await import('../core/classification'),{EMPTY_FEATURES}=await import('../core/featureWidth'),{readClassificationImport}=await import('./classificationImports');const imported=await readClassificationImport(new File(['3900 .2\n4150 .5\n4500 1\n'],'own.sp'));
   const profiles=[blank,{...blank,practice:{...initial,atlasId:'g2',proposed:'My hypothesis',reason:'Own evidence'}},{...blank,practice:{...initial,features:EMPTY_FEATURES}},openImportedClassification(blank,imported)];
   for(const[classIndex,classification]of profiles.entries()){
    const previous=JSON.parse(await serializeAnalysisSession({...empty,classification}));expect(previous.version).toBe(classIndex+4);const text=await serializeAnalysisSession({...empty,classification,photometry:photo()}),data=JSON.parse(text);expect(data.version).toBe(8);expect(data.classification.profileVersion).toBe(previous.version);const restored=await read(text);expect(restored.classification).toEqual((await read(JSON.stringify(previous))).classification);expect(serializePhotometerSession(restored.photometry!)).toBe(serializePhotometerSession(photo()));expect(await serializeAnalysisSession(restored)).toBe(text);
    for(const profileVersion of [0,3,8,'7'])await expect(read(JSON.stringify({...data,classification:{...data.classification,profileVersion}}))).rejects.toThrow();
   }
  }finally{vi.unstubAllGlobals();}
 });
 it('restores a raw star archive and its linked manual measurement beside photometer replay',async()=>{
  const {createStarExposure,activateStar,startStar,tickStar,pauseStar}=await import('../core/starExposure'),{createStarObservation}=await import('./starObservation'),{createMeasurement}=await import('../core/spectrum');const star=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))),control={...INITIAL_CONTROL,step:.001,position:2},row=createMeasurement(1,'My manual star',star.name,star.sha256,control,'BALMER.LST',{kind:star.kind,acquisitionId:star.acquisitionId});
  const text=await serializeAnalysisSession({...empty,control,rows:[row],observation:star,acquisitions:[star],photometry:photo()}),restored=await read(text);expect(restored.acquisitions![0].state.exposure).toEqual(star.state.exposure);expect(restored.observation?.sha256).toBe(star.sha256);expect(restored.rows[0].zFloat32Hex).toBe(row.zFloat32Hex);expect(restored.photometry?.readings[1].callback.totalPhotonCount).toBe(552);expect(await serializeAnalysisSession(restored)).toBe(text);
 });
 it('bounds nested journal bytes inside an otherwise valid larger investigation',async()=>{
  const data=JSON.parse(await serializeAnalysisSession({...empty,photometry:photo()}));data.photometry.events[6].note='x'.repeat(128*1024);await expect(read(JSON.stringify(data))).rejects.toThrow();
 });
});
