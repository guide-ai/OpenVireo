/** Front F → Front X: the spectrometer at an Object X spectroscopy pointing (E08 star, galaxy and QSO branches). Pure: the caller
 * (io/objectXSpectrometer.ts) supplies the decoded bounded packs (data/objectx/spectra-*.json, user approval of 2026-10-27,
 * group 2), CLEA_GLX.DAT, CLEA_QSO.DAT and QSOSpect.dat, all identity-checked.
 *
 * Hidden identity (decision D5): nothing returned for display names the object, its kind or its catalogue record. `targetKey` is
 * the ObjectX.HTL row index (already the student's own assignment); `revealDetail` carries the engine's typed reasons and the
 * selected record and must be shown only after the reveal. The status itself is not identity-neutral while some kinds are
 * unavailable (see docs/OBJECT-X-SPECTRA.md); that is a coordinator/user decision, not hidden here.
 *
 * Fields: the general field engine at the exact ObjectX.HTL coordinates (the coordinates the student is given), QSO 'merge',
 * variables 'outside-view', photographs from GLIMAGES.LST (association not ported: a typed reason), the QSO observation through
 * QSOSpect.dat. Journals use the same bounded exposure journal as every acquisition. */
import {evaluateField,createFieldExposure,type FieldResult,type FieldTelescope,type FieldUnavailableReason,type FieldQsoCatalog} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import type {QsoSpectrumFile} from './qsoSpectrum';
import {activateJournal,cancelJournal,deactivateJournal,JournalError,pauseJournal,replayJournal,resetJournal,startJournal,tickJournal,type JournalEvent,type JournalState} from './exposureJournal';

export const OBJECT_X_SPECTRUM_POLICY_PREFIX='openvireo-objectx-spectrum-v1';
/** ObjectX.HTL rows with a spectroscopic branch (QSOs 1, 10, 13; galaxies 3, 6, 8, 11; stars 4, 5, 9, 12) and their pack. */
export const OBJECT_X_SPECTRUM_ROWS:readonly Readonly<{row:number;pack:string}>[]=Object.freeze([
 [1,'objectx-he0353'],[3,'objectx-ngc2403'],[4,'objectx-ngc2403'],[5,'objectx-ngc4262'],[6,'objectx-ngc4262'],[8,'objectx-ngc4449'],[9,'objectx-ngc4449'],
 [10,'objectx-3c273'],[11,'objectx-ngc4631'],[12,'objectx-ngc4631'],[13,'objectx-hs1603'],
].map(([row,pack])=>Object.freeze({row:row as number,pack:pack as string})));
export type ObjectXSpectrometerInputs=Readonly<{packs:ReadonlyMap<string,FieldPack>;glx:Uint8Array;qsoCatalog:FieldQsoCatalog;qsoSpectrum:QsoSpectrumFile;rowPointings:ReadonlyMap<number,Readonly<{ra:number;dec:number}>>}>;
/** Display-safe reason families (one neutral message each in the UI): 'not-recovered' (a branch this version cannot model),
 * 'telescope' (the existing brightness bound: try another telescope), 'no-object' (the slit is empty), 'not-a-target' (a pointing
 * that is not one of the spectroscopy rows' exact coordinates). */
export type ObjectXSpectrumUnavailable='not-recovered'|'telescope'|'no-object'|'not-a-target';
export type ObjectXSpectrumEngine=Readonly<{policy:string;create:(seed:number)=>JournalState;activate:(s:JournalState)=>JournalState;start:(s:JournalState)=>JournalState;tick:(s:JournalState,d:number)=>JournalState;pause:(s:JournalState)=>JournalState;deactivate:(s:JournalState)=>JournalState;reset:(s:JournalState)=>JournalState;cancel:(s:JournalState)=>JournalState;replay:(seed:number,events:readonly JournalEvent[])=>JournalState}>;
export type ObjectXSpectrometerResult=
 |Readonly<{status:'available';targetKey:number;telescope:FieldTelescope;wavelengths:readonly number[];pixelLevel:number;engine:ObjectXSpectrumEngine;revealDetail:Readonly<{kind:'qso'|'galaxy';recordId:string}>}>
 |Readonly<{status:'unavailable';targetKey:number|null;telescope:FieldTelescope;reason:ObjectXSpectrumUnavailable;revealDetail:Readonly<{reasons:readonly FieldUnavailableReason[]}>}>;
