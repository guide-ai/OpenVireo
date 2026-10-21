import{wedgeDecimalToSingle,wedgeVelocityFromZ,wedgeZFromVelocity,type WedgeBinary32}from'./wedgeNumeric';
/** VIREO LSS "Load Saved Data" text reader (N06/E02), static recovery from
 * CLEA_VEO.exe SHA256 781bc970…c52c54c. Never executed.
 * - TEnvironment1 LSS branch 0x5891ef..0x5893e7 (exercise byte+0x383f=5): ".TXT" only.
 * - Loader 0x57bfb4: header gate, retain/clear prompt, rows → list+0x44a.
 * - Row parser 0x57b488 with helpers 0x48672c (token), 0x486a00 (StrToInt to
 *   delimiter), 0x48690c (StrToFloat to delimiter), 0x486c40 (d/m/s), 0x485960 (sign).
 * The browser admits a strict subset (ASCII+0xB0 bytes, LF/CRLF, no blank row,
 * plain decimal spellings). Anything the original might parse differently stays
 * explicit as `unadmitted`; definite native zero-fill stays `native-zero-fill`.
 * Neither is plotted. No acquisition, catalog, distance or Hubble value is added. */
export const WEDGE_EXECUTABLE_SHA256='781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c';
export const WEDGE_EVIDENCE_ID='VIREO-LSS-WEDGE-STATIC-2026-10-21';
/** Header written by 0x57ae64 (strings 0x57aec8 + 0x57aee8). */
export const WEDGE_NATIVE_HEADER='Object ID    MJD(Days)      RA           Dec     V(km/sec)  Comments';
export const WEDGE_LIMITS=Object.freeze({fileBytes:512*1024,lineBytes:1024,rows:2000,workspaceRecords:10000,tokenChars:64});

export type WedgeSeparator='.'|',';
export type WedgeFieldStatus='value'|'native-zero-fill'|'unadmitted';
export type WedgeRa=Readonly<{status:'value';hours:number;h:number;m:number;s:number}>|Readonly<{status:'native-zero-fill'|'unadmitted';reason:string}>;
export type WedgeDec=Readonly<{status:'value';degrees:number;signLost:boolean}>|Readonly<{status:'native-zero-fill'|'unadmitted';reason:string}>;
export type WedgeRedshift=Readonly<{status:'value';source:'velocity'|'z';velocity:WedgeBinary32;z:WedgeBinary32;boundary:boolean}>|Readonly<{status:'native-zero-fill'|'unadmitted';reason:string}>;
export type WedgeRecord=Readonly<{
 source:number;line:number;raw:string;
 objectId:string;mjdRaw:string;raRaw:string;decRaw:string;redshiftRaw:string;
 /** null when the original comment depends on an unadmitted V/Z parse outcome. */
 comment:string|null;
 ra:WedgeRa;dec:WedgeDec;redshift:WedgeRedshift;
}>;
export type WedgeParsedFile=Readonly<{header:string;hasZ:boolean;separator:WedgeSeparator;rows:readonly Omit<WedgeRecord,'source'>[]}>;
export type WedgeParseFailure=Readonly<{kind:'header'}>|Readonly<{kind:'unsupported';code:'size'|'bytes'|'cr'|'line-length'|'blank-line'|'rows'|'overflow';line?:number}>;
export type WedgeParseResult=Readonly<{ok:true;file:WedgeParsedFile}>|Readonly<{ok:false;failure:WedgeParseFailure}>;

/** ExtractFileExt+UpperCase = ".TXT" (0x589385..0x5893a8). */
export function wedgeHasTxtExtension(name:string):boolean{const base=name.slice(Math.max(name.lastIndexOf('/'),name.lastIndexOf('\\'))+1),dot=base.lastIndexOf('.');return dot>=0&&base.slice(dot).toUpperCase()==='.TXT';}

/** Bytes are ANSI; only ASCII printable, 0xB0 (degree delimiter of 0x57b6fe) and LF/CRLF are admitted. */
function decodeLines(bytes:Uint8Array):readonly string[]|WedgeParseFailure{
 if(bytes.byteLength>WEDGE_LIMITS.fileBytes)return{kind:'unsupported',code:'size'};
 const lines:string[]=[];let current='',line=1;
 for(let i=0;i<bytes.length;i++){
  const b=bytes[i];
  if(b===0x0a){lines.push(current);current='';line++;continue;}
  if(b===0x0d){if(bytes[i+1]!==0x0a)return{kind:'unsupported',code:'cr',line};continue;}
  if(!(b>=0x20&&b<=0x7e||b===0xb0))return{kind:'unsupported',code:'bytes',line};
  current+=String.fromCharCode(b);
  if(current.length>WEDGE_LIMITS.lineBytes)return{kind:'unsupported',code:'line-length',line};
 }
 if(current.length>0||bytes.length===0)lines.push(current);
 return lines;
}

