import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {CLASSIFICATION_CATALOG as catalog,EMPTY_CLASSIFICATION_WORKSPACE,INITIAL_CLASSIFICATION,classificationCoverage,classificationDifference,classificationRecord,classificationCsv,classificationSource,openAcquiredClassification,readClassificationWorkspace} from '../core/classification';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar} from '../core/starExposure';
import {createGalaxyExposure,activateGalaxy,startGalaxy,tickGalaxy,pauseGalaxy} from '../core/galaxyExposure';
import {createStarObservation} from './starObservation';
import {createGalaxyObservation} from './galaxyObservation';
import {createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
import {serializeAnalysisSession,readAnalysisSession,readInvestigationSession} from './analysisSession';
import {parseClassificationSession,serializeClassificationSession} from './classificationSession';
const star=()=>createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000)));
const read=(s:string)=>readAnalysisSession(new File([s],'complete.json'));
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(new URL('../../public'+url,import.meta.url)))));});afterEach(()=>vi.unstubAllGlobals());
describe('acquisition-to-classification continuity',()=>{
 it('verifies the common domain without declaring equal grids or an original spectral type',async()=>{
  const p=await star(),source=classificationSource('acquired:'+p.acquisitionId,[p]);
  expect(source.kind).toBe('acquired-star');expect(source.sha256).toBe(p.sha256);expect(source.minimum).toBe(3700);expect(source.maximum).toBe(4698.33);expect(classificationCoverage(p.samples)).toBe(true);expect(p.samples.filter(p=>p.wavelength>=3900&&p.wavelength<=4500)).toHaveLength(361);
  const raw=readFileSync(new URL('../../public'+catalog.standards[0].url,import.meta.url),'utf8').trim().split(/\r?\n/).map(row=>{const [wavelength,intensity]=row.trim().split(/\s+/).map(Number);return {wavelength,intensity};});
  expect(classificationCoverage(raw)).toBe(true);expect(raw.filter(p=>p.wavelength>=3900&&p.wavelength<=4500)).toHaveLength(429);expect(()=>classificationDifference(raw,p.samples)).toThrow();
  expect(classificationCoverage(p.samples.filter(p=>p.wavelength<3800))).toBe(false);expect(classificationCoverage(p.samples.filter(p=>p.wavelength<4400))).toBe(true);expect(classificationCoverage([{wavelength:3900,intensity:NaN},{wavelength:4500,intensity:1}])).toBe(false);
 });
 it('keeps practice and each acquisition draft independent and rejects missing, galaxy or difference links',async()=>{
  const p=await star(),practice={...INITIAL_CLASSIFICATION,unknownId:'u25',proposed:'Unfinished practice',reason:'My own reasoning'},w=openAcquiredClassification({...EMPTY_CLASSIFICATION_WORKSPACE,practice},p);
  expect(w.practice).toEqual(practice);expect(w.acquired[0].state.proposed).toBe('');const s={...w.acquired[0].state,proposed:'Manual acquired proposal',reason:'Inspect features, not catalogue answers'};const record=classificationRecord(s,[p]);const saved={...w,acquired:[{acquisitionId:p.acquisitionId,state:{...s,records:[record]}}]};expect(openAcquiredClassification(saved,p)).toEqual(saved);expect(readClassificationWorkspace(saved,[p])).toEqual(saved);
  expect(()=>readClassificationWorkspace(saved,[])).toThrow();expect(()=>readClassificationWorkspace({...saved,acquired:[{acquisitionId:p.acquisitionId,state:{...s,mode:'difference'}}]},[p])).toThrow();expect(()=>readClassificationWorkspace({...saved,acquired:[{acquisitionId:'b'.repeat(64),state:s}]},[p])).toThrow();
  const galaxy=await createGalaxyObservation(pauseGalaxy(tickGalaxy(startGalaxy(activateGalaxy(createGalaxyExposure(1))),1000)));expect(()=>classificationSource('acquired:'+galaxy.acquisitionId,[galaxy as any])).toThrow();
  const csv=classificationCsv({...s,records:[record]},[p]);expect(csv).toContain(p.acquisitionId);expect(csv).toContain(p.sha256);expect(csv).toContain('acquired-star');expect(csv.split('\r\n')[1]).toMatch(/^2,/);expect(csv).toContain('no_resampling');
 });
 it('replays a single v4 investigation containing raw acquisition, manual measurement and both classification workspaces',async()=>{
  const p=await star(),control={...INITIAL_CONTROL,step:.001,position:2};const row=createMeasurement(1,'Edited star',p.name,p.sha256,control,'BALMER.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
  const w=openAcquiredClassification({...EMPTY_CLASSIFICATION_WORKSPACE,practice:{...INITIAL_CLASSIFICATION,unknownId:'u25',proposed:'Practice draft'}},p),d={...w.acquired[0].state,proposed:'Own type',reason:'Own feature evidence'},classification={...w,acquired:[{acquisitionId:p.acquisitionId,state:{...d,records:[classificationRecord(d,[p])]}}]};
  const text=await serializeAnalysisSession({observation:p,acquisitions:[p],rows:[row],control,stepInput:'.001',reference:'balmer',wide:false,object:'Edited star',hubble:EMPTY_HUBBLE,classification});expect(JSON.parse(text).version).toBe(4);const restored=await read(text);expect(restored.rows[0].zFloat32Hex).toBe(row.zFloat32Hex);expect(restored.acquisitions![0].state.exposure).toEqual(p.state.exposure);expect(restored.classification).toEqual(classification);
  for(const change of [(v:any)=>v.classification.workspace.acquired[0].state.mode='difference',(v:any)=>v.classification.workspace.active='b'.repeat(64),(v:any)=>v.classification.datasetFingerprint='0'.repeat(64),(v:any)=>v.acquisitions[0].journal.seedAtReset=2]){const v=JSON.parse(text);change(v);await expect(read(JSON.stringify(v))).rejects.toThrow();}
 });
 it('reads original practice-only inventory sessions without letting that fingerprint assert new or acquired sources',async()=>{
  const old=JSON.parse(serializeClassificationSession({...INITIAL_CLASSIFICATION,unknownId:'u3',proposed:'Old draft'}));old.datasetFingerprint='ece8d76ceadb272845ef8c355689e3f654f454ae18e21f623920e58998fb09c4';expect(parseClassificationSession(old).proposed).toBe('Old draft');expect((await readInvestigationSession(new File([JSON.stringify(old)],'legacy.json'))).kind).toBe('practice');old.state.unknownId='u25';expect(()=>parseClassificationSession(old)).toThrow();
 });
});
