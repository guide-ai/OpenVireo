/** Front F → E08: the spectrometer at an Object X spectroscopy pointing (star, galaxy and QSO branches). Pure: the caller
 * (io/objectXSpectrometerInputs.ts) supplies the decoded bounded packs (data/objectx/spectra-*.json, user approval of
 * 2026-10-27, group 2), CLEA_GLX.DAT, CLEA_QSO.DAT, QSOSpect.dat, the star templates, galaxy spectra and photographs, all
 * identity-checked.
 *
 * Hidden identity (decision D5): evaluateObjectXSpectrum returns two parts. `display` holds only available (with what the
 * exposure needs) or unavailable, with no row, kind, record or reason; `reveal` (row, kind, record, typed reasons) is for after
 * the reveal only (io/objectXSpectrometer.ts revealObjectXSpectrum). The per-telescope availability pattern still narrows the
 * kind (pulsar and asteroid coordinates give no spectrum on any telescope); the coordinator accepted that as a consequence of
 * the recovered behaviour (docs/OBJECT-X-SPECTRA.md, "Accepted D5 residual").
 *
 * Fields: the general field engine at the exact ObjectX.HTL coordinates (the coordinates the student is given), QSO 'merge',
 * the recovered variable dispatch, the GLXYSP guard, photographs from GLIMAGES.LST (association, rescale and draw ported; photographDraw.ts), the QSO observation through
 * QSOSpect.dat. Journals use the same bounded exposure journal as every acquisition. */
import {evaluateField,glxyspLookup,FIELD_MULTIPLIER,type FieldOptions,type FieldResult,type FieldTelescope,type FieldUnavailableReason,type FieldQsoCatalog,type FieldPhotographs} from './fieldEngine';
import {continuationSourcePreparer,type FieldContinuationSource} from './fieldContinuation';
import type {FieldPack} from './fieldPack';
import type {QsoSpectrumFile} from './qsoSpectrum';
import {lookupStarTemplate,type StarIndexEntry} from './starTemplates';
import type {UniformSpectrum} from './acquisition';
import {activateJournal,cancelJournal,createJournalExposure,deactivateJournal,JournalError,pauseJournal,replayJournal,resetJournal,startJournal,tickJournal,type JournalEvent,type JournalState} from './exposureJournal';

export const OBJECT_X_SPECTRUM_POLICY_PREFIX='openvireo-objectx-spectrum-v2';
/** The normal spectrometer's interval: the active range (env+0x2bd4/0x2bd8 = general record +0x2520/+0x2524) is copied from the
 * configured range +0x2518/+0x251c (0x5a2a5c..0x5a2a6e at startup, 0x5a3f70..0x5a3f88 after the options file, 0x50cb66..0x50cb78
 * and 0x588980..0x588992 from the options dialogs), whose compiled default is 3700–4700 Å (0x5a2a1e/0x5a2a28). No Object X
 * specific interval exists: the QSO preparation 0x50e821..0x50e853 reads the same global range; the web uses that default
 * (adaptation: no options file or range control yet). */
export const OBJECT_X_SPECTRAL_INTERVAL=Object.freeze({minimum:3700,maximum:4700});
/** ObjectX.HTL rows with a spectroscopic branch (QSOs 1, 10, 13; galaxies 3, 6, 8, 11; stars 4, 5, 9, 12) and their pack. */
export const OBJECT_X_SPECTRUM_ROWS:readonly Readonly<{row:number;pack:string}>[]=Object.freeze([
 [1,'objectx-he0353'],[3,'objectx-ngc2403'],[4,'objectx-ngc2403'],[5,'objectx-ngc4262'],[6,'objectx-ngc4262'],[8,'objectx-ngc4449'],[9,'objectx-ngc4449'],
 [10,'objectx-3c273'],[11,'objectx-ngc4631'],[12,'objectx-ngc4631'],[13,'objectx-hs1603'],
].map(([row,pack])=>Object.freeze({row:row as number,pack:pack as string})));
/** starIndex: JSPEC2.SPI decoded (starTemplates.ts); starTemplates: template file → decoded spectrum (bundled, hash-checked);
 * glxyspLines: GLXYSP.LST rows; galaxySpectra: own library spectrum file → samples. */
