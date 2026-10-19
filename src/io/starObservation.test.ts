import {createJournalExposure,activateJournal,startJournal,tickJournal,pauseJournal} from '../core/exposureJournal';
import {STAR_POLICY_ID} from '../core/starExposure';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {createStarObservation,restoreStarObservation} from './starObservation';
import {activateStar,createStarExposure,startStar,tickStar,pauseStar} from '../core/starExposure';
import {createMeasurement,measurementCsv,INITIAL_CONTROL} from '../core/spectrum';
import {readAnalysisSession,serializeAnalysisSession} from './analysisSession';
import {EMPTY_HUBBLE,analyzeHubble,readHubbleWorkspace,measurementHubbleRow} from '../core/hubbleAnalysis';
import {hubbleVelocityCsv} from '../core/hubbleVelocity';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const state=()=>pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000));
const control={base:0,position:1,factor:1 as const,step:.0001};
const read=(s:string)=>readAnalysisSession(new File([s],'analysis.json'));
describe('acquisition → analyser provenance and portable continuity',()=>{
 it('creates a stable normalized derivative without changing counts/time/random state',async()=>{
  const original=state(),packet=await createStarObservation(original),again=await createStarObservation(original);
  expect(packet.acquisitionId).toBe(again.acquisitionId);expect(packet.sha256).toBe(again.sha256);expect(packet.state.exposure).toEqual(original.exposure);expect(packet.state.armed).toBe(false);expect(packet.samples).toHaveLength(600);expect(Math.max(...packet.samples.map(p=>p.intensity))).toBe(1);expect(packet.samples[0].wavelength).toBe(3700);expect(packet.samples.at(-1)!.wavelength).toBe(4698.33);expect(packet.sourceText).not.toContain('*SpHdr*');
  const restored=await restoreStarObservation(packet.acquisitionId,JSON.parse(packet.starSessionText));expect(restored.state.exposure).toEqual(original.exposure);
  await expect(createStarObservation(createStarExposure(1))).rejects.toThrow();await expect(createStarObservation(startStar(activateStar(createStarExposure(1))))).rejects.toThrow();
 });
 it('rejects in-memory counters from a different amplitude even if they carry the known policy string',async()=>{
  const fake=pauseJournal(tickJournal(startJournal(activateJournal(createJournalExposure(STAR_POLICY_ID,Array(600).fill(.0002),.000001,50,1))),100));
  await expect(createStarObservation(fake)).rejects.toThrow('replay journal');
 });
 it('preserves raw acquisition, measurements and controls in v3 after changing current observation',async()=>{
  const packet=await createStarObservation(state()),origin={kind:'catalog-star-acquisition' as const,acquisitionId:packet.acquisitionId};
  const row=createMeasurement(1,'Renamed label',packet.name,packet.sha256,control,'BALMER.LST',origin);
  const session={observation:packet,acquisitions:[packet],rows:[row],control,stepInput:'.0001',reference:'balmer' as const,wide:false,object:'Renamed label',hubble:EMPTY_HUBBLE};
  const text=await serializeAnalysisSession(session),data=JSON.parse(text);expect(data.version).toBe(3);expect(data.observation).toEqual({kind:origin.kind,acquisitionId:origin.acquisitionId});expect(data.acquisitions[0].journal.events).toHaveLength(3);expect(data.measurements[0].origin).toEqual(origin);
  const restored=await read(text);expect(restored.observation?.kind).toBe('catalog-star-acquisition');expect(restored.acquisitions![0].state.exposure).toEqual(packet.state.exposure);expect(restored.rows[0]).toEqual(row);expect(restored.control).toEqual(control);
  const changed=await read(await serializeAnalysisSession({...session,observation:null}));expect(changed.acquisitions![0].state.exposure).toEqual(packet.state.exposure);expect(changed.rows[0].origin).toEqual(origin);expect(measurementCsv(changed.rows)).toContain('source_kind,acquisition_id');expect(measurementCsv(changed.rows)).toContain(packet.acquisitionId);
 });
 it('rejects altered acquisition/identity, cached counts, dangling or stripped stellar provenance',async()=>{
  const p=await createStarObservation(state()),row=createMeasurement(1,'Star',p.name,p.sha256,control,'BALMER.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
  const saved=JSON.parse(await serializeAnalysisSession({observation:p,acquisitions:[p],rows:[row],control,stepInput:'',reference:'balmer',wide:false,object:'Star',hubble:EMPTY_HUBBLE}));
  for(const change of [(v:any)=>v.acquisitions[0].journal.seedAtReset=2,(v:any)=>v.acquisitions[0].journal.counts=[1],(v:any)=>v.acquisitions[0].id='a'.repeat(64),(v:any)=>v.acquisitions=[],(v:any)=>v.acquisitions=Array(9).fill(v.acquisitions[0]),(v:any)=>v.acquisitions.push(v.acquisitions[0]),(v:any)=>v.acquisitions[0].journal.events=Array(24001).fill({kind:'tick',deltaMs:0}),(v:any)=>delete v.measurements[0].origin,(v:any)=>v.measurements[0].sha256='a'.repeat(64),(v:any)=>v.hubble={recipeId:'workbook',rows:[{id:1,input:{kind:'measurement',measurementId:1,apparentVText:'13',magnitudeSource:'claim',targetId:''}}]}]){const data=structuredClone(saved);change(data);await expect(read(JSON.stringify(data))).rejects.toThrow();}
 });
 it('keeps stellar alignment out of Hubble distance and velocity even with a galaxy label',async()=>{
  const p=await createStarObservation(state()),row=createMeasurement(1,'NGC3034',p.name,p.sha256,control,'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
  const input=measurementHubbleRow(1,1),workspace={recipeId:'workbook' as const,rows:[{...input,input:{...input.input,apparentVText:'13',magnitudeSource:'false galaxy claim'}}]};
  expect(()=>readHubbleWorkspace(workspace,[row])).toThrow();const result=analyzeHubble(workspace,[row]);expect(result.value).toBeUndefined();expect(result.rows[0].distanceMpc).toBeUndefined();expect(result.rows[0].velocityKmS).toBeUndefined();expect(result.rows[0].issues.join(' ')).toContain('Stellar');expect(hubbleVelocityCsv([row])).toContain('stellar-excluded');
  expect(createMeasurement(2,'Imported','external.csv','a'.repeat(64),{...INITIAL_CONTROL,step:.001},'BALMER.LST').origin).toBeUndefined();
 });
});
