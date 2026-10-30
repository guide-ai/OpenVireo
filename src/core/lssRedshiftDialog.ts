/** Front L2: TLSSRsltsDlg1 "Measured Redshift Data", CLEA_VEO.exe 781bc970…c54c, static reading only (never executed). Plan
 * analysis/front-plans/front-l2-lss.md §3 and §6 Q1 (coordinator decision of 2026-10-29); research
 * analysis/front-l2-lss/rsltsdlg-txt-findings.md §2.
 *  - FormActivate 0x57cab8 [D]: JD FloatToStrF(ffFixed, 18, 6); z FloatToStrF(ffExponent, 4, 2) of the stored Single z (blank
 *    when 0); RA split 0x486bc0 with 2 second decimals → IntToStr(h), IntToStr(m), ffFixed(sec, 2); Dec with 1 decimal, '-'
 *    from the sign; velocity blank (option +0x2e88 "compute velocity" off, its compiled default).
 *  - OKBtnClick 0x57cd80 [D]: z := StrToFloat(z text), so the stored z is re-quantised to the 4-significant-digit text (an
 *    EConvertError, i.e. the blank text of z = 0, gives 0); v := StrToFloat(velocity text), a conversion error →
 *    "Velocity is incorrect or missing!…" (caption "Velocity Error!"); |(v − c·z)/(c·z)| > 0.01, NaN included →
 *    "Velocity calculation is invalid!"; the dialog stays open on either. RA, Dec and JD edits are never read back.
 *  - [D] the check uses the Single fields the record stores: cz = c (Extended 0x57cfa4) × Single[+0x2c], then
 *    |(Single[+0x30] − cz)/cz| against the Extended 0.01 at 0x57cfb0, accept when ≤ (0x57cec8..0x57cef5; review 1).
 *  - [W] z = 0 (a blank z text): the web refuses with "Velocity calculation is invalid!"; natively the 0/0 or v/0 division
 *    raises an x87 EInvalidOp/EZeroDivide (control word 0x1332) that reaches the VCL default box.
 * Web [W]: RA/Dec are read-only boxes (the native edits are discarded); Cancel adds nothing (natively 0x57c918 inserts the record
 * before the dialog opens and Cancel never removes it); every OK is a new record (the native reuse-by-ID option +0x2e8c is not
 * recovered). Pure. */
import {floatToStrFExponent4} from './catalogObject';
import {splitNativeSexagesimal} from './nativeListFormat';
import {delphiFixed} from './variableStars';
import {HUBBLE_C_KM_S,HUBBLE_VELOCITY_TOLERANCE} from './hubbleVelocity';

export const LSS_DIALOG_TEXT=Object.freeze({
 velocityCaption:'Velocity Error!',velocityMissing:'Velocity is incorrect or missing!\r\nYou must supply a valid velocity for plotting.',
 velocityInvalid:'Velocity calculation is invalid!',
});
const hex32=(v:number)=>{const b=new DataView(new ArrayBuffer(4));b.setFloat32(0,v,false);return b.getUint32(0,false).toString(16).padStart(8,'0');};
const fromHex32=(h:string)=>{if(!/^[0-9a-f]{8}$/.test(h))return NaN;const b=new DataView(new ArrayBuffer(4));b.setUint32(0,parseInt(h,16),false);return b.getFloat32(0,false);};
export type LssDialogFields=Readonly<{jd:string;z:string;raH:string;raM:string;raS:string;decD:string;decM:string;decS:string}>;
/** FormActivate's texts for a draft (z is the measured value; the record stores it as Single). */
export function lssDialogFields(d:Readonly<{jd:number;z:number;ra:number;dec:number}>):LssDialogFields{
 const z=Math.fround(d.z),ra=splitNativeSexagesimal(d.ra,2),dec=splitNativeSexagesimal(d.dec,1);
 return Object.freeze({jd:d.jd===0?'':delphiFixed(d.jd,6),z:z===0?'':floatToStrFExponent4(z),
  raH:String(ra.whole),raM:String(ra.minutes),raS:delphiFixed(ra.seconds,2),
  decD:(dec.sign<0?'-':'')+String(dec.whole),decM:String(dec.minutes),decS:delphiFixed(dec.seconds,1)});
}
/** StrToFloat [I: Delphi TextToFloat, '.' separator, surrounding blanks allowed]; null on EConvertError. */
export function lssStrToFloat(s:string):number|null{
 return /^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(s)&&Number.isFinite(Number(s.trim()))?Number(s.trim()):null;
}
/** The z OK stores: StrToFloat of the displayed text, as Single (0 when the text does not convert). */
export function lssDialogZ(z:number):number{const v=lssStrToFloat(lssDialogFields({jd:0,z,ra:0,dec:0}).z);return Math.fround(v??0);}
/** The velocity rule on the stored Singles: true when |(v − c·z)/(c·z)| ≤ 0.01 (NaN fails). [W] Within 1e-12 of the limit
 * (where Number and x87 Extended could disagree) it is refused, as the Hubble route's check (hubbleVelocity.ts) does. */
export function lssVelocityAccepted(vSingle:number,zSingle:number):boolean{
 const cz=HUBBLE_C_KM_S*zSingle,ratio=Math.abs((vSingle-cz)/cz);
 return ratio<=HUBBLE_VELOCITY_TOLERANCE&&Math.abs(ratio-HUBBLE_VELOCITY_TOLERANCE)>1e-12;
}
export type LssDialogResult=Readonly<{ok:true;zSingle:number;zHex:string;velocitySingle:number;velocityHex:string}>|Readonly<{ok:false;caption:string|null;message:string}>;
/** OKBtnClick: the stored z and velocity, or the native message (caption null: the VCL default exception box). */
export function lssDialogOk(z:number,velocityText:string):LssDialogResult{
 const zSingle=lssDialogZ(z),v=lssStrToFloat(velocityText);
 if(v===null)return {ok:false,caption:LSS_DIALOG_TEXT.velocityCaption,message:LSS_DIALOG_TEXT.velocityMissing};
 const velocitySingle=Math.fround(v);
 if(!Number.isFinite(velocitySingle)||!lssVelocityAccepted(velocitySingle,zSingle))return {ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid};
 return Object.freeze({ok:true,zSingle,zHex:hex32(zSingle),velocitySingle,velocityHex:hex32(velocitySingle)});
}
/** Restore of a v31 record: its stored hexes must be what OK could have stored for the replayed z. */
export function lssDialogRecordValid(z:number,zHex:string,velocityHex:string):Readonly<{zSingle:number;velocitySingle:number}>|null{
 const zSingle=lssDialogZ(z),v=fromHex32(velocityHex);
 if(zHex!==hex32(zSingle)||!Number.isFinite(v)||hex32(v)!==velocityHex||!lssVelocityAccepted(v,zSingle))return null;
 return Object.freeze({zSingle,velocitySingle:v});
}
/** Front R3, Compute Rdshft Vel. (env+0x2e88): TLSSRsltsDlg1.FormActivate 0x57cab8 stores Single(c·z) into the record's velocity
 * (0x57cbcb, c Extended 299792.458 at 0x57cd68, no z≠0 guard) and shows it like z, FloatToStrF(ffExponent,4,2). The OK check is
 * unchanged (it never reads the option), so z = 0 is still refused there. */
export function lssPrefilledVelocity(z:number):string{return floatToStrFExponent4(Math.fround(HUBBLE_C_KM_S*Math.fround(z)));}
