/** Front ONERESULTS: VIREO's one Observational Results list (analysis/front-oneresults/RECOVERY.md; plan
 * analysis/front-plans/front-oneresults.md). Static reading of CLEA_VEO.exe 781bc970…c54c; nothing executed or emulated. Pure.
 * Tags: [D] decoded, [I] inferred, [W] web choice, [U] unknown.
 *
 * [D] One list, `[[0x5b5bd4]]+0x480`, 0x90-byte records, built at FormCreate 0x546de0 with the order predicate 0x546db4 (VMT
 *     0x546790 slot +4): a > b ⇔ a.time > b.time, or equal times and a.RA > b.RA. Exactly three callers of find-or-add 0x54a73c:
 *     the photometer's Record1Click (0x501eb6), the classifier's Classification Results (0x50b20b) and Hubble Record Z
 *     (0x5839e6, exercise byte 3/4/7). One list, one ID space.
 * [D] 0x54a73c: Time-Dependent Data (env+0x2e8c) off → the first record, in list order, whose ShortString ID equals the full ID
 *     (core/recordReuse.ts); on, or a miss → 0x54a814: a zeroed record (ID cut to 15, the time, kind := Compute Magnitudes ≠ 0)
 *     inserted from the tail (0x4926d0) by the cursor insertion 0x492728 under 0x546db4, with key (time, RA = 0): the route
 *     writes RA/Dec and the rest into the stored record afterwards, and nothing re-sorts. The list is therefore not kept in
 *     insertion order.
 * [D] Route writes before ShowModal (RECOVERY §3) and OK 0x54b02c (remarks, Sp code, checked velocity); FormActivate 0x54aefc
 *     stores Single(c·z) as the velocity when Compute Rdshft Vel. is on, z ≠ 0 and the velocity is 0.
 * [D] Readers walk head → tail with no route filter: the HR plot 0x542990 (V +0x40, B +0x36, a zero skips), Display/Print Data
 *     0x542f2d.
 * [W] Compute Magnitudes is compiled on and read-only in the web (opticalOptions.ts), so a new record's kind is 1.
 * [W] The record JD is kept as a number in the admitted range or null (the stored Double 0, shown blank); the stored time is
 *     JD − 2415018.5, exact in that range. */
import {observationText,formatObservationType,ObservationResultError} from './observationResults';
import {recordReuseTarget,RECORD_ID_LENGTH} from './recordReuse';
import {encodeHtlExtended} from './hotList';
import {encodeNativeText,parseNativeObservationResults,NATIVE_RESULT_BYTES,NATIVE_RESULT_MAX_RECORDS,type NativeObservationData} from './nativeObservationResults';
import {NATIVE_TIME_BIAS} from './recordedResults';

export const OBSERVATION_LIST_POLICY='openvireo-observation-list-v35';
/** The DAT reader's bound (NATIVE_RESULT_MAX_RECORDS), a web limit. */
export const OBSERVATION_LIST_MAX=NATIVE_RESULT_MAX_RECORDS;
export const OBSERVATION_LIST_LIMITS=Object.freeze({id:RECORD_ID_LENGTH,remarks:36,bands:5});
/** The JD range of a stored record time (the photometer and Hubble records' range). */
export const OBSERVATION_LIST_JD=Object.freeze({min:2415020.5,max:2488069.5});
/** c of 0x54b020 as the web uses it (core/hubbleObservation.ts: the double product rounded to Single) [I]. */
const C_KMS=299792.458;
/** U, B, V, R, I slots (+0x2c + 10·i). */
export const OBSERVATION_LIST_BAND_ORDER=Object.freeze(['U','B','V','R','I'] as const);
export type ObservationListRecord=Readonly<{id:string;jd:number|null;ra:number;dec:number;bands:readonly number[];kind:0|1;spectralCode:number;
 /** Single (+0x63). */z:number;/** Single (+0x67). */velocity:number;remarks:string}>;
export type ObservationList=Readonly<{records:readonly ObservationListRecord[]}>;
export const EMPTY_OBSERVATION_LIST:ObservationList=Object.freeze({records:Object.freeze([])});
export class ObservationListError extends Error{constructor(readonly code:'limit'|'input'|'format'){super(`Observation list: ${code}`);this.name='ObservationListError';}}

