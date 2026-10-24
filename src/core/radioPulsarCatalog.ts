// Pulsar catalog codec: TRadioLab catalog constructor 0x562234..0x56245f and row parser 0x562490..0x562822
// (CLEA_VEO.exe SHA-256 781bc970…c54c). Pure web port; no file I/O. See docs/RADIO-PULSAR-CATALOG.md.
// The native program reads its catalog itself in TRadioLab FormCreate 0x5647a7; this module only decodes bytes (the
// Pulsar Parameters utility passes it bytes the learner chose; docs/RADIO-PULSAR-PARAMETERS.md).

/** One 96-byte catalog record (list item size cx=0x60 at 0x5622c7). Offsets name the native fields. The units come
 * from the TPlsrDataForm1 labels (pulsar-parameters-contracts.json); they are catalog reference values, never
 * learner measurements. */
export type PulsarRecord=Readonly<{
 /** +0x00 ShortString[12], text columns 0..11, right-trimmed of ASCII 0x20 only (0x5624ca..0x56251c). J2000 name. */
 primaryName:string;
 /** +0x0d ShortString[8], columns 12..19 (0x562530..0x562586). B1950 name. */
 legacyName:string;
 /** +0x16 Extended: columns 20..35 × Single 24 (0x562824) ÷ Single 360 (0x562828), i.e. hours. */
 ra:number;
 /** +0x20 Extended: columns 62..77, degrees. */
 dec:number;
 /** +0x2a Extended: columns 208..229. Period, seconds. */
 x2a:number;
 /** +0x34 Extended: columns 240..255. Period derivative, s/s. */
 x34:number;
 /** +0x3e Extended: columns 266..279 + Single 2400000 (0x56282c). Period epoch, caption PEpoch (MJD): the MJD column
  * plus the native 2400000 convention, not an ordinary JD (MJD + 2400000.5). */
 x3e:number;
 /** +0x48 Single: columns 336..343. Sky temperature, kelvin. */
 s48:number;
 /** +0x4c Single: columns 350..363. Dispersion measure, pc/cm³. */
 s4c:number;
 /** +0x50 Single: columns 410..419. Pulse width, ms. */
 s50:number;
 /** +0x54 Single: columns 430..437. 400 MHz flux density, mJy. */
 s54:number;
 /** +0x58 Single: columns 438..445. 600 MHz flux density, mJy. */
 s58:number;
 /** +0x5c Single: columns 446..453. 1400 MHz flux density, mJy. */
 s5c:number;
}>;
/** Frozen, non-empty, file order, duplicates kept (append 0x492574 inserts after the cursor and moves to the new node). */
export type PulsarCatalog=readonly PulsarRecord[];

export const PULSAR_CATALOG_CONSTANTS=Object.freeze({
 /** Read(buffer, 0x1fe) at 0x562332 (0x404078), then ReadLn 0x4040f0 discards the rest of the line. */
 readLimitBytes:510,
 /** Single 0x562824 and 0x562828 (fmul then fdiv at 0x5625b8/0x5625be). */
 raNumerator:Math.fround(24),raDenominator:Math.fround(360),
 /** Single 0x56282c (fadd at 0x5626a0). */
 epochOffset:Math.fround(2400000),
});

type NumericField=Exclude<keyof PulsarRecord,'primaryName'|'legacyName'>;
type Column=Readonly<{start:number;width:number}>;
const column=(start:number,width:number):Column=>Object.freeze({start,width});
/** Row parser source offsets (mov ax,imm) and widths (mov ecx,imm) passed to 0x40b8e8. */
export const PULSAR_CATALOG_COLUMNS=Object.freeze({
 primaryName:column(0x000,12),legacyName:column(0x00c,8),
 ra:column(0x014,16),dec:column(0x03e,16),x2a:column(0x0d0,22),x34:column(0x0f0,16),x3e:column(0x10a,14),
 s48:column(0x150,8),s4c:column(0x15e,14),s50:column(0x19a,10),s54:column(0x1ae,8),s58:column(0x1b6,8),s5c:column(0x1be,8),
} satisfies Record<keyof PulsarRecord,Column>);
const EXTENDED_FIELDS=['ra','dec','x2a','x34','x3e'] as const satisfies readonly NumericField[];
const SINGLE_FIELDS=['s48','s4c','s50','s54','s58','s5c'] as const satisfies readonly NumericField[];

/** Web admission policy (WEB-PC-01..04). Native file and StrToFloat behaviour outside it is not claimed. */
export const PULSAR_CATALOG_WEB_POLICY=Object.freeze({
 maxBytes:1<<20,maxRows:10_000,
 /** End of the last used column (446 + 8); shorter lines are refused rather than read past their end. */
 minLineBytes:PULSAR_CATALOG_COLUMNS.s5c.start+PULSAR_CATALOG_COLUMNS.s5c.width,
});

export type PulsarCatalogErrorKind=
 |'too-large'|'too-many-rows'|'empty'|'non-ascii'|'control-character'|'blank-line'|'short-line'|'bad-number'|'single-range';
