/** E02 Large-Scale Structure survey: pure student state (field choice, loaded list, own redshift records, results CSV).
 * Record Z, LSS branch (analysis/recovered-functions-seeded/record-z-seeded-dossier.c): when the exercise is not 3/4/7 the
 * measured z (stored Single, +0x2c) and the field centre RA/Dec (Extended, +0x18/+0x22) open the modal TLSSRsltsDlg1
 * "Measured Redshift Data" (Object, JD, RA, Dec, z, velocity, Remarks); OK adds one row to LSSRsltsForm, Cancel adds nothing.
 * Record creation 0x57c918 and the dialog's own FormActivate/OK bodies are NOT recovered: this module is a labelled web
 * adaptation of that flow. Velocity is the existing c·zSingle Single projection (hubbleVelocity.ts); RA/Dec are the
 * telescope pointing (the HTL row coordinates) and JD comes from the shared site clock. Records are in-memory student
 * observations (persistence is M6); nothing here invents a measurement. */
import {hubbleVelocity} from './hubbleVelocity';
import {LSS_FIELD_FILES,type LssFieldNumber} from './lssFields';

export const LSS_LIMITS=Object.freeze({records:250,object:24,remarks:40});
export class LssSurveyError extends Error{
 constructor(readonly code:'field'|'record'|'limit'|'pending'){super(`LSS survey: ${code}`);this.name='LssSurveyError';}
}
export type LssRecord=Readonly<{
 id:number;field:LssFieldNumber;row:number;telescope:0|1|2;object:string;jd:number;ra:number;dec:number;
 zSingle:number;zHex:string;velocitySingle:number;velocityHex:string;remarks:string;acquisitionPolicy:string;
}>;
/** The open "Measured Redshift Data" dialog: values fixed from the measurement, only Remarks (and the object label) editable. */
export type LssDraft=Readonly<{field:LssFieldNumber;row:number;telescope:0|1|2;object:string;jd:number;ra:number;dec:number;z:number;remarks:string;acquisitionPolicy:string}>;
export type LssSurveyState=Readonly<{field:LssFieldNumber|null;loaded:LssFieldNumber|null;records:readonly LssRecord[];draft:LssDraft|null;handedToWedge:number}>;
export const EMPTY_LSS_SURVEY:LssSurveyState=Object.freeze({field:null,loaded:null,records:Object.freeze([]),draft:null,handedToWedge:0});
const hex32=(v:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,v,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
const text=(s:unknown,max:number)=>{if(typeof s!=='string'||s.length>max||/[\u0000-\u001f\u007f]/.test(s))throw new LssSurveyError('record');return s;};
export function selectLssField(s:LssSurveyState,field:number):LssSurveyState{
 if(!LSS_FIELD_FILES.some(f=>f.field===field))throw new LssSurveyError('field');
 return Object.freeze({...s,field:field as LssFieldNumber,loaded:s.loaded===field?s.loaded:null});
}
/** The selected field's list was fetched, verified and parsed by the caller. */
export function markLssListLoaded(s:LssSurveyState,field:LssFieldNumber):LssSurveyState{
 if(s.field!==field)throw new LssSurveyError('field');return Object.freeze({...s,loaded:field});
}
/** Record Z: opens the dialog with the measured z. One dialog at a time. */
export function openLssRecord(s:LssSurveyState,d:Omit<LssDraft,'remarks'>):LssSurveyState{
 if(s.draft)throw new LssSurveyError('pending');
 if(!Number.isFinite(d.z)||Math.fround(d.z)<=-1||!Number.isFinite(d.jd)||!Number.isFinite(d.ra)||!Number.isFinite(d.dec)||d.ra<0||d.ra>=24||Math.abs(d.dec)>90)throw new LssSurveyError('record');
 hubbleVelocity(d.z);
 return Object.freeze({...s,draft:Object.freeze({...d,object:text(d.object,LSS_LIMITS.object),remarks:''})});
}
export function editLssDraft(s:LssSurveyState,change:Readonly<{object?:string;remarks?:string}>):LssSurveyState{
 if(!s.draft)throw new LssSurveyError('pending');
 return Object.freeze({...s,draft:Object.freeze({...s.draft,object:change.object===undefined?s.draft.object:text(change.object,LSS_LIMITS.object),remarks:change.remarks===undefined?s.draft.remarks:text(change.remarks,LSS_LIMITS.remarks)})});
}
/** OK: appends exactly one record. */
export function confirmLssRecord(s:LssSurveyState):LssSurveyState{
 const d=s.draft;if(!d)throw new LssSurveyError('pending');
 if(s.records.length>=LSS_LIMITS.records)throw new LssSurveyError('limit');
 const v=hubbleVelocity(d.z),zSingle=Math.fround(d.z);
 const record:LssRecord=Object.freeze({id:s.records.length+1,field:d.field,row:d.row,telescope:d.telescope,object:d.object.trim()||'—',jd:d.jd,ra:d.ra,dec:d.dec,zSingle,zHex:hex32(zSingle),velocitySingle:v.storedKmS,velocityHex:v.storedHex,remarks:d.remarks,acquisitionPolicy:d.acquisitionPolicy});
 return Object.freeze({...s,draft:null,records:Object.freeze([...s.records,record])});
}
/** Cancel / Escape: adds nothing. */
export function cancelLssRecord(s:LssSurveyState):LssSurveyState{return s.draft?Object.freeze({...s,draft:null}):s;}
/** Records not yet handed to the wedge, and the state after handing them. */
export function pendingWedgeRecords(s:LssSurveyState):readonly LssRecord[]{return s.records.slice(s.handedToWedge);}
export function markLssHandedToWedge(s:LssSurveyState):LssSurveyState{return Object.freeze({...s,handedToWedge:s.records.length});}
const cell=(value:string)=>'"'+(/^[\s]*[=+\-@]/.test(value)||/^[\t\r\n]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
/** OpenVireo results CSV (a web schema, not the native LSS .TXT writer 0x57af74). Text cells are formula-neutralised. */
export function lssResultsCsv(records:readonly LssRecord[]):string{
 const header='schema,id,field,row,telescope_record,object,jd,ra_hours,dec_degrees,z_float32,z_float32_hex,velocity_float32_km_s,velocity_float32_hex,remarks,acquisition_policy,numerical_policy';
 return header+'\r\n'+records.map(r=>[1,r.id,r.field,r.row+1,r.telescope,cell(r.object),r.jd,r.ra,r.dec,r.zSingle,r.zHex,r.velocitySingle,r.velocityHex,cell(r.remarks),cell(r.acquisitionPolicy),'Number_x87_equivalence_unvalidated'].join(',')).join('\r\n')+'\r\n';
}
