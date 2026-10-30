/** Front G (G4a, analysis/front-plans/front-g-gsc.md §11): VIREO's single-slit spectrometer at a field, shared by Object X (at
 * its exact ObjectX.HTL coordinates) and the generic route (at any telescope pointing, with a pack assembled from the compact
 * GSC tiles). VIREO builds the field at every pointing (0x53be70) and the slit takes the nearest object (0x59a0fc); the
 * spectrometer is the default instrument in modes 0/1/2/4/5 (0x538062) and its Access (RdngBtnClick 0x53cce4) has no pointing
 * check. Pure: the caller supplies the identity-checked inputs. No equivalence with the original program is claimed. */
import {evaluateField,glxyspLookup,FIELD_MULTIPLIER,FIELD_VARIABLE_JD_DOMAIN,type FieldVariableTime,type FieldOptions,type FieldResult,type FieldTelescope,type FieldQsoCatalog,type FieldPhotographs} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import type {QsoSpectrumFile} from './qsoSpectrum';
import {lookupStarTemplate,type StarIndexEntry} from './starTemplates';
import type {UniformSpectrum} from './acquisition';
import {JournalError,type JournalState} from './exposureJournal';

/** The normal spectrometer's interval: the configured range's compiled default 3700–4700 Å (0x5a2a1e/0x5a2a28); see
 * objectXSpectrometer.ts for the copy chain. */
export const SPECTROMETER_INTERVAL=Object.freeze({minimum:3700,maximum:4700});
/** Everything the spectrometer reads besides the field pack. */
export type SpectrometerInputs=Readonly<{glx:Uint8Array;qsoCatalog:FieldQsoCatalog;qsoSpectrum:QsoSpectrumFile;starIndex:readonly StarIndexEntry[];
 starTemplates:ReadonlyMap<string,UniformSpectrum>;glxyspLines:readonly string[];galaxySpectra:ReadonlyMap<string,readonly Readonly<{wavelength:number;intensity:number}>[]>;photographs:FieldPhotographs}>;
/** The spectrometer's field result at a pointing: QSO 'merge', the recovered variable dispatch, the GLXYSP guard, photographs,
 * 'start-time' continuation, star and QSO observation; a selected galaxy with its own bundled GLXYSP.LST spectrum takes the
 * matched branch (0x55e55c, factor 1). Every template JSPEC2.SPI names is bundled (approval of 2026-10-30), so a named template
 * missing from the inputs is an input error, never another template. variableTime (G4a review 1 M1): the observatory-clock JD frozen
 * when the field is prepared, as Field Information and LSS pass it; without it a time-dependent variable in view stays
 * variable-time-required. */
export function spectrometerFieldResult(inputs:SpectrometerInputs,pack:FieldPack,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,variableTime?:FieldVariableTime):FieldResult{
 const at={ra:pointing.ra,dec:pointing.dec};
 const starObservation={templateFor:(index:number)=>{const file=lookupStarTemplate(inputs.starIndex,index);if(!file)return null;const spectrum=inputs.starTemplates.get(file);if(!spectrum)throw new Error(`spectrometer inputs: star template ${file} missing`);return {file,spectrum};}};
 const options:FieldOptions={glxyspLines:inputs.glxyspLines,variableDispatch:'recovered',photographs:inputs.photographs,qso:'merge',qsoCatalog:inputs.qsoCatalog,continuation:'start-time',spectralInterval:SPECTROMETER_INTERVAL,starObservation,qsoObservation:{file:inputs.qsoSpectrum,...SPECTROMETER_INTERVAL},...(variableTime?{variableTime}:{})};
 let r=evaluateField(pack,inputs.glx,at,telescope,options);
 const own=r.target?glxyspLookup(inputs.glxyspLines,r.target.id):null;
 if(r.target&&own&&r.reasons.includes('spectrum-mapping')&&inputs.galaxySpectra.has(own))r=evaluateField(pack,inputs.glx,at,telescope,{...options,librarySpectrum:{targetId:r.target.id,file:own,samples:inputs.galaxySpectra.get(own)!}});
 return r;
}
/** Journal policy of the generic route: the exact binary64 pointing, the telescope and (G4a review 1 M1) the frozen observatory JD
 * when the field was prepared with one: `openvireo-field-spectrum-v1:<ra>,<dec>:T<telescope>[:JD<jd>]`. */
