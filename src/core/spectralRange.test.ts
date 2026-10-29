import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {DEFAULT_SPECTRAL_RANGE,defaultRangeDraft,isDialogRange,moveRangeMaximum,moveRangeMinimum,rangeDraft,rangeFromDraft,SpectralRangeError,spectralRangeGrid} from './spectralRange';
import {activateStar,createStarExposure,pauseStar,startStar,starPolicyRange,starSpectralRange,StarRangeUnavailableError,STAR_POLICY_ID,tickStar,verifiedStarConfiguration} from './starExposure';
import {starSpectrumBytes} from './exposureSpectrum';
import {parseLegacySpectrumFile} from './legacySpectrumFile';
import {parseStarSession,serializeStarSession} from '../io/starSession';
import witness from './starRange.witness.json';

// Rules from analysis/front-s-spectroscopy/RE-spectral-range.md (static reading of CLEA_VEO.exe). Witness: research
// analysis/front-s-spectroscopy/tools/star_range_witness.py (SHA-256 below), a second implementation of grid and sampler.
const TOOL_SHA256='2121e97d12619c517e2997b5082c6bb3d62b486b52ee64e33ce8485daaf3eb1e';

describe('Spectrometer Wavelength Range dialog (TSpecRangeDlg 0x50c738)',()=>{
 it('maps positions to 3500 + 100·position and keeps the ends 100 Å apart',()=>{
  expect(rangeDraft(DEFAULT_SPECTRAL_RANGE)).toEqual({minPosition:2,maxPosition:12});
  const a=moveRangeMinimum(rangeDraft(DEFAULT_SPECTRAL_RANGE),12);expect(a).toEqual({minPosition:12,maxPosition:13});
  const b=moveRangeMaximum(a,5);expect(b).toEqual({minPosition:4,maxPosition:5});
  expect(rangeFromDraft(b)).toEqual({minimum:3900,maximum:4000});
  expect(moveRangeMinimum(a,99).minPosition).toBe(38);expect(moveRangeMaximum(a,0).maxPosition).toBe(1);
  expect(rangeFromDraft(defaultRangeDraft())).toEqual({minimum:3700,maximum:4700});
  expect(()=>moveRangeMinimum(a,2.5)).toThrow(SpectralRangeError);
  for(const r of [{minimum:3500,maximum:7400},{minimum:7300,maximum:7400},{minimum:4000,maximum:5000}])expect(isDialogRange(r)).toBe(true);
  for(const r of [{minimum:3400,maximum:3600},{minimum:3500,maximum:7500},{minimum:4000,maximum:4000},{minimum:4050,maximum:5000}])expect(isDialogRange(r)).toBe(false);
 });
 it('builds 600 bins from the minimum (the default grid is unchanged)',()=>{
  const g=spectralRangeGrid(DEFAULT_SPECTRAL_RANGE);expect(g).toHaveLength(600);expect(g[0]).toBe(3700);expect(g[599]).toBe(3700+599*(1000/600));
  expect(spectralRangeGrid({minimum:3500,maximum:7400})[1]).toBe(3506.5);
 });
});

describe('the catalogue star on another spectrometer range',()=>{
 const bytes=(values:readonly number[])=>{const f=new Float64Array(values);return createHash('sha256').update(Buffer.from(f.buffer)).digest('hex');};
 it('samples A0000049.SP exactly as the pinned independent witness, zero tail included',()=>{
  expect((witness as {tool:string}).tool).toBe('star_range_witness.py');expect(TOOL_SHA256).toHaveLength(64);
  for(const r of witness.ranges){
   const range={minimum:r.minimum,maximum:r.maximum};let c;
   try{c=verifiedStarConfiguration(0,range);}catch(e){expect(e).toBeInstanceOf(StarRangeUnavailableError);continue;}
   expect(bytes(c.sourceValues),`${r.minimum}-${r.maximum}`).toBe(r.valuesFloat64LeSha256);
   expect(c.sourceValues.filter(v=>v===0).length).toBe(r.outside);
  }
  // The default range keeps the verified configuration byte for byte.
  expect(bytes(verifiedStarConfiguration(0).sourceValues)).toBe(witness.ranges[0].valuesFloat64LeSha256);
 });
 it('carries a non-default range in the policy, the session and the saved .SSP; the default range changes nothing',()=>{
  const range={minimum:4000,maximum:5000};
  expect(createStarExposure(1).policy).toBe(STAR_POLICY_ID);
  const s=pauseStar(tickStar(startStar(activateStar(createStarExposure(1,0,range))),1000));
  expect(s.policy).toBe(`${STAR_POLICY_ID}#R4000-5000`);expect(starSpectralRange(s)).toEqual(range);
  const back=parseStarSession(JSON.parse(serializeStarSession(s)));expect(back.exposure.counts).toEqual(s.exposure.counts);expect(back.policy).toBe(s.policy);
  const lines=new TextDecoder().decode(starSpectrumBytes(s)).split('\r\n');expect(lines[1]).toMatch(/^4000\.00 /);expect(lines[600]).toMatch(/^4998\.33 /);
  expect(parseLegacySpectrumFile(starSpectrumBytes(s)).header).not.toBeNull();
  for(const p of [`${STAR_POLICY_ID}#R3700-4700`,`${STAR_POLICY_ID}#R4050-5000`,`${STAR_POLICY_ID}#Rx`])expect(()=>starPolicyRange(p)).toThrow();
 });
});
