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
import {foldAsciiCase} from '../core/radioHotListSearch';
import {delphiFixed} from '../core/variableStars';

export type SpectralLine=Readonly<{wavelength:number;name:string;file:string;row:string}>;
export class SpectralLineError extends Error{
 constructor(readonly line:number){super(`Spectral line list: line ${line}`);this.name='SpectralLineError';}
}
const latin1=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return s;};
function textLines(bytes:Uint8Array):string[]{
 const lines=latin1(bytes).split(/\r?\n/);if(lines.length>0&&lines[lines.length-1]==='')lines.pop();return lines;
}
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
 return Object.freeze(textLines(bytes).map((raw,n)=>{
  const s=raw.replace(/^ +/,''),space=s.indexOf(' '),first=space<0?s:s.slice(0,space);
  if(!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(first))throw new SpectralLineError(n+1);
  const wavelength=Math.fround(Number(first));
  const [name,rest]=quotedToken(space<0?'':s.slice(space)),[file]=quotedToken(rest);
  const shown=name.slice(0,35);
  return Object.freeze({wavelength,name:shown,file:file.slice(0,12),row:`${delphiFixed(wavelength,2)}   ${shown}`});
 }));
}

export type SpectralLineHelp=Readonly<{kind:'topic';rows:readonly string[]}|{kind:'not-found';caption:string;text:string}>;
export const SPECTRAL_LINE_HELP_CAPTION='Spectral Line Help';
/** 0x5049f0 + 0x504fd0. Rows: ' * ' + name + ' *', ' ', then '  ' + line + '  ' up to the next line that starts and ends
 * with '*', then ' '. A file whose first line is empty or does not start with '*' is shown whole. */
export function spectralLineHelp(txt:Uint8Array,name:string):SpectralLineHelp{
 if(!(txt instanceof Uint8Array)||txt.length>262144)throw new SpectralLineError(0);
 const title=name.replace(/^ +/,''),key=foldAsciiCase(title),lines=textLines(txt);
 let i=0;
 if(lines.length>0&&lines[0]!==''&&lines[0][0]==='*'){
  while(i<lines.length&&!(lines[i].includes('*')&&foldAsciiCase(lines[i]).includes(key)))i++;
  if(i===lines.length)return Object.freeze({kind:'not-found',caption:'Topic Not Found',text:`Help Topic: ${title}\r\n\r\nHelp on this topic is not available at this time.`});
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
