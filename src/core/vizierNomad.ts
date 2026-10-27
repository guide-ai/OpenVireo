/** CDS/VizieR Simple Cone Search VOTable reader for the camera catalogs (web adaptation, front C1).
 * The original asked USNO NOFS vo_cone.cgi for ASCII (`&cftype=ASCII&slf=hh.hhh/dd.ddd`, 0x59c434); that service no
 * longer answers. This reader admits the VizieR VOTable 1.x TABLEDATA serialization and maps it onto the recovered
 * NOFS row contract (nativeNomadRows.ts): RA degrees -> hours, motion /1000 then /54000 or /3600, selected magnitude
 * stored Single and rejected when 0 or >=30, recovered RA/DEC sorted insertion (nativeNomadOrder.ts).
 * Evidence: NATIVE-CAMERA-FRONT-C-C0-01 (docs/CAMERA-EXPOSURE-PROVENANCE.json) and docs/CAMERA-EXPOSURE.md.
 * Web choices are marked [W]. No URL is fetched here; transport lives in src/io/cameraCatalog.ts. */
import {orderNativeNomadEntries,NativeNomadOrderError} from './nativeNomadOrder';
import {cameraCatalogReference} from './cameraCatalogReference';
import {nativeNomadCandidateInSelection,type NomadSelection} from './nativeNomadRows';

export type VizierCatalogId='I/297'|'I/284';
/** NOMAD selectors B,V,R,J,H,K (mode 0) and the USNO-B1 mode-1 labels B2,R2,I2 recovered at 0x59c5e8. */
export type VizierBand='B'|'V'|'R'|'J'|'H'|'K'|'B2'|'R2'|'I2';
export type VizierErrorCode='size'|'encoding'|'not-votable'|'binary'|'query-status'|'overflow'|'table-count'|'malformed'|'missing-field'|'missing-band'|'row-limit'|'context';
export class VizierCatalogError extends Error {
 constructor(readonly code:VizierErrorCode,readonly detail=''){super(`VizieR catalog: ${code}${detail?` (${detail})`:''}`);this.name='VizierCatalogError';}
}
export const VIZIER_POLICY=Object.freeze({
 /** [W] CDS primary host. Only RA, DEC and SR are sent (docs/EXTERNAL-SERVICES.md §1). */
 baseUrl:'https://vizier.cds.unistra.fr/viz-bin/conesearch',
 /** [W] Bounded admission; a dense galactic-plane cone at 0.23 deg stays far below this. */
 maxBytes:24*1024*1024,maxRows:60_000,maxCellChars:256,
 /** VizieR's own row cap (INFO MaxTuples). Reaching it means the field is incomplete. */
 defaultMaxTuples:50_000,
});
type CatalogShape=Readonly<{id:string;ra:string;dec:string;pmRA:string;pmDE:string;bands:Readonly<Partial<Record<VizierBand,string>>>}>;
const shapes:Readonly<Record<VizierCatalogId,CatalogShape>>=Object.freeze({
 'I/297':Object.freeze({id:'NOMAD1',ra:'RAJ2000',dec:'DEJ2000',pmRA:'pmRA',pmDE:'pmDE',bands:Object.freeze({B:'Bmag',V:'Vmag',R:'Rmag',J:'Jmag',H:'Hmag',K:'Kmag'})}),
 'I/284':Object.freeze({id:'USNO-B1.0',ra:'RAJ2000',dec:'DEJ2000',pmRA:'pmRA',pmDE:'pmDE',bands:Object.freeze({B2:'B2mag',R2:'R2mag',I2:'Imag'})}),
});
export function vizierBandColumn(catalog:VizierCatalogId,band:VizierBand):string {
 const column=shapes[catalog]?.bands[band];if(!column)throw new VizierCatalogError('context','band');return column;
}

/** Recovered NOFS scalars (CAMERA-QUERY-CONTEXT): RA degrees and DEC with 6 decimals, SR with 2.
 * [W] JavaScript toFixed with an ASCII dot replaces the native locale formatter 0x40cf28. */
export function vizierConeUrl(catalog:VizierCatalogId,raDegrees:number,decDegrees:number,radiusDegrees:number,baseUrl:string=VIZIER_POLICY.baseUrl):string {
 if(!Object.hasOwn(shapes,catalog))throw new VizierCatalogError('context','catalog');
 if(!Number.isFinite(raDegrees)||raDegrees<0||raDegrees>360||!Number.isFinite(decDegrees)||Math.abs(decDegrees)>90||!Number.isFinite(radiusDegrees)||radiusDegrees<=0||radiusDegrees>1)throw new VizierCatalogError('context','cone');
 const sr=radiusDegrees.toFixed(2);if(Number(sr)<=0)throw new VizierCatalogError('context','cone');
 return `${baseUrl}/${catalog}/out?RA=${raDegrees.toFixed(6)}&DEC=${decDegrees.toFixed(6)}&SR=${sr}`;
}