/** 0x48672c: token up to delimiter (or rest); removes token and delimiter. */
function takeToken(state:{s:string},delim:string):string{
 if(state.s.length===0)return'';const p=state.s.indexOf(delim),n=p>=0?p:state.s.length;
 const out=state.s.slice(0,n);state.s=state.s.slice(n+1);return out;
}
/** Shared prefix of 0x486a00/0x48690c: drop leading ' ' and delimiter characters, then cut. */
function cutNumber(state:{s:string},delim:string):{text:string;consume:()=>void}{
 let s=state.s;while(s.length>0&&(s[0]===' '||s[0]===delim))s=s.slice(1);
 const p=s.indexOf(delim),n=p>=0?p:s.length,text=s.slice(0,n);
 return{text,consume:()=>{state.s=s.slice(n+1);}};
}
type Lex<T>=Readonly<{status:'value';value:T}>|Readonly<{status:'native-zero-fill'|'unadmitted';reason:string}>;
const INT=/^[+-]?\d{1,10}$/;
function lexInt(text:string):Lex<number>{
 if(text==='')return{status:'native-zero-fill',reason:'empty-integer'};
 if(!INT.test(text))return{status:'unadmitted',reason:'integer-spelling'};
 const v=Number(text);if(v< -2147483648||v>2147483647)return{status:'unadmitted',reason:'integer-range'};
 return{status:'value',value:v===0?0:v};
}
function decimalPattern(sep:WedgeSeparator){const s=sep==='.'?'\\.':',';return new RegExp(`^[+-]?(?:\\d+(?:${s}\\d*)?|${s}\\d+)(?:[eE][+-]?\\d{1,3})?$`);}
function lexDecimal(text:string,sep:WedgeSeparator):Lex<string>{
 if(text==='')return{status:'native-zero-fill',reason:'empty-number'};
 if(text.length>WEDGE_LIMITS.tokenChars||!decimalPattern(sep).test(text))return{status:'unadmitted',reason:'number-spelling'};
 return{status:'value',value:sep===','?text.replace(',','.'):text};
}
/** Number value of an admitted decimal for RA/Dec seconds (Extended in the original). */
const decimalNumber=(text:string)=>Number(text);
/** Two's-complement abs of a signed 32-bit DWORD: cdq/xor/sub at 0x486c53..0x486c59 (and
 * the Dec caller 0x57b72b..0x57b72e), read back by FILD DWORD at 0x486c5f as signed.
 * abs(−2^31) wraps to −2^31; every other int32 gets its ordinary magnitude. */
export function wedgeAbsInt32(v:number):number{
 if(!Number.isInteger(v)||v< -2147483648||v>2147483647)throw new RangeError('int32');
 return v===-2147483648?v:Math.abs(v);
}

function parseRa(token:string,sep:WedgeSeparator):WedgeRa{
 const st={s:token};
 const hc=cutNumber(st,'h'),h=lexInt(hc.text);if(h.status!=='value')return{status:h.status,reason:'hours-'+h.reason};hc.consume();
 const mc=cutNumber(st,'m'),m=lexInt(mc.text);if(m.status!=='value')return{status:m.status,reason:'minutes-'+m.reason};mc.consume();
 const sc=cutNumber(st,'s'),s=lexDecimal(sc.text,sep);if(s.status!=='value')return{status:s.status,reason:'seconds-'+s.reason};
 const sec=decimalNumber(s.value);if(!Number.isFinite(sec)||Math.abs(sec)>1e9)return{status:'unadmitted',reason:'seconds-range'};
 // 0x486c40: (abs32(d) + m/60 + s/3600) × sign; the RA path stores sign=+1 (0x57b686).
 // Hours reach the helper as the full DWORD from 0x486a00 (0x57b668); minutes are not abs'd.
 const hours=(wedgeAbsInt32(h.value)+m.value/60)+sec/3600;
 return Object.freeze({status:'value',hours,h:h.value,m:m.value,s:sec});
}
function parseDec(token:string,sep:WedgeSeparator):WedgeDec{
 const st={s:token};
 const dc=cutNumber(st,'°'),d=lexInt(dc.text);if(d.status!=='value')return{status:d.status,reason:'degrees-'+d.reason};dc.consume();
 const mc=cutNumber(st,"'"),m=lexInt(mc.text);if(m.status!=='value')return{status:m.status,reason:'minutes-'+m.reason};mc.consume();
 const sc=cutNumber(st,'"'),s=lexDecimal(sc.text,sep);if(s.status!=='value')return{status:s.status,reason:'seconds-'+s.reason};
 const sec=decimalNumber(s.value);if(!Number.isFinite(sec)||Math.abs(sec)>1e9)return{status:'unadmitted',reason:'seconds-range'};
 // 0x485960 returns −1 only for degrees<0, so "-0°…" keeps a positive sign in the original.
 // The caller (0x57b72b) and 0x486c40 both apply abs32 to the degrees DWORD (idempotent), so
 // "-2147483648°" gives (−2^31 + m/60 + s/3600) × −1.
 const sign=d.value<0?-1:1,degrees=sign*((wedgeAbsInt32(d.value)+m.value/60)+sec/3600);
 return Object.freeze({status:'value',degrees,signLost:d.value===0&&dc.text.trim().startsWith('-')});
}

