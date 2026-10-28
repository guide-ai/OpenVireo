import {formatFixed,roundHalfEven,splitSexagesimal} from './radioAntenna';
/** CLEA_VStrs.dat records and the "Variable Star Data" list (TVStarListForm1) of CLEA_VEO.exe
 * 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c. Recovery notes, addresses and listings:
 * research analysis/front-v-variable-stars/RECOVERY.md; this module ports §3 and §6, docs/VARIABLE-STARS.md.
 * - 92-byte record, offsets read by the list fill 0x52ccec (they extend variableMerge.ts, which Front F owns);
 * - eleven list lines, in order, with the literals at 0x52d168..0x52d2c0 and the formatters 0x486ca0 (sexagesimal) and
 *   0x486268 (FloatToStrF ffFixed, 18 digits);
 * - the CepheidTypeObj Init 0x51f2d8 overwrites a zero M−m/D word with 50 in the in-memory record; a later list fill
 *   (FormShow rebuilds the list) then shows 0.50. That mutation is modelled explicitly by `riseDefaulted`.
 * Numeric policy (web): Singles are exact binary64 values; Extended epoch and period are decoded exactly with BigInt
 * for text and rounded to the nearest binary64 for computing. FloatToStrF rounds the exact value half away from zero
 * [I: the Delphi 18-digit decimal stage is not re-derived]. DecimalSeparator is not recovered; '.' is used. */

export const VSTRS_RECORD_BYTES=92;
export const VSTRS_RECORD_COUNT=31147;
export const VSTRS_FILE_BYTES=VSTRS_RECORD_BYTES*VSTRS_RECORD_COUNT;
/** Record offsets (decimal). */
export const VSTRS_OFFSETS=Object.freeze({name:0,ra:11,dec:19,type:27,maxFlag:38,max:39,minFlag:43,min:44,system:48,epoch:51,periodFlag:61,period:62,riseWord:72,spectrum:74});
const SHORT_MAX=Object.freeze({name:10,type:11,system:2,spectrum:17});

export class VariableStarError extends Error{
 constructor(readonly code:'file-size'|'record'|'index'){super(`Variable star catalog: ${code}`);this.name='VariableStarError';}
}
/** An 80-bit Extended decoded exactly: value = sign × mantissa × 2^exponent (mantissa includes the explicit integer bit). */
export type ExactExtended=Readonly<{negative:boolean;mantissa:bigint;exponent:number;value:number}>;
export type VariableStarRecord=Readonly<{
 index:number;name:string;raHours:number;decDegrees:number;type:string;
 maxFlag:string;max:number;minFlag:string;min:number;system:string;
 epoch:ExactExtended;periodFlag:string;period:ExactExtended;riseWord:number;spectrum:string;
}>;

function shortString(bytes:Uint8Array,at:number,max:number):string{
 const length=bytes[at];if(length>max)throw new VariableStarError('record');
 let s='';for(let i=1;i<=length;i++){const c=bytes[at+i];if(c<0x20||c===0x7f)throw new VariableStarError('record');s+=String.fromCharCode(c);}// Latin-1
 return s;
}
function flag(bytes:Uint8Array,at:number):string{const c=bytes[at];if(c<0x20||c>0x7e)throw new VariableStarError('record');return String.fromCharCode(c);}
/** Zero or a normal finite Extended (explicit integer bit set); other encodings are rejected. */
export function decodeExtended(bytes:Uint8Array,at:number):ExactExtended{
 let mantissa=0n;for(let i=7;i>=0;i--)mantissa=(mantissa<<8n)|BigInt(bytes[at+i]);
 const top=bytes[at+8]|(bytes[at+9]<<8),negative=(top&0x8000)!==0,biased=top&0x7fff;
 if(biased===0&&mantissa===0n)return Object.freeze({negative,mantissa:0n,exponent:0,value:0});
 if(biased===0||biased===0x7fff||(mantissa>>63n)!==1n)throw new VariableStarError('record');
 const exponent=biased-16383-63;
 return Object.freeze({negative,mantissa,exponent,value:extendedToNumber(negative,mantissa,exponent)});
}
/** Nearest binary64 (ties to even) of ±m·2^e for a 64-bit m. */
function extendedToNumber(negative:boolean,mantissa:bigint,exponent:number):number{
 // Round the 64-bit mantissa to 53 bits, ties to even; then scale exactly (no subnormal/overflow in this catalog).
 const drop=11n,kept=mantissa>>drop,rest=mantissa&((1n<<drop)-1n),half=1n<<(drop-1n);
 let m=kept;if(rest>half||(rest===half&&(kept&1n)===1n))m+=1n;
 const v=Number(m)*2**(exponent+11);
 if(!Number.isFinite(v))throw new VariableStarError('record');
 return negative?-v:v;
}
export function decodeVariableStarRecord(bytes:Uint8Array,index:number):VariableStarRecord{
 if(!(bytes instanceof Uint8Array)||!Number.isSafeInteger(index)||index<0||(index+1)*VSTRS_RECORD_BYTES>bytes.length)throw new VariableStarError('index');
 const base=index*VSTRS_RECORD_BYTES,r=bytes.subarray(base,base+VSTRS_RECORD_BYTES),view=new DataView(r.buffer,r.byteOffset,VSTRS_RECORD_BYTES),o=VSTRS_OFFSETS;
 const raHours=view.getFloat64(o.ra,true),decDegrees=view.getFloat64(o.dec,true),max=view.getFloat32(o.max,true),min=view.getFloat32(o.min,true);
 if(!Number.isFinite(raHours)||raHours<0||raHours>=24||!Number.isFinite(decDegrees)||Math.abs(decDegrees)>90||!Number.isFinite(max)||!Number.isFinite(min))throw new VariableStarError('record');
 return Object.freeze({index,name:shortString(r,o.name,SHORT_MAX.name),raHours,decDegrees,type:shortString(r,o.type,SHORT_MAX.type),
  maxFlag:flag(r,o.maxFlag),max,minFlag:flag(r,o.minFlag),min,system:shortString(r,o.system,SHORT_MAX.system),
  epoch:decodeExtended(r,o.epoch),periodFlag:flag(r,o.periodFlag),period:decodeExtended(r,o.period),riseWord:view.getUint16(o.riseWord,true),
  spectrum:shortString(r,o.spectrum,SHORT_MAX.spectrum)});
}
/** The whole bundled file, in file order (sorted by RA in this copy). */
export function decodeVariableStarCatalog(bytes:Uint8Array):readonly VariableStarRecord[]{
 if(!(bytes instanceof Uint8Array)||bytes.length!==VSTRS_FILE_BYTES)throw new VariableStarError('file-size');
 const out:VariableStarRecord[]=new Array(VSTRS_RECORD_COUNT);
 for(let i=0;i<VSTRS_RECORD_COUNT;i++)out[i]=decodeVariableStarRecord(bytes,i);
 return Object.freeze(out);
}

