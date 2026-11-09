/** Byte-exact original VIREO lists used by E02 (CLEA_Vireo.zip, user approval of 2026-10-27, groups 1 and 2 in AGENTS.md):
 * LSSFields.LST (field names and centres), Images/Galaxies/GLIMAGES.LST (photographic list; positions only) and
 * Spectra/Galaxies/GLXYSP.LST (galaxy library spectrum names). LSSFields.LST follows TLSSFieldsForm1 FormShow 0x52ac24, its
 * line parser 0x52b00c and list item 0x52b10c (Front LSSPARSE, below; its file-error message, Front L4). The photographic-list
 * selection 0x596ab8 and association 0x598e3b..0x598e52 (0x5987e4 is the QSO catalogue loader, see qsoMerge.ts) and the
 * GLXYSP lookup are not recovered: those two parsers read the evident text formats and reject anything else; they never
 * repair a row. Callers verify size and SHA-256 before parsing. */
import {freshFieldArea} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import {LSS_FIELD_FILES,type LssFieldNumber} from './lssFields';
import {cutFloatToken,nativeFloatSpelling,nativeTextFileLines,strToFloatErrorText,takeQuotedToken} from './nativeTextFile';
import {formatNativeUnits} from './nativeUnitsText';

export type OriginalListIdentity=Readonly<{name:string;path:string;bytes:number;sha256:string}>;
export const LSS_FIELDS_LST:OriginalListIdentity=Object.freeze({name:'LSSFields.LST',path:'/original/hotlists/LSSFields.LST',bytes:460,sha256:'1c9cdcc56bd3b5cd801f519104e95bb671b2305818afb47ad8369f04af64070f'});
export const GLIMAGES_LST:OriginalListIdentity=Object.freeze({name:'GLIMAGES.LST',path:'/original/images/GLIMAGES.LST',bytes:10103,sha256:'fd5b98163259b3b4f7e0da1185930ef393e349fbfa07bcc3b6abfd97552c0a01'});
export const GLXYSP_LST:OriginalListIdentity=Object.freeze({name:'GLXYSP.LST',path:'/original/spectra/GLXYSP.LST',bytes:576,sha256:'0a7a352d37c5a899e2304048c660b7703646fbb616f49e5c7ddf75b84d3c166a'});
/** Front L4: TLSSFieldsForm1 FormShow 0x52ac24 when LSSFields.LST cannot be read (IOResult ≠ 0 after Reset, 0x52acc2): MessageBox
 * 'Cannot access LSS fields file ' + path + CRLF + CRLF + the system's text for the error (0x486594), caption 'File Error!',
 * MB_ICONSTOP (0x10), then FormShow exits (strings 0x52afd0, 0x52aff8, 0x52affc). Static reading of CLEA_VEO.exe 781bc970…c54c.
 * [W] The path is the bundled file's address and the system text is the web's own reason. */
export const LSS_FIELDS_FILE_ERROR=Object.freeze({prefix:'Cannot access LSS fields file ',separator:'\r\n\r\n',caption:'File Error!',flags:0x10});
/** `tr` (Front ES4): the screen's translator for VIREO's prefix (default: the literal). */
export function lssFieldsFileErrorText(path:string,reason:string,tr:(literal:string)=>string=literal=>literal):string{return tr(LSS_FIELDS_FILE_ERROR.prefix)+path+LSS_FIELDS_FILE_ERROR.separator+reason;}
export class OriginalListError extends Error{constructor(readonly list:string,readonly line:number){super(`${list}: line ${line}`);this.name='OriginalListError';}}
const lines=(bytes:Uint8Array)=>{let text='';for(const b of bytes)text+=String.fromCharCode(b);return text.replace(/\x1a$/,'').split('\r\n');};

/** Front LSSPARSE: one TLSSFieldsForm1 list record as 0x52b00c builds it (105 bytes, copied by `rep movs` 0x1a dwords + 1).
 * [D] +0x00 ShortString[71] file name (0x52b070 cl=0x47), +0x48 Single RA (0x52b081), +0x4c Single Dec (0x52b08f),
 *     +0x50 ShortString[24] label (0x52b0c2 cl=0x18). */
export const LSS_FIELDS_RECORD=Object.freeze({file:71,label:24});
export type LssFieldsRecord=Readonly<{file:string;ra:number;dec:number;label:string}>;
/** Why a line stops the native read. `convert`: StrToFloat raises EConvertError (`message`, [D] text). `range`: the value
 * overflows Extended inside TextToFloat (EConvertError) or the Single store (fstp + fwait under the caller's control word,
 * EOverflow [I]); the web does not tell the two apart, so no message is claimed. */
