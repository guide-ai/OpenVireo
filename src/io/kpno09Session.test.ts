import {describe,it,expect} from 'vitest';
import {createStarExposure,activateStar,startStar,tickStar,deactivateStar,starTelescopeIndex} from '../core/starExposure';
import {serializeStarSession,parseStarSession} from './starSession';
import {createStarObservation,restoreStarObservation} from './starObservation';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {INITIAL_CONTROL,createMeasurement} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {emptyExposureWorkspace,OBSERVING_POLICY,OBSERVING_OPTICAL_POLICY,type ObservingWorkspace} from '../core/observingWorkspace';
import {defaultVelocityDraft,defaultPhotometryDraft} from '../core/editingWorkspace';
const state=(index:0|1)=>deactivateStar(tickStar(startStar(activateStar(createStarExposure(1,index))),100));
const empty=emptyExposureWorkspace(),observing:ObservingWorkspace={context:{domeOpen:false,mode:'telescope',selectedId:'N0000.DAT@14428',pointing:{ra:.4987684,dec:.03628},raText:'.4987684',decText:'.03628',hasPointed:true,galaxyTargetId:'36773'},sky:empty,star:empty,galaxies:{'36747':empty,'36773':empty,'54876':empty}};
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'balmer',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE,observing,editing:{preparationSeedText:'1',photometry:defaultPhotometryDraft(),velocity:defaultVelocityDraft([])},optical:{selectedIndex:1,draftIndex:2}};
const read=(s:string)=>readAnalysisSession(new File([s],'kpno.json'));
describe('KPNO0.9m strict journals, raw identity and investigation12',()=>{
 it('uses a source/proof/domain-bound v2 only for record1; old v1 bytes remain stable and cannot carry a new profile',()=>{
  const original=serializeStarSession(state(0)),alternate=serializeStarSession(state(1)),a=JSON.parse(alternate);expect(JSON.parse(original).version).toBe(1);expect(a.version).toBe(2);expect(starTelescopeIndex(parseStarSession(a))).toBe(1);expect(serializeStarSession(parseStarSession(a))).toBe(alternate);expect(serializeStarSession(parseStarSession(JSON.parse(original)))).toBe(original);
  for(const change of [(v:any)=>v.configurationSHA256='bad',(v:any)=>v.opticalProfileSHA256='bad',(v:any)=>v.domain.telescopeRecord=0,(v:any)=>v.telescopeIndex=2,(v:any)=>v.version=1,(v:any)=>v.counts=[100],(v:any)=>v.events[1].deltaMs=301]){const bad=structuredClone(a);change(bad);expect(()=>parseStarSession(bad)).toThrow();}
 });
 it('derives a distinct raw archive/SSP curve by replay and retains the learner row instead of applying an automatic measurement',async()=>{
  const a=await createStarObservation(state(1)),b=await createStarObservation(state(0));expect(a.acquisitionId).not.toBe(b.acquisitionId);expect(a.sha256).not.toBe(b.sha256);expect(a.samples).toHaveLength(600);expect(a.templateSamples).toEqual(b.templateSamples);expect((await restoreStarObservation(a.acquisitionId,JSON.parse(a.starSessionText))).state.exposure).toEqual(a.state.exposure);expect(starTelescopeIndex(a.state)).toBe(1);await expect(restoreStarObservation(b.acquisitionId,JSON.parse(a.starSessionText))).rejects.toThrow();
 });
 it('roundtrips both independent current segments and manual archive links with exact archive reuse and no pending-choice apply',async()=>{
  const a=await createStarObservation(state(1)),b=await createStarObservation(state(0)),control={...INITIAL_CONTROL,step:.001,position:3},row=createMeasurement(1,'My manual KPNO alignment',a.name,a.sha256,control,'BALMER.LST',{kind:a.kind,acquisitionId:a.acquisitionId});const s:AnalysisSession={...base,rows:[row],acquisitions:[b,a],observation:a,observing:{...observing,star:{state:b.state,seedText:'old draft'},star09:{state:a.state,seedText:'pending seed'}}};const text=await serializeAnalysisSession(s),v=JSON.parse(text),r=await read(text);expect(v.version).toBe(12);expect(v.observing.policy).toBe(OBSERVING_OPTICAL_POLICY);expect(v.observing.star.source).toEqual({kind:'archive',acquisitionId:b.acquisitionId});expect(v.observing.star09.source).toEqual({kind:'archive',acquisitionId:a.acquisitionId});expect(r.rows).toEqual([row]);expect(r.optical).toEqual(base.optical);expect(r.observing?.star.state?.exposure.sourceTotal).toBe(217);expect(r.observing?.star09?.state?.exposure.sourceTotal).toBe(1338);expect(await serializeAnalysisSession(r)).toBe(text);
 });
 it('rejects cross-telescope slot substitution, mismatched archive references, absent required scope and legacy smuggling',async()=>{
  const a=await createStarObservation(state(1)),b=await createStarObservation(state(0));const v=JSON.parse(await serializeAnalysisSession({...base,acquisitions:[b,a],observing:{...observing,star:{state:b.state,seedText:'1'},star09:{state:a.state,seedText:'1'}}}));
  for(const change of [(v:any)=>v.observing.star09.source.acquisitionId=b.acquisitionId,(v:any)=>v.observing.star.source.acquisitionId=a.acquisitionId,(v:any)=>delete v.observing.star09,(v:any)=>v.version=11,(v:any)=>v.observing.policy=OBSERVING_POLICY,(v:any)=>delete v.optical]){const bad=structuredClone(v);change(bad);await expect(read(JSON.stringify(bad))).rejects.toThrow();}
  await expect(serializeAnalysisSession({...base,acquisitions:[a]})).rejects.toThrow();await expect(serializeAnalysisSession({...base,observing:{...observing,star09:{state:b.state,seedText:'1'}}})).rejects.toThrow();
 });
 it('keeps old full11 byte serialization without new scope and distinguishes explicit empty star09 in12',async()=>{
  const old=await serializeAnalysisSession(base),r=await read(old);expect(JSON.parse(old).version).toBe(11);expect(r.observing?.star09).toBeUndefined();expect(await serializeAnalysisSession(r)).toBe(old);const explicit=await read(await serializeAnalysisSession({...base,observing:{...observing,star09:empty}}));expect(explicit.observing?.star09).toEqual(empty);
 });
});
