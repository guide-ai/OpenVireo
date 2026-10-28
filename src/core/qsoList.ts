/** File › QSO List... (Front O2, docs/QSO-LIST-HST.md). CLEA_VEO.exe 781bc970…c54c, static reading only:
 * QSOList1Click 0x58e600, TQSOListDlg (DFM; FormActivate 0x57836c, OKBtnClick 0x578430), builder 0x5776f0, row 0x577df0,
 * comparators 0x578314/24/34/44, TQSORptForm1 (inherits TObjctListForm1; FormCreate 0x578518, FormatforHotList 0x578544).
 * The catalogue is CLEA_QSO.DAT read in file order (records decoded by qsoMerge.decodeQsoRecord); each record whose V is not
 * greater than the limit is inserted with the native sorted-cursor rule 0x492728 (fieldEngine.nativeCursorInsert). Without
 * Edit Mode the list has only Name, RA, Dec and V; Z and the colours are Edit Mode columns. Pure: no React, DOM or fetch. */
import {decodeQsoRecord,QSO_CATALOG,type NativeQso} from './qsoMerge';
import {nativeCursorInsert} from './fieldEngine';
import {splitNativeSexagesimal,padLeft,padRight} from './nativeListFormat';
import {delphiFixed} from './variableStars';
import type {HtlFields} from './hotList';
import {QSO_LIST_MENU,HST_ARCHIVE} from './observatoryMenuLiterals';
export {HST_ARCHIVE};

/** Original literals (DFM TQSOLISTDLG, builder 0x5776f0, row 0x577df0, menu QSOList1). Never translated. */
export const QSO_LIST_LITERALS=Object.freeze({
 menu:QSO_LIST_MENU,
 dialog:Object.freeze({caption:'Options for QSO List ',magnitude:'Magnitude Limit (V):',magnitudeHint:'0.00-7.00',sort:'Sort Options',
  sorts:Object.freeze(['App. Mag (Ascending)','Z (Ascending)','Z (Descending)','RA (Ascending)'] as const),ok:'&OK',cancel:'&Cancel',
  errorCaption:'Numeric Error!',errorText:'Invalid Magnitude Limit'}),
 caption:'CLEA QSO Data',saveStem:'QSO Data',
 countTail:' QSOs to magnitude ',sortedBy:', sorted by ',sortSuffix:Object.freeze(['magnitude.','Z(ascending).','Z(descending).',''] as const),
 positions:'Positions are J2000.0',assignedColor:'"(...)" indicates an assigned mean color.',
 headerEdit:'Name/ID           Right Ascn. Declination    Z       V      B-V      U-B   ',
 headerStudent:'Name/ID           Right Ascn. Declination    V   ',
 /** 0x577b1c overwrites the 0-based character 32 (the `d`) with 0xB0. */
 units:'                  Hr Mn Sec     d  \'  "',
 fileErrorCaption:'QSO Catalog File Error!',fileErrorHead:'Unable to Open QSO Catalog File!\r\n\r\nFile Name: ',
});
export type QsoSort=0|1|2|3;
export type QsoListOptions=Readonly<{limit:number;sort:QsoSort}>;
/** The dialog's process globals 0x5bce38 (Single) and 0x5bce3c start at zero. */
export const QSO_LIST_INITIAL_OPTIONS:QsoListOptions=Object.freeze({limit:0,sort:0});
const DEFAULT_LIMIT=Math.fround(20);

/** FormActivate 0x57836c: a zero limit becomes 20.0; without Edit Mode the sort is reset to 0 and the group disabled. */
export function qsoOptionsActivate(options:QsoListOptions,editMode:boolean):Readonly<{options:QsoListOptions;limitText:string;sortEnabled:boolean}>{
 const limit=options.limit===0?DEFAULT_LIMIT:options.limit,sort=editMode?options.sort:0;
 return Object.freeze({options:Object.freeze({limit,sort}),limitText:delphiFixed(limit,2),sortEnabled:editMode});
}
/** StrToFloat (Delphi TextToFloat: blanks, sign, digits, '.', exponent; US separator assumed) stored as Single. A failure or a
 * non-finite Single (unmasked FPU overflow at the store, inside the same try) is the `Invalid Magnitude Limit` box: null. */
export function parseQsoMagnitudeLimit(text:string):number|null{
 if(typeof text!=='string'||!/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/.test(text))return null;
 const v=Math.fround(Number(text));return Number.isFinite(v)?v:null;
}

