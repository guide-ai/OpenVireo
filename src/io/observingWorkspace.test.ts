import {describe,it,expect} from 'vitest';
import {createSkyExposure,activateSky,startSky,tickSky,pauseSky,deactivateSky} from '../core/skyExposure';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar,deactivateStar} from '../core/starExposure';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy,deactivateGalaxy} from '../core/galaxyExposure';
import {LIVE_GALAXY_IDS,emptyExposureWorkspace,readObservatoryWorkspace,type ObservingWorkspace} from '../core/observingWorkspace';
import {INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {createStarObservation} from './starObservation';
import {createGalaxyObservation} from './galaxyObservation';
import {portableObservingWorkspace,restoreObservingWorkspace} from './observingWorkspace';
const context={domeOpen:true,mode:'telescope' as const,selectedId:'N0000.DAT@14428',pointing:{ra:.4987684,dec:.03628},raText:'30',decText:'',hasPointed:true,galaxyTargetId:'54876'};
function work():ObservingWorkspace{return {context,sky:{state:deactivateSky(pauseSky(tickSky(startSky(activateSky(createSkyExposure(1))),100))),seedText:'pending seed'},star:{state:deactivateStar(pauseStar(tickStar(startStar(activateStar(createStarExposure(42))),100))),seedText:'9'},galaxies:Object.fromEntries(LIVE_GALAXY_IDS.map((id,i)=>[id,{state:deactivateGalaxy(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(i+1,id))),100))),seedText:String(i+1)}]))as ObservingWorkspace['galaxies']};}
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE};
const read=(text:string)=>readAnalysisSession(new File([text],'all.json'));
describe('P02 stopped current exposure segments and VIREO preview context in full9',()=>{
 it('restores all five independent journals and raw seed drafts with unchanged counts/time/PRNG, stopped and deactivated',async()=>{
  const w=work(),text=await serializeAnalysisSession({...base,observing:w}),file=JSON.parse(text);expect(file.version).toBe(9);expect(file.photometry).toBeNull();expect(file.classification).toBeNull();const r=await read(text);expect(r.observing).toEqual(w);for(const state of [r.observing!.sky.state,r.observing!.star.state,...Object.values(r.observing!.galaxies).map(s=>s.state)]){expect(state?.armed).toBe(false);expect(state?.exposure.phase).toBe('paused');}expect(await serializeAnalysisSession(r)).toBe(text);
 });
 it('continues each restored current segment identically after explicit activation/start',async()=>{
  const w=work(),r=(await read(await serializeAnalysisSession({...base,observing:w}))).observing!;
  expect(tickSky(startSky(activateSky(r.sky.state!)),100).exposure).toEqual(tickSky(startSky(activateSky(w.sky.state!)),100).exposure);expect(tickStar(startStar(activateStar(r.star.state!)),100).exposure).toEqual(tickStar(startStar(activateStar(w.star.state!)),100).exposure);for(const id of LIVE_GALAXY_IDS)expect(tickGalaxy(startGalaxy(activateGalaxy(r.galaxies[id].state!)),100).exposure).toEqual(tickGalaxy(startGalaxy(activateGalaxy(w.galaxies[id].state!)),100).exposure);
 });
 it('keeps committed frame remainder and pending seed independent; never saves an armed/running segment',async()=>{
  const w=work();const armed=activateSky(w.sky.state!);await expect(serializeAnalysisSession({...base,observing:{...w,sky:{state:armed,seedText:'42'}}})).rejects.toThrow();const running=startSky(armed);await expect(serializeAnalysisSession({...base,observing:{...w,sky:{state:running,seedText:'42'}}})).rejects.toThrow();expect((await read(await serializeAnalysisSession({...base,observing:w}))).observing?.sky.seedText).toBe('pending seed');
 });
 it('uses exact existing archive references for matching star/galaxy journals, rejecting wrong-kind, target and missing links',async()=>{
  const w=work(),star=await createStarObservation(w.star.state!),galaxy=await createGalaxyObservation(w.galaxies['36747'].state!),archive=[star,galaxy],v=portableObservingWorkspace(w,archive)as any;expect(v.star.source).toEqual({kind:'archive',acquisitionId:star.acquisitionId});expect(v.galaxies['36747'].source).toEqual({kind:'archive',acquisitionId:galaxy.acquisitionId});expect(restoreObservingWorkspace(v,archive).star.state?.exposure).toEqual(star.state.exposure);
  for(const alter of [(x:any)=>x.sky.source=x.star.source,(x:any)=>x.star.source=x.galaxies['36747'].source,(x:any)=>x.galaxies['54876'].source=x.galaxies['36747'].source,(x:any)=>x.star.source.acquisitionId='a'.repeat(64)]){const bad=structuredClone(v);alter(bad);expect(()=>restoreObservingWorkspace(bad,archive)).toThrow();}
  const text=await serializeAnalysisSession({...base,observing:w,observation:star,acquisitions:archive});expect((await read(text)).observing?.star.state?.exposure).toEqual(w.star.state?.exposure);
 });
 it('rejects unsupported editions/options, unsafe context, missing slots and injected cached counts atomically',async()=>{
  const data=JSON.parse(await serializeAnalysisSession({...base,observing:work()}));for(const change of [(v:any)=>v.observing.edition.version='1.505',(v:any)=>v.observing.edition.binarySHA256='a'.repeat(64),(v:any)=>v.observing.context.site='new site',(v:any)=>v.observing.context.selectedId='unknown',(v:any)=>v.observing.context.pointing.ra=24,(v:any)=>v.observing.context.galaxyTargetId='unknown',(v:any)=>delete v.observing.galaxies['54876'],(v:any)=>v.observing.star.source.journal.counts=[999],(v:any)=>v.observing.galaxies['54876']=v.observing.galaxies['36747'],(v:any)=>v.observing.sky.seedText='x'.repeat(81)]){const bad=structuredClone(data);change(bad);await expect(read(JSON.stringify(bad))).rejects.toThrow();}
 });
 it('bounds replay work and every existing nested proof; preserves empty segments without creating observations',async()=>{
  const data=JSON.parse(await serializeAnalysisSession({...base,observing:work()}));for(const change of [(v:any)=>v.observing.star.source.journal.fieldSnapshotSHA256='bad',(v:any)=>v.observing.sky.source.journal.events=Array(24001).fill({kind:'pause'})]){const bad=structuredClone(data);change(bad);await expect(read(JSON.stringify(bad))).rejects.toThrow();}const empty=emptyExposureWorkspace(),w={context,sky:empty,star:empty,galaxies:{'36747':empty,'36773':empty,'54876':empty}},r=await read(await serializeAnalysisSession({...base,observing:w}));expect(r.observing?.star.state).toBeNull();expect(r.acquisitions).toEqual([]);expect(r.rows).toEqual([]);
 });
 it('retains the signed-zero pointing and unapplied coordinate drafts; legacy1–8 cannot hide v9 state',async()=>{
  const ctx=readObservatoryWorkspace({...context,pointing:{ra:0,dec:'-0'},raText:'1e999'});expect(Object.is(ctx.pointing.dec,-0)).toBe(true);expect(ctx.raText).toBe('1e999');const data=JSON.parse(await serializeAnalysisSession({...base,observing:work()}));for(const version of [1,2,3,4,5,6,7,8])await expect(read(JSON.stringify({...data,version}))).rejects.toThrow();const old=await read(await serializeAnalysisSession(base));expect(old.observing).toBeUndefined();
 });
});
