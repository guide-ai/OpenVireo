/** Spectral Line Table (TSpLinesList) and Spectral Line Help (TSpLinesHelp) as pure data (Front H, docs/CLEA-HELP.md).
 * Static reading of CLEA_VEO.exe (SHA-256 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c), research
 * analysis/front-h-help/RECOVERY.md §6; nothing executed or emulated.
 * - list loader 0x505390: per line, the first space-delimited token is the wavelength (Single, rec+0), then two quoted
 *   tokens (0x4867fc, as in a help LST) are the line name (≤35, rec+4) and its help file (≤12, rec+0x28); the row is
 *   FloatToStrF(wavelength, ffFixed, 18, 2) + three spaces + name.
 * - help window 0x5049f0 with the seek 0x504fd0: the section is found by the line NAME (lower-cased substring of a header
 *   line containing '*'), not by its wavelength, so several rows open another line's section (for example every He I row
 *   opens "*3819.61   He I*"). That is VIREO's rule and is kept.
 * WEB: the wavelength text is parsed as binary64 and rounded to Single (VIREO converts through Extended; the 30 values of
 * SPECLNS.LNL give the same Single either way, see spectralLines.test.ts). */
/** Front ES5: TSpClassify's DFM menu item SpectralLineTable1 [D], the caption of the classification lab's Spectral Line Table
 * button (rendered through vireo()). */
export const SPECTRAL_LINE_TABLE_LITERALS=Object.freeze({menu:'Spectral Line &Table'});
import {foldAsciiCase} from '../core/radioHotListSearch';
import {CLUSTER_HR_CAPTIONS as C} from '../core/clusterHrCaptions';
import {delphiFixed} from '../core/variableStars';
import {cutColumns} from '../core/textColumns';

export type SpectralLine=Readonly<{wavelength:number;name:string;file:string;row:string}>;
export class SpectralLineError extends Error{
 constructor(readonly line:number){super(`Spectral line list: line ${line}`);this.name='SpectralLineError';}
}
const latin1=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return s;};
function splitLines(text:string):string[]{
 const lines=text.split(/\r?\n/);if(lines.length>0&&lines[lines.length-1]==='')lines.pop();return lines;
}
const textLines=(bytes:Uint8Array)=>splitLines(latin1(bytes));
function quotedToken(line:string):[string,string]{
 let i=0;while(i<line.length&&line.charCodeAt(i)===0x20)i++;
 if(i>=line.length)return ['',''];
 const quote=line[i],end=line.indexOf(quote,i+1);
 return end<0?[line.slice(i+1),'']:[line.slice(i+1,end),line.slice(end+2)];
}
/** 0x505390. WEB: a line whose first token is not a finite number is refused (the native conversion error path is not
 * traced; the bundled file has none). */
export function parseSpectralLineList(bytes:Uint8Array):readonly SpectralLine[]{
 if(!(bytes instanceof Uint8Array)||bytes.length>65536)throw new SpectralLineError(0);
 return spectralLines(textLines(bytes));
}
/** Front SC7: `parseSpectralLineList` for a translated list as Unicode text (at most 65536 UTF-16 units); the 35-character name
 * and 12-character file fields are cut at whole grapheme clusters within that many display columns (core/textColumns.ts), which
 * is the same cut for Latin-1 text. */
export function parseSpectralLineListText(text:string):readonly SpectralLine[]{
 if(typeof text!=='string'||text.length>65536)throw new SpectralLineError(0);
 return spectralLines(splitLines(text));
}
function spectralLines(lines:readonly string[]):readonly SpectralLine[]{
 return Object.freeze(lines.map((raw,n)=>{
  const s=raw.replace(/^ +/,''),space=s.indexOf(' '),first=space<0?s:s.slice(0,space);
  if(!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(first))throw new SpectralLineError(n+1);
  const wavelength=Math.fround(Number(first));
  const [name,rest]=quotedToken(space<0?'':s.slice(space)),[file]=quotedToken(rest);
  const shown=cutColumns(name,35);
  return Object.freeze({wavelength,name:shown,file:cutColumns(file,12),row:`${delphiFixed(wavelength,2)}   ${shown}`});
 }));
}

export type SpectralLineHelp=Readonly<{kind:'topic';rows:readonly string[]}|{kind:'not-found';caption:string;text:string;title:string}>;
export const SPECTRAL_LINE_HELP_CAPTION='Spectral Line Help';
/** 0x5049f0: the box shown when a line's help file is absent (caption, then head + file name + tail). Rendered through vireo()
 * (Front ES-HELP review S7). */
export const SPECTRAL_LINE_MISSING_LITERALS=Object.freeze({caption:'Sp Line Help not Available!',head:'Unable to open Spectral Line Help File.\r\n\r\nFile Name: ',tail:'\r\n\r\nFile Not Found!'});
/** 0x5049f0 + 0x504fd0. Rows: ' * ' + name + ' *', ' ', then '  ' + line + '  ' up to the next line that starts and ends
 * with '*', then ' '. A file whose first line is empty or does not start with '*' is shown whole. */
export function spectralLineHelp(txt:Uint8Array,name:string):SpectralLineHelp{
 if(!(txt instanceof Uint8Array)||txt.length>262144)throw new SpectralLineError(0);
 return lineHelp(textLines(txt),name);
}
/** Front SC7: `spectralLineHelp` for a translated SPECLNS.TXT as Unicode text (at most 262144 UTF-16 units); the same seek. */
export function spectralLineHelpText(text:string,name:string):SpectralLineHelp{
 if(typeof text!=='string'||text.length>262144)throw new SpectralLineError(0);
 return lineHelp(splitLines(text),name);
}
function lineHelp(lines:readonly string[],name:string):SpectralLineHelp{
 const title=name.replace(/^ +/,''),key=foldAsciiCase(title);
 let i=0;
 if(lines.length>0&&lines[0]!==''&&lines[0][0]==='*'){
  while(i<lines.length&&!(lines[i].includes('*')&&foldAsciiCase(lines[i]).includes(key)))i++;
  // The same box as the help viewer's (CLUSTER_HR_CAPTIONS, which the screen renders through vireo()); `title` for that.
  if(i===lines.length)return Object.freeze({kind:'not-found',caption:C.topicNotFoundCaption,text:C.topicNotFoundHead+title+C.topicNotFoundTail,title});
  i++;
 }
 const rows=[` * ${title} *`,' '];
 for(;i<lines.length;i++){const s=lines[i];if(s.length>0&&s[0]==='*'&&s[s.length-1]==='*')break;rows.push(`  ${s}  `);}
 rows.push(' ');
 return Object.freeze({kind:'topic',rows:Object.freeze(rows)});
}
/** The header line the seek stops at (for documentation and tests): the first '*' line containing the name. */
export function spectralLineHeader(txt:Uint8Array,name:string):string|null{
 const key=foldAsciiCase(name.replace(/^ +/,''));
 return textLines(txt).find(l=>l.includes('*')&&foldAsciiCase(l).includes(key))??null;
}
/** Reverse link 0x5058b8 (Front K2.5, research analysis/front-k2/D-multispec-help-line-click.md §5.4) [D]: the row with the
 * smallest |λc − row wavelength|, starting from a bound of 1000 Å with a strict `<`, so ties keep the first row; −1 when no
 * row is within 1000 Å. λc is the cursor's pixel-quantized wavelength. */
export function nearestSpectralLine(lines:readonly SpectralLine[],wavelength:number):number{
 let best=1000,index=-1;
 lines.forEach((l,i)=>{const d=Math.abs(wavelength-l.wavelength);if(d<best){best=d;index=i;}});
 return index;
}
