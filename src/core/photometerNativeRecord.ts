/** Front P3: VIREO's photometer File › Data › Record/Review and the reading it records (analysis/front-plans/front-p3.md;
 * research analysis/front-p3/RESEARCH.md). Static reading of CLEA_VEO.exe 781bc970…c54c; nothing executed or emulated. Pure.
 * Tags: [D] decoded, [I] inferred, [W] web choice, [U] unknown.
 *
 * The reading (TPhotometer+0x620..+0x6af, one 0x90-byte record of the results type) [D]:
 * - Start 0x4fffd4 (from StrtBtnClick 0x5008db) fixes its ID (Sky / the object name / the Object X label; currentObject.ts
 *   photometerRecordedName), sets the kind to Compute Magnitudes (env+0x2e7f), zeroes the five band slots and the time, and sets
 *   the "nothing to save" flag +0x6b0 := 1. Every Start therefore starts a fresh struct holding at most one filter's value.
 * - Completion (PhotoTimerTimer 0x5016bf–0x501904): an object reading's slot[filter] := its magnitude (0 when the sky is
 *   negative or the net count is not positive) and +0x6b0 := (magnitude = 0); a sky reading in magnitudes mode leaves +0x6b0 = 1.
 *   Record1.Enabled := not(sky reading and Compute Magnitudes) (0x5018e5–0x501904), so Record/Review is offered after any object
 *   reading, a zero-magnitude one included.
 * - Record1Click 0x501e7c: rec := 0x54a73c(ID, time) (core/photometerRecord.ts), RA/Dec := the telescope pointing when either
 *   is 0, kind := the struct kind, nonzero slots copied, all BEFORE TObsRsltsDlg1.ShowModal (0x501f94). OK 0x54b02c stores the
 *   remarks (36) and the parsed Sp type; +0x6b0 := (ModalResult = 1); Record1.Enabled := not OK (0x502033–0x502043).
 * - Cancel (CnclBtnClick 0x54b2dc) only clears the HR plot-marker flag: nothing is rolled back. The record keeps its band value
 *   (a new record stays in the list), the remarks and Sp typed in the dialog are dropped, +0x6b0 stays 0 and Record stays
 *   enabled. With Time-Dependent Data on, a second Record appends a duplicate row [D chain, dossier §3].
 *
 * Web choices:
 * - [W] Compute Magnitudes is compiled on and read-only here (opticalOptions.ts), so the kind is always 1 and a sky reading is
 *   never recordable.
 * - [W] The record time is the observatory clock at completion; VIREO stores the host clock (Now, 0x501444 → 0x487b4c).
 * - [W] The struct lives within one photometer activation: a web activation starts a new context (it also clears the sky bank),
 *   so an unrecorded reading is dropped when the bench is left; VIREO's FormCloseQuery "Data Not Recorded!" prompt (0x501b84) is
 *   not reproduced, because the web releases the bench on its own (hidden page, another view).
 * - Front ONERESULTS: the list the student sees is VIREO's one Observational Results list (core/sharedObservationList.ts),
 *   shared with the classifier (0x50b1dc) and Hubble Record Z (0x5839e6). The rows below stay the journal's own replay (owner 15
 *   unchanged) and are what an older investigation migrates from.
 * - [W] The velocity box stays read-only for a photometer record: a typed velocity would divide by c·0 natively (x87 exception
 *   path, [I]), which is not modelled.
 * - [D] [0x5b5d98] is the Object X ID: only TUTTimeDlg.OKBtnClick 0x4fdf0c writes it, from the IDEd box (+0x388, "ID # of Unknown Object (From Lab Sheet or Instructor)"); an empty box gives UNKNOWN (0x4fe078) (Front P3 review 1 M2). */
import {photometerRecord,PHOTOMETER_BANDS,type PhotometerResultRecord} from './photometerRecord';
import {observationText,formatObservationType,parseObservationType,ObservationResultError} from './observationResults';
import {encodeHtlExtended} from './hotList';
import {encodeNativeText,parseNativeObservationResults,NATIVE_RESULT_BYTES,type NativeObservationData} from './nativeObservationResults';
import {NATIVE_TIME_BIAS} from './recordedResults';
import type {PhotometerFilter} from './photometerUbvField';

/** The photometer's own filter order U, B, V, R, I (analysis/front-p2/B-photometer-r-i.md §2) [D]. */
export const PHOTOMETER_BAND_ORDER:readonly PhotometerFilter[]=Object.freeze(['U','B','V','R','I']);
export const PHOTOMETER_NATIVE_LIMITS=Object.freeze({id:15,remarks:36,spType:12});
/** Kind 1 = "Observed Magnitudes" (Compute Magnitudes compiled on) [D 0x500292–0x5002a8; W fixed]. */
export const PHOTOMETER_NATIVE_KIND=1;
/** JD bounds of a stored record time (the same as the Hubble observation records). */
const JD_MIN=2415020.5,JD_MAX=2488069.5;
/** One record of the photometer-owned results list. `time` is the JD (the stored Double is JD − 2415018.5). */
export type PhotometerNativeRow=PhotometerResultRecord&Readonly<{spectralCode:number;remarks:string}>;
export type PhotometerNativeState=Readonly<{rows:readonly PhotometerNativeRow[];
 /** Readings whose Record/Review ended with OK (VIREO's +0x6b0 after the dialog). */recorded:readonly number[];
 /** Front P3 review 1 L1: readings whose Record/Review ended with Cancel (absent until the first Cancel). */cancelled?:readonly number[]}>;