export type LssFieldsLineFailure=Readonly<{line:number;field:'ra'|'dec';token:string;kind:'convert'|'range';message:string|null}>;
/** The native read: the records appended before the first failing line, and that failure (null when every line parsed). */
export type LssFieldsRead=Readonly<{records:readonly LssFieldsRecord[];failure:LssFieldsLineFailure|null}>;

/** 0x48690c with ' ' then the Single store: [W] the value is Number() of TextToFloat's accepted spelling rounded with
 * Math.fround (binary64 then binary32), not the x87 Extended accumulation of 0x40cdb4; they can differ only for a decimal
 * within that accumulation's error of a binary32 rounding boundary (the nine bundled values are far from one). */
function singleToken(line:string,lineNumber:number,field:'ra'|'dec'):[value:number,rest:string]|LssFieldsLineFailure{
 const [token,rest]=cutFloatToken(line,' '),spelling=nativeFloatSpelling(token);
 if(spelling===null)return Object.freeze({line:lineNumber,field,token,kind:'convert',message:strToFloatErrorText(token)});
 const value=Math.fround(Number(spelling));
 if(!Number.isFinite(value))return Object.freeze({line:lineNumber,field,token,kind:'range',message:null});
 return [value,rest];// −0 kept: TextToFloat negates after scaling (fchs 0x40ce44), so '-0' stores Single −0.0
}
/** [D] 0x52b00c over one line: file := 0x4867fc(' ') cut to 71 characters; RA := 0x48690c(' ') stored as Single; Dec the
 * same; label := 0x4867fc(' ') cut to 24 characters; whatever follows is ignored. Nothing is trimmed, skipped or checked:
 * a blank or short line reaches StrToFloat with '' and fails; a missing label is ''. The first character of each quoted
 * token is its quote, whatever it is (an unquoted name loses its first character). */
export function parseLssFieldsLine(line:string,lineNumber:number):LssFieldsRecord|LssFieldsLineFailure{
 const [file,afterFile]=takeQuotedToken(line,' ');
 const ra=singleToken(afterFile,lineNumber,'ra');if(!Array.isArray(ra))return ra;
 const dec=singleToken(ra[1],lineNumber,'dec');if(!Array.isArray(dec))return dec;
 const [label]=takeQuotedToken(dec[1],' ');
 return Object.freeze({file:file.slice(0,LSS_FIELDS_RECORD.file),ra:ra[0],dec:dec[0],label:label.slice(0,LSS_FIELDS_RECORD.label)});
}
/** [D] FormShow 0x52ac24 read loop 0x52ad25..0x52ad76: Assign/Reset, `while not Eof do begin Readln(S); parse 0x52b00c;
 * append 0x492574 end; Close` (only when the list is empty, 0x492708). There is no count limit, no comment syntax and no
 * blank-line skip. A raised conversion leaves FormShow through its try…finally (0x52afb8 → 0x4056e4), which only frees
 * strings: the records already appended stay, the file is not closed and the list box is not filled on that show. */
export function readLssFieldsList(bytes:Uint8Array):LssFieldsRead{
 const records:LssFieldsRecord[]=[];
 for(const [i,line] of nativeTextFileLines(bytes).entries()){
  const r=parseLssFieldsLine(line,i+1);
  if(!('file' in r))return Object.freeze({records:Object.freeze(records),failure:r});
  records.push(r);
 }
 return Object.freeze({records:Object.freeze(records),failure:null});
}
/** [D] List item 0x52b10c: the label padded with ' ' (0x52b1ec) to 17 characters, then 0x486f4c(RA, 0 decimals, 'Hr ',
 * 'Min') (0x52b204/0x52b1f8), ' ', 0x486f4c(Dec, 0 decimals, '° ', "'") (0x52b21c/0x52b210). */
export const LSS_FIELDS_ITEM=Object.freeze({width:17,raUnit:'Hr ',raMinutes:'Min',decUnit:'\u00b0 ',decMinutes:"'"});
export function lssFieldsItemText(r:Pick<LssFieldsRecord,'label'|'ra'|'dec'>):string{
 const I=LSS_FIELDS_ITEM;return r.label.padEnd(I.width,' ')+formatNativeUnits(r.ra,0,I.raUnit,I.raMinutes)+' '+formatNativeUnits(r.dec,0,I.decUnit,I.decMinutes);
}