/** The 52-byte record's name ShortString as stored (CLEA_QSO.DAT pads most names with spaces to 17). */
export function qsoRawName(q:NativeQso):string{
 const n=parseInt(q.rawHex.slice(0,2),16);let s='';
 for(let i=1;i<=n;i++)s+=String.fromCharCode(parseInt(q.rawHex.slice(2*i,2*i+2),16));
 return s;
}
const two=(n:number)=>padLeft(String(n),2,'0');
const signed=(v:number)=>{const s=delphiFixed(v,2);return v>=0?'+'+s:s;};
const color=(v:number,assigned:number)=>assigned!==0?'('+signed(v)+')':' '+signed(v)+' ';
/** Row 0x577df0. */
export function qsoListRow(q:NativeQso,editMode:boolean):string{
 let s=padRight(qsoRawName(q),18);
 const ra=splitNativeSexagesimal(q.ra,1);
 s+=two(ra.whole)+' '+two(ra.minutes)+' '+padLeft(delphiFixed(ra.seconds,1),4,'0')+'   ';
 const dec=splitNativeSexagesimal(q.dec,0);
 s+=(dec.sign<0?'-':'+')+two(dec.whole)+' '+two(dec.minutes)+' '+padLeft(delphiFixed(dec.seconds,0),2,'0')+'   ';
 if(editMode)s+=padRight(delphiFixed(q.redshift,3),5)+'   ';
 s+=padLeft(delphiFixed(q.magnitude,2),5,' ')+'  ';
 if(editMode)s+=color(q.colorBV,q.flags[0])+'  '+color(q.colorUB,q.flags[1])+'  ';
 return s;
}
/** Comparators 0x578314 (V >), 0x578324 (z >), 0x578334 (z <), 0x578344 (RA ≠ ? RA > : Dec >); a = new item, b = cursor. */
const GREATER:readonly ((a:NativeQso,b:NativeQso)=>boolean)[]=[
 (a,b)=>a.magnitude>b.magnitude,(a,b)=>a.redshift>b.redshift,(a,b)=>a.redshift<b.redshift,(a,b)=>a.ra!==b.ra?a.ra>b.ra:a.dec>b.dec,
];
/** Decodes every CLEA_QSO.DAT record in file order (exact size required). */
export function decodeQsoCatalog(bytes:Uint8Array):readonly NativeQso[]{
 if(!(bytes instanceof Uint8Array)||bytes.byteLength!==QSO_CATALOG.bytes)throw new RangeError('Unsupported QSO catalogue');
 const out:NativeQso[]=[];for(let i=0;i<QSO_CATALOG.records;i++)out.push(decodeQsoRecord(bytes.subarray(i*52,i*52+52),i));
 return Object.freeze(out);
}
export type QsoList=Readonly<{caption:string;lines:readonly string[];first:number;last:number;rows:readonly NativeQso[]}>;
/** Builder 0x5776f0. `withheld` [W] removes records before the build (Object X rows), as if they were absent from the file. */
export function buildQsoList(records:readonly NativeQso[],options:QsoListOptions,editMode:boolean,withheld:(q:NativeQso)=>boolean=()=>false):QsoList{
 const L=QSO_LIST_LITERALS,limit=options.limit;let maxV=-2;
 const read:NativeQso[]=[];
 for(const q of records){
  if(q.magnitude>limit||withheld(q))continue;// `ja` skip: V > limit
  read.push(q);if(q.magnitude>maxV)maxV=q.magnitude;
 }
 const rows=nativeCursorInsert(read,GREATER[options.sort]);
 const lines:string[]=[`${rows.length}${L.countTail}${delphiFixed(maxV,2)}${L.sortedBy}${L.sortSuffix[options.sort]}`,L.positions];
 if(editMode)lines.push(L.assignedColor);
 lines.push('',editMode?L.headerEdit:L.headerStudent,L.units.slice(0,32)+'°'+L.units.slice(33));
 const first=lines.length;for(const q of rows)lines.push(qsoListRow(q,editMode));
 return Object.freeze({caption:L.caption,lines:Object.freeze(lines),first,last:lines.length-1,rows:Object.freeze([...rows])});
}
/** FormatforHotList 0x578544: ID (max 24), RA, Dec; the native remarks are an uninitialised stack field, so empty [W]. */
export function qsoHotListFields(q:NativeQso):HtlFields{return Object.freeze({id:qsoRawName(q).slice(0,24),remarks:'',ra:q.ra,dec:q.dec});}
/** Save Text › As Displayed: the form stem +0x3e2 with `.TXT` (M7). */
export const QSO_LIST_SAVE_NAME='QSO Data.TXT';
