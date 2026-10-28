/** The photographic list as the original keeps it (Front F, static reading of CLEA_VEO.exe 781bc970…c54c).
 *
 * Loader 0x596bd0 (called from the population assembler at 0x597b61 the first time the global list 0x61fd00 is created) reads
 * GLIMAGES.LST line by line and parses each row with 0x596da8 inside try…except (handler table 0x59719a: class EConvertError, VMT 0x409cac →
 * 0x5971a6 sets the result false). The integer columns 7..10 (width, height, centre x, centre y → record +0x7f/+0x81/+0x83/+0x85)
 * go through StrToInt 0x40ad50, which raises EConvertError for an empty field (Val 0x4042e4 returns code 1 on a nil string,
 * 0x40435a). The caller (0x596ce8) inserts only rows that parsed, so a malformed row is dropped silently: in the approved
 * GLIMAGES.LST these are the 9 rows 6, 7, 9, 11, 19, 20, 91, 112 (NGC 4449) and 176. Every row whose BMP file is absent from the
 * archive is among them, so no association can name a missing file.
 * Name (record +0, String[18], 0x596dfa..0x596f78): a row starting with ',' (empty column 1) is named 'NGC ' + column 2
 * (0x597200); otherwise column 1, then column 1 + ' (NGC ' (0x597208, String[24] concat) + column 2 + ')' (0x597218); the
 * result is stored as String[18] (truncated to 18 characters). Column 3 (+0x23) is not used here.
 * This parser reproduces the keep/drop decision for the evident CSV format (other columns are the existing lssLists.ts parse). */
import {parseGlimagesPositions} from './lssLists';

/** Val 0x4042e4 as StrToInt 0x40ad50 uses it: leading spaces (0x20 only) skipped; one '+' or '-'; '$', 'x', 'X' or '0x'/'0X'
 * starts hexadecimal (at least one digit; pre-shift bound 0x0FFFFFFF, the 32-bit result wraps and is negated after '-');
 * otherwise decimal digits (pre-multiply bound 0x0CCCCCCC; the result must stay a non-negative Int32, or ≥ −2^31 after '-');
 * anything else, including a trailing space or an empty field, is an error (StrToInt raises EConvertError). */
export function nativeVal(text:string):number|null{
 let i=0;while(text[i]===' ')i++;
 let negative=false;if(text[i]==='-'||text[i]==='+'){negative=text[i]==='-';i++;}
 const rest=text.slice(i);
 const hex=/^(\$|x|X|0x|0X)/.exec(rest);
 if(hex){
  const digits=rest.slice(hex[0].length);if(!/^[0-9a-fA-F]+$/.test(digits))return null;
  let v=0;for(const d of digits){if(v>0x0fffffff)return null;v=v*16+parseInt(d,16);}
  v|=0;return negative?(-v)|0:v;
 }
 if(!/^[0-9]+$/.test(rest))return null;
 let v=0;for(const d of rest){if(v>0x0ccccccc)return null;v=v*10+(d.charCodeAt(0)-48);if(v>0xffffffff)v%=0x1_0000_0000;}
 if(negative)return v<=0x8000_0000?(v===0?0:-v):null;
 return v<=0x7fff_ffff?v:null;
}
export type PhotographRow=Readonly<{index:number;name:string;ra:number;dec:number;file:string;width:number;height:number;centreX:number;centreY:number}>;
function lines(bytes:Uint8Array):string[]{let text='';for(const b of bytes)text+=String.fromCharCode(b);const rows=text.replace(/\x1a$/,'').split('\r\n');if(rows[rows.length-1]==='')rows.pop();return rows;}
/** 0x596dfa..0x596f78: the photograph record's name from columns 1 and 2. */
export function nativePhotographName(column1:string,column2:string):string{
 if(column1==='')return ('NGC '+column2).slice(0,18);
 return ((column1.slice(0,18)+' (NGC ').slice(0,24)+column2+')').slice(0,18);
}
/** Rows the original keeps, with their GLIMAGES.LST index (positions as lssLists.ts parses them). */
export function nativePhotographRows(bytes:Uint8Array):readonly PhotographRow[]{
 const positions=parseGlimagesPositions(bytes),rows=lines(bytes),out:PhotographRow[]=[];
 for(const p of positions){
  const cols=rows[p.index].split(',');if(cols.length<10)continue;
  const ints=cols.slice(6,10).map(nativeVal);if(ints.some(v=>v===null))continue;
  const [width,height,centreX,centreY]=ints as number[];
  out.push(Object.freeze({index:p.index,name:nativePhotographName(cols[0],cols[1]),ra:p.ra,dec:p.dec,file:cols[5],width,height,centreX,centreY}));
 }
 return Object.freeze(out);
}
/** Positions in the shape packWithPhotographs expects, natively-dropped rows removed. */
export function nativePhotographPositions(bytes:Uint8Array):readonly Readonly<{index:number;ra:number;dec:number}>[]{
 return Object.freeze(nativePhotographRows(bytes).map(r=>Object.freeze({index:r.index,ra:r.ra,dec:r.dec})));
}
