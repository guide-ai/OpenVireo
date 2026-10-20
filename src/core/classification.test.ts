import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {CLASSIFICATION_CATALOG as catalog,CLASSIFICATION_MAIN_FINGERPRINT,INITIAL_CLASSIFICATION,classificationDifference,classificationRecord,classificationCsv,readClassificationState,MAX_CLASSIFICATIONS} from './classification';
import {parseClassificationSession,serializeClassificationSession,readClassificationSession,MAX_CLASSIFICATION_BYTES} from '../io/classificationSession';
import {parseLibrarySpectrum} from './spectrum';
const proposal=()=>({...INITIAL_CLASSIFICATION,proposed:'Operator proposal',reason:'Compare several absorption features; synthetic response for state validation.'});
describe('manual spectral classification contracts',()=>{
 it('binds all38 unmodified resources to hashes and the original shared printed grid without keys or answers',()=>{
  expect(catalog.standards.map(s=>s.label)).toEqual(['O5 V','B0 V','B6 V','A1 V','A5 V','F0 V','F5 V','G0 V','G6 V','K0 V','K5 V','M0 V','M5 V']);
  expect(catalog.practice).toHaveLength(25);expect(catalog.practice.slice(0,3).map(p=>p.label)).toEqual(['HD 124320','HD 37767','HD 35619']);
  let grid:readonly number[]|undefined;
  for(const s of [...catalog.standards,...catalog.practice]){const bytes=readFileSync(new URL('../../public'+s.url,import.meta.url));expect(createHash('sha256').update(bytes).digest('hex')).toBe(s.sha256);const samples=parseLibrarySpectrum(bytes.toString());expect(samples).toHaveLength(2799);expect(samples.every(p=>p.intensity>=0&&p.intensity<=1)).toBe(true);const current=samples.map(p=>p.wavelength);if(grid)expect(current).toEqual(grid);grid=current;}
  expect(JSON.stringify(catalog)).not.toMatch(/correct|answer|expected|grade/i);
 });
 it('subtracts standard minus unknown on identical grids, preserves inputs and rejects unestablished resampling',()=>{
  const top=[{wavelength:4000,intensity:.75},{wavelength:4100,intensity:.25}],unknown=[{wavelength:4000,intensity:.25},{wavelength:4100,intensity:.75}];
  expect(classificationDifference(top,unknown).map(p=>p.intensity)).toEqual([.5,-.5]);expect(top[0].intensity).toBe(.75);
  expect(()=>classificationDifference(top,[{...unknown[0],wavelength:4001},unknown[1]])).toThrow();expect(()=>classificationDifference(top,unknown.slice(0,1))).toThrow();expect(()=>classificationDifference(top,[{...unknown[0],intensity:NaN},unknown[1]])).toThrow();
 });
 it('keeps manual proposals separate from comparison choices and requires an explanation',()=>{
  expect(()=>classificationRecord(INITIAL_CLASSIFICATION)).toThrow();const r=classificationRecord(proposal());expect(r.proposed).toBe('Operator proposal');expect(r.id).toBe(1);expect(classificationRecord({...proposal(),pair:8}).proposed).toBe(r.proposed);
  expect(()=>classificationRecord({...proposal(),reason:'  '})).toThrow();expect(classificationRecord({...proposal(),records:[r]}).id).toBe(2);
 });
 it('roundtrips incomplete drafts, comparison and source-bound response records; rejects schema/link/bounds violations',async()=>{
  const state={...proposal(),mode:'difference' as const,line:2,records:[classificationRecord(proposal())]},serialized=serializeClassificationSession(state),json=JSON.parse(serialized);
  expect(parseClassificationSession(json)).toEqual(state);expect(await readClassificationSession(new File([serialized],'class.json'))).toEqual(state);expect(parseClassificationSession(JSON.parse(serializeClassificationSession(INITIAL_CLASSIFICATION)))).toEqual(INITIAL_CLASSIFICATION);
  for(const change of [(v:any)=>v.datasetFingerprint='a'.repeat(64),(v:any)=>v.version=2,(v:any)=>v.state.unknownId='u26',(v:any)=>v.state.pair=12,(v:any)=>v.state.line=999,(v:any)=>v.state.records[0].reason='',(v:any)=>v.state.records[0].id=0,(v:any)=>v.state.cachedType='A',(v:any)=>v.state.records[0].unknownId='s1']){const bad=structuredClone(json);change(bad);expect(()=>parseClassificationSession(bad)).toThrow();}
  expect(()=>readClassificationState({...state,records:[state.records[0],state.records[0]]})).toThrow();
  const records=Array.from({length:MAX_CLASSIFICATIONS},(_,i)=>({...state.records[0],id:i+1}));expect(()=>classificationRecord({...state,records})).toThrow();expect(()=>readClassificationState({...state,records:[...records,{...records[0],id:101}]})).toThrow();
 });
 it('bounds imports before reading and does not accept another lab or malformed bytes',async()=>{
  let read=false;await expect(readClassificationSession({size:MAX_CLASSIFICATION_BYTES+1,arrayBuffer:async()=>{read=true;return new ArrayBuffer(0);}} as unknown as File)).rejects.toThrow();expect(read).toBe(false);
  await expect(readClassificationSession(new File([new Uint8Array([255,254])],'bad.json'))).rejects.toThrow();expect(()=>parseClassificationSession({format:'OpenVireo analysis session',version:3})).toThrow();
 });
 it('exports manual records, exact source identities and formula-neutralized multiline text',()=>{
  const state={...proposal(),proposed:'=FORMULA()',reason:'@external\n"claim"'},r=classificationRecord(state),csv=classificationCsv({...state,records:[r]});
  expect(csv).toContain(catalog.atlasSha256);expect(csv).toContain(catalog.practice[0].sha256);expect(csv).toContain(CLASSIFICATION_MAIN_FINGERPRINT);expect(csv).toContain("'=FORMULA()");expect(csv).toContain("'@external\n\"\"claim\"\"");expect(csv).toContain('manual_response_not_graded');
 });
});
