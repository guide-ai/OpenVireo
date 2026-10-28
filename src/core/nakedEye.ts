/** Naked Eye Star (TNkdEyeDataForm, Front O FO-NE; docs/OBJECT-INFO-FORMS.md). CLEA_VEO.exe 781bc970…c54c, static only
 * (analysis/front-o-info-forms/RECOVERY-A-catalog-object.md §1.2, §4). NkdEye.dat (bundled byte-exact, user approval
 * 2026-10-28, 57,740 bytes, SHA-256 1d2f1045…3bddd) is read by loader 0x554e78: 20-byte records, sequential to EOF:
 * +0 Double RA (hours), +8 Double Dec (degrees), +16 Single V. A record is kept when V ≤ 5.5 (0x553c0b passes 5.5) and the
 * visibility test 0x5550b8 passes (geometry: nakedEyeSky.ts). The form (FormActivate 0x55334c) shows RA 0x486ca0(2,'h ','m ','s'),
 * Dec 0x486ca0(1,'° ',"' ",'"') and V FloatToStrF(ffFixed,18,3) with no blank rule; nothing is written back.
 * Pick 0x55526c: nearest record by pixel distance, initial best 10.0, strictly smaller wins (first in list order on ties);
 * marker 0x58d5c0 = 15×15 lime rectangle at (Round(x), Round(1.01·y)). Pure. */
import {delphiFixed,formatNativeSexagesimal} from './variableStars';

export const NKDEYE_FILE=Object.freeze({path:'/original/nakedeye/NkdEye.dat',name:'NkdEye.dat',bytes:57740,records:2887,sha256:'1d2f10450b8f72ca3dd2a84e83ac0c5df739646374d421aa4084308e9333bddd'});
export const NKDEYE_RECORD_BYTES=20;
export const NKDEYE_MAGNITUDE_LIMIT=5.5;
export const NAKED_EYE_LITERALS=Object.freeze({caption:'Naked Eye Star',ra:'RA:',dec:'Dec:',mag:'V Mag:',openError:'Unable to Open Naked Eye Data File!\r\n\r\nFile Name: '});
export class NakedEyeError extends Error{constructor(readonly code:'size'|'record'|'input'){super(`Naked eye: ${code}`);this.name='NakedEyeError';}}
export type NakedEyeRecord=Readonly<{index:number;raHours:number;decDegrees:number;magnitude:number}>;

/** All records in file order (the original reads to EOF; a trailing partial record or a non-finite field is refused). */
export function decodeNakedEyeFile(bytes:Uint8Array):readonly NakedEyeRecord[]{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength===0||bytes.byteLength%NKDEYE_RECORD_BYTES!==0||bytes.byteLength>NKDEYE_FILE.bytes*4)throw new NakedEyeError('size');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),out:NakedEyeRecord[]=[];
 for(let i=0;i<bytes.byteLength/NKDEYE_RECORD_BYTES;i++){
  const o=i*NKDEYE_RECORD_BYTES,ra=v.getFloat64(o,true),dec=v.getFloat64(o+8,true),m=v.getFloat32(o+16,true);
  if(![ra,dec,m].every(Number.isFinite)||ra<0||ra>=24||Math.abs(dec)>90)throw new NakedEyeError('record');
  out.push(Object.freeze({index:i,raHours:ra,decDegrees:dec,magnitude:m}));
 }
 return Object.freeze(out);
}
/** 0x553c0b: V ≤ 5.5 (the Single compared with the Extended limit). */
export const nakedEyeMagnitudeAdmits=(r:NakedEyeRecord,limit=NKDEYE_MAGNITUDE_LIMIT)=>r.magnitude<=limit;
/** FormActivate 0x55334c: the three edit texts. */
export function nakedEyeFormFields(r:NakedEyeRecord):Readonly<{ra:string;dec:string;mag:string}>{
 return Object.freeze({ra:formatNativeSexagesimal(r.raHours,2,['h ','m ','s']),dec:formatNativeSexagesimal(r.decDegrees,1,['° ',"' ",'"']),mag:delphiFixed(r.magnitude,3)});
}
export type NakedEyePoint=Readonly<{record:NakedEyeRecord;x:number;y:number}>;
/** 0x55526c: nearest within strictly less than 10.0 pixels, first in list order on ties; null when none. */
export function pickNakedEye(points:readonly NakedEyePoint[],x:number,y:number):NakedEyePoint|null{
 if(!Number.isFinite(x)||!Number.isFinite(y))throw new NakedEyeError('input');
 let best:NakedEyePoint|null=null,min=10;
 for(const p of points){const dx=x-p.x,dy=y-p.y,d=Math.sqrt(dx*dx+dy*dy);if(d<min){min=d;best=p;}}
 return best;
}
/** 0x58d5c0 marker centre (the 1.01 factor is applied to y only, in the marker). Rounding half-even (policy). */
export function nakedEyeMarker(p:NakedEyePoint):Readonly<{x:number;y:number}>{
 const r=(n:number)=>{const f=Math.floor(n),d=n-f;return d>.5?f+1:d<.5?f:(f%2===0?f:f+1);};
 return Object.freeze({x:r(p.x),y:r(1.01*p.y)});
}