export type ObjectXSpectrometerInputs=Readonly<{packs:ReadonlyMap<string,FieldPack>;glx:Uint8Array;qsoCatalog:FieldQsoCatalog;qsoSpectrum:QsoSpectrumFile;rowPointings:ReadonlyMap<number,Readonly<{ra:number;dec:number}>>;
 /** Opaque target code (objectXLab.ts objectXCode) of each spectroscopy row, for the journal policy. */
 rowCodes:ReadonlyMap<number,string>;
 starIndex:readonly StarIndexEntry[];starTemplates:ReadonlyMap<string,UniformSpectrum>;glxyspLines:readonly string[];galaxySpectra:ReadonlyMap<string,readonly Readonly<{wavelength:number;intensity:number}>[]>;
 /** Kept GLIMAGES.LST rows with native names and the approved bitmaps (fieldEngine 'photographs' option). */
 photographs:FieldPhotographs}>;
export {glxyspLookup};
/** Before the reveal (decision D5, review 2 finding 4) the display gets only `available` (with the exposure) or `unavailable`, with
 * no reason, row, kind or record: every unavailable case reads the same. The reveal data (row, kind, record, typed reasons) is a
 * separate result for after the reveal. Both are plain data, so the evaluation can run in a Worker. */
export type ObjectXSpectrumCalibration=Readonly<{sourceMeans:readonly number[];skyMean:number;multiplier:number;continuationSource?:FieldContinuationSource}>;
export type ObjectXSpectrumDisplay=
 |Readonly<{status:'available';telescope:FieldTelescope;policy:string;wavelengths:readonly number[];calibration:ObjectXSpectrumCalibration}>
 |Readonly<{status:'unavailable';telescope:FieldTelescope}>;
/** reasons: the engine's typed reasons; 'not-a-target' when the pointing is not a spectroscopy row's exact coordinates. */
/** headerMagnitude (Front S, S6): the selected record's catalog magnitude, which VIREO's .SSP header writes (0x510090); only
 * used after the reveal. */