const plus=(v:number)=>v===0?0:v;// −0 is stored as +0 (the zero tests treat both alike; one JSON form).
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const single=(v:unknown):v is number=>finite(v)&&Math.fround(v)===v;
function validJd(jd:unknown):jd is number|null{return jd===null||finite(jd)&&jd>=OBSERVATION_LIST_JD.min&&jd<=OBSERVATION_LIST_JD.max;}
function validText(text:unknown,maximum:number,minimum=0):text is string{
 if(typeof text!=='string'||text.length<minimum)return false;
 try{observationText(text,maximum);return true;}catch(e){if(e instanceof ObservationResultError)return false;throw e;}
}
function validCode(code:unknown):code is number{
 if(!Number.isSafeInteger(code)||(code as number)<0||(code as number)>0x7fffffff)return false;
 try{formatObservationType(code as number);return true;}catch(e){if(e instanceof ObservationResultError)return false;throw e;}
}
/** Every field of a record within what the list can hold. */
export function validObservationListRecord(r:ObservationListRecord):boolean{
 return validText(r.id,RECORD_ID_LENGTH,1)&&validJd(r.jd)&&finite(r.ra)&&r.ra>=0&&r.ra<24&&finite(r.dec)&&Math.abs(r.dec)<=90
  &&Array.isArray(r.bands)&&r.bands.length===5&&r.bands.every(finite)&&(r.kind===0||r.kind===1)&&validCode(r.spectralCode)
  &&single(r.z)&&single(r.velocity)&&validText(r.remarks,OBSERVATION_LIST_LIMITS.remarks)
  &&[r.ra,r.dec,r.z,r.velocity,...r.bands].every(v=>!Object.is(v,-0))&&(r.jd===null||!Object.is(r.jd,-0));
}

type Key=readonly [number,number];
/** 0x546db4 [D]: a > b. */
const greater=(a:Key,b:Key)=>a[0]!==b[0]?a[0]>b[0]:a[1]>b[1];
const storedTime=(jd:number|null)=>jd===null?0:jd-NATIVE_TIME_BIAS;
const keyOf=(r:ObservationListRecord):Key=>[storedTime(r.jd),r.ra];
/** 0x492728 with the cursor at the tail (0x4926d0), as 0x54a814 calls it [D 0x492728–0x4927fc]: the index the new record takes. */
export function observationListInsertionIndex(records:readonly ObservationListRecord[],jd:number|null):number{
 const n=records.length;if(!n)return 0;
 const key:Key=[storedTime(jd),0];let c=n-1;
 // new > current (the tail): forward walk; at the tail the record goes after it.
 if(greater(key,keyOf(records[c]!)))return n;
 // Backward: walk while not(new > current) and not at the head; insert after the first record the key exceeds.
 while(c!==0&&!greater(key,keyOf(records[c]!)))c--;
 if(c!==0)return c+1;
 // At the head (0x4927c8–0x4927f2): before it when head > new, else after it (an equal minimum head is followed).
 return greater(keyOf(records[0]!),key)?0:1;
}
/** 0x54a73c's search alone [D]: the record a Record of `id` would reuse now, or null (a new record). */
export function observationListFind(list:ObservationList,id:string,timeDependent:boolean):ObservationListRecord|null{
 const hit=recordReuseTarget(list.records.map(r=>r.id),id,timeDependent);return hit===null?null:list.records[hit]!;
}
/** [W] The classifier's time: the source's JD when it is in the admitted range, else none (stored 0, shown blank). */
export function observationListJd(jd:number|null|undefined):number|null{return typeof jd==='number'&&jd>=OBSERVATION_LIST_JD.min&&jd<=OBSERVATION_LIST_JD.max?jd:null;}
export type ObservationListPosition=Readonly<{list:ObservationList;index:number;created:boolean}>;
/** 0x54a73c / 0x54a814 [D]. `id` is the full ID (an ID longer than 15 never matches its own truncated record). */
export function observationListFindOrAdd(list:ObservationList,id:string,jd:number|null,timeDependent:boolean):ObservationListPosition{
 if(!validText(id,255,1)||!validJd(jd)||typeof timeDependent!=='boolean')throw new ObservationListError('input');
 const hit=recordReuseTarget(list.records.map(r=>r.id),id,timeDependent);
 if(hit!==null)return Object.freeze({list,index:hit,created:false});
 if(list.records.length>=OBSERVATION_LIST_MAX)throw new ObservationListError('limit');
 const record:ObservationListRecord=Object.freeze({id:id.slice(0,RECORD_ID_LENGTH),jd,ra:0,dec:0,bands:Object.freeze([0,0,0,0,0]),kind:1,spectralCode:0,z:0,velocity:0,remarks:''});
 const at=observationListInsertionIndex(list.records,jd),records=[...list.records];records.splice(at,0,record);
 return Object.freeze({list:Object.freeze({records:Object.freeze(records)}),index:at,created:true});
}
function replace(list:ObservationList,index:number,change:(r:ObservationListRecord)=>ObservationListRecord):ObservationList{
 const r=list.records[index];if(!r)throw new ObservationListError('input');
 const next=Object.freeze(change(r));if(!validObservationListRecord(next))throw new ObservationListError('input');
 return Object.freeze({records:Object.freeze(list.records.map((x,i)=>i===index?next:x))});
}
/** Record1Click 0x501e7c after 0x54a73c [D]: RA/Dec := the pointing only when the stored RA or Dec is 0; kind := the reading's;
 * band slot i := the reading's slot i when it is not 0. */
