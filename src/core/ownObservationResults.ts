import {HUBBLE_C_KM_S,HubbleVelocityError,hubbleVelocity,type HubbleVelocity} from './hubbleVelocity';
import {measurementGalaxyTarget} from './galaxyIdentity';
import type {Measurement,ShiftControl} from './spectrum';
import {formatObservationType} from './observationResults';
import {delphiFixed} from './variableStars';
/** Phase 1 item 1.12, new web adaptation: an immutable read-only projection of the
 * confirmed measurement log for the student's Observational Results view and its
 * text/CSV handoff. It is not a native CLEA results record, file or 0x90 layout and
 * stores nothing. The c·z column is derived from the stored float32 z by hubbleVelocity,
 * with the same exclusion statuses as hubbleVelocityCsv; no value is substituted.
 * Front H2 review 1 M3: a row recorded through Observational Data also carries its record: the typed velocity (blank when 0),
 * which VIREO's mode-4 results list shows in place of the Sp type (0x548a5a–0x548a95), and the record's Sp type, remarks and JD.
 * [W] The web shows both the velocity and the Sp type. */
export const OWN_RESULTS_SCHEMA='openvireo-own-results-web-1';
export const OWN_RESULTS_NUMERICAL_POLICY='Number_x87_equivalence_unvalidated';
export const OWN_RESULTS_VELOCITY_POLICY='velocity_float32 is the derived c*z_float32 study aid; typed_velocity is the value entered in Observational Data and used by the Hubble analysis; neither is relativistic or a distance';
/** Minimal archive identity: acquisitionObjectId supplies objectId (galaxy target or star record). */
export type OwnResultsArchiveEntry=Readonly<{acquisitionId:string;kind:string;objectId:string;sha256:string;name:string}>;
export type OwnResultSource='catalog-galaxy-acquisition'|'catalog-star-acquisition'|'imported-spectrum';
export type OwnResultBinding='bound'|'missing'|'not-applicable';
export type OwnVelocityStatus='derived'|'stellar-excluded'|'redshift'|'overflow'|'invalid';
export type OwnResultRow=Readonly<{
  id:number;object:string;file:string;sha256:string;source:OwnResultSource;acquisitionId:string;acquiredTargetId:string;binding:OwnResultBinding;
  reference:string;control:ShiftControl;zNumber:number;zFloat32:number;zFloat32Hex:string;velocityStatus:OwnVelocityStatus;
  referenceKmS?:number;velocityKmS?:number;velocityHex?:string;
  /** The Observational Data record, when the row has one: typed velocity (absent when the box was left empty), Sp type text,
   * remarks and the record JD (ffFixed 6). */
  record?:Readonly<{velocityKmS?:number;velocityHex?:string;spType:string;remarks:string;jd:string}>;
}>;
/** Same match rule as the session restore (analysisSession measurement), reported rather than assumed. */
function binding(row:Measurement,archive:readonly OwnResultsArchiveEntry[]):OwnResultBinding {
  const origin=row.origin;if(!origin)return 'not-applicable';
  const linked=archive.find(a=>a.acquisitionId===origin.acquisitionId);
  return linked&&linked.kind===origin.kind&&(origin.kind!=='catalog-galaxy-acquisition'||linked.objectId===measurementGalaxyTarget(origin))&&linked.sha256===row.sha256&&linked.name===row.file?'bound':'missing';
}
export function ownObservationResults(rows:readonly Measurement[],archive:readonly OwnResultsArchiveEntry[]):readonly OwnResultRow[] {
  return Object.freeze(rows.map(row=>{
    let status:OwnVelocityStatus='derived',velocity:HubbleVelocity|undefined;
    if(row.origin?.kind==='catalog-star-acquisition')status='stellar-excluded';
    else try{velocity=hubbleVelocity(row.zFloat32);}catch(e){status=e instanceof HubbleVelocityError&&(e.code==='redshift'||e.code==='overflow')?e.code:'invalid';}
    return Object.freeze({id:row.id,object:row.object,file:row.file,sha256:row.sha256,source:row.origin?.kind??'imported-spectrum',acquisitionId:row.origin?.acquisitionId??'',acquiredTargetId:measurementGalaxyTarget(row.origin)??'',binding:binding(row,archive),
      reference:row.reference,control:Object.freeze({...row.control}),zNumber:row.zNumber,zFloat32:row.zFloat32,zFloat32Hex:row.zFloat32Hex,velocityStatus:status,
      ...(velocity?{referenceKmS:velocity.referenceKmS,velocityKmS:velocity.storedKmS,velocityHex:velocity.storedHex}:{}),
      ...(row.observation?{record:Object.freeze({...(row.observation.velocitySingle!==0?{velocityKmS:row.observation.velocitySingle,velocityHex:row.observation.velocityHex}:{}),
        spType:formatObservationType(row.observation.spectralCode),remarks:row.observation.remarks,jd:delphiFixed(row.observation.jd,6)})}:{})});
  }));
}
/** Shortest round-trip decimal; −0 keeps its sign as -0 (String(-0) would print 0). */
const decimal=(value:number)=>Object.is(value,-0)?'-0':String(value);
const text=(value:string)=>'"'+(/^[\s\u0000-\u001f]*[=+\-@]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
const token=(value:string)=>/^[A-Za-z0-9._-]*$/.test(value)?value:text(value);
/** JSON string for the text handoff. JSON.stringify leaves these raw, so each is rewritten
 * as a lowercase \uXXXX escape: U+007F–U+009F (DEL, C1), U+061C, U+200E–U+200F,
 * U+2028–U+202E (line/paragraph separators, bidi embeddings/overrides) and U+2066–U+2069
 * (bidi isolates). Every JSON escape is ASCII, so no match lies inside one; JSON.parse
 * returns the original value. Other Unicode Cf characters are not escaped. */
const quoted=(value:string)=>JSON.stringify(value).replace(/[\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
const CSV_HEADER='schema,id,object,file,sha256,source_kind,acquisition_id,acquired_target_id,archive_binding,reference,analyst_step,base,position,factor,z_number,z_float32,z_float32_hex,c_km_s,reference_cz_km_s,velocity_float32_km_s,velocity_float32_hex,velocity_status,numerical_policy,velocity_policy,typed_velocity_float32_km_s,typed_velocity_float32_hex,sp_type,remarks,record_jd';
/** Separate new export: CRLF, no timestamps. Arbitrary user text (object, file, reference) and the
 * policy text are quoted and formula-neutralized; validated ASCII identity tokens (sha256, ids, hex)
 * may stay unquoted through token(). */
export function ownResultsCsv(view:readonly OwnResultRow[]):string {
  return [CSV_HEADER,...view.map(r=>[OWN_RESULTS_SCHEMA,String(r.id),text(r.object),text(r.file),token(r.sha256),r.source,token(r.acquisitionId),token(r.acquiredTargetId),r.binding,text(r.reference),
    decimal(r.control.step),decimal(r.control.base),decimal(r.control.position),decimal(r.control.factor),decimal(r.zNumber),decimal(r.zFloat32),token(r.zFloat32Hex),decimal(HUBBLE_C_KM_S),
    r.referenceKmS===undefined?'':decimal(r.referenceKmS),r.velocityKmS===undefined?'':decimal(r.velocityKmS),r.velocityHex===undefined?'':token(r.velocityHex),r.velocityStatus,OWN_RESULTS_NUMERICAL_POLICY,text(OWN_RESULTS_VELOCITY_POLICY),
    r.record?.velocityKmS===undefined?'':decimal(r.record.velocityKmS),r.record?.velocityHex===undefined?'':token(r.record.velocityHex),r.record?text(r.record.spType):'',r.record?text(r.record.remarks):'',r.record?r.record.jd:''].join(','))].join('\r\n')+'\r\n';
}
/** Readable handoff; text fields are quoted() JSON strings so quotes, newlines, controls and the listed format characters stay escaped. */
export function ownResultsText(view:readonly OwnResultRow[]):string {
  const lines=['OpenVireo own observational results (web adaptation)',`schema: ${OWN_RESULTS_SCHEMA}`,
    'scope: confirmed measurement-log rows only; unsaved adjustments and cancelled records are excluded',
    'format: browser text handoff; not a native CLEA results file or record layout',
    `velocity: velocity_float32 is derived v = c * z_float32 with c = ${decimal(HUBBLE_C_KM_S)} km/s (study aid); typed_velocity is the value entered in Observational Data, which the Hubble analysis uses; neither is relativistic or a distance`,
    'labels: object is the analyst-entered label on every row; source identity is source_kind, acquisition_id, acquired_target_id (galaxies only), sha256 and file',
    'imported rows: file name, object and SHA-256 are operator claims',
    'archive_binding: bound only when kind, SHA-256, file name and, for galaxy rows, target match an archived acquisition',
    `numerical_policy: ${OWN_RESULTS_NUMERICAL_POLICY}`,`rows: ${view.length}`];
  for(const r of view)lines.push('',`[measurement ${r.id}]`,`object: ${quoted(r.object)}`,`file: ${quoted(r.file)}`,`sha256: ${quoted(r.sha256)}`,`source_kind: ${r.source}`,
    `acquisition_id: ${r.acquisitionId?quoted(r.acquisitionId):'none'}`,`acquired_target_id: ${r.acquiredTargetId?quoted(r.acquiredTargetId):'none'}`,`archive_binding: ${r.binding}`,`reference: ${quoted(r.reference)}`,
    `control: step=${decimal(r.control.step)} base=${decimal(r.control.base)} position=${decimal(r.control.position)} factor=${decimal(r.control.factor)}`,
    `z_number: ${decimal(r.zNumber)}`,`z_float32: ${decimal(r.zFloat32)} (hex ${r.zFloat32Hex})`,`velocity_status: ${r.velocityStatus}`,
    `reference_cz_km_s: ${r.referenceKmS===undefined?'none':decimal(r.referenceKmS)}`,`velocity_float32_km_s: ${r.velocityKmS===undefined?'none':`${decimal(r.velocityKmS)} (hex ${r.velocityHex})`}`,
    ...(r.record?[`typed_velocity_float32_km_s: ${r.record.velocityKmS===undefined?'none':`${decimal(r.record.velocityKmS)} (hex ${r.record.velocityHex})`}`,`sp_type: ${quoted(r.record.spType)}`,`remarks: ${quoted(r.record.remarks)}`,`record_jd: ${r.record.jd}`]:[]));
  return lines.join('\n')+'\n';
}