/** What Record/Review takes from outside the photometer core: the recorded name fixed at Start, the completion time, the telescope
 * pointing at Record (Obs+0x65f/+0x669) and Time-Dependent Data (env+0x2e8c, read by 0x54a76f during Record). */
export type PhotometerNativeInput=Readonly<{id:string;jd:number;ra:number;dec:number;timeDependent:boolean}>;
export type PhotometerNativeRecordEvent=Readonly<{type:'nativeRecord';readingId:number}&PhotometerNativeInput&{ok:boolean;remarks:string;spectralCode:number}>;
export const PHOTOMETER_NATIVE_EVENT_KEYS=Object.freeze(['type','readingId','id','jd','ra','dec','timeDependent','ok','remarks','spectralCode'] as const);
export class PhotometerNativeError extends Error{constructor(readonly code:'reading'|'input'){super(`Photometer record: ${code}`);this.name='PhotometerNativeError';}}
export const EMPTY_PHOTOMETER_NATIVE:PhotometerNativeState=Object.freeze({rows:Object.freeze([]),recorded:Object.freeze([])});

/** The reading Record/Review applies to: the shape the core needs from a PhotometerReading. */
export type PhotometerStructReading=Readonly<{id:number;kind:'sky'|'object';filter:PhotometerFilter;reduction:Readonly<{status:string;magnitude?:number|null}>|null}>;
/** Completion 0x5017cd–0x50182c: the struct's slot for an object reading is its magnitude, 0 when it is not available [D]. */
export function photometerStructSlot(r:PhotometerStructReading):number{
 const m=r.kind==='object'&&r.reduction?.status==='available'?r.reduction.magnitude:null;
 return typeof m==='number'&&Number.isFinite(m)?m:0;
}
export function photometerStructBands(r:PhotometerStructReading):readonly number[]{
 const slot=photometerStructSlot(r),at=PHOTOMETER_BAND_ORDER.indexOf(r.filter);
 return Object.freeze(Array.from({length:PHOTOMETER_BANDS},(_,i)=>i===at?slot:0));
}
/** Record1.Enabled after completion and Record (0x5018e5, 0x502033) [D; W kind fixed 1]: an object reading not yet recorded with OK. */
export function photometerStructRecordable(r:PhotometerStructReading|null,native:PhotometerNativeState|undefined):boolean{
 return !!r&&r.kind==='object'&&!(native?.recorded.includes(r.id)??false);
}
/** +0x6b0 = 0: the reading has a nonzero value that was not recorded with OK, or its Record/Review was cancelled (Cancel at
 * 0x501fab sets the flag whatever the slot holds; Front P3 review 1 L1). Start then asks "Telescope has Moved!" (0x4fffd4). */
export function photometerStructUnrecorded(r:PhotometerStructReading|null,native:PhotometerNativeState|undefined):boolean{
 return photometerStructRecordable(r,native)&&(photometerStructSlot(r!)!==0||(native?.cancelled?.includes(r!.id)??false));
}

export function validPhotometerNativeInput(p:PhotometerNativeInput):boolean{
 if(typeof p.id!=='string'||p.id.length<1||p.id.length>PHOTOMETER_NATIVE_LIMITS.id)return false;
 try{observationText(p.id,PHOTOMETER_NATIVE_LIMITS.id);}catch{return false;}
 return typeof p.jd==='number'&&Number.isFinite(p.jd)&&p.jd>=JD_MIN&&p.jd<=JD_MAX&&typeof p.ra==='number'&&Number.isFinite(p.ra)&&p.ra>=0&&p.ra<24
  &&typeof p.dec==='number'&&Number.isFinite(p.dec)&&Math.abs(p.dec)<=90&&typeof p.timeDependent==='boolean';
}
/** OK's stored text: remarks (36, printable Windows-1252) and a Sp code the results list can format; Cancel stores neither. */
export function validPhotometerNativeOutcome(e:Pick<PhotometerNativeRecordEvent,'ok'|'remarks'|'spectralCode'>):boolean{
 if(typeof e.ok!=='boolean'||typeof e.remarks!=='string'||!Number.isSafeInteger(e.spectralCode)||e.spectralCode<0||e.spectralCode>0x7fffffff)return false;
 if(!e.ok)return e.remarks===''&&e.spectralCode===0;
 try{observationText(e.remarks,PHOTOMETER_NATIVE_LIMITS.remarks);formatObservationType(e.spectralCode);}catch(error){if(error instanceof ObservationResultError)return false;throw error;}
 return true;
}

