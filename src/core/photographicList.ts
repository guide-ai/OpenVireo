/** The photographic list as the original keeps it (Front F, static reading of CLEA_VEO.exe 781bc970…c54c).
 *
 * Loader 0x596bd0 (called from the population assembler at 0x597b61 the first time the global list 0x61fd00 is created) reads
 * GLIMAGES.LST line by line and parses each row with 0x596da8 inside try…except (handler table 0x59719a: class Exception →
 * 0x5971a6 sets the result false). The integer columns 7..10 (width, height, centre x, centre y → record +0x7f/+0x81/+0x83/+0x85)
 * go through StrToInt 0x40ad50, which raises EConvertError for an empty field (Val 0x4042e4 returns code 1 on a nil string,
 * 0x40435a). The caller (0x596ce8) inserts only rows that parsed, so a malformed row is dropped silently: in the approved
 * GLIMAGES.LST these are the 9 rows 6, 7, 9, 11, 19, 20, 91, 112 (NGC 4449) and 176. Every row whose BMP file is absent from the
 * archive is among them, so no association can name a missing file.
 * This parser reproduces the keep/drop decision for the evident CSV format (other columns are the existing lssLists.ts parse). */
import {parseGlimagesPositions} from './lssLists';

const INTEGER=/^\s*[+-]?(\d+|\$[0-9a-fA-F]+|0[xX][0-9a-fA-F]+)\s*$/;
export type PhotographRow=Readonly<{index:number;ra:number;dec:number;file:string;width:number;height:number;centreX:number;centreY:number}>;
function lines(bytes:Uint8Array):string[]{let text='';for(const b of bytes)text+=String.fromCharCode(b);const rows=text.replace(/\x1a$/,'').split('\r\n');if(rows[rows.length-1]==='')rows.pop();return rows;}
/** Rows the original keeps, with their GLIMAGES.LST index (positions as lssLists.ts parses them). */
export function nativePhotographRows(bytes:Uint8Array):readonly PhotographRow[]{
 const positions=parseGlimagesPositions(bytes),rows=lines(bytes),out:PhotographRow[]=[];
 for(const p of positions){
  const cols=rows[p.index].split(',');if(cols.length<10||!cols.slice(6,10).every(c=>INTEGER.test(c)))continue;
  const [width,height,centreX,centreY]=cols.slice(6,10).map(c=>Number.parseInt(c,10));
  out.push(Object.freeze({index:p.index,ra:p.ra,dec:p.dec,file:cols[5],width,height,centreX,centreY}));
 }
 return Object.freeze(out);
}
/** Positions in the shape packWithPhotographs expects, natively-dropped rows removed. */
export function nativePhotographPositions(bytes:Uint8Array):readonly Readonly<{index:number;ra:number;dec:number}>[]{
 return Object.freeze(nativePhotographRows(bytes).map(r=>Object.freeze({index:r.index,ra:r.ra,dec:r.dec})));
}
