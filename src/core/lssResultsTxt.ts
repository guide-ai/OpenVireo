/** Front L2: the native LSS results .TXT writer, CLEA_VEO.exe 781bc970…c54c, static reading only (never executed). Plan
 * analysis/front-plans/front-l2-lss.md §3; research analysis/front-l2-lss/rsltsdlg-txt-findings.md §3.
 *  - Writer 0x57af74 (Tools ▸ Results Editors ▸ Observational Results ▸ Save Data..., exercise byte 5): Writeln(header), then
 *    Writeln(row) per record in list order, CR LF, ANSI bytes [D; line ending and code page I from the RTL].
 *  - Header 0x57ae64 = WEDGE_NATIVE_HEADER (the wedge reader's gate, wedgeLssText.ts) [D].
 *  - Row 0x57b8e4 (also the list box line), concatenated with no other separators [D]:
 *    Copy(ID,1,11) right-padded to 12; Copy(FloatToStrF(JD, ffFixed, 18, 6), 4, 11) (the JD text minus its first 3
 *    characters); RA 0x486ca0(1, 'h','m','s'); Dec 0x486ca0(0, '°',"'",'"'); V: 12 spaces when v = 0, otherwise
 *    FloatToStrF(v, ffExponent, 4, 2) + ' ' (_LStrCat3 0x406148 at 0x57ba0d..0x57ba43: number, then ' ') left-padded to 12
 *    (Insert loop 0x57ba26); the remarks appended directly, so the trailing space separates V from them.
 *  - Default file name LSS_Redshifts.TXT, dialog title "Save Reshift Measurements in Text File" (typo verbatim) [D].
 * Web [W]: rows are written in the order they were recorded (natively the list's sorted (TDateTime, RA) order, 0x492728;
 * they differ only if the site clock was moved backwards). The file is a browser download (no folder, overwrite or IO-error
 * boxes); remarks are cut to the native 36
 * characters (ShortString[36]) and a character outside Windows-1252 is written as '?'. Number formatting uses the ported
 * helpers (nativeListFormat.ts, catalogObject.floatToStrFExponent4, variableStars.delphiFixed): half-even, not x87. Pure. */
import {formatNativeSexagesimalDigits,padLeft,padRight} from './nativeListFormat';
import {floatToStrFExponent4} from './catalogObject';
import {delphiFixed} from './variableStars';
import {WEDGE_NATIVE_HEADER} from './wedgeLssText';
import type {LssRecord} from './lssSurvey';

export const LSS_RESULTS_TXT=Object.freeze({defaultName:'LSS_Redshifts.TXT',title:'Save Reshift Measurements in Text File',filter:'Text Files (*.TXT)|*.TXT',remarks:36,id:11});
export type LssTxtRow=Pick<LssRecord,'object'|'jd'|'ra'|'dec'|'velocitySingle'|'remarks'>;
/** One row as 0x57b8e4 builds it (a string of Windows-1252 characters). */
export function lssResultsTxtRow(r:LssTxtRow):string{
 if(![r.jd,r.ra,r.dec,r.velocitySingle].every(Number.isFinite))throw new RangeError('LSS .TXT row');
 const jd=delphiFixed(r.jd,6).slice(3,14);
 const v=r.velocitySingle===0?' '.repeat(12):padLeft(floatToStrFExponent4(r.velocitySingle)+' ',12,' ');
 return padRight(r.object.slice(0,LSS_RESULTS_TXT.id),12)+jd+formatNativeSexagesimalDigits(r.ra,1,['h','m','s'])+
  formatNativeSexagesimalDigits(r.dec,0,['°',"'",'"'])+v+r.remarks.slice(0,LSS_RESULTS_TXT.remarks);
}
const CP1252='€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
function ansi(text:string):Uint8Array{
 return Uint8Array.from(text,c=>{const n=c.codePointAt(0)!;if(n<128||(n>=160&&n<256))return n;const i=CP1252.indexOf(c);return i>=0?128+i:0x3f;});
}
/** The whole file: header and one row per record, CR LF after each line. */
export function lssResultsTxtBytes(records:readonly LssTxtRow[]):Uint8Array{
 if(!records.length)throw new RangeError('LSS .TXT empty');
 return ansi([WEDGE_NATIVE_HEADER,...records.map(lssResultsTxtRow)].map(l=>l+'\r\n').join(''));
}