export function observationListPhotometer(list:ObservationList,index:number,w:Readonly<{ra:number;dec:number;kind:0|1;bands:readonly number[]}>):ObservationList{
 if(w.bands.length!==5)throw new ObservationListError('input');
 return replace(list,index,r=>({...r,...(r.ra===0||r.dec===0?{ra:plus(w.ra),dec:plus(w.dec)}:{}),kind:w.kind,bands:Object.freeze(r.bands.map((v,i)=>w.bands[i]!==0?w.bands[i]!:v))}));
}
/** 0x50b1dc after 0x54a73c [D]: RA/Dec := the spectrum's, always (0 when the web does not know them). */
export function observationListClassifier(list:ObservationList,index:number,w:Readonly<{ra:number;dec:number}>):ObservationList{
 return replace(list,index,r=>({...r,ra:plus(w.ra),dec:plus(w.dec)}));
}
/** RecordZ1Click 0x5839eb–0x583a6b [D]: z := Single(z); RA/Dec := the target's, always; in mode 4 with the target magnitude below
 * 99, V := that magnitude and kind := 1 (`vMagnitude` null otherwise). */
export function observationListHubble(list:ObservationList,index:number,w:Readonly<{z:number;ra:number;dec:number;vMagnitude:number|null}>):ObservationList{
 if(!single(w.z)||w.vMagnitude!==null&&!single(w.vMagnitude))throw new ObservationListError('input');
 return replace(list,index,r=>({...r,z:plus(w.z),ra:plus(w.ra),dec:plus(w.dec),...(w.vMagnitude!==null?{kind:1 as const,bands:Object.freeze(r.bands.map((v,i)=>i===2?plus(w.vMagnitude!):v))}:{})}));
}
/** FormActivate 0x54aedb–0x54aefc [D]: with Compute Rdshft Vel. on, z ≠ 0 and velocity 0, the record's velocity := Single(c·z). */
export function observationListActivate(list:ObservationList,index:number,computeRedshiftVelocity:boolean):ObservationList{
 const r=list.records[index];if(!r)throw new ObservationListError('input');
 if(!computeRedshiftVelocity||r.z===0||r.velocity!==0)return list;
 return replace(list,index,x=>({...x,velocity:plus(Math.fround(C_KMS*x.z))}));
}
/** OK 0x54b02c [D]: the remarks (36), the parsed Sp code and, when given, the checked velocity (Single). */
export function observationListOk(list:ObservationList,index:number,ok:Readonly<{remarks:string;spectralCode:number;velocity?:number}>):ObservationList{
 if(ok.velocity!==undefined&&!single(ok.velocity))throw new ObservationListError('input');
 return replace(list,index,r=>({...r,remarks:ok.remarks,spectralCode:ok.spectralCode,...(ok.velocity!==undefined?{velocity:plus(ok.velocity)}:{})}));
}

/** The records as the 144-byte records the list holds (layout: nativeObservationResults.ts), so the Observational Data dialog
 * (FormActivate 0x54a91c), the Recorded Results list (0x5486a8) and the HR plot (0x542990) read them unchanged. Time is the
 * Double JD − 2415018.5 (0 when there is none), RA/Dec and the bands the Extended of each binary64 value [I: VIREO keeps the
 * x87 result], z and velocity Single. */