// ------------------------------------------------------------------ text
/** FloatToStrF(x, ffFixed, 18, digits) of an exact Extended: half away from zero on the exact value; a rounded zero
 * keeps no '-'. */
export function formatExtendedFixed(x:ExactExtended,digits:number):string{
 if(!Number.isInteger(digits)||digits<0||digits>18)throw new VariableStarError('record');
 // |x|·10^d = m·2^e·10^d; rounded = floor(num/den + 1/2).
 let num=x.mantissa*10n**BigInt(digits),den=1n;
 if(x.exponent>=0)num<<=BigInt(x.exponent);else den<<=BigInt(-x.exponent);
 const rounded=(2n*num+den)/(2n*den);
 let s=rounded.toString().padStart(digits+1,'0');
 if(digits>0)s=s.slice(0,-digits)+'.'+s.slice(-digits);
 return x.negative&&rounded!==0n?'-'+s:s;
}
/** 0x486ca0: sign slot, whole (wrapped below 360) left-padded to 4, minutes to 2 digits, seconds FloatToStrF(digits)
 * with a '0' prefix when Round(Round(10^d)·sec) div Round(10^d) < 10; split by the ported 0x486bc0. */
export function formatNativeSexagesimal(value:number,digits:1|2,separators:readonly [string,string,string]):string{
 if(!Number.isFinite(value))throw new VariableStarError('record');
 const s=splitSexagesimal(value,digits);let whole=s.whole;while(whole>=360)whole-=360;
 const scale=digits===1?10:100,minutes=String(s.minutes).slice(0,2);
 const seconds=(Math.trunc(roundHalfEven(scale*s.seconds)/scale)<10?'0':'')+formatFixed(s.seconds,digits);
 return ((s.sign<0?'-':' ')+whole).padStart(4,' ')+separators[0]+(minutes.length===1?'0'+minutes:minutes)+separators[1]+seconds+separators[2];
}
/** Literals of the list fill (0x52d168..0x52d2c0), in line order. */
export const VARIABLE_STAR_LIST_LABELS=Object.freeze(['GCVS ID:         ','Right Ascension: ','Declination:     ','Variable Type:   ','Max. Magnitude:  ',
 'Min. Magnitude:  ','Mag. System:     ','Epoch(Jul. Day): ','Period(Days):    ','M-m/D(%):        ','Spectrum:        ']);