/** Record1Click 0x501e7c up to ShowModal: the merged record and its index (what the dialog shows). */
export function photometerNativeMerge(native:PhotometerNativeState|undefined,reading:PhotometerStructReading,input:PhotometerNativeInput):Readonly<{rows:readonly PhotometerNativeRow[];index:number;reused:boolean}>{
 if(!validPhotometerNativeInput(input))throw new PhotometerNativeError('input');
 const rows=native?.rows??[];
 const merged=photometerRecord(rows,{id:input.id,time:input.jd,ra:input.ra,dec:input.dec,kind:PHOTOMETER_NATIVE_KIND,bands:photometerStructBands(reading)},input.timeDependent);
 const out=merged.records.map((r,i)=>Object.freeze({id:r.id,time:r.time,ra:r.ra,dec:r.dec,kind:r.kind,bands:r.bands,spectralCode:rows[i]?.spectralCode??0,remarks:rows[i]?.remarks??''}));
 return Object.freeze({rows:Object.freeze(out),index:merged.index,reused:merged.reused});
}
/** Record/Review closed with OK or Cancel (the event the journal stores; owner 15). */
export function photometerNativeApply(native:PhotometerNativeState|undefined,reading:PhotometerStructReading,e:PhotometerNativeRecordEvent):PhotometerNativeState{
 if(!photometerStructRecordable(reading,native)||!validPhotometerNativeOutcome(e))throw new PhotometerNativeError('reading');
 const m=photometerNativeMerge(native,reading,e);
 const rows=e.ok?m.rows.map((r,i)=>i===m.index?Object.freeze({...r,remarks:e.remarks,spectralCode:e.spectralCode}):r):m.rows;
 const cancelled=e.ok?native?.cancelled:[...(native?.cancelled??[]),reading.id];
 return Object.freeze({rows:Object.freeze(rows),recorded:Object.freeze(e.ok?[...(native?.recorded??[]),reading.id]:[...(native?.recorded??[])]),...(cancelled?{cancelled:Object.freeze(cancelled)}:{})});
}

/** The rows as the 144-byte records VIREO's results list holds (layout: nativeObservationResults.ts), so the shared dialog
 * (FormActivate 0x54a91c), the Recorded Results list (0x5486a8) and the observation HR plot (0x542990) read them unchanged.
 * Time is the Double JD − 2415018.5 (exact by Sterbenz's lemma in the admitted JD range), RA/Dec and the bands the Extended of
 * each binary64 value [I: VIREO keeps the x87 Extended result], Z and velocity 0. */
export function photometerNativeData(rows:readonly PhotometerNativeRow[]):NativeObservationData{
 const bytes=new Uint8Array(rows.length*NATIVE_RESULT_BYTES),view=new DataView(bytes.buffer);
 rows.forEach((r,i)=>{
  const at=i*NATIVE_RESULT_BYTES,id=encodeNativeText(r.id,PHOTOMETER_NATIVE_LIMITS.id),remarks=encodeNativeText(r.remarks,PHOTOMETER_NATIVE_LIMITS.remarks);
  bytes[at]=id.length;bytes.set(id,at+1);
  view.setFloat64(at+16,r.time-NATIVE_TIME_BIAS,true);
  bytes.set(encodeHtlExtended(r.ra),at+24);bytes.set(encodeHtlExtended(r.dec),at+34);
  r.bands.forEach((v,k)=>bytes.set(encodeHtlExtended(v),at+44+10*k));
  bytes[at+94]=r.kind;view.setInt32(at+95,r.spectralCode,true);
  bytes[at+107]=remarks.length;bytes.set(remarks,at+108);
 });
 return parseNativeObservationResults(bytes);
}

/** The native texts of the Record/Review path [D]: menu caption (DFM Record1), the Start prompt 0x4fffd4 (0x50032c..0x5003c4),
 * its follow-up (0x5003dc/0x5003ec) and the first-OK message of Record1Click (0x502080/0x50210c). Lines end in CR LF natively. */
export const PHOTOMETER_RECORD_LITERALS=Object.freeze({
 menu:'&Record/Review',
 movedCaption:'Telescope has Moved!',
 movedText:(id:string)=>[`You have not recorded your current readings for "${id}".`,'If you do not record them now, you cannot access them later.','Record current readings?'] as const,
 notSavedCaption:'Data Not Saved!',notSavedText:'Current Readings Cleared!',
 savedCaption:'Data Saved',
 savedText:'Current readings added to results list.  View/Print/Save list under "Tools" -> "Results Editors" -> "Observational Results" on main Window.',
});
/** OK 0x54b02c for a photometer record: the remarks and the parsed Sp type. [W] A Sp text the native parser would not accept
 * (natively an unchecked path) or text outside printable Windows-1252 is refused and the dialog stays open, as for Hubble. */
export function photometerNativeOk(input:Readonly<{remarks:string;typeText:string}>):Readonly<{ok:true;remarks:string;spectralCode:number}>|Readonly<{ok:false}>{
 try{observationText(input.remarks,PHOTOMETER_NATIVE_LIMITS.remarks);const spectralCode=parseObservationType(input.typeText);formatObservationType(spectralCode);return Object.freeze({ok:true,remarks:input.remarks,spectralCode});}
 catch(e){if(e instanceof ObservationResultError)return Object.freeze({ok:false});throw e;}
}