export function observationListData(list:ObservationList):NativeObservationData{
 const rows=list.records;if(rows.length>OBSERVATION_LIST_MAX)throw new ObservationListError('limit');
 const bytes=new Uint8Array(rows.length*NATIVE_RESULT_BYTES),view=new DataView(bytes.buffer);
 rows.forEach((r,i)=>{
  const at=i*NATIVE_RESULT_BYTES,id=encodeNativeText(r.id,RECORD_ID_LENGTH),remarks=encodeNativeText(r.remarks,OBSERVATION_LIST_LIMITS.remarks);
  bytes[at]=id.length;bytes.set(id,at+1);
  view.setFloat64(at+16,storedTime(r.jd),true);
  bytes.set(encodeHtlExtended(r.ra),at+24);bytes.set(encodeHtlExtended(r.dec),at+34);
  r.bands.forEach((v,k)=>bytes.set(encodeHtlExtended(v),at+44+10*k));
  bytes[at+94]=r.kind;view.setInt32(at+95,r.spectralCode,true);
  view.setFloat32(at+99,r.z,true);view.setFloat32(at+103,r.velocity,true);
  bytes[at+107]=remarks.length;bytes.set(remarks,at+108);
 });
 return parseNativeObservationResults(bytes);
}

const RECORD_KEYS=['id','jd','ra','dec','bands','kind','spectralCode','z','velocity','remarks'] as const;
export const portableObservationList=(list:ObservationList)=>list.records.map(r=>({id:r.id,jd:r.jd,ra:r.ra,dec:r.dec,bands:[...r.bands],kind:r.kind,spectralCode:r.spectralCode,z:r.z,velocity:r.velocity,remarks:r.remarks}));
/** Session v35 restore: a bounded array of records, each one the list could hold. */
export function readObservationList(value:unknown):ObservationList{
 if(!Array.isArray(value)||value.length>OBSERVATION_LIST_MAX)throw new ObservationListError('format');
 const records=value.map(v=>{
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==RECORD_KEYS.length||RECORD_KEYS.some(k=>!Object.hasOwn(v,k)))throw new ObservationListError('format');
  const o=v as Record<string,unknown>;if(!Array.isArray(o.bands))throw new ObservationListError('format');
  const r=Object.freeze({id:o.id,jd:o.jd,ra:o.ra,dec:o.dec,bands:Object.freeze([...o.bands]),kind:o.kind,spectralCode:o.spectralCode,z:o.z,velocity:o.velocity,remarks:o.remarks}) as ObservationListRecord;
  if(!validObservationListRecord(r))throw new ObservationListError('format');
  return r;
 });
 return Object.freeze({records:Object.freeze(records)});
}
export const sameObservationList=(a:ObservationList,b:ObservationList)=>a===b||JSON.stringify(portableObservationList(a))===JSON.stringify(portableObservationList(b));

/** The photometer rows and Hubble records an investigation file kept before the shared list (photometer owner 15; Hubble v32). */
export type ObservationListSources=Readonly<{
 photometer:readonly Readonly<{id:string;time:number;ra:number;dec:number;kind:number;bands:readonly number[];spectralCode:number;remarks:string}>[];
 hubble:readonly Readonly<{id:string;jd:number;ra:number;dec:number;zSingle:number;velocitySingle:number;spectralCode:number;remarks:string;vMagnitude:number|null}>[]}>;
/** [W] Migration of a file saved before the shared list: those files kept the photometer's and Hubble's records in separate
 * lists and did not record the order between routes. Each photometer row (its list order), then each Hubble record (measurement
 * row order) becomes one record created through 0x54a814's insertion with its own time; no cross-route reuse is applied
 * retroactively. Classifications are kept in the browser notebook, not in the file, so none are migrated. */
export function migrateObservationList(s:ObservationListSources):ObservationList{
 let list=EMPTY_OBSERVATION_LIST;
 const add=(r:ObservationListRecord)=>{
  if(list.records.length>=OBSERVATION_LIST_MAX)throw new ObservationListError('limit');
  const record=Object.freeze({...r,bands:Object.freeze(r.bands.map(plus)),ra:plus(r.ra),dec:plus(r.dec)});
  if(!validObservationListRecord(record))throw new ObservationListError('input');
  const at=observationListInsertionIndex(list.records,record.jd),records=[...list.records];records.splice(at,0,record);
  list=Object.freeze({records:Object.freeze(records)});
 };
 for(const p of s.photometer)add({id:p.id.slice(0,RECORD_ID_LENGTH),jd:p.time,ra:p.ra,dec:p.dec,bands:p.bands,kind:p.kind===0?0:1,spectralCode:p.spectralCode,z:0,velocity:0,remarks:p.remarks});
 for(const h of s.hubble)add({id:h.id.slice(0,RECORD_ID_LENGTH),jd:h.jd,ra:h.ra,dec:h.dec,bands:[0,0,h.vMagnitude??0,0,0],kind:1,spectralCode:h.spectralCode,z:h.zSingle,velocity:h.velocitySingle,remarks:h.remarks});
 return list;
}
