import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {FEATURE_POLICY,EMPTY_FEATURES,emptyFeatureDraft,updateFeatureDraft,recordFeature,type FeatureWorkspace} from '../core/featureWidth';
import {EMPTY_CLASSIFICATION_WORKSPACE,INITIAL_CLASSIFICATION,readClassificationState,openAcquiredClassification} from '../core/classification';
import {parseClassificationSession,serializeClassificationSession} from './classificationSession';
import {readAnalysisSession,serializeAnalysisSession} from './analysisSession';
import {createStarObservation} from './starObservation';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar} from '../core/starExposure';
import {INITIAL_CONTROL,createMeasurement} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
const region={center:4150,left:4100,right:4200,leftContinuum:1,rightContinuum:1};
const features:FeatureWorkspace={policy:FEATURE_POLICY,drafts:[{...emptyFeatureDraft('u1'),center:'4150',left:'4100',right:'4200',leftContinuum:'1',rightContinuum:'1'},emptyFeatureDraft('u2')],records:[{...region,id:1,unknownId:'u1'}]};
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(new URL('../../public'+url,import.meta.url)))));});afterEach(()=>vi.unstubAllGlobals());
it('preserves partial per-source drafts and strict practice v3 without trusting derived results',()=>{
 const state={...INITIAL_CLASSIFICATION,atlasId:'g2',proposed:'Manual hypothesis',reason:'Manual features',features},text=serializeClassificationSession(state),p=JSON.parse(text);expect(p.version).toBe(3);expect(parseClassificationSession(p)).toEqual(state);expect(p.state.features.records[0]).not.toHaveProperty('width');
 for(const version of [1,2])expect(()=>parseClassificationSession({...p,version})).toThrow();const bad=structuredClone(p);bad.state.features.records[0].width=42;expect(()=>parseClassificationSession(bad)).toThrow();bad.state.features=undefined;expect(()=>parseClassificationSession(bad)).toThrow();
 expect(()=>readClassificationState({...state,features:{...features,policy:'invented'}})).toThrow();expect(()=>readClassificationState({...state,features:{...features,records:[{...region,unknownId:'u99',id:1}]}})).toThrow();
});
it('keeps width inputs alongside raw star replay, manual measurements and luminosity responses in full v6',async()=>{
 const p=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))),control={...INITIAL_CONTROL,step:.001,position:2},row=createMeasurement(1,'Manual object',p.name,p.sha256,control,'BALMER.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
 const w=openAcquiredClassification(EMPTY_CLASSIFICATION_WORKSPACE,p),classification={...w,practice:{...INITIAL_CLASSIFICATION,features},active:'practice'},session={observation:p,acquisitions:[p],rows:[row],control,stepInput:'.001',reference:'balmer' as const,wide:false,object:'Manual object',hubble:EMPTY_HUBBLE,classification};const text=await serializeAnalysisSession(session);expect(JSON.parse(text).version).toBe(6);const r=await readAnalysisSession(new File([text],'v6.json'));expect(r.classification).toEqual(classification);expect(r.rows[0].zFloat32Hex).toBe(row.zFloat32Hex);expect(r.acquisitions![0].state.exposure).toEqual(p.state.exposure);
 const bad=JSON.parse(text);bad.version=5;await expect(readAnalysisSession(new File([JSON.stringify(bad)],'fake-v5.json'))).rejects.toThrow();bad.version=6;bad.classification.workspace.acquired[0].state.features=features;await expect(readAnalysisSession(new File([JSON.stringify(bad)],'fake-acquired.json'))).rejects.toThrow();
});
it('uses bounded pure draft/record transitions without mutating previous state or wrapping record ids',()=>{
 const d=emptyFeatureDraft('u1'),w=updateFeatureDraft(EMPTY_FEATURES,d,['u1']);expect(EMPTY_FEATURES.drafts).toHaveLength(0);const recorded=recordFeature(w,'u1',region,['u1']);expect(w.records).toHaveLength(0);expect(recorded.records).toHaveLength(1);
 expect(()=>recordFeature({...w,records:Array.from({length:20},(_,i)=>({...region,id:i+1,unknownId:'u1'}))},'u1',region,['u1'])).toThrow();expect(()=>recordFeature({...w,records:[{...region,id:Number.MAX_SAFE_INTEGER-1,unknownId:'u1'}]},'u1',region,['u1'])).toThrow();
});