export type LssFieldEntry=Readonly<{field:LssFieldNumber}>&LssFieldsRecord;
/** LSSFields.LST as VIREO reads it (`readLssFieldsList`), then [W] the web's own guard: every line must parse and the
 * records must name LSS_Field01..09.HTL in order, because the web only bundles those nine lists (VIREO opens whatever
 * file a record names and has no count limit). Any failure is OriginalListError with the line (0 for a wrong count). */
export function parseLssFieldsList(bytes:Uint8Array):readonly LssFieldEntry[]{
 const read=readLssFieldsList(bytes);
 if(read.failure)throw new OriginalListError(LSS_FIELDS_LST.name,read.failure.line);
 if(read.records.length!==LSS_FIELD_FILES.length)throw new OriginalListError(LSS_FIELDS_LST.name,0);
 return Object.freeze(read.records.map((r,i)=>{
  if(r.file!==LSS_FIELD_FILES[i].name)throw new OriginalListError(LSS_FIELDS_LST.name,i+1);
  return Object.freeze({field:LSS_FIELD_FILES[i].field,...r});
 }));
}
/** GLIMAGES.LST: CSV rows with RA hours in column 4 and Dec degrees in column 5 (1-based); only positions are read. As natively
 * (0x596da8 inside try…except, review 3 finding 5), a row whose RA or Dec does not parse is dropped and the others are kept
 * with their file index; a parsed value outside the sky simply never falls inside an area. The evident decimal form is read
 * (StrToFloat's locale DecimalSeparator and exponent forms are not modelled: such a row is dropped, declared). */
export function parseGlimagesPositions(bytes:Uint8Array):readonly Readonly<{index:number;ra:number;dec:number}>[]{
 const rows=lines(bytes);if(rows[rows.length-1]==='')rows.pop();
 if(rows.length<1||rows.length>1000)throw new OriginalListError(GLIMAGES_LST.name,0);
 const out:Readonly<{index:number;ra:number;dec:number}>[]=[];
 rows.forEach((row,index)=>{
  const f=row.split(',');
  if(f.length<5||!/^-?\d+(\.\d+)?$/.test(f[3])||!/^-?\d+(\.\d+)?$/.test(f[4]))return;
  out.push(Object.freeze({index,ra:Number(f[3]),dec:Number(f[4])}));
 });
 return Object.freeze(out);
}
/** GLXYSP.LST: one library file name per line. */
export function parseGlxyspNames(bytes:Uint8Array):ReadonlySet<string>{
 const rows=lines(bytes);if(rows[rows.length-1]==='')rows.pop();
 rows.forEach((r,i)=>{if(!/^[A-Za-z0-9+-]{1,24}\.SP$/.test(r))throw new OriginalListError(GLXYSP_LST.name,i+1);});
 return new Set(rows);
}
/** Native library key (Pegasus provenance spectrumMapping): identifier without spaces + ".SP", exact match. */
export function hasLibrarySpectrum(names:ReadonlySet<string>,id:string):boolean{return names.has(id.replace(/ /g,'')+'.SP');}
/** 0x596b1c, the photograph matcher the galaxy loader calls with the area: inclusive bounds; min < max is the ordinary
 * rectangle, otherwise (a field across 0 h, min ≥ max) RA ≥ min or RA ≤ max (Front G, RE-wrap-polar-consumers.md §G-RE1). */
export function nativePhotographInArea(x:Readonly<{ra:number;dec:number}>,a:Readonly<{minimumRa:number;maximumRa:number;minimumDec:number;maximumDec:number}>):boolean{
 const ra=a.minimumRa<a.maximumRa?x.ra>=a.minimumRa&&x.ra<=a.maximumRa:x.ra>=a.minimumRa||x.ra<=a.maximumRa;
 return ra&&x.dec>=a.minimumDec&&x.dec<=a.maximumDec;
}
/** The pack with its photographic-list gate taken from the whole original list (per listed pointing, positions inside the
 * fresh area, inclusive bounds as the other source scans). */
export function packWithPhotographs(pack:FieldPack,positions:readonly Readonly<{index:number;ra:number;dec:number}>[],halfDegrees?:number):FieldPack{
 const entries=pack.pointings.map((p,pointing)=>{const a=freshFieldArea(p,halfDegrees);return {pointing,indices:Object.freeze(positions.filter(x=>nativePhotographInArea(x,a)).map(x=>x.index))};}).filter(e=>e.indices.length).map(e=>Object.freeze(e));
 return Object.freeze({...pack,photographs:Object.freeze({sha256:GLIMAGES_LST.sha256,recordsChecked:positions.length,entries:Object.freeze(entries)})});
}
