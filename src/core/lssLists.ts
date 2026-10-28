/** Byte-exact original VIREO lists used by E02 (CLEA_Vireo.zip, user approval of 2026-10-27, groups 1 and 2 in AGENTS.md):
 * LSSFields.LST (field names and centres), Images/Galaxies/GLIMAGES.LST (photographic list; positions only) and
 * Spectra/Galaxies/GLXYSP.LST (galaxy library spectrum names). The native readers are not recovered (TLSSFieldsForm1
 * FormShow, the photographic-list selection 0x596ab8 and association 0x598e3b..0x598e52 (0x5987e4 is the QSO catalogue loader,
 * see qsoMerge.ts), the GLXYSP lookup): these parsers read the evident text formats
 * and reject anything else; they never repair a row. Callers verify size and SHA-256 before parsing. */
import {freshFieldArea} from './fieldEngine';
import type {FieldPack} from './fieldPack';
import {LSS_FIELD_FILES,type LssFieldNumber} from './lssFields';

export type OriginalListIdentity=Readonly<{name:string;path:string;bytes:number;sha256:string}>;
export const LSS_FIELDS_LST:OriginalListIdentity=Object.freeze({name:'LSSFields.LST',path:'/original/hotlists/LSSFields.LST',bytes:460,sha256:'1c9cdcc56bd3b5cd801f519104e95bb671b2305818afb47ad8369f04af64070f'});
export const GLIMAGES_LST:OriginalListIdentity=Object.freeze({name:'GLIMAGES.LST',path:'/original/images/GLIMAGES.LST',bytes:10103,sha256:'fd5b98163259b3b4f7e0da1185930ef393e349fbfa07bcc3b6abfd97552c0a01'});
export const GLXYSP_LST:OriginalListIdentity=Object.freeze({name:'GLXYSP.LST',path:'/original/spectra/GLXYSP.LST',bytes:576,sha256:'0a7a352d37c5a899e2304048c660b7703646fbb616f49e5c7ddf75b84d3c166a'});
export class OriginalListError extends Error{constructor(readonly list:string,readonly line:number){super(`${list}: line ${line}`);this.name='OriginalListError';}}
const lines=(bytes:Uint8Array)=>{let text='';for(const b of bytes)text+=String.fromCharCode(b);return text.replace(/\x1a$/,'').split('\r\n');};

export type LssFieldEntry=Readonly<{field:LssFieldNumber;file:string;ra:number;dec:number;label:string}>;
/** LSSFields.LST: one line per field, `'FILE' RA DEC 'LABEL'`, CRLF, DOS EOF. Must name LSS_Field01..09.HTL in order. */
export function parseLssFieldsList(bytes:Uint8Array):readonly LssFieldEntry[]{
 const rows=lines(bytes);if(rows[rows.length-1]==='')rows.pop();
 if(rows.length!==LSS_FIELD_FILES.length)throw new OriginalListError(LSS_FIELDS_LST.name,rows.length);
 return Object.freeze(rows.map((row,i)=>{
  const m=/^'([^']{1,40})' +(\d{1,2}\.\d+) +(\d{1,2}\.\d+) +'([^']{1,40})'$/.exec(row);
  if(!m||m[1]!==LSS_FIELD_FILES[i].name)throw new OriginalListError(LSS_FIELDS_LST.name,i+1);
  return Object.freeze({field:LSS_FIELD_FILES[i].field,file:m[1],ra:Number(m[2]),dec:Number(m[3]),label:m[4]});
 }));
}
/** GLIMAGES.LST: CSV rows with RA hours in column 4 and Dec degrees in column 5 (1-based); only positions are read. */
export function parseGlimagesPositions(bytes:Uint8Array):readonly Readonly<{index:number;ra:number;dec:number}>[]{
 const rows=lines(bytes);if(rows[rows.length-1]==='')rows.pop();
 if(rows.length<1||rows.length>1000)throw new OriginalListError(GLIMAGES_LST.name,0);
 return Object.freeze(rows.map((row,index)=>{
  const f=row.split(','),ra=Number(f[3]),dec=Number(f[4]);
  if(f.length<5||!/^-?\d+(\.\d+)?$/.test(f[3])||!/^-?\d+(\.\d+)?$/.test(f[4])||ra<0||ra>=24||Math.abs(dec)>90)throw new OriginalListError(GLIMAGES_LST.name,index+1);
  return Object.freeze({index,ra,dec});
 }));
}
/** GLXYSP.LST: one library file name per line. */
export function parseGlxyspNames(bytes:Uint8Array):ReadonlySet<string>{
 const rows=lines(bytes);if(rows[rows.length-1]==='')rows.pop();
 rows.forEach((r,i)=>{if(!/^[A-Za-z0-9+-]{1,24}\.SP$/.test(r))throw new OriginalListError(GLXYSP_LST.name,i+1);});
 return new Set(rows);
}
/** Native library key (Pegasus provenance spectrumMapping): identifier without spaces + ".SP", exact match. */
export function hasLibrarySpectrum(names:ReadonlySet<string>,id:string):boolean{return names.has(id.replace(/ /g,'')+'.SP');}
/** The pack with its photographic-list gate taken from the whole original list (per listed pointing, positions inside the
 * fresh area, inclusive bounds as the other source scans). */
export function packWithPhotographs(pack:FieldPack,positions:readonly Readonly<{index:number;ra:number;dec:number}>[]):FieldPack{
 const entries=pack.pointings.map((p,pointing)=>{const a=freshFieldArea(p);return {pointing,indices:Object.freeze(positions.filter(x=>x.ra>=a.minimumRa&&x.ra<=a.maximumRa&&x.dec>=a.minimumDec&&x.dec<=a.maximumDec).map(x=>x.index))};}).filter(e=>e.indices.length).map(e=>Object.freeze(e));
 return Object.freeze({...pack,photographs:Object.freeze({sha256:GLIMAGES_LST.sha256,recordsChecked:positions.length,entries:Object.freeze(entries)})});
}