export const FIELD_SPECTRUM_POLICY_PREFIX='openvireo-field-spectrum-v1';
export type FieldSpectrumPolicy=Readonly<{pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;variableTime?:FieldVariableTime}>;
export function fieldSpectrumPolicy(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope,variableTime?:FieldVariableTime):string{
 if(!Number.isFinite(pointing?.ra)||!Number.isFinite(pointing?.dec)||pointing.ra<0||pointing.ra>=24||Math.abs(pointing.dec)>90||![0,1,2].includes(telescope))throw new RangeError('field spectrum policy');
 if(variableTime&&!(variableTime.source==='observatory-clock'&&Number.isFinite(variableTime.jd)&&variableTime.jd>=FIELD_VARIABLE_JD_DOMAIN.minimum&&variableTime.jd<=FIELD_VARIABLE_JD_DOMAIN.maximum))throw new RangeError('field spectrum policy');
 return `${FIELD_SPECTRUM_POLICY_PREFIX}:${pointing.ra},${pointing.dec}:T${telescope}${variableTime?`:JD${variableTime.jd}`:''}`;
}
export function parseFieldSpectrumPolicy(policy:unknown):FieldSpectrumPolicy|null{
 if(typeof policy!=='string')return null;
 const m=/^openvireo-field-spectrum-v1:([^,:]+),([^,:]+):T([012])(?::JD([^,:]+))?$/.exec(policy);if(!m)return null;
 const pointing={ra:Number(m[1]),dec:Number(m[2])},telescope=Number(m[3]) as FieldTelescope;
 const variableTime=m[4]===undefined?undefined:Object.freeze({jd:Number(m[4]),source:'observatory-clock' as const});
 try{return fieldSpectrumPolicy(pointing,telescope,variableTime)===policy?Object.freeze({pointing:Object.freeze(pointing),telescope,...(variableTime?{variableTime}:{})}):null;}catch{return null;}
}
/** Session file of the generic route: policy, seed and event journal only; counts are always replayed, never imported. */
export const FIELD_SPECTRUM_FORMAT='OpenVireo field spectrum exposure';
export function serializeFieldSpectrumSession(s:JournalState):string{
 if(s.exposure.phase==='running')throw new JournalError('phase');
 if(!parseFieldSpectrumPolicy(s.policy))throw new JournalError('session');
 return JSON.stringify({format:FIELD_SPECTRUM_FORMAT,version:1,policy:s.policy,seedAtReset:s.seedAtReset,events:s.events},null,1)+'\n';
}
/** One RFC 4180 field: quoted when it holds a comma, quote or line break (G4a review 1 M2). */
const csvField=(v:string|number)=>{const t=String(v);return /[",\r\n]/.test(t)?`"${t.replace(/"/g,'""')}"`:t;};
/** The counts CSV of a paused or stopped exposure: one row per bin, the policy quoted (it contains commas). */
export function fieldSpectrumCsv(s:JournalState,wavelengths:readonly number[]):string{
 if(s.exposure.phase==='running')throw new JournalError('phase');
 return ['policy,bin,wavelength_A,source_plus_sky_count,elapsed_ms,seed_at_reset,uniform_draws',...s.exposure.counts.map((n,i)=>[s.policy,i+1,wavelengths[i],n,s.exposure.elapsedMs,s.seedAtReset,s.exposure.draws].map(csvField).join(','))].join('\r\n')+'\r\n';
}
/** What an exposure needs from an available result (the same shape as the Object X display). */
export type FieldSpectrumCalibration=Readonly<{sourceMeans:readonly number[];skyMean:number;multiplier:number;continuationSource?:NonNullable<FieldResult['calibration']>['continuationSource']}>;
export function fieldSpectrumCalibration(r:FieldResult):FieldSpectrumCalibration|null{
 if(r.reasons.length||!r.calibration)return null;
 const c=r.calibration;
 return Object.freeze({sourceMeans:c.sourceMeans,skyMean:c.amplitude.sky,multiplier:FIELD_MULTIPLIER,...(c.continuationSource?{continuationSource:c.continuationSource}:{})});
}
