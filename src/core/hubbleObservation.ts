/** Front H2: Hubble "Record Measurements" through TObsRsltsDlg1 "Observational Data" (CLEA_VEO.exe 781bc970…c54c, static only;
 * analysis/front-plans/front-h2.md §4). Pure.
 * [D] RecordZ1Click 0x58383c, exercise byte ∈ {3,4,7}: rec := 0x54a73c(ID, time) — with Time-Dependent Data off (env+0x2e8c,
 *     compiled 0) the first record whose ID equals the measured object's exactly is reused and keeps its time; on, or on a miss, a
 *     new record — then rec.z(+0x63) := Single(z) and rec.RA/Dec := the target's (+0x31/+0x3b). In mode 4 (Hubble), when the
 *     target magnitude (+0x45, Single) is below 99.0 (0x583bc0), rec.V(+0x40) := that magnitude and +0x5e := 1 (0x583a40..0x583a6b).
 * [D] FormActivate 0x54a91c: JD = time + 2415018.5 (ffFixed 6), RA `HHh MMm SS.SSs`, Dec `±DD° MM' SS.S"`, z and velocity
 *     ffExponent 4 (blank when 0); a zero velocity is pre-filled with Single(c·z) only when Compute Rdshft Vel. is on and z ≠ 0
 *     (0x54aedb..0x54aefc). Sp.Type and Remarks are editable.
 * [D] OK 0x54b02c: stores the remarks (36) and the re-parsed Sp type; the typed velocity becomes a Single and must be within the
 *     Extended 0.01 of the unrounded c × Single z (checkHubbleVelocity, docs/HUBBLE-VELOCITY.md); otherwise "Velocity is incorrect
 *     or missing!…" (Velocity Error!, 0x54b278) or "Velocity calculation is invalid!" (0x54b24c), and the dialog stays open.
 * [W] Only catalogue-galaxy acquisitions take this path (VIREO's mode 4); stellar rows, imported and library spectra keep the
 *     web's confirmation (they have no catalogue target record here). Cancel records nothing (natively the record is inserted
 *     before ShowModal), and on a reused row it changes nothing, as in the LSS survey (Front L3). */
import {checkHubbleVelocity,HubbleVelocityError} from './hubbleVelocity';
import {floatToStrFExponent4} from './catalogObject';
import {delphiFixed,floatToStrFFixed,exactFromNumber} from './variableStars';
import {observationalDecText,observationalRaText,OBSERVATIONAL_DATA_LITERALS,type ObservationalDataFields} from './clusterNativeHrSelect';
import {formatObservationType,parseObservationType} from './observationResults';
import {padLeft} from './nativeListFormat';
import {LSS_DIALOG_TEXT} from './lssRedshiftDialog';

export const HUBBLE_OBSERVATION_POLICY='openvireo-hubble-observational-data-v32';
export const HUBBLE_OBSERVATION_LIMITS=Object.freeze({remarks:36,spType:12,id:15});
/** What OK stores in the observation record beside the measurement's own z (the Single z of the row). */
export type HubbleObservation=Readonly<{jd:number;ra:number;dec:number;spectralCode:number;velocitySingle:number;velocityHex:string;remarks:string;
 /** Catalogue V when below 99 (mode 4), else null. */vMagnitude:number|null}>;
