import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {createGalaxyObservation} from './galaxyObservation';
import {createStarObservation} from './starObservation';
import {createGalaxyExposure,startGalaxy,activateGalaxy,tickGalaxy,pauseGalaxy} from '../core/galaxyExposure';
import {createStarExposure,startStar,activateStar,tickStar,pauseStar} from '../core/starExposure';
import {createMeasurement,INITIAL_CONTROL,measurementCsv} from '../core/spectrum';
import {serializeAnalysisSession,readAnalysisSession} from './analysisSession';
import {analyzeHubble,readHubbleWorkspace,measurementHubbleRow,hubbleAnalysisCsv} from '../core/hubbleAnalysis';
beforeEach(()=>vi.stubGlobal('crypto',webcrypto));afterEach(()=>vi.unstubAllGlobals());
const exposure=()=>pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1))),1000));
const read=(text:string)=>readAnalysisSession(new File([text],'analysis.json'));
describe('galaxy acquisition provenance in analysis and Hubble',()=>{
 it('uses the unshifted rest template and only the student control for measured z; archives both object kinds',async()=>{
  const p=await createGalaxyObservation(exposure()),star=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),100)));
  expect(p.samples[0].wavelength).toBe(4000);expect(p.templateSamples[0].wavelength).toBe(3650);expect(p.state.armed).toBe(false);
  const control={...INITIAL_CONTROL,step:.001,position:49},row=createMeasurement(1,'Renamed',p.name,p.sha256,control,'GLXYLNS.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
  expect(row.zFloat32).toBe(Math.fround(.049));
  const h=measurementHubbleRow(1,1),workspace={recipeId:'workbook' as const,rows:[{...h,input:{...h.input,apparentVText:'15.8',magnitudeSource:'Original CLEA_GLX.DAT record12119',targetId:'36773'}}]};
  const analysis=analyzeHubble(workspace,[row]);expect(analysis.rows[0].issues).toEqual([]);expect(analysis.value).toBeGreaterThan(0);expect(analysis.rows[0].acquisitionId).toBe(p.acquisitionId);expect(hubbleAnalysisCsv(workspace,[row])).toContain(p.acquisitionId);expect(measurementCsv([row])).toContain(p.kind);
  const session={observation:p,acquisitions:[star,p],rows:[row],control,stepInput:'.001',reference:'galaxy' as const,wide:false,object:'Renamed',hubble:workspace};
  const saved=await serializeAnalysisSession(session),restored=await read(saved);expect(restored.acquisitions).toHaveLength(2);expect(restored.observation?.kind).toBe(p.kind);expect(restored.acquisitions![1].state.exposure).toEqual(p.state.exposure);expect(restored.hubble).toEqual(workspace);
  const data=JSON.parse(saved);for(const change of [(v:any)=>v.observation.kind='catalog-star-acquisition',(v:any)=>v.measurements[0].origin.kind='catalog-star-acquisition',(v:any)=>delete v.measurements[0].origin,(v:any)=>v.acquisitions[1].journal.domain.minimum=3700,(v:any)=>v.acquisitions[1].journal.seedAtReset=2,(v:any)=>v.hubble.rows[0].input.targetId='NGC 4889']){const x=structuredClone(data);change(x);await expect(read(JSON.stringify(x))).rejects.toThrow();}
  const wrong={...workspace,rows:[{...h,input:{...h.input,apparentVText:'15.8',magnitudeSource:'claim',targetId:'NGC 4889'}}]};expect(()=>readHubbleWorkspace(wrong,[row])).toThrow();expect(analyzeHubble(wrong,[row]).value).toBeUndefined();expect(analyzeHubble(wrong,[row]).rows[0].distanceMpc).toBeUndefined();
 });
 it('rejects positive forged counters and leaves empty/running states without analyser observations',async()=>{
  await expect(createGalaxyObservation(createGalaxyExposure(1))).rejects.toThrow();await expect(createGalaxyObservation(startGalaxy(activateGalaxy(createGalaxyExposure(1))))).rejects.toThrow();
  const s=exposure();await expect(createGalaxyObservation({...s,exposure:{...s.exposure,counts:Array(600).fill(1)}})).rejects.toThrow('replay journal');
 });
});
