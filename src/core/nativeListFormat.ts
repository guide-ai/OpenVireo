/** Sexagesimal split/format with 0, 1 or 2 second decimals (Front O). CLEA_VEO.exe 781bc970…c54c, static only:
 * split 0x486bc0 (sign from the value; whole := |Trunc|; minutes and seconds from the fraction ×60; the seconds carry when
 * Round(10^d·sec) = 60·10^d, minute 60 carries into the whole) and formatter 0x486ca0 (sign slot, whole wrapped below 360 and
 * left-padded to 4, minutes to 2 digits, seconds FloatToStrF(ffFixed, d) zero-prefixed when Trunc(Round(10^d·sec)/10^d) < 10).
 * For d = 1, 2 these equal radioAntenna.splitSexagesimal / variableStars.formatNativeSexagesimal (tested); d = 0 is what the
 * Star Data List header Dec lines use (0x534e18). Rounding is half-even (numeric policy; not x87). Pure. */
import {roundHalfEven,valueSign} from './radioAntenna';
import {delphiFixed} from './variableStars';

export type NativeSexagesimal=Readonly<{sign:-1|0|1;whole:number;minutes:number;seconds:number}>;
export function splitNativeSexagesimal(value:number,digits:0|1|2):NativeSexagesimal{
 if(!Number.isFinite(value)||(digits!==0&&digits!==1&&digits!==2))throw new RangeError('Invalid sexagesimal input');
 const sign=valueSign(value);let whole=Math.abs(Math.trunc(value));
 const f=Math.abs(value-Math.trunc(value))*60;let minutes=Math.trunc(f),seconds=(f-Math.trunc(f))*60;
 const scale=digits===0?1:digits===1?10:100;
 if(roundHalfEven(scale*seconds)===60*scale){seconds=0;minutes+=1;if(minutes===60){minutes=0;whole+=1;}}
 return Object.freeze({sign,whole,minutes,seconds});
}
export function formatNativeSexagesimalDigits(value:number,digits:0|1|2,separators:readonly [string,string,string]):string{
 const s=splitNativeSexagesimal(value,digits);let whole=s.whole;while(whole>=360)whole-=360;
 const scale=digits===0?1:digits===1?10:100,minutes=String(s.minutes).slice(0,2);
 const seconds=(Math.trunc(roundHalfEven(scale*s.seconds)/scale)<10?'0':'')+delphiFixed(s.seconds,digits);
 return ((s.sign<0?'-':' ')+whole).padStart(4,' ')+separators[0]+(minutes.length===1?'0'+minutes:minutes)+separators[1]+seconds+separators[2];
}
/** Left pad with a character to a minimum length (no truncation, as the native padding loops). */
export const padLeft=(s:string,n:number,c:string)=>s.length>=n?s:c.repeat(n-s.length)+s;
export const padRight=(s:string,n:number,c=' ')=>s.length>=n?s:s+c.repeat(n-s.length);