export type VizierRowContext=Readonly<{catalog:VizierCatalogId;band:VizierBand;epochOffsetYears:number;queryBrightMagnitude:number;queryFaintMagnitude:number}>;
export type VizierCandidate=Readonly<{
 identifier:string;cells:readonly string[];
 sourceRaHours:number;sourceDecDegrees:number;motionRaAfterDivision:number;motionDecAfterDivision:number;
 raHours:number;decDegrees:number;selectedMagnitude:number;band:VizierBand;
}>;
export type VizierRowResult=
 |Readonly<{kind:'candidate';row:VizierCandidate}>
 |Readonly<{kind:'rejected';reason:'selected-magnitude'|'query-magnitude-window'}>
 |Readonly<{kind:'invalid';field:string}>;
export type VizierEntry=Readonly<{rowIndex:number;result:VizierRowResult}>;
export type VizierCandidateEntry=Readonly<{rowIndex:number;result:Readonly<{kind:'candidate';row:VizierCandidate}>}>;
export type VizierCatalog=Readonly<{
 catalog:VizierCatalogId;context:VizierRowContext;fieldNames:readonly string[];
 queryStatus:string|null;maxTuples:number;matches:number|null;
 entries:readonly VizierEntry[];
 /** Candidates in the recovered RA-then-DEC sorted-insertion order (0x492728). */
 catalogEntries:readonly VizierCandidateEntry[];
 rejectedCount:number;invalidCount:number;
}>;
const owned=new WeakSet<object>();

const entities:Readonly<Record<string,string>>=Object.freeze({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"});
function decode(text:string):string {
 return text.replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|[a-z]+);/g,(_whole,name:string)=>{
  if(name[0]==='#'){const code=name[1]==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10);if(code>0x10ffff)throw new VizierCatalogError('malformed','entity');return String.fromCodePoint(code);}
  const value=entities[name];if(value===undefined)throw new VizierCatalogError('malformed','entity');return value;
 });
}
function attribute(tag:string,name:string):string|null {
 const m=new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(tag);return m?decode(m[2]??m[3]??''):null;
}
const decimal=/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
/** [W] Blank cells, and the declared VOTable null "NaN", are absent values. */
function number(cell:string|undefined):number|null {
 const s=(cell??'').trim();if(s===''||s==='NaN')return null;
 if(s.length>64||!decimal.test(s))return Number.NaN;
 return Number(s);
}