/** line is 1-based (null for whole-file errors); field names the column for bad-number/single-range. */
export type PulsarCatalogError=Readonly<{kind:PulsarCatalogErrorKind;line:number|null;field?:NumericField}>;
export type PulsarCatalogParse=Readonly<{ok:true;catalog:PulsarCatalog}|{ok:false;error:PulsarCatalogError}>;

/** WEB-PC-03: ASCII decimal with optional sign, optional fraction/exponent and surrounding ASCII spaces. Not JS
 * Number syntax (no hex, Infinity, NaN, underscores) and not a claim of Delphi StrToFloat locale parity. */
const DECIMAL=/^ *[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)? *$/;
function decimal(text:string):number|null{
 if(!DECIMAL.test(text))return null;
 const value=Number(text.trim());return Number.isFinite(value)?value:null;
}
/** The 0x562515/0x56257d loops: delete the last character while it is ASCII 0x20. Leading spaces stay. */
function trimRightSpaces(text:string):string{let end=text.length;while(end>0&&text.charCodeAt(end-1)===0x20)end--;return text.slice(0,end);}
const fail=(kind:PulsarCatalogErrorKind,line:number|null,field?:NumericField):PulsarCatalogParse=>
 Object.freeze({ok:false,error:Object.freeze(field===undefined?{kind,line}:{kind,line,field})});

/** Decodes one already-cut line (≤ 510 bytes, ≥ 454 bytes, printable ASCII). */
function parseRow(line:string,lineNumber:number):PulsarRecord|PulsarCatalogParse{
 const cell=(c:Column)=>line.slice(c.start,c.start+c.width),k=PULSAR_CATALOG_CONSTANTS,values={} as Record<NumericField,number>;
 for(const field of EXTENDED_FIELDS){
  const raw=decimal(cell(PULSAR_CATALOG_COLUMNS[field]));
  if(raw===null)return fail('bad-number',lineNumber,field);
  const value=field==='ra'?raw*k.raNumerator/k.raDenominator:field==='x3e'?raw+k.epochOffset:raw;
  if(!Number.isFinite(value))return fail('bad-number',lineNumber,field);
  values[field]=value;
 }
 for(const field of SINGLE_FIELDS){
  const raw=decimal(cell(PULSAR_CATALOG_COLUMNS[field]));
  if(raw===null)return fail('bad-number',lineNumber,field);
  const value=Math.fround(raw);// fstp DWORD
  if(!Number.isFinite(value))return fail('single-range',lineNumber,field);
  values[field]=value;
 }
 return Object.freeze({primaryName:trimRightSpaces(cell(PULSAR_CATALOG_COLUMNS.primaryName)),legacyName:trimRightSpaces(cell(PULSAR_CATALOG_COLUMNS.legacyName)),...values});
}

/** Constructor loop 0x56232c..0x562405 over in-memory bytes. Lines end in LF or CRLF; a final terminator does not
 * start another row. Each line is cut at 510 bytes (the rest is what ReadLn would skip). Any refused line rejects the
 * whole file: the native parser has no blank/comment skip and no per-row recovery. An empty catalog is refused, which
 * also avoids the native picker's nil read when a Ready catalog has no records. */
export function parsePulsarCatalog(bytes:Uint8Array):PulsarCatalogParse{
 const policy=PULSAR_CATALOG_WEB_POLICY;
 if(bytes.length>policy.maxBytes)return fail('too-large',null);
 if(bytes.length===0)return fail('empty',null);
 const ends:number[]=[];
 for(let i=0;i<bytes.length;i++)if(bytes[i]===0x0a){ends.push(i);if(ends.length>policy.maxRows)return fail('too-many-rows',null);}
 if(ends.length===0||ends[ends.length-1]!==bytes.length-1){ends.push(bytes.length);if(ends.length>policy.maxRows)return fail('too-many-rows',null);}
 const rows:PulsarRecord[]=[];let start=0;
 for(let n=0;n<ends.length;n++){
  const lineNumber=n+1;let end=ends[n];
  if(end<bytes.length&&end>start&&bytes[end-1]===0x0d)end--;// CRLF
  for(let i=start;i<end;i++){
   const b=bytes[i];
   if(b>0x7f)return fail('non-ascii',lineNumber);
   if(b<0x20||b===0x7f)return fail('control-character',lineNumber);
  }
  if(end===start)return fail('blank-line',lineNumber);
  const cut=Math.min(end,start+PULSAR_CATALOG_CONSTANTS.readLimitBytes);
  if(cut-start<policy.minLineBytes)return fail('short-line',lineNumber);
  let line='';for(let i=start;i<cut;i++)line+=String.fromCharCode(bytes[i]);
  const row=parseRow(line,lineNumber);
  if('ok' in row)return row;
  rows.push(row);start=ends[n]+1;
 }
 return Object.freeze({ok:true,catalog:Object.freeze(rows)});
}
