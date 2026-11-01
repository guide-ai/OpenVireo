/** Front S3 (analysis/front-plans/front-s3.md §3): the range-dependent step of a field-spectrometer result. VIREO's field, slit
 * selection and amplitudes do not read the spectrometer range (S2 study); only the source values and the mean bound do. Given an
 * evaluation on one range, this recomputes the outcome on another with the field engine's own source functions, in the engine's
 * order (fieldEngine.ts evaluateField, QSO, star and galaxy branches): QSOSpect.dat (prepareQsoProfile), the star sampler 0x55dfe0
 * on the 600-bin grid, and galaxySourceValues with the start-time continuation. fieldRangeSource.test.ts checks it against a full
 * evaluation on sampled ranges. Pure. */
import galaxySource from '../../data/hubble/galaxy-source.json';
import {FIELD_CALIBRATIONS,FIELD_MULTIPLIER,type FieldResult,type FieldTelescope} from './fieldEngine';
import {galaxySourceValues} from './fieldContinuation';
import {galaxyChannelGrid} from './galaxySpectrum';
import {prepareQsoProfile,QsoSpectrumError,type QsoSpectrumFile} from './qsoSpectrum';
import {sampleUniformSpectrum,type UniformSpectrum} from './acquisition';
import type {SpectralRange} from './spectralRange';

export type FieldRangeSourceInputs=Readonly<{qsoSpectrum:QsoSpectrumFile;starTemplates:ReadonlyMap<string,UniformSpectrum>;galaxySpectra:ReadonlyMap<string,readonly Readonly<{wavelength:number;intensity:number}>[]>}>;
export type FieldRangeOutcome='available'|'spectrum-range'|'mean-bound';
/** The outcome on `range` of a result that was calibrated on another range: available, or refused there only by the mean bound
 * (both are range-dependent; every other reason is decided before the source step and does not read the range). */
export function fieldRangeOutcome(r:FieldResult,telescope:FieldTelescope,range:SpectralRange,inputs:FieldRangeSourceInputs):FieldRangeOutcome{
 const c=r.calibration;if(!c||!r.reasons.every(x=>x==='mean-bound'))throw new Error('fieldRangeOutcome: not a calibrated result');
 const bound=FIELD_CALIBRATIONS[telescope].meanBound,over=(means:readonly number[])=>Math.max(...means)*FIELD_MULTIPLIER*1000>=bound;
 if(r.qsoTarget){
  let values:readonly number[];try{values=prepareQsoProfile(inputs.qsoSpectrum,r.qsoTarget.redshift,range.minimum,range.maximum).values;}
  catch(e){if(e instanceof QsoSpectrumError)return 'spectrum-range';throw e;}
  return over(values.map(v=>v*c.amplitude.source))?'mean-bound':'available';
 }
 if(r.starTarget){
  const spectrum=inputs.starTemplates.get(c.sourceFile);if(!spectrum)throw new Error(`fieldRangeOutcome: star template ${c.sourceFile}`);
  const values:number[]=[];
  for(const w of galaxyChannelGrid(range.minimum,range.maximum).wavelengths){const v=sampleUniformSpectrum(spectrum,w);if(v.valid&&!(v.value>=0))return 'spectrum-range';values.push(v.valid?v.value:0);}
  return over(values.map(v=>v*c.amplitude.source))?'mean-bound':'available';
 }
 if(!r.target)throw new Error('fieldRangeOutcome: no target');
 const own=c.sourceFile!==galaxySource.file?inputs.galaxySpectra.get(c.sourceFile):null;
 if(own===undefined)throw new Error(`fieldRangeOutcome: galaxy spectrum ${c.sourceFile}`);
 const samples=own??galaxySource.samples.map(([wavelength,intensity])=>({wavelength,intensity})),matched=own?true:galaxySource.matched;
 const v=galaxySourceValues(samples,matched,r.target.morphology,r.target.redshift,range.minimum,range.maximum,c.amplitude.source,true);
 if(v.kind==='range')return 'spectrum-range';
 return over(v.values.map(x=>x*c.amplitude.source))?'mean-bound':'available';
}
