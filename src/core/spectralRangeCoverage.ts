/** Front S2 (analysis/front-plans/front-s2-range.md §6.1), Front S3 (front-s3.md §3): which routes and sources may observe a
 * non-default spectrometer range in this web version. VIREO has one global active range (env+0x2bd4/+0x2bd8) read by every
 * spectrometer route and by Multi-Spec; the web admits a range only where an independent witness covers that route's output [W]:
 *  - star sources: every dialog range (jspect2_range_witness.py; the mean bound is still checked per range);
 *  - the sky: every dialog range (the sky branch of 0x50df64 reads no range; one constant mean per bin);
 *  - galaxy sources: every dialog range since Front S3 (galaxy_range_all_witness.py, galaxyRangeAll.witness.json: the template,
 *    own GLXYSP spectra and the start-time continuation). A range on which a galaxy has no spectrum (the shifted source wholly
 *    outside it, or a negative interpolation) is not a coverage question: the engine types it 'spectrum-range' [U for VIREO];
 *  - QSO sources: every dialog range since Front S3 (qso_range_witness.py, qsoRange.witness.json);
 *  - so the field, Hubble and LSS routes and Multi-Spec admit every dialog range;
 *  - Object X (and Multi-Spec while a target is masked): only the pinned admitted ranges (objectXRanges.json), on which every
 *    spectroscopy row × telescope has the same availability as at the default. The decision reads the range only, so a refusal
 *    never tells the type (E08); every other range keeps the one kind-free refusal. */
import {DEFAULT_SPECTRAL_RANGE,isDialogRange,sameRange,type SpectralRange} from './spectralRange';
import objectXRanges from './objectXRanges.json';

export type RangeRoute='star'|'sky'|'field'|'objectx'|'multispec'|'hubble'|'lss';
export type RangeSource='star'|'galaxy'|'qso'|'sky';
export type RangeCoverage='covered'|'not-witnessed';
const OBJECT_X_ADMITTED=new Set((objectXRanges.admitted as readonly (readonly number[])[]).map(([a,b])=>`${a}-${b}`));
/** Front S3: a range Object X admits (the default always). */
export const objectXRangeAdmitted=(range:SpectralRange)=>isDialogRange(range)&&(sameRange(range,DEFAULT_SPECTRAL_RANGE)||OBJECT_X_ADMITTED.has(`${range.minimum}-${range.maximum}`));
export function spectralRangeCoverage(route:RangeRoute,range:SpectralRange,_source:RangeSource|null=null):RangeCoverage{
 if(!isDialogRange(range))return 'not-witnessed';
 if(sameRange(range,DEFAULT_SPECTRAL_RANGE))return 'covered';
 return route==='objectx'?(objectXRangeAdmitted(range)?'covered':'not-witnessed'):'covered';
}
