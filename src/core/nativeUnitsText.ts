/** CLEA's whole-unit + decimal-minute formatter 0x486f4c (with the decomposition 0x486b20), shared by the receiver beam
 * text (0x572f8c: one decimal, ' Deg ', "'") and the LSS field list item 0x52b10c (no decimal; 'Hr ', 'Min' for RA and
 * '° ', "'" for Dec). Static reading of CLEA_VEO.exe 781bc970…c54c; never executed.
 * [D] 0x486b20: sign := Sign(v) (0x4272d4), whole := |Trunc v|, f := |Frac v| × 60, minutes := Trunc f, seconds := Frac f × 60.
 * [D] 0x486f4c: scale := Round(Power(10, decimals)) (0x42703c, 0x403700); m := minutes + seconds / 60 (Single 60.0 at
 *     0x48715c); r := Round(scale × m); r = 60 × scale carries (m := 0, whole + 1); whole wraps below 360 (0x168); head is
 *     ShortString[4] of ('-' or ' ') + IntToStr(whole), left-padded with ' ' (0x487160) through ShortString[5] until it has
 *     four characters; the minutes text is FloatToStrF ffFixed (0x486268) with a '0' (0x48716c) prefix when r div scale < 10
 *     (the pre-carry r: quirk kept); result = head + unit + minutes + minuteUnit (0x4061c4, four parts).
 * [W] Binary64 arithmetic (WEB-RX-NUM-01), not x87 Extended; FloatToStrF's DecimalSeparator is '.' (formatFixed).
 * [W] Range: 0x486b20 keeps |Trunc v| as a dword (0x486b3e..0x486b4e: Trunc 0x40370c to Int64, negate when negative, store
 *     the low dword) and 0x486f4c compares it signed with 360 (0x48701a jge), so a value whose whole part (after the carry)
 *     no longer fits a positive Integer behaves differently; such values and non-finite ones throw
 *     NativeUnitsRangeError instead. In range the subtract-360 loop is whole mod 360. */
import {roundNearestEven} from './numericPolicy';
import {formatFixed} from './radioAntenna';

/** ShortString literals of 0x486f4c: head pad 0x487160, minutes prefix 0x48716c. */
export const NATIVE_UNITS_LITERALS=Object.freeze({pad:' ',zero:'0'});
const cap=(s:string,n:number)=>s.length>n?s.slice(0,n):s;

/** Largest |Trunc v| admitted: the 60-minute carry may add one and the result must stay a positive signed dword. */
export const NATIVE_UNITS_MAX_WHOLE=0x7ffffffe;
export class NativeUnitsRangeError extends RangeError{constructor(readonly value:number){super('native-units-range');this.name='NativeUnitsRangeError';}}
export function formatNativeUnits(v:number,decimals:number,unit:string,minuteUnit:string):string{
 if(!Number.isInteger(decimals)||decimals<0||decimals>4)throw new RangeError('decimals');
 if(!Number.isFinite(v)||Math.abs(Math.trunc(v))>NATIVE_UNITS_MAX_WHOLE)throw new NativeUnitsRangeError(v);
 const sign=v>0?1:v<0?-1:0,scale=roundNearestEven(10**decimals),f=Math.abs(v-Math.trunc(v))*60,minutes=Math.trunc(f);
 let whole=Math.abs(Math.trunc(v)),m=minutes+(f-minutes)*60/60;
 const r=roundNearestEven(scale*m);
 if(r===60*scale){m=0;whole++;}
 whole%=360;// the 0x48700c loop for 0 ≤ whole ≤ 2^31 − 1
 let head=cap((sign<0?'-':' ')+String(whole),4);
 while(head.length<4)head=cap(cap(NATIVE_UNITS_LITERALS.pad+head,5),4);
 let text=formatFixed(m,decimals);
 if(Math.trunc(r/scale)<10)text=NATIVE_UNITS_LITERALS.zero+text;
 return head+unit+text+minuteUnit;
}
