import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witness from './jspect2Range.witness.json';
import {spectralRangeCoverage,objectXRangeAdmitted} from './spectralRangeCoverage';
import {DEFAULT_SPECTRAL_RANGE,spectralRangeGrid} from './spectralRange';
import {starTemplateSpectrum} from './starTemplates';
import {sampleUniformSpectrum} from './acquisition';

// Front S2 §6.1. The witness is analysis/front-s2-range/tools/jspect2_range_witness.py (SHA-256 below), run on
// public/original/spectra/jspect2 with analysis/front-s-spectroscopy/tools/star_range_witness.py as its base.
const TOOL_SHA256='5db1a16e6fd0f8d16574b5d63c1f523f640f05fd31391cb741119f149d130cac';
const W={minimum:4000,maximum:5000};
describe('Front S2: spectral range coverage',()=>{
 // Re-pinned 2026-10-31 (Front S3): galaxy and QSO sources are witnessed on every dialog range (galaxyRangeAll, qsoRange), so the
 // field, Hubble and LSS routes and Multi-Spec admit every dialog range; Object X admits only its pinned ranges, for every
 // source alike (the decision never reads the target).
 it('the default is covered everywhere; every dialog range on the field, Hubble, LSS and Multi-Spec routes; Object X only its admitted ranges, uniformly',()=>{
  for(const route of ['star','sky','field','objectx','multispec','hubble','lss'] as const)for(const s of ['star','galaxy','qso','sky',null] as const)expect(spectralRangeCoverage(route,DEFAULT_SPECTRAL_RANGE,s)).toBe('covered');
  for(const route of ['star','sky','field','multispec','hubble','lss'] as const)for(const s of ['star','galaxy','qso','sky',null] as const){expect(spectralRangeCoverage(route,W,s)).toBe('covered');expect(spectralRangeCoverage(route,{minimum:3500,maximum:3600},s)).toBe('covered');}
  for(const r of [W,{minimum:3500,maximum:3600},{minimum:7300,maximum:7400}]){const want=objectXRangeAdmitted(r)?'covered':'not-witnessed';for(const s of ['star','galaxy','qso',null] as const)expect(spectralRangeCoverage('objectx',r,s)).toBe(want);}
  expect(objectXRangeAdmitted({minimum:3500,maximum:3600})).toBe(false);
  for(const route of ['star','field','objectx','hubble'] as const)expect(spectralRangeCoverage(route,{minimum:4050,maximum:5000})).toBe('not-witnessed');
 });
 it('every bundled jspect2 template samples on the S1 anchor ranges exactly as the pinned independent witness',()=>{
  expect(TOOL_SHA256).toHaveLength(64);expect(witness.templates.map(t=>t.file)).toEqual(readdirSync('public/original/spectra/jspect2').filter(f=>/\.SP$/i.test(f)).sort());expect(witness.templates).toHaveLength(85);
  for(const t of witness.templates){
   const bytes=readFileSync(`public/original/spectra/jspect2/${t.file}`);expect(createHash('sha256').update(bytes).digest('hex'),t.file).toBe(t.sha256);
   const spectrum=starTemplateSpectrum(bytes.toString('latin1'));
   witness.ranges.forEach(([minimum,maximum],i)=>{
    const values=spectralRangeGrid({minimum,maximum}).map(w=>sampleUniformSpectrum(spectrum,w)),f=new Float64Array(values.map(v=>v.value));
    expect(values.filter(v=>!v.valid).length,`${t.file} ${minimum}`).toBe(t.ranges[i].outside);
    expect(createHash('sha256').update(new Uint8Array(f.buffer)).digest('hex'),`${t.file} ${minimum}–${maximum}`).toBe(t.ranges[i].valuesFloat64LeSha256);
   });
  }
 });
});
