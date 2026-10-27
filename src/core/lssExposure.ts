/** E02 acquisition of one LSS row: the general field engine (fieldEngine.ts) on the row's field pack, pointed at the row's
 * HTL coordinates, for the selected telescope record; then the same bounded journal as the galaxy exposure. Web adaptations
 * (one line each in docs/LSS-SURVEY.md): a fresh field per pointing; the telescope is the student's choice among the three
 * verified profiles because the exercise-mode-5 telescope entry is not recovered; native timing (no speed-up). */
import {evaluateField,createFieldExposure,FieldEngineError,type FieldResult,type FieldTelescope,type FieldUnavailableReason} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import {lssFieldRows,type LssFieldNumber,type LssRow} from './lssFields';
import {activateJournal,cancelJournal,deactivateJournal,JournalError,pauseJournal,replayJournal,resetJournal,startJournal,tickJournal,type JournalEvent,type JournalState} from './exposureJournal';

export const LSS_POLICY_PREFIX='openvireo-lss-v1';
export function lssPolicy(field:LssFieldNumber,row:number,telescope:FieldTelescope):string{return `${LSS_POLICY_PREFIX}:F${field}:R${row+1}:T${telescope}`;}
export function parseLssPolicy(policy:unknown):Readonly<{field:LssFieldNumber;row:number;telescope:FieldTelescope}>{
 const m=typeof policy==='string'?/^openvireo-lss-v1:F([1-9]):R(\d{1,2}):T([012])$/.exec(policy):null;
 if(!m)throw new JournalError('session');
 const field=Number(m[1]) as LssFieldNumber,row=Number(m[2])-1,telescope=Number(m[3]) as FieldTelescope;
 if(row<0||row>=lssFieldRows(field).length)throw new JournalError('session');
 return Object.freeze({field,row,telescope});
}
/** Selected galaxies that have their own library spectrum in GLXYSP.LST (SHA-256 0a7a352d…c0a01, 576 bytes; not an approved
 * resource, read statically in research only). Native key: identifier without spaces + ".SP", exact match (Pegasus provenance
 * spectrumMapping). Their spectrum is not the GLXYTMPL.SP template, so they stay unavailable rather than substituted. These are
 * the only two LSS identifiers with a match. */
export const LSS_SPECTRUM_MAPPED_IDS:readonly string[]=Object.freeze(['NGC 4670','NGC 4889']);
/** available: verified on this telescope and the slit selects the row's own catalogue galaxy; neighbour: available, but the
 * nearest rule selects another catalogue galaxy at (or within 1″ of) the row position; unavailable: typed reasons. */
export type LssRowStatus=Readonly<{kind:'available'|'neighbour';result:FieldResult;selectedId:string;selectedIndex:number}>|Readonly<{kind:'unavailable';reasons:readonly FieldUnavailableReason[];result:FieldResult|null}>;
export function evaluateLssRow(pack:FieldPack,glx:Uint8Array,row:LssRow,telescope:FieldTelescope):LssRowStatus{
 let result:FieldResult;
 try{result=evaluateField(pack,glx,{ra:row.ra,dec:row.dec},telescope);}
 catch(e){if(e instanceof FieldEngineError&&e.code==='evidence')return Object.freeze({kind:'unavailable' as const,reasons:Object.freeze(['outside-pack' as const]),result:null});throw e;}
 if(result.reasons.length||!result.target)return Object.freeze({kind:'unavailable' as const,reasons:result.reasons,result});
 if(LSS_SPECTRUM_MAPPED_IDS.includes(result.target.id))return Object.freeze({kind:'unavailable' as const,reasons:Object.freeze(['spectrum-mapping' as const]),result});
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