export function objectXSpectrumPolicy(row:number,telescope:FieldTelescope):string{return `${OBJECT_X_SPECTRUM_POLICY_PREFIX}:R${row}:T${telescope}`;}
export function parseObjectXSpectrumPolicy(policy:unknown):Readonly<{row:number;telescope:FieldTelescope}>{
 const m=typeof policy==='string'?/^openvireo-objectx-spectrum-v1:R(\d{1,2}):T([012])$/.exec(policy):null;
 if(!m||!OBJECT_X_SPECTRUM_ROWS.some(r=>r.row===Number(m[1])))throw new JournalError('session');
 return Object.freeze({row:Number(m[1]),telescope:Number(m[2]) as FieldTelescope});
}
const NOT_RECOVERED:ReadonlySet<FieldUnavailableReason>=new Set(['photographic-image','variable-merge','axis-fallback','merge-boundary','stamp-bound','star-selected','qso-selected','spectrum-range','spectrum-mapping','outside-pack']);
function engineFor(result:FieldResult,policy:string):ObjectXSpectrumEngine{
 const check=(s:JournalState)=>{if(s?.policy!==policy)throw new JournalError('proof');return s;};
 return Object.freeze({policy,create:(seed:number)=>createFieldExposure(result,policy,seed),activate:(s:JournalState)=>activateJournal(check(s)),start:(s:JournalState)=>startJournal(check(s)),tick:(s:JournalState,d:number)=>tickJournal(check(s),d),
  pause:(s:JournalState)=>pauseJournal(check(s)),deactivate:(s:JournalState)=>deactivateJournal(check(s)),reset:(s:JournalState)=>resetJournal(check(s)),cancel:(s:JournalState)=>cancelJournal(check(s)),
  replay:(seed:number,events:readonly JournalEvent[])=>replayJournal(seed=>createFieldExposure(result,policy,seed),seed,events)});
}
/** The spectrometer for a pointing and telescope. A pointing that is not exactly a spectroscopy row's coordinates is
 * 'not-a-target' (no field is generated for arbitrary coordinates in this version). */
export function objectXSpectrometerAt(inputs:ObjectXSpectrometerInputs,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):ObjectXSpectrometerResult{
 const row=OBJECT_X_SPECTRUM_ROWS.find(r=>{const p=inputs.rowPointings.get(r.row);return !!p&&p.ra===pointing.ra&&p.dec===pointing.dec;});
 if(!row)return Object.freeze({status:'unavailable',targetKey:null,telescope,reason:'not-a-target',revealDetail:Object.freeze({reasons:Object.freeze([])})});
 const pack=inputs.packs.get(row.pack);if(!pack)throw new JournalError('proof');
 const r=evaluateField(pack,inputs.glx,{ra:pointing.ra,dec:pointing.dec},telescope,{qso:'merge',qsoCatalog:inputs.qsoCatalog,variables:'outside-view',qsoObservation:{file:inputs.qsoSpectrum}});
 if(r.reasons.length||!r.calibration){
  const reason:ObjectXSpectrumUnavailable=r.reasons.includes('mean-bound')?'telescope':r.reasons.some(x=>x==='slit-empty'||x==='no-galaxy-selected')&&!r.reasons.some(x=>NOT_RECOVERED.has(x))?'no-object':'not-recovered';
  return Object.freeze({status:'unavailable',targetKey:row.row,telescope,reason,revealDetail:Object.freeze({reasons:r.reasons})});
 }
 const kind=r.qsoTarget?'qso' as const:'galaxy' as const,recordId=r.qsoTarget?.id??r.target!.id;
 return Object.freeze({status:'available',targetKey:row.row,telescope,wavelengths:r.calibration.wavelengths,pixelLevel:r.calibration.pixelLevel,engine:engineFor(r,objectXSpectrumPolicy(row.row,telescope)),revealDetail:Object.freeze({kind,recordId})});
}
