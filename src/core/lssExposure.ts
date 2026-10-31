/** E02 acquisition of one LSS row: the general field engine (fieldEngine.ts) on the row's field pack, pointed at the row's
 * HTL coordinates, for the selected telescope record; then the same bounded journal as the galaxy exposure. Web adaptations
 * (one line each in docs/LSS-SURVEY.md): a fresh field per pointing; the telescope is the student's choice among the three
 * verified profiles because the exercise-mode-5 telescope entry is not recovered; native timing (no speed-up). */
import {evaluateField,createFieldExposure,type FieldLibrarySpectrum,type FieldOptions,type FieldPhotographs,type FieldQsoCatalog,type FieldResult,type FieldTelescope,type FieldUnavailableReason,type FieldVariableTime} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import {hasLibrarySpectrum} from './lssLists';
import {lssFieldRows,type LssFieldNumber,type LssRow} from './lssFields';
import {LEGACY_GALAXY_RANGE,galaxyPolicyRange,galaxyPolicyWithRange,sameRange,type SpectralRange} from './spectralRange';
import {activateJournal,cancelJournal,deactivateJournal,JournalError,pauseJournal,replayJournal,resetJournal,startJournal,tickJournal,type JournalEvent,type JournalState} from './exposureJournal';

export const LSS_POLICY_PREFIX='openvireo-lss-v1';
/** Front S2 round 2: a row exposure on VIREO's 3700–4700 Å carries "#R3700-4700"; an unmarked policy is the former web range
 * 4000–5000 Å (spectralRange.ts galaxyPolicyRange), so earlier investigations keep their bytes. */
export function lssPolicy(field:LssFieldNumber,row:number,telescope:FieldTelescope,range:SpectralRange=LEGACY_GALAXY_RANGE):string{return galaxyPolicyWithRange(`${LSS_POLICY_PREFIX}:F${field}:R${row+1}:T${telescope}`,range);}
export function parseLssPolicy(policy:unknown):Readonly<{field:LssFieldNumber;row:number;telescope:FieldTelescope;range:SpectralRange}>{
 const split=galaxyPolicyRange(policy);
 const m=split?/^openvireo-lss-v1:F([1-9]):R(\d{1,2}):T([012])$/.exec(split.base):null;
 if(!m||!split)throw new JournalError('session');
 const field=Number(m[1]) as LssFieldNumber,row=Number(m[2])-1,telescope=Number(m[3]) as FieldTelescope;
 if(row<0||row>=lssFieldRows(field).length)throw new JournalError('session');
 return Object.freeze({field,row,telescope,range:split.range});
}
/** The bundled own library spectra LSS rows can select (GLXYSP.LST names that are LSS catalogue galaxies). NGC4670.SP: user
 * approval of 2026-10-27 (group 1), bundled by Front L2; NGC4889.SP: bundled for the Hubble Coma target. */
export const LSS_OWN_SPECTRA=Object.freeze([
 Object.freeze({file:'NGC4670.SP',bytes:27616,sha256:'228149e937449b4731421c0b81fc14545dabc514cd3af4a1c9b4e78f8f12170a'}),
 Object.freeze({file:'NGC4889.SP',bytes:27616,sha256:'d48f79640fa5d70d947388968bccb41beabf9ea8ea95c51ca877c381da101e39'}),
]);
/** Front L2: what an LSS row evaluation needs besides its pack and CLEA_GLX.DAT. `names`: the GLXYSP.LST names; `qsoCatalog`:
 * the bundled CLEA_QSO.DAT for the recovered QSO merge (0x5987e4/0x597f90, qsoMerge.ts); `ownSpectra`: own library spectrum
 * file → samples. Front F3: `photographs`, the GLIMAGES.LST rows and the five LSS bitmaps (none of the Object X four lies in the strip), so a
 * row whose field holds a photographed galaxy is drawn as natively (0x596bd0, 0x597290) instead of staying photographic-image. */
export type LssSpectrumInputs=Readonly<{names:ReadonlySet<string>;qsoCatalog:FieldQsoCatalog;ownSpectra:ReadonlyMap<string,FieldLibrarySpectrum['samples']>;photographs:FieldPhotographs}>;
/** A selected galaxy with its own library spectrum in GLXYSP.LST (native key: id without spaces + ".SP") is observed with that
 * spectrum, as the Hubble route does (librarySpectrum); one whose file is not bundled stays unavailable (spectrum-mapping),
 * never given the GLXYTMPL.SP template. Among LSS identifiers only NGC 4670 and NGC 4889 match; both are bundled. */
/** available: verified on this telescope and the slit selects the row's own catalogue galaxy; neighbour: available, but the
 * nearest rule selects another catalogue galaxy at (or within 1″ of) the row position; unavailable: typed reasons. */
export type LssRowStatus=Readonly<{kind:'available'|'neighbour';result:FieldResult;selectedId:string;selectedIndex:number}>|Readonly<{kind:'unavailable';reasons:readonly FieldUnavailableReason[];result:FieldResult|null}>;
/** variableTime (Front T): the observatory-clock JD frozen when the list was built; without it, a row whose field holds a
 * time-dependent variable star in view stays unavailable (variable-time-required). */
