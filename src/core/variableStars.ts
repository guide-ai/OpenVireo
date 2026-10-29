import {roundHalfEven,splitSexagesimal} from './radioAntenna';
/** CLEA_VStrs.dat records and the "Variable Star Data" list (TVStarListForm1) of CLEA_VEO.exe
 * 781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c. Recovery notes, addresses and listings:
 * research analysis/front-v-variable-stars/RECOVERY.md; this module ports §3 and §6, docs/VARIABLE-STARS.md.
 * - 92-byte record, offsets read by the list fill 0x52ccec (they extend variableMerge.ts, which Front F owns);
 * - eleven list lines, in order, with the literals at 0x52d168..0x52d2c0 and the formatters 0x486ca0 (sexagesimal) and
 *   0x486268 (FloatToStrF ffFixed, 18 digits);
 * - the CepheidTypeObj Init 0x51f2d8 overwrites a zero M−m/D word with 50 in the in-memory record; a later list fill
 *   (FormShow rebuilds the list) then shows 0.50. That mutation is modelled explicitly by `riseDefaulted`.
 * Numeric policy (web): Singles are exact binary64 values; Extended epoch and period are decoded exactly with BigInt
 * for text and rounded to the nearest binary64 for computing. FloatToStrF follows FloatToDecimal 0x40cbb5 (18 digits ties to
 * even, then half up at the requested decimals; `floatToStrFFixed`). DecimalSeparator is not recovered; '.' is used. */

export const VSTRS_RECORD_BYTES=92;
export const VSTRS_RECORD_COUNT=31147;
export const VSTRS_FILE_BYTES=VSTRS_RECORD_BYTES*VSTRS_RECORD_COUNT;
/** Record offsets (decimal). */
export const VSTRS_OFFSETS=Object.freeze({name:0,ra:11,dec:19,type:27,maxFlag:38,max:39,minFlag:43,min:44,system:48,epoch:51,periodFlag:61,period:62,riseWord:72,spectrum:74});
// Type: 11 bytes at 27..37 (maxFlag at 38) = length byte + 10 characters; the list fill joins label + type with
// PStrNCat max 27 = 17 + 10 (0x52ce11).
const SHORT_MAX=Object.freeze({name:10,type:10,system:2,spectrum:17});

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
/** M−m/D is loaded with `fild WORD` (0x51f2de, 0x51f407, 0x52d0ab): a signed int16. Negative values do not occur and are
 * rejected. */
