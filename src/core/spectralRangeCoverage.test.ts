import {describe,expect,it} from 'vitest';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witness from './jspect2Range.witness.json';
import {spectralRangeCoverage} from './spectralRangeCoverage';
import {DEFAULT_SPECTRAL_RANGE,spectralRangeGrid} from './spectralRange';
import {starTemplateSpectrum} from './starTemplates';
import {sampleUniformSpectrum} from './acquisition';

// Front S2 §6.1. The witness is analysis/front-s2-range/tools/jspect2_range_witness.py (SHA-256 below), run on
// public/original/spectra/jspect2 with analysis/front-s-spectroscopy/tools/star_range_witness.py as its base.
const TOOL_SHA256='5db1a16e6fd0f8d16574b5d63c1f523f640f05fd31391cb741119f149d130cac';
const W={minimum:4000,maximum:5000};
describe('Front S2: spectral range coverage',()=>{
 it('the default is covered everywhere; other ranges only for stars and the sky; Object X refuses uniformly',()=>{
  for(const route of ['star','sky','field','objectx','multispec','hubble','lss'] as const)for(const s of ['star','galaxy','qso','sky',null] as const)expect(spectralRangeCoverage(route,DEFAULT_SPECTRAL_RANGE,s)).toBe('covered');
  expect(['star','sky'].map(r=>spectralRangeCoverage(r as 'star',W))).toEqual(['covered','covered']);
  expect((['star','sky','galaxy','qso'] as const).map(s=>spectralRangeCoverage('field',W,s))).toEqual(['covered','covered','not-witnessed','not-witnessed']);
  for(const s of ['star','galaxy','qso',null] as const)expect(spectralRangeCoverage('objectx',W,s)).toBe('not-witnessed');
  for(const r of ['multispec','hubble','lss'] as const)expect(spectralRangeCoverage(r,W,'star')).toBe('not-witnessed');
  expect(spectralRangeCoverage('star',{minimum:4050,maximum:5000})).toBe('not-witnessed');
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
