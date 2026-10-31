// Front M: the Multi-Spec as the page uses it. In the browser every evaluation runs in the Worker io/multiSpecWorker.ts (never on
// the main thread); under tests a resource seam evaluates in process. A failure is 'evidence' (final) or 'load' (retryable).
// Object X (M4): the view and spectra carry catalogue names; the page masks them before the reveal (plan §4).
import type {MultiSpecExposure} from '../core/multiSpecSpectrum';
import type {MultiSpecFieldRequest,MultiSpecInputs,MultiSpecResources} from './multiSpecInputs';
import type {MultiSpecFibreRequest,MultiSpecView} from './multiSpecEvaluate';
import type {MultiSpecWorkerRequest} from './multiSpecWorker';
import {workerClient} from './workerClient';
import {workerFailureKind,type WorkerFailureKind} from './workerFailure';

export type {MultiSpecFieldRequest,MultiSpecFibreRequest,MultiSpecResources,MultiSpecView};
export class MultiSpecLoadError extends Error{constructor(){super('Multi-Spec: load');this.name='MultiSpecLoadError';}}
export class MultiSpecEvidenceError extends Error{constructor(){super('Multi-Spec: evidence');this.name='MultiSpecEvidenceError';}}
export function multiSpecFailure(e:unknown):WorkerFailureKind{return e instanceof MultiSpecEvidenceError?'evidence':e instanceof MultiSpecLoadError?'load':workerFailureKind(e);}
let resources:MultiSpecResources|null=null,inputs:Promise<MultiSpecInputs>|null=null;
/** Test seam: recorded local bytes evaluated in process; null restores the browser Worker path. */
export function setMultiSpecResources(r:MultiSpecResources|null){resources=r;inputs=null;}
const ask=workerClient(()=>new Worker(new URL('./multiSpecWorker.ts',import.meta.url),{type:'module'}));
type Request=MultiSpecWorkerRequest extends infer R?R extends unknown?Omit<R,'ticket'>:never:never;
async function viaWorker<T>(request:Request,field:'view'|'exposures',signal?:AbortSignal):Promise<T>{
 const m=await ask(request,signal);
 if(m.ok&&m[field]!==undefined)return m[field] as T;
 throw m.kind==='evidence'?new MultiSpecEvidenceError():new MultiSpecLoadError();
}
async function loaded(r:MultiSpecResources){
 inputs??=import('./multiSpecInputs').then(m=>m.loadMultiSpecInputs(r)).catch(e=>{inputs=null;throw e;});
 return inputs;
}
/** The Telescope view (population, scene, 312² viewport, field-level reasons) of one field; an assembled field that could not be
 * read carries `fieldRead` (Front G G4b). An abort (a newer field, or the form closed) rejects with AbortError. */
export async function multiSpecView(field:MultiSpecFieldRequest,signal?:AbortSignal):Promise<MultiSpecView>{
 if(!resources)return viaWorker<MultiSpecView>({op:'view',field},'view',signal);
 const {evaluateMultiSpecView}=await import('./multiSpecEvaluate');return evaluateMultiSpecView(await loaded(resources),field,signal);
}
/** The spectra of the fibres, in order (each from its own seed and integrated seconds). */
export async function multiSpecSpectra(field:MultiSpecFieldRequest,fibres:readonly MultiSpecFibreRequest[]):Promise<readonly MultiSpecExposure[]>{
 if(!resources)return viaWorker<readonly MultiSpecExposure[]>({op:'spectra',field,fibres},'exposures');
 const {evaluateMultiSpecSpectra}=await import('./multiSpecEvaluate');return evaluateMultiSpecSpectra(await loaded(resources),field,fibres);
}