export type ObjectXSpectrumReveal=Readonly<{row:number|null;kind:'qso'|'galaxy'|'star'|null;recordId:string|null;headerMagnitude:number|null;reasons:readonly (FieldUnavailableReason|'not-a-target')[];pixelLevel:number|null}>;
export type ObjectXSpectrumEvaluation=Readonly<{display:ObjectXSpectrumDisplay;reveal:ObjectXSpectrumReveal}>;
const CODE=/^X-[0-9A-Z]{5}$/;
/** The journal policy names the opaque target code (never the ObjectX.HTL row) and the telescope. */
export function objectXSpectrumPolicy(code:string,telescope:FieldTelescope):string{if(!CODE.test(code))throw new JournalError('proof');return `${OBJECT_X_SPECTRUM_POLICY_PREFIX}:${code}:T${telescope}`;}
export function parseObjectXSpectrumPolicy(policy:unknown):Readonly<{code:string;telescope:FieldTelescope}>{
 const m=typeof policy==='string'?/^openvireo-objectx-spectrum-v2:(X-[0-9A-Z]{5}):T([012])$/.exec(policy):null;
 if(!m)throw new JournalError('session');
 return Object.freeze({code:m[1],telescope:Number(m[2]) as FieldTelescope});
}
export type ObjectXSpectrumEngine=Readonly<{policy:string;create:(seed:number)=>JournalState;activate:(s:JournalState)=>JournalState;start:(s:JournalState)=>JournalState;tick:(s:JournalState,d:number)=>JournalState;pause:(s:JournalState)=>JournalState;deactivate:(s:JournalState)=>JournalState;reset:(s:JournalState)=>JournalState;cancel:(s:JournalState)=>JournalState;replay:(seed:number,events:readonly JournalEvent[])=>JournalState}>;
/** The bounded exposure journal of an available display result (same journal as every acquisition). */
export function objectXSpectrumEngine(d:Extract<ObjectXSpectrumDisplay,{status:'available'}>):ObjectXSpectrumEngine{
 const {policy,calibration:c}=d,preparer=c.continuationSource?continuationSourcePreparer(c.continuationSource):undefined;
 const create=(seed:number)=>createJournalExposure(policy,c.sourceMeans,c.skyMean,c.multiplier,seed,preparer);
 const check=(s:JournalState)=>{if(s?.policy!==policy)throw new JournalError('proof');return s;};
 return Object.freeze({policy,create,activate:(s:JournalState)=>activateJournal(check(s)),start:(s:JournalState)=>startJournal(check(s)),tick:(s:JournalState,d:number)=>tickJournal(check(s),d),
  pause:(s:JournalState)=>pauseJournal(check(s)),deactivate:(s:JournalState)=>deactivateJournal(check(s)),reset:(s:JournalState)=>resetJournal(check(s)),cancel:(s:JournalState)=>cancelJournal(check(s)),
  replay:(seed:number,events:readonly JournalEvent[])=>replayJournal(create,seed,events)});
}
/** The field behind an evaluation (also used by the frozen-record test), or null when the pointing is not a spectroscopy row. */
export function objectXField(inputs:ObjectXSpectrometerInputs,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Readonly<{row:Readonly<{row:number;pack:string}>;code:string;result:FieldResult}>|null{
 const row=OBJECT_X_SPECTRUM_ROWS.find(r=>{const p=inputs.rowPointings.get(r.row);return !!p&&p.ra===pointing.ra&&p.dec===pointing.dec;});
 if(!row)return null;
 const pack=inputs.packs.get(row.pack),code=inputs.rowCodes.get(row.row);if(!pack||!code)throw new JournalError('proof');
 const at={ra:pointing.ra,dec:pointing.dec};
 const starObservation={templateFor:(index:number)=>{const file=lookupStarTemplate(inputs.starIndex,index);const spectrum=file?inputs.starTemplates.get(file):undefined;return file&&spectrum?{file,spectrum}:null;}};
 const options:FieldOptions={glxyspLines:inputs.glxyspLines,variableDispatch:'recovered',photographs:inputs.photographs,qso:'merge',qsoCatalog:inputs.qsoCatalog,continuation:'start-time',spectralInterval:OBJECT_X_SPECTRAL_INTERVAL,starObservation,qsoObservation:{file:inputs.qsoSpectrum,...OBJECT_X_SPECTRAL_INTERVAL}};
 let r=evaluateField(pack,inputs.glx,at,telescope,options);
 // A selected galaxy with its own GLXYSP.LST spectrum takes the matched branch (0x55e55c, factor 1), as NGC 4889 in E01; an own
 // spectrum that is not bundled keeps the engine's typed spectrum-mapping reason (no fallback template).
 const own=r.target?glxyspLookup(inputs.glxyspLines,r.target.id):null;
 if(r.target&&own&&r.reasons.includes('spectrum-mapping')&&inputs.galaxySpectra.has(own))r=evaluateField(pack,inputs.glx,at,telescope,{...options,librarySpectrum:{targetId:r.target.id,file:own,samples:inputs.galaxySpectra.get(own)!}});
 return Object.freeze({row,code,result:r});
}
/** The spectrometer for a pointing and telescope. A pointing that is not exactly a spectroscopy row's coordinates has no field in
 * this version (reveal reason 'not-a-target'; the display reads like every other unavailable case). */
export function evaluateObjectXSpectrum(inputs:ObjectXSpectrometerInputs,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):ObjectXSpectrumEvaluation{
 const unavailable=Object.freeze({status:'unavailable' as const,telescope});
 const f=objectXField(inputs,pointing,telescope);
 if(!f)return Object.freeze({display:unavailable,reveal:Object.freeze({row:null,kind:null,recordId:null,headerMagnitude:null,reasons:Object.freeze(['not-a-target' as const]),pixelLevel:null})});
 const {row,code,result:r}=f;
 const kind=r.qsoTarget?'qso' as const:r.starTarget?'star' as const:r.target?'galaxy' as const:null,recordId=r.qsoTarget?.id??r.starTarget?.id??r.target?.id??null,headerMagnitude=r.qsoTarget?.magnitude??r.starTarget?.magnitude??r.target?.magnitude??null;
 const reveal=Object.freeze({row:row.row,kind,recordId,headerMagnitude,reasons:Object.freeze([...r.reasons]),pixelLevel:r.calibration?.pixelLevel??null});
 if(r.reasons.length||!r.calibration)return Object.freeze({display:unavailable,reveal});
 const c=r.calibration,calibration=Object.freeze({sourceMeans:c.sourceMeans,skyMean:c.amplitude.sky,multiplier:FIELD_MULTIPLIER,...(c.continuationSource?{continuationSource:c.continuationSource}:{})});
 return Object.freeze({display:Object.freeze({status:'available' as const,telescope,policy:objectXSpectrumPolicy(code,telescope),wavelengths:c.wavelengths,calibration}),reveal});
}
