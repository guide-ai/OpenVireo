/** Radio Slew ▸ Hot List ▸ View/Select row text (RA-HL-08, docs/RADIO-ANTENNA-PROVENANCE.json). CLEA_VEO.exe
 * 781bc970…c54c, static listings only (/tmp/clea-static-research/radio-hotlist-format-20261026/, no execution):
 * the refresh 0x5905e8..0x59070b copies each 86-byte record and calls 0x590110 when byte +0x383f is 6 or 5 or byte
 * +0x2e7e is nonzero (otherwise the ordinal formatter 0x590248, not ported). 0x590110..0x5901f3 pads the ID
 * ShortString[24] on the right with the one-space literal 0x5901fc until its length is at least 24, then concatenates
 * it with RA (0x486ca0, digits 2, suffixes 0x590220 'h ', 0x590214 'm ', 0x590208 's '), Dec (0x486ca0, digits 1,
 * suffixes 0x590244 B0+' ', 0x590238 "' ", 0x59022c '"  ') and the remarks ShortString[40]: no ordinal, no separator.
 * 0x486ca0..0x486f32 splits through 0x486bc0 (splitSexagesimal), subtracts 360 while the whole part is ≥ 360, writes
 * '-' (negative sign) or ' ' before IntToStr(whole) and left-pads with the cell 0x486f38 ' ' to length 4, pads minutes
 * with the cell 0x486f3c '0' to length 2, formats the seconds with FloatToStrF ffFixed (0x486268, formatFixed) and
 * prefixes the literal 0x486f48 '0' iff Trunc(Round(10^d × seconds) / Round(10^d)) < 10.
 * Web policy (WEB-HL-07): binary64 Number, toFixed, '.' and B0 shown as U+00B0 (code page unknown); no x87,
 * FloatToStrF, control-word, locale or GDI parity. Display text only: never fed back into the target, order or codec.
 * Inputs outside the codec domain are refused instead of reproducing the native ShortString truncations. */
import {formatFixed,roundHalfEven,splitSexagesimal} from './radioAntenna';
import type {HtlFields} from './hotList';

function field(value:number,digits:1|2,[a,b,c]:readonly [string,string,string]):string{
 const s=splitSexagesimal(value,digits);let whole=s.whole;
 while(whole>=360)whole-=360;// 0x486d19: 360, not 24; unreachable in the codec domain
 const scale=digits===1?10:100;
 const first=((s.sign<0?'-':' ')+whole).padStart(4,' ');
 const minutes=String(s.minutes).padStart(2,'0');
 const seconds=(Math.trunc(roundHalfEven(scale*s.seconds)/scale)<10?'0':'')+formatFixed(s.seconds,digits);
 return first+a+minutes+b+seconds+c;
}
/** RA field of one row, for the codec domain 0 ≤ ra < 24. A carry can display 24h. */
export function formatHotListRa(ra:number):string{
 if(!Number.isFinite(ra)||ra<0||ra>=24)throw new RangeError('Unsupported hot list RA');
 return field(ra,2,['h ','m ','s ']);
}
/** Dec field of one row, for the codec domain |dec| ≤ 90. A subdegree negative value keeps its '-'; −0 does not. */
export function formatHotListDec(dec:number):string{
 if(!Number.isFinite(dec)||Math.abs(dec)>90)throw new RangeError('Unsupported hot list Dec');
 return field(dec,1,['° ',"' ",'"  ']);
}
const LATIN1=/^[\x20-\x7e\xa0-\xff]*$/;
/** 0x590110 row: ID padded to 24 + RA + Dec + remarks. */
export function formatRadioHotListRow(row:HtlFields):string{
 const {id,remarks}=row;
 if(typeof id!=='string'||typeof remarks!=='string'||id.length>24||remarks.length>40||!LATIN1.test(id)||!LATIN1.test(remarks))throw new RangeError('Unsupported hot list text');
 return id.padEnd(24,' ')+formatHotListRa(row.ra)+formatHotListDec(row.dec)+remarks;
}