/** 0x57b488 for one data line (header already accepted). */
export function wedgeParseRow(raw:string,line:number,hasZ:boolean,sep:WedgeSeparator):Omit<WedgeRecord,'source'>|'overflow'{
 // Copy(line,1,11) with trailing spaces removed, then Delete(line,1,11).
 const objectId=raw.slice(0,11).replace(/ +$/,''),st={s:raw.slice(11)};
 const skip=()=>{while(st.s.startsWith(' '))st.s=st.s.slice(1);};
 skip();const mjdRaw=takeToken(st,' ');
 skip();const raRaw=takeToken(st,' ');const ra=parseRa(raRaw,sep);
 skip();const decRaw=takeToken(st,' ');const dec=parseDec(decRaw,sep);
 skip();
 // V/Z is parsed in place (0x48690c on the line); a raised conversion leaves the token in the line.
 const cut=cutNumber(st,' '),redshiftRaw=cut.text,lexed=lexDecimal(redshiftRaw,sep);
 let redshift:WedgeRedshift,comment:string|null;
 if(lexed.status==='value'){
  const parsed=wedgeDecimalToSingle(lexed.value);
  if(parsed.status==='range'){redshift={status:'unadmitted',reason:'binary32-range'};comment=null;}
  else if(hasZ){
   const velocity=wedgeVelocityFromZ(parsed.single);if(!velocity)return'overflow';
   redshift=Object.freeze({status:'value',source:'z',z:parsed.single,velocity,boundary:parsed.boundary});cut.consume();skip();comment=takeToken(st,' ').slice(0,36);
  }else{
   redshift=Object.freeze({status:'value',source:'velocity',velocity:parsed.single,z:wedgeZFromVelocity(parsed.single),boundary:parsed.boundary});cut.consume();skip();comment=takeToken(st,' ').slice(0,36);
  }
 }else if(lexed.status==='native-zero-fill'){redshift={status:'native-zero-fill',reason:lexed.reason};skip();comment=takeToken(st,' ').slice(0,36);}
 else{redshift={status:'unadmitted',reason:lexed.reason};comment=null;}
 return Object.freeze({line,raw,objectId,mjdRaw,raRaw,decRaw,redshiftRaw,comment,ra,dec,redshift});
}

/** 0x57bfb4 header gate and row loop over a complete, already-read file. */
export function wedgeParseLssText(bytes:Uint8Array,separator:WedgeSeparator):WedgeParseResult{
 if(separator!=='.'&&separator!==',')throw new RangeError('separator');
 const decoded=decodeLines(bytes);if(!Array.isArray(decoded))return{ok:false,failure:decoded as WedgeParseFailure};
 const lines=decoded as readonly string[],header=lines[0]??'';
 if(!header.startsWith('Object ID')||!header.includes('RA'))return{ok:false,failure:{kind:'header'}};
 const hasZ=header.includes('Z'),rows:Omit<WedgeRecord,'source'>[]=[];
 if(lines.length-1>WEDGE_LIMITS.rows)return{ok:false,failure:{kind:'unsupported',code:'rows'}};
 for(let i=1;i<lines.length;i++){
  // An empty ReadLn string makes 0x57b4ef read before a nil string: the original faults mid-load.
  if(lines[i].length===0)return{ok:false,failure:{kind:'unsupported',code:'blank-line',line:i+1}};
  const row=wedgeParseRow(lines[i],i+1,hasZ,separator);
  if(row==='overflow')return{ok:false,failure:{kind:'unsupported',code:'overflow',line:i+1}};
  rows.push(row);
 }
 return{ok:true,file:Object.freeze({header,hasZ,separator,rows:Object.freeze(rows)})};
}
