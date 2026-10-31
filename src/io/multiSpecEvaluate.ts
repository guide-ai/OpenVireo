// Front M: the two Multi-Spec evaluations, shared by the Worker (io/multiSpecWorker.ts) and the in-process test seam
// (io/multiSpec.ts): the Telescope view of a field (core/fieldEngine.ts evaluateFieldView) and the spectra of a list of fibres
// (core/multiSpecSpectrum.ts) on that field. Results are plain, cloneable data (the scene loses its in-memory brand when posted).
import {FieldEngineError,evaluateFieldView,type FieldView} from '../core/fieldEngine';
import type {FieldPack} from '../core/fieldPack';
import {multiSpecFibreSpectrum,type MultiSpecExposure,type MultiSpecSelection} from '../core/multiSpecSpectrum';
import {multiSpecContext,multiSpecFieldOptions,type MultiSpecFieldRequest,type MultiSpecInputs} from './multiSpecInputs';
import {fieldSpectrumFailure} from './fieldSpectrumFailure';

export type MultiSpecFibreRequest=Readonly<{selection:MultiSpecSelection;seed:number;seconds:number}>;
/** Front G G4b: why an assembled field has no view (the tile and catalogue-read results of G2, shown as readable text). A file
 * that did not arrive is 'field-tiles' (retryable); one that did not match its identity is 'load-error'; anything else is
 * 'internal' (G4b review 1 L3: the same classifier as the field spectrometer, io/fieldSpectrumFailure.ts). */
export type MultiSpecFieldRead=Readonly<{reason:'field-polar'|'load-error'|'internal'}|{reason:'field-tiles'|'field-unreadable';detail:string}>;
/** A Multi-Spec view: the field engine's view, plus `fieldRead` when an assembled field could not be read. */
export type MultiSpecView=FieldView&Readonly<{fieldRead?:MultiSpecFieldRead}>;
const views=new WeakMap<MultiSpecInputs,Map<string,MultiSpecView>>();
/** The pack of a request: a certified bundled pack, or one assembled from the tiles at the request's pointing (the Worker keeps
 * its own tile store; same-origin files only). A read failure is returned typed, never as a load error. */
async function requestPack(inputs:MultiSpecInputs,request:MultiSpecFieldRequest,signal?:AbortSignal):Promise<FieldPack|MultiSpecFieldRead>{
 if(request.pack!=='gsc-tiles')return inputs.pack(request.pack);
 const [{assembleFieldPack,AssembledFieldError},{tileSources}]=await Promise.all([import('./assembledFieldPack'),import('./tileAssembly')]);
 try{return await assembleFieldPack(request.pointing,(await tileSources()).assembly,signal);}
 catch(e){
  // A superseded or cancelled build (G4b review 1 M1) rejects; nothing is cached or shown.
  if(signal?.aborted||e instanceof DOMException&&e.name==='AbortError')throw e;
  if(e instanceof AssembledFieldError)return e.code==='polar'?Object.freeze({reason:'field-polar'}):Object.freeze({reason:'field-unreadable',detail:e.code});
  const shown=fieldSpectrumFailure(e),reason='reason' in shown?shown.reason:'internal';
  return reason==='field-tiles'?Object.freeze({reason:'field-tiles',detail:'fetch'}):Object.freeze({reason:reason==='load-error'?'load-error':'internal'});
 }
}
const unread=(request:MultiSpecFieldRequest,fieldRead:MultiSpecFieldRead):MultiSpecView=>Object.freeze({pointing:Object.freeze({...request.pointing}),telescope:request.telescope,reasons:Object.freeze([]),
 population:null,scene:null,viewport:null,unpaintedStarIds:Object.freeze([]),fieldRead});
const key=(r:MultiSpecFieldRequest)=>`${r.pack}:${r.pointing.ra}:${r.pointing.dec}:${r.telescope}:${r.variableTime?.jd??''}`;
/** `signal` stops an assembled build at its next pause (a newer field superseded it, or the form closed). */
export async function evaluateMultiSpecView(inputs:MultiSpecInputs,request:MultiSpecFieldRequest,signal?:AbortSignal):Promise<MultiSpecView>{
 let m=views.get(inputs);if(!m){m=new Map();views.set(inputs,m);}
 const k=key(request),hit=m.get(k);if(hit)return hit;
 const pack=await requestPack(inputs,request,signal);
 // A file that did not arrive or did not match is not cached (the next request fetches again, past the HTTP cache for a bad
 // tile); a field the native read cannot reproduce is.
 if('reason' in pack){const v=unread(request,pack);if(pack.reason!=='field-tiles'&&pack.reason!=='load-error')put(m,k,v);return v;}
 let v:MultiSpecView;
 try{v=evaluateFieldView(pack,inputs.objectX.glx,{ra:request.pointing.ra,dec:request.pointing.dec},request.telescope,multiSpecFieldOptions(inputs,request));}
 catch(e){if(request.pack==='gsc-tiles'&&e instanceof FieldEngineError&&e.code==='polar')v=unread(request,{reason:'field-polar'});else throw e;}
 put(m,k,v);return v;
}
function put(m:Map<string,MultiSpecView>,k:string,v:MultiSpecView){if(m.size>=16)m.delete(m.keys().next().value!);m.set(k,v);}
/** Spectra of the fibres in order; a field without a view (field-level reasons) yields no spectra (empty list). */
export async function evaluateMultiSpecSpectra(inputs:MultiSpecInputs,request:MultiSpecFieldRequest,fibres:readonly MultiSpecFibreRequest[]):Promise<readonly MultiSpecExposure[]>{
 const view=await evaluateMultiSpecView(inputs,request);
 if(!view.population||!view.viewport)return Object.freeze([]);
 const context=await multiSpecContext(inputs,view.population,request.telescope,fibres.map(f=>f.selection));
 return Object.freeze(fibres.map(f=>multiSpecFibreSpectrum(f.selection,context,f.seed,f.seconds)));
}
