// Front G (G4a, analysis/front-plans/front-g-gsc.md §11): the single-slit spectrometer at any telescope pointing. The field is
// a pack assembled from the compact GSC tiles (the instrument field, 0.375°); the spectrometer inputs are every bundled star
// template and own galaxy spectrum (Object X and Multi-Spec lists), QSOSpect.dat, JSPEC2.SPI, GLXYSP.LST and the approved
// photographs. The Object X mask (2°) applies before anything is read. Same-origin files only; nothing is sent anywhere.
import type {FieldResult,FieldTelescope,FieldVariableTime} from '../core/fieldEngine';
import {FIELD_SPECTRUM_FORMAT,fieldSpectrumPolicy,parseFieldSpectrumPolicy,spectrometerFieldResult,type SpectrometerInputs} from '../core/fieldSpectrometer';
export {FIELD_SPECTRUM_FORMAT,serializeFieldSpectrumSession} from '../core/fieldSpectrometer';
import {GLXYSP_LST} from '../core/lssLists';
import {nativePhotographRows} from '../core/photographicList';
import {decodeStarIndexList,starTemplateSpectrum,JSPEC2_SPI} from '../core/starTemplates';
import {decodeQsoSpectrumFile,QSO_SPECTRUM_FILE} from '../core/qsoSpectrum';
import {parseLibrarySpectrum} from '../core/spectrum';
import {decodeBitmap8,type Bitmap8} from '../core/photographDraw';
import {JournalError,MAX_JOURNAL_EVENTS,type JournalEvent,type JournalState} from '../core/exposureJournal';
import {lssExposureEngine} from '../core/lssExposure';
import type {Pointing} from '../core/sky';
import type {UniformSpectrum} from '../core/acquisition';
import {AssembledFieldError,assembleFieldPack} from './assembledFieldPack';
import {GscTileError} from './gscTiles';
import {loadObjectXPositions,objectXMasked} from './objectXMask';
import {BoundedResourceError,resourceSha256,boundedResourceBody} from './boundedResource';
import {tileSources} from './tileAssembly';
import {yieldTask} from './yieldTask';
import {OBJECT_X_STAR_TEMPLATES,OBJECT_X_GALAXY_SPECTRA} from './objectXSpectrometerInputs';
import {APPROVED_PHOTOGRAPHS} from '../core/approvedPhotographs';
import {MULTISPEC_STAR_TEMPLATES,MULTISPEC_GALAXY_SPECTRA} from './multiSpecInputs';

type Resource=Readonly<{file:string;path:string;bytes:number;sha256:string}>;
const unique=(list:readonly Resource[])=>[...new Map(list.map(r=>[r.file,r])).values()];
const latin1=(b:Uint8Array)=>{let t='';for(const x of b)t+=String.fromCharCode(x);return t;};
export class FieldSpectrometerError extends Error{constructor(readonly code:'resource'|'session'){super(`Field spectrometer: ${code}`);this.name='FieldSpectrometerError';}}
let fileOverride:((path:string,bytes:number)=>Promise<Uint8Array>)|null=null,inputs:Promise<SpectrometerInputs>|null=null;
/** Test seam: read same-origin files from elsewhere (the tile sources have their own seam, tileAssembly.ts). */
export function setFieldSpectrometerFiles(read:((path:string,bytes:number)=>Promise<Uint8Array>)|null){fileOverride=read;inputs=null;}
async function file(path:string,bytes:number):Promise<Uint8Array>{
 if(fileOverride)return fileOverride(path,bytes);
 const res=await fetch(path,{credentials:'same-origin'});
 // A host with an SPA fallback answers a missing file with 200 and index.html: a file that did not arrive (as the tile store).
 if(/^\s*text\/html\b/i.test(res.headers.get('content-type')??'')){try{await res.body?.cancel();}catch{/* ignore */}throw new BoundedResourceError('download');}
 return new Uint8Array(await boundedResourceBody(res,bytes));
}
async function checked(r:Readonly<{path:string;bytes:number;sha256:string}>){const b=await file(r.path,r.bytes);if(b.byteLength!==r.bytes||await resourceSha256(b.slice().buffer as ArrayBuffer)!==r.sha256)throw new FieldSpectrometerError('resource');return b;}
/** Map with at most `limit` tasks in flight; results in input order. */
async function pooled<T,R>(items:readonly T[],task:(item:T)=>Promise<R>,limit=8):Promise<R[]>{
 const out=new Array<R>(items.length);let next=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await task(items[i]);}}));
 return out;
}
async function loadInputs():Promise<SpectrometerInputs>{
 const s=await tileSources();
 const [qsoBytes,spi,glxysp]=await Promise.all([checked(QSO_SPECTRUM_FILE),checked(JSPEC2_SPI),checked(GLXYSP_LST)]);
 // G4a review 1 L4: the independent files are fetched and checked a few at a time, not one after another.
 const [templates,spectra,photographs]=await Promise.all([
  pooled(unique([...OBJECT_X_STAR_TEMPLATES,...MULTISPEC_STAR_TEMPLATES]),async t=>[t.file,starTemplateSpectrum(latin1(await checked(t)))] as const),
  pooled(unique([...OBJECT_X_GALAXY_SPECTRA,...MULTISPEC_GALAXY_SPECTRA]),async g=>[g.file,parseLibrarySpectrum(latin1(await checked(g)))] as const),
  pooled(APPROVED_PHOTOGRAPHS,async b=>[b.file,decodeBitmap8(await checked(b))] as const)]);
 const starTemplates=new Map<string,UniformSpectrum>(templates),galaxySpectra=new Map(spectra),bitmaps=new Map<string,Bitmap8>(photographs);
 const glxyspLines=latin1(glxysp).replace(/\x1a$/,'').split('\r\n').filter(l=>l!=='');
 return Object.freeze({glx:s.glx,qsoCatalog:s.qso,qsoSpectrum:decodeQsoSpectrumFile(qsoBytes),starIndex:decodeStarIndexList(spi),starTemplates,glxyspLines,galaxySpectra,photographs:Object.freeze({rows:nativePhotographRows(s.glimages),bitmaps})});
}
/** The shared inputs, loaded once (exported for tests and for future routes). */
export function spectrometerInputs(){inputs??=loadInputs();inputs.catch(()=>{inputs=null;});return inputs;}