/** Parse one VizieR cone-search VOTable and admit its rows under the recovered NOFS row contract. */
export function readVizierCatalog(bytes:Uint8Array,context:VizierRowContext):VizierCatalog {
 if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length>VIZIER_POLICY.maxBytes)throw new VizierCatalogError('size');
 if(!context||typeof context!=='object'||!Object.hasOwn(shapes,context.catalog)||!Number.isFinite(context.epochOffsetYears)||Math.abs(context.epochOffsetYears)>1000||
  !Number.isFinite(context.queryBrightMagnitude)||!Number.isFinite(context.queryFaintMagnitude)||context.queryBrightMagnitude>context.queryFaintMagnitude)throw new VizierCatalogError('context');
 const shape=shapes[context.catalog],bandColumn=vizierBandColumn(context.catalog,context.band);
 const ownedContext:VizierRowContext=Object.freeze({catalog:context.catalog,band:context.band,epochOffsetYears:context.epochOffsetYears,queryBrightMagnitude:context.queryBrightMagnitude,queryFaintMagnitude:context.queryFaintMagnitude});
 let text:string;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new VizierCatalogError('encoding');}
 if(!/<VOTABLE[\s>]/.test(text))throw new VizierCatalogError('not-votable');
 if(/<(BINARY2?|FITS)[\s>]/.test(text))throw new VizierCatalogError('binary');
 // INFOs are read from the whole document: VizieR writes them both before and after the RESOURCE.
 let queryStatus:string|null=null,maxTuples:number=VIZIER_POLICY.defaultMaxTuples,matches:number|null=null;
 for(const m of text.matchAll(/<INFO\b[^>]*>/g)){
  const name=attribute(m[0],'name'),value=attribute(m[0],'value');
  if(name==='QUERY_STATUS')queryStatus=value;
  if(name==='MaxTuples'&&value!==null&&/^\d{1,9}$/.test(value))maxTuples=Number(value);
  if(name==='matches'&&value!==null&&/^\d{1,9}$/.test(value))matches=Number(value);
 }
 if(queryStatus==='OVERFLOW')throw new VizierCatalogError('overflow','QUERY_STATUS');
 if(queryStatus!==null&&queryStatus!=='OK')throw new VizierCatalogError('query-status',queryStatus);
 // IVOA Simple Cone Search 1.03 signals errors with an INFO or PARAM named "Error".
 for(const m of text.matchAll(/<(?:INFO|PARAM)\b[^>]*>/g))if(attribute(m[0],'name')==='Error')throw new VizierCatalogError('query-status','Error');
 const tables=[...text.matchAll(/<TABLE\b[^>]*>([\s\S]*?)<\/TABLE>/g)];
 let fieldNames:readonly string[]=[],rows:string[][]=[];
 // A usable answer has exactly one TABLE; a document without one is never read as an empty field.
 if(tables.length!==1)throw new VizierCatalogError('table-count',String(tables.length));
 {
  const body=tables[0][1];
  fieldNames=Object.freeze([...body.matchAll(/<FIELD\b[^>]*>/g)].map(f=>{const n=attribute(f[0],'name');if(!n)throw new VizierCatalogError('malformed','FIELD');return n;}));
  if(new Set(fieldNames).size!==fieldNames.length)throw new VizierCatalogError('malformed','duplicate FIELD');
  const data=/<TABLEDATA>([\s\S]*?)<\/TABLEDATA>/.exec(body);
  if(data){
   for(const tr of data[1].matchAll(/<TR\b[^>]*>([\s\S]*?)<\/TR>/g)){
    if(rows.length>=VIZIER_POLICY.maxRows)throw new VizierCatalogError('row-limit');
    const cells=[...tr[1].matchAll(/<TD\b[^>]*\/>|<TD\b[^>]*>([\s\S]*?)<\/TD>/g)].map(td=>{const v=decode(td[1]??'');if(v.length>VIZIER_POLICY.maxCellChars||/[<>]/.test(v))throw new VizierCatalogError('malformed','TD');return v;});
    if(cells.length!==fieldNames.length)throw new VizierCatalogError('malformed',`row ${rows.length+1} cells`);
    rows.push(cells);
   }
  }else if(/<DATA>/.test(body))throw new VizierCatalogError('binary','DATA without TABLEDATA');
 }
 // Overflow: the service stopped at its row cap, so the field cannot be complete. Never treated as a full field.
 if(rows.length>=maxTuples||(matches!==null&&matches>rows.length))throw new VizierCatalogError('overflow',`${rows.length}/${maxTuples}`);
 const index=(name:string)=>fieldNames.indexOf(name);
 const columns={id:index(shape.id),ra:index(shape.ra),dec:index(shape.dec),pmRA:index(shape.pmRA),pmDE:index(shape.pmDE),band:index(bandColumn)};
 for(const [key,at] of Object.entries(columns))if(key!=='band'&&at<0)throw new VizierCatalogError('missing-field',key);
 if(columns.band<0)throw new VizierCatalogError('missing-band',bandColumn);
 const entries:VizierEntry[]=rows.map((cells,rowIndex)=>Object.freeze({rowIndex,result:readRow(cells,columns,ownedContext)}));
 const candidates=entries.filter((e):e is VizierCandidateEntry=>e.result.kind==='candidate');
 const catalog:VizierCatalog=Object.freeze({catalog:context.catalog,context:ownedContext,fieldNames,queryStatus,maxTuples,matches,
  entries:Object.freeze(entries),catalogEntries:ordered(candidates),
  rejectedCount:entries.filter(e=>e.result.kind==='rejected').length,invalidCount:entries.filter(e=>e.result.kind==='invalid').length});
 owned.add(catalog);return catalog;
}
function ordered(entries:readonly VizierCandidateEntry[]):readonly VizierCandidateEntry[] {
 try{return orderNativeNomadEntries(entries);}
 catch(error){if(error instanceof NativeNomadOrderError)throw new VizierCatalogError('row-limit','ordering');throw error;}
}
type Columns=Readonly<{id:number;ra:number;dec:number;pmRA:number;pmDE:number;band:number}>;
function readRow(cells:readonly string[],c:Columns,context:VizierRowContext):VizierRowResult {
 const invalid=(field:string)=>Object.freeze({kind:'invalid' as const,field});
 const identifier=cells[c.id].trim().slice(0,18);if(!identifier)return invalid('id');
 const raDegrees=number(cells[c.ra]),dec=number(cells[c.dec]);
 if(raDegrees===null||!Number.isFinite(raDegrees)||raDegrees<0||raDegrees>360)return invalid('RA');
 if(dec===null||!Number.isFinite(dec)||dec< -90||dec>90)return invalid('DEC');
 // A blank or malformed motion makes the native numeric row read fail; the row is skipped, never zero-filled.
 const muRA=number(cells[c.pmRA]),muDec=number(cells[c.pmDE]);
 if(muRA===null||!Number.isFinite(muRA))return invalid('MuRA');
 if(muDec===null||!Number.isFinite(muDec))return invalid('MuDEC');
 const raw=number(cells[c.band]);
 if(raw!==null&&!Number.isFinite(raw))return invalid('magnitude');
 // [W] Blank selected magnitude is rejected like the recovered 0 sentinel; no other band is substituted.
 const selectedMagnitude=Math.fround(raw??0);
 if(selectedMagnitude===0||selectedMagnitude>=30)return Object.freeze({kind:'rejected' as const,reason:'selected-magnitude' as const});
 // [W] NOFS applied bri/fai on the server (0x59c3f0 &bri=1.0, &fai=); VizieR cone search has no such cut.
 if(selectedMagnitude<context.queryBrightMagnitude||selectedMagnitude>context.queryFaintMagnitude)return Object.freeze({kind:'rejected' as const,reason:'query-magnitude-window' as const});
 const sourceRaHours=raDegrees/15,motionRaAfterDivision=Math.fround(muRA/1000),motionDecAfterDivision=Math.fround(muDec/1000);
 const row:VizierCandidate=Object.freeze({identifier,cells:Object.freeze([...cells]),sourceRaHours,sourceDecDegrees:dec,motionRaAfterDivision,motionDecAfterDivision,
  raHours:sourceRaHours+(context.epochOffsetYears*motionRaAfterDivision)/54000,
  decDegrees:dec+(context.epochOffsetYears*motionDecAfterDivision)/3600,
  selectedMagnitude,band:context.band});
 return Object.freeze({kind:'candidate' as const,row});
}