const dropOneZero=(s:string)=>s.endsWith('0')?s.slice(0,-1):s;
const dropZeros=(s:string)=>s.replace(/0+$/,'');
const closeIfParen=(f:string)=>f==='('?')':'';
/** M−m/D word that the in-memory record holds: 50 once a light-curve Init has replaced a zero (0x51f2d8). */
export function effectiveRiseWord(record:VariableStarRecord,riseDefaulted:boolean):number{return record.riseWord===0&&riseDefaulted?50:record.riseWord;}
/** The eleven ListBox lines of 0x52ccec. */
export function variableStarDataLines(record:VariableStarRecord,riseDefaulted=false):readonly string[]{
 const L=VARIABLE_STAR_LIST_LABELS;
 return Object.freeze([
  L[0]+record.name,
  L[1]+formatNativeSexagesimal(record.raHours,2,['h ','m ','s']),
  L[2]+formatNativeSexagesimal(record.decDegrees,1,['° ',"' ",'"']),
  L[3]+record.type,
  L[4]+record.maxFlag+dropOneZero(formatFixed(record.max,2))+closeIfParen(record.maxFlag),
  L[5]+record.minFlag+dropOneZero(formatFixed(record.min,2))+closeIfParen(record.minFlag),
  L[6]+record.system,
  L[7]+dropZeros(formatExtendedFixed(record.epoch,5)),
  L[8]+record.periodFlag+dropZeros(formatExtendedFixed(record.period,8))+closeIfParen(record.periodFlag),
  L[9]+formatFixed(effectiveRiseWord(record,riseDefaulted)/100,2),
  L[10]+record.spectrum,
 ]);
}
/** Save Text › As Displayed (0x52d9f8): one Writeln per ListBox item (CRLF), ANSI bytes. Characters outside Latin-1
 * cannot occur (the catalog strings are Latin-1 and the labels ASCII plus '°'). */
export function variableStarSaveText(lines:readonly string[]):Uint8Array{
 const text=lines.map(line=>line+'\r\n').join(''),out=new Uint8Array(text.length);
 for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c>0xff)throw new VariableStarError('record');out[i]=c;}
 return out;
}
/** WEB file name: the original dialog starts from an empty name (+0x3b4 is never set by this form) with extension .TXT;
 * the web download offers the GCVS ID with characters outside [A-Za-z0-9-] replaced by '_'. */
export function variableStarSaveFileName(record:VariableStarRecord):string{
 const stem=record.name.replace(/[^A-Za-z0-9-]+/g,'_').replace(/^_+|_+$/g,'')||'VARSTAR';
 return `${stem}.TXT`;
}

// ------------------------------------------------------------------ browsing (web adaptation)
export type VariableStarQuery=Readonly<{name:string;type:string}>;
export const VARIABLE_STAR_RESULT_LIMIT=100;
const normalizeName=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
/** WEB: the original reaches one record from a clicked star; this page filters the catalog instead. Name: case-insensitive
 * substring after collapsing blanks; type: exact stored type text, or '' for all. Results keep file order. */
export function searchVariableStars(records:readonly VariableStarRecord[],query:VariableStarQuery,limit=VARIABLE_STAR_RESULT_LIMIT):Readonly<{total:number;rows:readonly VariableStarRecord[]}>{
 if(!query||typeof query.name!=='string'||typeof query.type!=='string'||query.name.length>40||query.type.length>11||!Number.isSafeInteger(limit)||limit<1)throw new VariableStarError('index');
 const name=normalizeName(query.name),rows:VariableStarRecord[]=[];let total=0;
 for(const r of records){
  if(query.type&&r.type!==query.type)continue;
  if(name&&!normalizeName(r.name).includes(name))continue;
  total++;if(rows.length<limit)rows.push(r);
 }
 return Object.freeze({total,rows:Object.freeze(rows)});
}
/** Distinct stored type texts with their record counts, most frequent first, then by text. */
export function variableStarTypes(records:readonly VariableStarRecord[]):readonly Readonly<{type:string;count:number}>[]{
 const counts=new Map<string,number>();for(const r of records)counts.set(r.type,(counts.get(r.type)??0)+1);
 return Object.freeze([...counts].map(([type,count])=>Object.freeze({type,count})).sort((a,b)=>b.count-a.count||(a.type<b.type?-1:a.type>b.type?1:0)));
}

// ------------------------------------------------------------------ VarTypeHlp.TXT
export type VariableTypeHelpSection=Readonly<{title:string;lines:readonly string[]}>;
/** WEB: VarTypeHlp.TXT split at its own "**Title**" lines (the original help index VarTypeHlp.LST is not bundled).
 * Trailing blank lines of each section are dropped; text is shown as plain text, never as HTML. */
export function parseVariableTypeHelp(bytes:Uint8Array):readonly VariableTypeHelpSection[]{
 if(!(bytes instanceof Uint8Array)||bytes.length>65536)throw new VariableStarError('file-size');
 let text='';for(const b of bytes)text+=String.fromCharCode(b);
 const sections:{title:string;lines:string[]}[]=[];
 for(const line of text.split(/\r?\n/)){
  const heading=/^\*\*(.+)\*\*$/.exec(line);
  if(heading){sections.push({title:heading[1],lines:[]});continue;}
  if(sections.length)sections[sections.length-1].lines.push(line);
 }
 return Object.freeze(sections.map(s=>{const lines=[...s.lines];while(lines.length&&!lines[lines.length-1].trim())lines.pop();return Object.freeze({title:s.title,lines:Object.freeze(lines)});}));
}