/** range (Front S2): VIREO's 3700–4700 Å with its start-time continuation (0x55e97c), or the former web range 4000–5000 Å. */
export function evaluateLssRow(pack:FieldPack,glx:Uint8Array,row:LssRow,telescope:FieldTelescope,inputs:LssSpectrumInputs,variableTime?:FieldVariableTime,range:SpectralRange=LEGACY_GALAXY_RANGE):LssRowStatus{
 // Evidence inconsistencies (tampered or incomplete pack) throw to the caller; only typed gates become statuses.
 // Front L2: the recovered QSO merge replaces the earlier typed QSO gate (as the Hubble engine fields use it).
 const at={ra:row.ra,dec:row.dec},base:FieldOptions={qso:'merge',qsoCatalog:inputs.qsoCatalog,photographs:inputs.photographs,...(variableTime?{variableTime}:{}),...(sameRange(range,LEGACY_GALAXY_RANGE)?{}:{spectralInterval:{minimum:range.minimum,maximum:range.maximum},continuation:'start-time' as const})};
 // The row's own galaxy is usually the selected one: when it has an own spectrum, supply it up front (one evaluation, and any
 // typed reason, mean-bound included, is then judged with that spectrum). Review 1 F8.
 const ownFor=(id:string)=>{if(!hasLibrarySpectrum(inputs.names,id))return null;const file=id.replace(/ /g,'')+'.SP',samples=inputs.ownSpectra.get(file);return samples?Object.freeze({targetId:id,file,samples}):undefined;};
 const rowOwn=ownFor(row.id);
 let result=evaluateField(pack,glx,at,telescope,rowOwn?{...base,librarySpectrum:rowOwn}:base);
 if(result.target&&result.target.id!==rowOwn?.targetId){
  const own=ownFor(result.target.id);
  if(own===undefined)return Object.freeze({kind:'unavailable' as const,reasons:Object.freeze(['spectrum-mapping' as const]),result});
  // Another selected galaxy with its own spectrum: evaluate again with it.
  if(own)result=evaluateField(pack,glx,at,telescope,{...base,librarySpectrum:own});
 }
 if(result.reasons.length||!result.target)return Object.freeze({kind:'unavailable' as const,reasons:result.reasons,result});
 if(hasLibrarySpectrum(inputs.names,result.target.id)&&result.calibration?.sourceFile!==result.target.id.replace(/ /g,'')+'.SP')throw new Error('LSS own spectrum');
 return Object.freeze({kind:result.target.recordIndex===row.catalogIndex?'available' as const:'neighbour' as const,result,selectedId:result.target.id,selectedIndex:result.target.recordIndex});
}
/** Exposure engine for one available row; every operation checks the state's policy. */
export function lssExposureEngine(result:FieldResult,policy:string){
 if(!result.calibration||result.reasons.length)throw new JournalError('proof');
 const check=(s:JournalState)=>{if(s?.policy!==policy)throw new JournalError('proof');return s;};
 return Object.freeze({
  policy,create:(seed:number)=>createFieldExposure(result,policy,seed),
  activate:(s:JournalState)=>activateJournal(check(s)),start:(s:JournalState)=>startJournal(check(s)),tick:(s:JournalState,d:number)=>tickJournal(check(s),d),
  pause:(s:JournalState)=>pauseJournal(check(s)),deactivate:(s:JournalState)=>deactivateJournal(check(s)),reset:(s:JournalState)=>resetJournal(check(s)),cancel:(s:JournalState)=>cancelJournal(check(s)),
  replay:(seed:number,events:readonly JournalEvent[])=>replayJournal(seed=>createFieldExposure(result,policy,seed),seed,events),
 });
}
const cell=(s:string|number)=>{const t=String(s);return /[",\r\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;};
/** Raw counts CSV of a paused LSS exposure (web schema). */
export function lssCountsCsv(s:JournalState,result:FieldResult,row:LssRow):string{
 if(s.exposure.phase==='running')throw new JournalError('phase');if(!s.exposure.draws||!result.calibration||!result.target)throw new JournalError('no-data');
 const c=result.calibration,e=s.exposure;
 return [['kind','policy','row_id','selected_object','catalog_index','ra_h','dec_deg','telescope_record','slit_level','slit_fraction','bin','wavelength_A','source_plus_sky_count','elapsed_ms','seed_at_reset','uniform_draws','numerical_policy'],
  ...e.counts.map((n,i)=>['browser-lss-field-exposure',s.policy,row.id,result.target!.id,result.target!.recordIndex,row.ra,row.dec,result.telescope,c.pixelLevel,c.fraction,i+1,c.wavelengths[i],n,e.elapsedMs,s.seedAtReset,e.draws,'Number/Math nearest-even; browser seed/timing; not native x87/GDI oracle'])].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