export type VizierSelection=Readonly<{catalog:VizierCatalog;bounds:NomadSelection;selectedEntries:readonly VizierCandidateEntry[];nativeMinimumMagnitude:number;nativeMaximumMagnitude:number}>;
/** Selection 0x59cc88: predicate 0x59cf58 into a second sorted list, then Single 25/-2 extrema sentinels. */
export function selectVizierCatalog(catalog:VizierCatalog,bounds:NomadSelection):VizierSelection {
 if(!catalog||!owned.has(catalog))throw new VizierCatalogError('context','ownership');
 const ownedBounds=Object.freeze({...bounds});
 const selectedEntries=ordered(catalog.catalogEntries.filter(e=>nativeNomadCandidateInSelection(e.result.row,ownedBounds)));
 let nativeMinimumMagnitude=25,nativeMaximumMagnitude=-2;
 for(const e of selectedEntries){const m=e.result.row.selectedMagnitude;if(m<nativeMinimumMagnitude)nativeMinimumMagnitude=m;if(m>nativeMaximumMagnitude)nativeMaximumMagnitude=m;}
 return Object.freeze({catalog,bounds:ownedBounds,selectedEntries,nativeMinimumMagnitude,nativeMaximumMagnitude});
}
/** [W] The camera selection bounds come from the shared region record at [0x5b5b30] (four Doubles + Single), whose
 * writer is not recovered. The web uses the whole sky, so selection reduces to the recovered magnitude limit;
 * the projection bounds 0x522698 still decide which sources land on the detector. */
export function wholeSkySelection(magnitudeLimit:number):NomadSelection {
 return Object.freeze({minRAHours:0,maxRAHours:24,minDecDegrees:-90,maxDecDegrees:90,magnitudeLimit:Math.fround(magnitudeLimit)});
}

export type VizierRoute=Readonly<{catalog:VizierCatalogId;band:VizierBand;catalogName:'NOMAD'|'USNO-B1'}>;
/** Filter -> catalog owner from the recovered CCD switch 0x5223c8 / IR 0x51dfda (cameraCatalogReference.ts):
 * NF/B/V/R -> NOMAD R/B/V/R, CCD I -> USNO-B1 I2 (mode 1), IR J/H/K -> NOMAD J/H/K. */
export function vizierRouteForCamera(kind:unknown,filterPosition:unknown):VizierRoute {
 const r=cameraCatalogReference(kind,filterPosition);
 return r.catalog==='USNO-B1'?Object.freeze({catalog:'I/284' as const,band:'I2' as const,catalogName:'USNO-B1' as const}):Object.freeze({catalog:'I/297' as const,band:r.selectedBand as VizierBand,catalogName:'NOMAD' as const});
}