export type PreparedFieldSpectrum=Readonly<{status:'ready';pointing:Pointing;telescope:FieldTelescope;policy:string;result:FieldResult}|{status:'unavailable';reason:'object-x-hidden'|'field-polar'|'field-tiles'|'field-unreadable';detail?:string}>;
/** G4c: a prepared field with its exposure journal (the investigation's field-spectrum part). */
export type FieldSpectrumRecord=Readonly<{prepared:Extract<PreparedFieldSpectrum,{status:'ready'}>;state:JournalState}>;
/** The spectrometer's field result at a pointing and telescope. An available result has no reasons; the result is returned either
 * way so the page can show what the slit selects and the engine's typed reasons. An abort rejects with AbortError.
 * variableTime: the observatory JD frozen when the student pressed Use (recorded in the policy). */
export async function prepareFieldSpectrum(pointing:Pointing,telescope:FieldTelescope,options:Readonly<{signal?:AbortSignal;hidden?:Pointing|null;variableTime?:FieldVariableTime}>={}):Promise<PreparedFieldSpectrum>{
 const {signal}=options;signal?.throwIfAborted();
 if(await objectXMasked(options.hidden??null,pointing))return Object.freeze({status:'unavailable',reason:'object-x-hidden'});
 const [s,inp]=await Promise.all([tileSources(),spectrometerInputs()]);signal?.throwIfAborted();
 let pack;
 try{pack=await assembleFieldPack(pointing,s.assembly,signal);}
 catch(e){
  if(e instanceof GscTileError)return Object.freeze({status:'unavailable',reason:'field-tiles',detail:e.code});
  if(e instanceof AssembledFieldError)return Object.freeze(e.code==='polar'?{status:'unavailable',reason:'field-polar'}:{status:'unavailable',reason:'field-unreadable',detail:e.code});
  throw e;
 }
 await yieldTask();signal?.throwIfAborted();
 const result=spectrometerFieldResult(inp,pack,pointing,telescope,options.variableTime);
 return Object.freeze({status:'ready',pointing:Object.freeze({ra:pointing.ra,dec:pointing.dec}),telescope,policy:fieldSpectrumPolicy(pointing,telescope,options.variableTime),result});
}

/** Reads a session file: the field is prepared again at its policy's pointing and telescope, then the journal is replayed. */
export async function readFieldSpectrumSession(text:string,options:Readonly<{signal?:AbortSignal;hidden?:Pointing|null}>={}):Promise<Readonly<{prepared:Extract<PreparedFieldSpectrum,{status:'ready'}>;state:JournalState}>>{
 let v:unknown;try{v=JSON.parse(text);}catch{throw new JournalError('session');}
 const r=v as Record<string,unknown>;
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==5||r.format!==FIELD_SPECTRUM_FORMAT||r.version!==1||typeof r.seedAtReset!=='number'||!Array.isArray(r.events)||r.events.length>MAX_JOURNAL_EVENTS)throw new JournalError('session');
 const p=parseFieldSpectrumPolicy(r.policy);if(!p)throw new JournalError('session');
 // G4c review 1 M1: the mask fails closed when ObjectX.HTL cannot be read; read it first so a file that did not arrive is a
 // missing resource (retryable), and a part refused as masked really lies near Object X.
 await loadObjectXPositions();
 const prepared=await prepareFieldSpectrum(p.pointing,p.telescope,{...options,...(p.variableTime?{variableTime:p.variableTime}:{})});
 // G4c: a field whose tiles did not arrive is a missing resource (retryable), not a bad file.
 if(prepared.status==='unavailable'&&prepared.reason==='field-tiles')throw new GscTileError((prepared.detail??'fetch') as GscTileError['code']);
 if(prepared.status!=='ready'||prepared.policy!==r.policy||prepared.result.reasons.length||!prepared.result.calibration)throw new JournalError('session');
 return Object.freeze({prepared,state:lssExposureEngine(prepared.result,prepared.policy).replay(r.seedAtReset,r.events as JournalEvent[])});
}
