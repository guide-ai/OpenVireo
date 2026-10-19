import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {CLASSIFICATION_CATALOG as catalog,CLASSIFICATION_MAIN_FINGERPRINT,INITIAL_CLASSIFICATION,EMPTY_CLASSIFICATION_WORKSPACE,classificationAtlas,classificationRecord,classificationCsv,classificationUsesNewAtlas,legacyClassificationState,openAcquiredClassification,readClassificationState} from '../core/classification';
import {parseLibrarySpectrum,createMeasurement,INITIAL_CONTROL} from '../core/spectrum';
import {parseClassificationSession,serializeClassificationSession} from './classificationSession';
import {serializeAnalysisSession,readAnalysisSession} from './analysisSession';
import {createStarObservation} from './starObservation';
import {createStarExposure,activateStar,startStar,tickStar,pauseStar} from '../core/starExposure';
import {EMPTY_HUBBLE} from '../core/hubbleAnalysis';
beforeEach(()=>{vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(new URL('../../public'+url,import.meta.url)))));});afterEach(()=>vi.unstubAllGlobals());
const proposal=(atlasId='g2',pair=0)=>({...INITIAL_CLASSIFICATION,atlasId,pair,proposed:'Manual proposal',reason:'Operator observation of line patterns; not an expected classification.'});
describe('original luminosity atlases',()=>{
 it('preserves all seven original label sequences, including nearby types, and verifies all57 raw grids/hashes',()=>{
  expect(catalog.atlases.map(a=>a.label)).toEqual(['Main Sequence','Luminosity near O8','Luminosity near B2','Luminosity at A3','Luminosity at F5','Luminosity at G2','Luminosity at K0','Luminosity near M2']);
  const labels:Record<string,string[]>={o8:['O8 I','O8.5 III','O8 V'],b2:['B2 I','B2 II','B2 III','B1.5 V'],a3:['A3 I','A3 III','A3 V'],f5:['F5 I','F5 II','F5 III','F5 V'],g2:['G2 I','G2 III','G2 IV','G2 V'],k0:['K0 I','K0 III','K0 V'],m2:['M2 I','M3 II','M3 III','M1 V']};
  for(const [id,expected] of Object.entries(labels))expect(classificationAtlas(id).standards.map(s=>s.label)).toEqual(expected);
  const files=new Map([...catalog.practice,...catalog.atlases.flatMap(a=>a.standards)].map(s=>[s.file,s]));expect(files.size).toBe(57);let grid:readonly number[]|undefined;
  for(const s of files.values()){const raw=readFileSync(new URL('../../public'+s.url,import.meta.url));expect(createHash('sha256').update(raw).digest('hex')).toBe(s.sha256);const samples=parseLibrarySpectrum(raw.toString());expect(samples).toHaveLength(2799);expect(samples.every(p=>p.intensity>=0&&p.intensity<=1)).toBe(true);const wavelengths=samples.map(p=>p.wavelength);if(grid)expect(wavelengths).toEqual(grid);grid=wavelengths;}
 });
 it('binds records and CSV to their recorded atlas rather than the currently viewed family',()=>{
  const r=classificationRecord(proposal('a3',1)),state={...proposal('g2',2),records:[r]};expect(r.atlasId).toBe('a3');const csv=classificationCsv(state);expect(csv).toContain('A3_LUM.ATL');expect(csv).toContain(classificationAtlas('a3').sha256);expect(csv).toContain('A3 III');expect(csv).toContain('A3 V');expect(csv).not.toContain('G2_LUM.ATL');expect(csv.split('\r\n')[1]).toMatch(/^3,/);expect(csv).toContain('atlas_id,atlas_label,atlas_file');expect(csv).toContain(catalog.fingerprint);
  expect(classificationUsesNewAtlas({...state,atlasId:'main'})).toBe(true);expect(()=>legacyClassificationState(state)).toThrow();
 });
 it('checks pair boundaries for each atlas and rejects unbound labels or missing modern context',()=>{
  for(const atlas of catalog.atlases){expect(readClassificationState({...proposal(atlas.id,atlas.standards.length-2)}).atlasId).toBe(atlas.id);expect(()=>readClassificationState(proposal(atlas.id,atlas.standards.length-1))).toThrow();}
  expect(()=>readClassificationState(proposal('invented'))).toThrow();const missing:any=proposal();delete missing.atlasId;expect(()=>readClassificationState(missing)).toThrow();
 });
 it('roundtrips practice v2 and keeps v1 restricted to the unchanged main-sequence contract',()=>{
  const s={...proposal('m2',2),records:[classificationRecord(proposal('o8',1))]},modern=JSON.parse(serializeClassificationSession(s));expect(modern.version).toBe(2);expect(parseClassificationSession(modern)).toEqual(s);
  const legacy=JSON.parse(serializeClassificationSession({...proposal('main',3)}));expect(legacy.version).toBe(1);expect(legacy.datasetFingerprint).toBe(CLASSIFICATION_MAIN_FINGERPRINT);expect(legacy.state).not.toHaveProperty('atlasId');expect(parseClassificationSession(legacy).atlasId).toBe('main');legacy.state.atlasId='o8';expect(()=>parseClassificationSession(legacy)).toThrow();
  const broken=structuredClone(modern);broken.state.records[0].atlasId='unknown';expect(()=>parseClassificationSession(broken)).toThrow();delete modern.state.atlasId;expect(()=>parseClassificationSession(modern)).toThrow();
 });
 it('preserves raw acquisition and manual Single measurement through full v5 while v4 still defaults to Main Sequence',async()=>{
  const p=await createStarObservation(pauseStar(tickStar(startStar(activateStar(createStarExposure(1))),1000))),control={...INITIAL_CONTROL,step:.001,position:2};const m=createMeasurement(1,'Own label',p.name,p.sha256,control,'BALMER.LST',{kind:p.kind,acquisitionId:p.acquisitionId});
  const w=openAcquiredClassification(EMPTY_CLASSIFICATION_WORKSPACE,p),d={...w.acquired[0].state,atlasId:'g2',pair:2,proposed:'Own MK proposal',reason:'Manual evidence with uncertainty'},classification={...w,practice:{...proposal('b2',1)},acquired:[{acquisitionId:p.acquisitionId,state:{...d,records:[classificationRecord(d,[p])]}}]};
  const session={observation:p,acquisitions:[p],rows:[m],control,stepInput:'.001',reference:'balmer' as const,wide:false,object:'Own label',hubble:EMPTY_HUBBLE,classification},text=await serializeAnalysisSession(session);expect(JSON.parse(text).version).toBe(5);const restored=await readAnalysisSession(new File([text],'full.json'));expect(restored.classification).toEqual(classification);expect(restored.rows[0].zFloat32Hex).toBe(m.zFloat32Hex);expect(restored.acquisitions![0].state.exposure).toEqual(p.state.exposure);
  const forged=JSON.parse(text);forged.classification.workspace.acquired[0].state.mode='difference';await expect(readAnalysisSession(new File([JSON.stringify(forged)],'bad.json'))).rejects.toThrow();
  const old=await serializeAnalysisSession({...session,classification:w});expect(JSON.parse(old).version).toBe(4);expect(JSON.parse(old).classification.workspace.practice).not.toHaveProperty('atlasId');expect((await readAnalysisSession(new File([old],'v4.json'))).classification?.acquired[0].state.atlasId).toBe('main');
 });
});
