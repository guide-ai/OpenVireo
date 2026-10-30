import {describe,expect,it} from 'vitest';
import {parseNativeObservationResults} from './nativeObservationResults';
import {nativeJulianDateText,recordedResultsHeader,recordedResultsLines,RECORDED_RESULTS_DEFAULTS} from './recordedResults';

// Synthetic records and expected lines from the research script analysis/front-k2/A-recorded-results-rows-examples.py
// (decoded rules applied by hand; not original output).
const E1='0e484949203132333420504c4549410000000000a883e34000b8490c022b87f2004000789ca223b9fcc00340000000000000000000000000000000000082024000686666666666fe01400000000000000000000000000000000000000000010000000000000000000000000c636c75737465722073746172000000000000000000000000000000000000000000000000';
const E2='0653746172203700000000000000000000000000b083e34000000000000000c8024000686666666666b001c00050b81e85eb519a09400000000000000000000000a0703d0ab7e6c00f4000000000000000c0024000d0ccccccccccec0040004811fe025bb1bf3c0000000004746573740000000000000000000000000000000000000000000000000000000000000000';
const SKY='03536b7900000000000000000000000000000000a883e34000b8490c022b87f2004000789ca223b9fcc00340000000000000000000000000000000000080ff3f0000000000000080004000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
const bytes=(...hex:string[])=>Uint8Array.from(hex.join('').match(/../g)!.map(h=>parseInt(h,16)));
const data=(...hex:string[])=>parseNativeObservationResults(bytes(...hex));
const L1='HII 1234 PL 4983.750000   3h47m22.2s  24°07\'24"         8.125  7.950                          cluster star';
const L2='Star 7      4984.000000  12h30m00.0s  -5°30\'45"    1234.6             98765.4      12.0       3.7   2.340E-02 G2V          test';

describe('Recorded Results lines (0x549c4a, 0x54708c, 0x5486a8)',()=>{
 it('formats the magnitudes example with 3 filters (E1)',()=>{
  const r=recordedResultsLines(data(E1),{magnitudes:true,fiveFilters:false});
  expect(r).toEqual({kind:'ready',caption:'Recorded Results - Computed Magnitudes',saveName:'Observations.TXT',
   lines:['Object ID    MJD(Days)      RA           Dec      U      B      V         Z      Spectrum     Comments',L1]});
 });
 it('formats the counts example with 5 filters (E2)',()=>{
  const r=recordedResultsLines(data(E2),{magnitudes:false,fiveFilters:true});
  expect(r.kind==='ready'&&r.caption).toBe('Recorded Results - Mean Counts');
  expect(r.kind==='ready'&&r.lines).toEqual(['Object ID    MJD(Days)      RA           Dec         U         B         V         R         I         Z      Spectrum     Comments',L2]);
 });
 it('takes the header labels from the first record kind and keeps list order',()=>{
  const r=recordedResultsLines(data(E2,E1));
  expect(r.kind==='ready'&&r.lines[0]).toBe(recordedResultsHeader(0,5));
  expect(r.kind==='ready'&&r.lines.length).toBe(3);
  expect(recordedResultsHeader(2,5)).toBe('Object ID    MJD(Days)      RA           Dec    '+'     Z      Spectrum     Comments');
 });
 it('repeats the previous row for Sky with magnitudes on, empty when first; formats it with the option off',()=>{
  const on=recordedResultsLines(data(E1,SKY),{magnitudes:true,fiveFilters:false});
  expect(on.kind==='ready'&&on.lines.slice(1)).toEqual([L1,L1]);
  const first=recordedResultsLines(data(SKY,E1),{magnitudes:true,fiveFilters:false});
  expect(first.kind==='ready'&&first.lines.slice(1)).toEqual(['',L1]);
  const off=recordedResultsLines(data(SKY),{magnitudes:false,fiveFilters:false});
  expect(off.kind==='ready'&&off.lines[1].startsWith('Sky         4983.750000')).toBe(true);
 });
 it('repeats the Dec text for each filter of a kind ≥ 2 record',()=>{
  const b=bytes(E1);b[0x5e]=2;
  const r=recordedResultsLines(parseNativeObservationResults(b),{magnitudes:true,fiveFilters:false});
  expect(r.kind==='ready'&&r.lines[1]).toBe('HII 1234 PL 4983.750000   3h47m22.2s  24°07\'24"   24°07\'24"  24°07\'24"  24°07\'24"'+' '.repeat(25)+'cluster star');
 });
 it('adds the bias in one Extended sum and keeps 6 decimals',()=>{
  const b=bytes(E1),view=new DataView(b.buffer);view.setFloat64(16,0.1,true);
  const t=parseNativeObservationResults(b).records[0].fields[0].value;
  expect(nativeJulianDateText(t)).toBe('2415018.600000');
  view.setFloat64(16,0,true);
  expect(nativeJulianDateText(parseNativeObservationResults(b).records[0].fields[0].value)).toBe('2415018.500000');
 });
 it('is empty for no records and blocks a NaN magnitude or an unknown spectral code',()=>{
  expect(recordedResultsLines(parseNativeObservationResults(new Uint8Array(0)))).toMatchObject({kind:'ready',lines:[]});
  const nan=bytes(E1);nan.set([0,0,0,0,0,0,0,0xc0,0xff,0x7f],0x36);
  expect(recordedResultsLines(parseNativeObservationResults(nan),RECORDED_RESULTS_DEFAULTS)).toEqual({kind:'blocked',reason:'value',row:1});
  const code=bytes(E1);new DataView(code.buffer).setInt32(0x5f,7,true);
  expect(recordedResultsLines(parseNativeObservationResults(code))).toEqual({kind:'blocked',reason:'spectral-code',row:1});
 });
});
