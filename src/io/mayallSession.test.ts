import {describe,it,expect} from 'vitest';
import {createStarExposure,activateStar,startStar,tickStar,deactivateStar} from '../core/starExposure';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,deactivateGalaxy} from '../core/galaxyExposure';
import {createStarObservation} from './starObservation';
import {createGalaxyObservation} from './galaxyObservation';
import {serializeAnalysisSession,readAnalysisSession,type AnalysisSession} from './analysisSession';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {defaultPhotometryDraft,defaultVelocityDraft} from '../core/editingWorkspace';
import {emptyExposureWorkspace,LIVE_GALAXY_IDS,OBSERVING_GALAXY_POLICY,type ObservingWorkspace} from '../core/observingWorkspace';
import {MAX_ACQUISITION_ARCHIVE,LEGACY_MAX_ACQUISITION_ARCHIVE} from '../core/acquisitionArchive';
import type {AcquisitionObservation} from './acquisitionObservation';
const empty=emptyExposureWorkspace(),banks=()=>Object.fromEntries(LIVE_GALAXY_IDS.map(id=>[id,empty]))as ObservingWorkspace['galaxies'];
const observing:ObservingWorkspace={context:{domeOpen:false,mode:'telescope',selectedId:'36773-acquisition',pointing:{ra:11.789361111111111,dec:55.68888888888889},raText:'11.789',decText:'55.688',hasPointed:true,galaxyTargetId:'36773'},sky:empty,star:empty,star09:empty,galaxies:banks(),galaxies09:banks()};
const base:AnalysisSession={observation:null,control:INITIAL_CONTROL,stepInput:'',reference:'galaxy',wide:false,object:'',rows:[],hubble:EMPTY_HUBBLE,observing,editing:{preparationSeedText:'1',photometry:defaultPhotometryDraft(),velocity:defaultVelocityDraft([])},optical:{selectedIndex:2,draftIndex:0}};
const read=(s:string)=>readAnalysisSession(new File([s],'mayall.json'));
let cached:Promise<{session:AnalysisSession;packets:AcquisitionObservation[]}>|undefined;
function allProfiles(){return cached??=build();}
async function build(){
 const packets:AcquisitionObservation[]=[],w={...observing,star4m:empty,galaxies:{...banks()},galaxies09:{...banks()},galaxies4m:{...banks()}};
 for(const index of [0,1,2]as const){
  for(const id of LIVE_GALAXY_IDS){const state=deactivateGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1,id,index))),100)),a=await createGalaxyObservation(state);packets.push(a);w[index===2?'galaxies4m':index===1?'galaxies09':'galaxies'][id]={state:a.state,seedText:'pending '+id};}
  const star=await createStarObservation(deactivateStar(tickStar(startStar(activateStar(createStarExposure(1,index))),100)));packets.push(star);w[index===2?'star4m':index===1?'star09':'star']={state:star.state,seedText:'pending star'};
 }
 const rows=packets.map((a,i)=>createMeasurement(i+1,'My operator alignment '+i,a.name,a.sha256,{...INITIAL_CONTROL,step:.001,position:12},a.kind==='catalog-star-acquisition'?'BALMER.LST':'GLXYLNS.LST',{kind:a.kind,acquisitionId:a.acquisitionId,...(a.kind==='catalog-galaxy-acquisition'?{targetId:a.targetId}:{})}));return {packets,session:{...base,rows,observation:packets[11],acquisitions:packets,observing:w,editing:{...base.editing!,velocity:defaultVelocityDraft(rows)}}};
}
describe('Mayall full14 state and preservation of both earlier telescope profiles',()=>{
 it('roundtrips all12 acquired target/profile kinds with unchanged manual Single rows and exact archive reuse',async()=>{const{session,packets}=await allProfiles(),text=await serializeAnalysisSession(session),v=JSON.parse(text),r=await read(text);expect(MAX_ACQUISITION_ARCHIVE).toBe(12);expect(LEGACY_MAX_ACQUISITION_ARCHIVE).toBe(8);expect(v.version).toBe(14);expect(v.acquisitions).toHaveLength(12);expect(r.rows).toEqual(session.rows);expect(r.optical).toEqual(session.optical);expect(r.acquisitions?.map(a=>a.acquisitionId)).toEqual(packets.map(a=>a.acquisitionId));expect(v.observing.star4m.source).toEqual({kind:'archive',acquisitionId:packets[11].acquisitionId});expect(await serializeAnalysisSession(r)).toBe(text);});
 it('rejects cross-profile and wrong-kind links, missing Mayall banks, proof corruption and a13th archive atomically',async()=>{const{session}=await allProfiles(),v=JSON.parse(await serializeAnalysisSession(session));for(const change of [(v:any)=>v.observing.star4m.source=v.observing.star09.source,(v:any)=>v.observing.galaxies4m['36773'].source=v.observing.galaxies09['36773'].source,(v:any)=>delete v.observing.star4m,(v:any)=>delete v.observing.galaxies4m['36747'],(v:any)=>v.acquisitions[11].journal.configurationSHA256='bad',(v:any)=>v.acquisitions.push(v.acquisitions[0]),(v:any)=>v.version=13]){const bad=structuredClone(v);change(bad);await expect(read(JSON.stringify(bad))).rejects.toThrow();}});
 it('retains old full13 bytes and absent scope, while explicit empty14 replaces both new Mayall banks',async()=>{const text=await serializeAnalysisSession(base),r=await read(text);expect(JSON.parse(text).version).toBe(13);expect(r.observing?.star4m).toBeUndefined();expect(await serializeAnalysisSession(r)).toBe(text);const explicit=await read(await serializeAnalysisSession({...base,observing:{...observing,star4m:empty,galaxies4m:banks()}}));expect(explicit.observing?.star4m).toEqual(empty);expect(explicit.observing?.galaxies4m).toEqual(banks());await expect(serializeAnalysisSession({...base,observing:{...observing,star4m:empty}})).rejects.toThrow();});
 it('keeps legacy files capped at8 archives and does not admit a new Mayall raw observation without full14 scope',async()=>{const{session,packets}=await allProfiles(),v=JSON.parse(await serializeAnalysisSession(session));v.version=13;v.observing.policy=OBSERVING_GALAXY_POLICY;delete v.observing.star4m;delete v.observing.galaxies4m;await expect(read(JSON.stringify(v))).rejects.toThrow();await expect(serializeAnalysisSession({...base,observation:packets[11],acquisitions:[packets[11]]})).rejects.toThrow();});
});
