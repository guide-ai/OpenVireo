import {describe,it,expect,beforeAll,afterAll,vi} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,webcrypto} from 'node:crypto';
import {loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {OBJECT_X_SPECTRUM_ROWS,objectXField,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import {fieldRangeOutcome} from '../core/fieldRangeSource';
import {DEFAULT_SPECTRAL_RANGE,isDialogRange,sameRange,type SpectralRange} from '../core/spectralRange';
import {objectXRangeAdmitted} from '../core/spectralRangeCoverage';
import {FIELD_CALIBRATIONS,type FieldTelescope} from '../core/fieldEngine';
import table from '../core/objectXRanges.json';
// Front S3 (analysis/front-plans/front-s3.md §3): Object X admits a non-default range only if every spectroscopy row × telescope
// is available there exactly when it is at the default, so the per-telescope availability pattern (the accepted D5 residual) is
// the default's on every admitted range and a refusal is one kind-free text. The table is derived from the default evaluations
// with the field engine's own range step (core/fieldRangeSource.ts), checked here against full evaluations on sampled ranges.
// Regenerate deliberately: OPENVIREO_S3_FREEZE=1 npx vitest run src/io/objectXRanges.test.ts
vi.setConfig({testTimeout:1_800_000});
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const RANGES:SpectralRange[]=[];for(let a=3500;a<=7300;a+=100)for(let b=a+100;b<=7400;b+=100)RANGES.push(Object.freeze({minimum:a,maximum:b}));
let inputs:ObjectXSpectrometerInputs;
const cells=()=>OBJECT_X_SPECTRUM_ROWS.flatMap(({row})=>[0,1,2].map(t=>({row,t:t as FieldTelescope,pointing:inputs.rowPointings.get(row)!})));
beforeAll(async()=>{vi.stubGlobal('crypto',webcrypto);const qb=file('catalogs/CLEA_QSO.DAT');
 inputs=await loadObjectXSpectrometerInputs({glx:async()=>file('catalogs/CLEA_GLX.DAT'),qsoCatalog:async()=>({bytes:qb,sha256:sha(qb)}),file:async p=>file(p.replace('/original/','')),objectXHotList:async()=>file('hotlists/ObjectX.HTL')});});
afterAll(()=>vi.unstubAllGlobals());
const status=(r:ReturnType<typeof objectXField>)=>!!r&&!r.result.reasons.length&&!!r.result.calibration;
describe('Front S3: the Object X admitted ranges',()=>{
 it('are the ranges on which every spectroscopy row × telescope has its default availability; the pinned table equals them',()=>{
  expect(RANGES).toHaveLength(780);expect(RANGES.every(isDialogRange)).toBe(true);
  const base=cells().map(c=>({...c,f:objectXField(inputs,c.pointing,c.t)!}));
  const admitted:[number,number][]=[];
  for(const range of RANGES){
   if(sameRange(range,DEFAULT_SPECTRAL_RANGE))continue;
   const same=base.every(c=>{const at=status(c.f);const calibrated=!!c.f.result.calibration&&c.f.result.reasons.every(x=>x==='mean-bound');
    const there=calibrated?fieldRangeOutcome(c.f.result,c.t,range,inputs)==='available':false;return there===at;});
   if(same)admitted.push([range.minimum,range.maximum]);
  }
  const doc={schema:1,kind:'Front S3: Object X admitted spectrometer ranges (every spectroscopy row × telescope has its default availability); derived by src/io/objectXRanges.test.ts',
   meanBounds:FIELD_CALIBRATIONS.map(c=>c.meanBound),defaultAvailable:base.filter(c=>status(c.f)).length,admitted};
  if(process.env.OPENVIREO_S3_FREEZE==='1')writeFileSync(new URL('../core/objectXRanges.json',import.meta.url),JSON.stringify(doc)+'\n');
  expect(doc).toEqual(JSON.parse(readFileSync(new URL('../core/objectXRanges.json',import.meta.url),'utf8')));
  expect(table.admitted.length).toBeGreaterThan(0);
  for(const r of RANGES)expect(objectXRangeAdmitted(r)).toBe(sameRange(r,DEFAULT_SPECTRAL_RANGE)||admitted.some(([a,b])=>a===r.minimum&&b===r.maximum));
 });
 it('the range step equals a full evaluation on sampled ranges (every cell, available or typed)',()=>{
  const sample=[[4000,5000],[3500,7400],[3500,3600],[3600,3700],[6400,7400],[7300,7400]] as const;
  const extra=process.env.OPENVIREO_S3_FULL==='1'?RANGES.filter((_,i)=>i%37===0).map(r=>[r.minimum,r.maximum] as const):[];
  for(const [a,b] of [...sample,...extra]){
   const range=Object.freeze({minimum:a,maximum:b});
   for(const c of cells()){
    const d=objectXField(inputs,c.pointing,c.t)!,full=objectXField(inputs,c.pointing,c.t,range)!;
    const calibrated=!!d.result.calibration&&d.result.reasons.every(x=>x==='mean-bound');
    const fast=calibrated?fieldRangeOutcome(d.result,c.t,range,inputs):'other';
    const slow=full.result.reasons.length===0&&full.result.calibration?'available':full.result.reasons.join();
    expect(calibrated?fast:'other',`row ${c.row} T${c.t} ${a}-${b}`).toBe(calibrated?slow:'other');
   }
  }
 });
});
