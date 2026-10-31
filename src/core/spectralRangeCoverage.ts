/** Front S2 (analysis/front-plans/front-s2-range.md §6.1): which routes and sources may observe a non-default spectrometer range
 * in this web version. VIREO has one global active range (env+0x2bd4/+0x2bd8) read by every spectrometer route and by
 * Multi-Spec; the web admits a range only where an independent witness covers that route's output [W]:
 *  - star sources: every dialog range (sampler 0x55dfe0; jspect2_range_witness.py pins every bundled template on the S1 anchor
 *    ranges, as star_range_witness.py did for the catalogue star; the mean bound is still checked per range);
 *  - the sky: every dialog range (the sky branch of the source setup 0x50df64 (0x50e20d..0x50e2de) reads no range and Go skips the per-bin source loop for the sky (0x50f4da); the function's QSO branch (0x50e7b0) does read it; one constant mean per bin);
 *  - galaxies, QSOs, Multi-Spec and the Hubble/LSS routes: the default range only, until their witnesses are extended;
 *  - Object X: the default range only, for every target alike (before and after the reveal), so a refusal never tells the
 *    type (E08) and the kept-spectrum policies (v28) stay as they are. */
import {DEFAULT_SPECTRAL_RANGE,isDialogRange,sameRange,type SpectralRange} from './spectralRange';

export type RangeRoute='star'|'sky'|'field'|'objectx'|'multispec'|'hubble'|'lss';
export type RangeSource='star'|'galaxy'|'qso'|'sky';
export type RangeCoverage='covered'|'not-witnessed';
export function spectralRangeCoverage(route:RangeRoute,range:SpectralRange,source:RangeSource|null=null):RangeCoverage{
 if(!isDialogRange(range))return 'not-witnessed';
 if(sameRange(range,DEFAULT_SPECTRAL_RANGE))return 'covered';
 switch(route){
  case 'star':case 'sky':return 'covered';
  case 'field':return source==='star'||source==='sky'?'covered':'not-witnessed';
  default:return 'not-witnessed';
 }
}