export class HubbleObservationError extends Error{constructor(readonly code:'record'|'velocity'){super(`Hubble observation: ${code}`);this.name='HubbleObservationError';}}
const hex32=(v:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,v,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
export const fromHex32=(h:string)=>{if(!/^[0-9a-f]{8}$/.test(h))return NaN;const b=new DataView(new ArrayBuffer(4));b.setUint32(0,parseInt(h,16),false);return b.getFloat32(0,false);};

/** 0x54a73c / 0x57c918 [D]: with Time-Dependent Data off, the first record (here: a measurement row that has an observation
 * record) whose stored ID equals `id` exactly and case-sensitively; a longer ID than 15 never matches its own truncated copy.
 * Shared rule with the LSS survey's lssReuseTarget (Front L3). */
export function observationReuseTarget(rows:readonly Readonly<{object:string;observation?:HubbleObservation}>[],id:string,timeDependent:boolean):number|null{
 if(timeDependent||id.length>HUBBLE_OBSERVATION_LIMITS.id)return null;
 const i=rows.findIndex(r=>r.observation!==undefined&&r.object===id);return i<0?null:i;
}
/** The record the dialog opens on: a new one, or a reused one (its first time, velocity, remarks and Sp type). */
export type HubbleObservationDraft=Readonly<{id:string;jd:number;ra:number;dec:number;zSingle:number;vMagnitude:number|null;
 velocityText:string;remarks:string;spText:string;reused:boolean}>;
export function openHubbleObservation(p:Readonly<{id:string;jd:number;ra:number;dec:number;zSingle:number;targetMagnitude:number;computeRedshiftVelocity:boolean;reused:HubbleObservation|null}>):HubbleObservationDraft{
 if(![p.jd,p.ra,p.dec,p.zSingle,p.targetMagnitude].every(Number.isFinite)||Math.fround(p.zSingle)!==p.zSingle)throw new HubbleObservationError('record');
 const r=p.reused,vMagnitude=Math.fround(p.targetMagnitude)<99?Math.fround(p.targetMagnitude):null;
 // FormActivate: the record's own velocity first; a zero one is pre-filled only with Compute Rdshft Vel. and z ≠ 0 (0x54aedb).
 const own=r?.velocitySingle??0;
 const velocityText=own!==0?floatToStrFExponent4(own):p.computeRedshiftVelocity&&p.zSingle!==0?floatToStrFExponent4(Math.fround(299792.458*p.zSingle)):'';
 return Object.freeze({id:p.id.slice(0,HUBBLE_OBSERVATION_LIMITS.id),jd:r?r.jd:p.jd,ra:p.ra,dec:p.dec,zSingle:p.zSingle,vMagnitude:r&&vMagnitude===null?r.vMagnitude:vMagnitude,
  velocityText,remarks:r?.remarks??'',spText:r?formatObservationType(r.spectralCode):'',reused:!!r});
}
/** The dialog's boxes (K2's ObservationalDataDialog), as FormActivate writes them. */
export function hubbleObservationFields(d:HubbleObservationDraft):ObservationalDataFields{
 return Object.freeze({id:d.id,jd:delphiFixed(d.jd,6),ra:observationalRaText(d.ra),dec:observationalDecText(d.dec),sp:d.spText,
  z:d.zSingle===0?'':floatToStrFExponent4(d.zSingle),vel:d.velocityText,remarks:d.remarks,
  results:d.vMagnitude===null?null:OBSERVATIONAL_DATA_LITERALS.magnitudes,
  u:'',b:'',v:d.vMagnitude===null?'':padLeft(floatToStrFFixed(exactFromNumber(d.vMagnitude),3),10,' '),r:'',i:''});
}
export type HubbleObservationResult=Readonly<{ok:true;observation:HubbleObservation}>|Readonly<{ok:false;caption:string|null;message:string}>;
const VELOCITY_TEXT=/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/;
/** OK 0x54b02c. */
export function confirmHubbleObservation(d:HubbleObservationDraft,input:Readonly<{velocityText:string;remarks:string;spText:string}>):HubbleObservationResult{
 if(input.remarks.length>HUBBLE_OBSERVATION_LIMITS.remarks||input.spText.length>HUBBLE_OBSERVATION_LIMITS.spType||/[\u0000-\u001f\u007f]/.test(input.remarks+input.spText))throw new HubbleObservationError('record');
 let spectralCode:number;try{spectralCode=parseObservationType(input.spText);}catch{return {ok:false,caption:null,message:OBSERVATIONAL_SP_ERROR};}
 if(!VELOCITY_TEXT.test(input.velocityText))return {ok:false,caption:LSS_DIALOG_TEXT.velocityCaption,message:LSS_DIALOG_TEXT.velocityMissing};
 let accepted:{accepted:boolean;answerSingle:number};
 try{accepted=checkHubbleVelocity(d.zSingle,Number(input.velocityText.trim()));}
 catch(e){if(e instanceof HubbleVelocityError)return {ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid};throw e;}
 if(!accepted.accepted)return {ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid};
 return Object.freeze({ok:true,observation:Object.freeze({jd:d.jd,ra:d.ra,dec:d.dec,spectralCode,velocitySingle:accepted.answerSingle,velocityHex:hex32(accepted.answerSingle),remarks:input.remarks,vMagnitude:d.vMagnitude})});
}
/** [W] A Sp type that the native parser would not accept (natively an unchecked path) is refused with this text. */
export const OBSERVATIONAL_SP_ERROR='Sp.Type is not a spectral type the results list can store.';

/** Session v32 restore: a stored observation must be one OK could have stored for that row's Single z. */
export function readHubbleObservation(value:unknown,zSingle:number):HubbleObservation{
 const keys=['jd','ra','dec','spectralCode','velocityHex','remarks','vMagnitude'];
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw new HubbleObservationError('record');
 const v=value as Record<string,unknown>,num=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)?x:(()=>{throw new HubbleObservationError('record');})();
 const jd=num(v.jd),ra=num(v.ra),dec=num(v.dec);if(jd<2415020.5||jd>2488069.5||ra<0||ra>=24||Math.abs(dec)>90)throw new HubbleObservationError('record');
 if(!Number.isSafeInteger(v.spectralCode)||(v.spectralCode as number)<0)throw new HubbleObservationError('record');
 try{formatObservationType(v.spectralCode as number);}catch{throw new HubbleObservationError('record');}
 if(typeof v.remarks!=='string'||v.remarks.length>HUBBLE_OBSERVATION_LIMITS.remarks||/[\u0000-\u001f\u007f]/.test(v.remarks))throw new HubbleObservationError('record');
 const velocitySingle=fromHex32(String(v.velocityHex));if(!Number.isFinite(velocitySingle)||hex32(velocitySingle)!==v.velocityHex)throw new HubbleObservationError('velocity');
 let accepted=false;try{accepted=checkHubbleVelocity(zSingle,velocitySingle).accepted;}catch{accepted=false;}
 if(!accepted)throw new HubbleObservationError('velocity');
 const vMagnitude=v.vMagnitude===null?null:num(v.vMagnitude);if(vMagnitude!==null&&(Math.fround(vMagnitude)!==vMagnitude||vMagnitude>=99))throw new HubbleObservationError('record');
 return Object.freeze({jd,ra,dec,spectralCode:v.spectralCode as number,velocitySingle,velocityHex:v.velocityHex as string,remarks:v.remarks,vMagnitude});
}
export const portableHubbleObservation=(o:HubbleObservation)=>({jd:o.jd,ra:o.ra,dec:o.dec,spectralCode:o.spectralCode,velocityHex:o.velocityHex,remarks:o.remarks,vMagnitude:o.vMagnitude});