function riseWord(view:DataView):number{const w=view.getInt16(VSTRS_OFFSETS.riseWord,true);if(w<0)throw new VariableStarError('record');return w;}
export function decodeVariableStarRecord(bytes:Uint8Array,index:number):VariableStarRecord{
 if(!(bytes instanceof Uint8Array)||!Number.isSafeInteger(index)||index<0||(index+1)*VSTRS_RECORD_BYTES>bytes.length)throw new VariableStarError('index');
 const base=index*VSTRS_RECORD_BYTES,r=bytes.subarray(base,base+VSTRS_RECORD_BYTES),view=new DataView(r.buffer,r.byteOffset,VSTRS_RECORD_BYTES),o=VSTRS_OFFSETS;
 const raHours=view.getFloat64(o.ra,true),decDegrees=view.getFloat64(o.dec,true),max=view.getFloat32(o.max,true),min=view.getFloat32(o.min,true);
 if(!Number.isFinite(raHours)||raHours<0||raHours>=24||!Number.isFinite(decDegrees)||Math.abs(decDegrees)>90||!Number.isFinite(max)||!Number.isFinite(min))throw new VariableStarError('record');
 return Object.freeze({index,name:shortString(r,o.name,SHORT_MAX.name),raHours,decDegrees,type:shortString(r,o.type,SHORT_MAX.type),
  maxFlag:flag(r,o.maxFlag),max,minFlag:flag(r,o.minFlag),min,system:shortString(r,o.system,SHORT_MAX.system),
  epoch:decodeExtended(r,o.epoch),periodFlag:flag(r,o.periodFlag),period:decodeExtended(r,o.period),riseWord:riseWord(view),
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
/** Exact binary value of a finite Number (a Single or Double field), in the same form as a decoded Extended. */
export function exactFromNumber(value:number):ExactExtended{
 if(!Number.isFinite(value))throw new VariableStarError('record');
 if(value===0)return Object.freeze({negative:Object.is(value,-0),mantissa:0n,exponent:0,value});
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value);
 const hi=view.getUint32(0),lo=view.getUint32(4),biased=(hi>>>20)&0x7ff;
 let mantissa=(BigInt(hi&0xfffff)<<32n)|BigInt(lo),exponent:number;
 if(biased===0)exponent=-1074;else{mantissa|=1n<<52n;exponent=biased-1075;}
 // Normalize to a 64-bit mantissa with the top bit set, like an Extended.
 const shift=64-mantissa.toString(2).length;
 return Object.freeze({negative:value<0,mantissa:mantissa<<BigInt(shift),exponent:exponent-shift,value});
}
const roundHalfEvenRational=(num:bigint,den:bigint)=>{const q=num/den,r=num-q*den;return 2n*r>den||(2n*r===den&&(q&1n)===1n)?q+1n:q;};
const TEN18=10n**18n;
/** FloatToStrF(x, ffFixed, 18, digits) through FloatToDecimal 0x40cbb5 (called by 0x40cf28 via wrapper 0x486268) [D]:
 * E = ((floor(log2|x|)·0x4d10) sar 16) + 1; N = FRNDINT(|x|·10^(18−E)) (ties to even under control word 0x1332);
 * if N ≥ 10^18 then N := N/10 rounded again by FBSTP, E += 1; the 18 BCD digits are then cut at E + digits (capped at 18)
 * and rounded half up on the next digit ('5' or more, 0x40cc76), with carry; a cut below 0 gives zero. Web policy: the
 * scaling |x|·10^k is exact here, while 0x404984 scales in x87 Extended (an error of about one ulp is not reproduced). A
 * rounded zero prints without '-' (sign behaviour not traced). */
export function floatToStrFFixed(x:ExactExtended,digits:number):string{
 if(!Number.isInteger(digits)||digits<0||digits>18)throw new VariableStarError('record');
 let text:string;
 if(x.mantissa===0n)text='0'.repeat(digits+1);
 else{
  const log2=x.exponent+x.mantissa.toString(2).length-1;
  let E=Math.floor(log2*0x4d10/65536)+1;
  const k=18-E;
  // |x|·10^k = m·2^e·10^k as num/den.
  let num=x.mantissa,den=1n;
  if(x.exponent>=0)num<<=BigInt(x.exponent);else den<<=BigInt(-x.exponent);
  if(k>=0)num*=10n**BigInt(k);else den*=10n**BigInt(-k);
  let n=roundHalfEvenRational(num,den);
  if(n>=TEN18){n=roundHalfEvenRational(n,10n);E+=1;}
  let bcd=n.toString().padStart(18,'0');
  let cut=E+digits,integer:bigint;
  if(cut<0)integer=0n;
  else{
   if(cut>18)cut=18;
   let kept=cut===0?0n:BigInt(bcd.slice(0,cut));
   if(cut<18&&bcd.charCodeAt(cut)>=0x35)kept+=1n;// carry can add one digit: that is E+1 natively, the same number
   integer=kept*10n**BigInt(E+digits-cut);
  }
  text=integer.toString().padStart(digits+1,'0');
  void bcd;
 }
 if(digits>0)text=text.slice(0,-digits)+'.'+text.slice(-digits);
 return x.negative&&/[1-9]/.test(text)?'-'+text:text;
}
/** FloatToStrF ffFixed of a finite Number (Single/Double fields and computed seconds). */
export const delphiFixed=(value:number,digits:number)=>floatToStrFFixed(exactFromNumber(value),digits);
/** 0x486ca0: sign slot, whole (wrapped below 360) left-padded to 4, minutes to 2 digits, seconds FloatToStrF(digits)
 * with a '0' prefix when Round(Round(10^d)·sec) div Round(10^d) < 10; split by the ported 0x486bc0. */
export function formatNativeSexagesimal(value:number,digits:1|2,separators:readonly [string,string,string]):string{
 if(!Number.isFinite(value))throw new VariableStarError('record');
 const s=splitSexagesimal(value,digits);let whole=s.whole;while(whole>=360)whole-=360;
 const scale=digits===1?10:100,minutes=String(s.minutes).slice(0,2);
 const seconds=(Math.trunc(roundHalfEven(scale*s.seconds)/scale)<10?'0':'')+delphiFixed(s.seconds,digits);
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
  L[4]+record.maxFlag+dropOneZero(delphiFixed(record.max,2))+closeIfParen(record.maxFlag),
  L[5]+record.minFlag+dropOneZero(delphiFixed(record.min,2))+closeIfParen(record.minFlag),
  L[6]+record.system,
  L[7]+dropZeros(floatToStrFFixed(record.epoch,5)),
  L[8]+record.periodFlag+dropZeros(floatToStrFFixed(record.period,8))+closeIfParen(record.periodFlag),
  L[9]+delphiFixed(effectiveRiseWord(record,riseDefaulted)/100,2),
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
/** `type: null` matches every record; `''` matches only the records whose type text is blank. */
export type VariableStarQuery=Readonly<{name:string;type:string|null}>;
export const VARIABLE_STAR_RESULT_LIMIT=100;
const normalizeName=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
/** WEB: the original reaches one record from a clicked star; this page filters the catalog instead. Name: case-insensitive
 * substring after collapsing blanks; type: exact stored type text ('' = blank type), or null for all. Results keep file order. */
export function searchVariableStars(records:readonly VariableStarRecord[],query:VariableStarQuery,limit=VARIABLE_STAR_RESULT_LIMIT):Readonly<{total:number;rows:readonly VariableStarRecord[]}>{
 if(!query||typeof query.name!=='string'||(query.type!==null&&(typeof query.type!=='string'||query.type.length>10))||query.name.length>40||!Number.isSafeInteger(limit)||limit<1)throw new VariableStarError('index');
 const name=normalizeName(query.name),rows:VariableStarRecord[]=[];let total=0;
 for(const r of records){
  if(query.type!==null&&r.type!==query.type)continue;
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

