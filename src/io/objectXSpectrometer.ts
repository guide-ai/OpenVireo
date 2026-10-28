// Front F → E08: the Object X spectrometer as the page uses it. In the browser every evaluation runs in the Worker
// io/objectXSpectrometerWorker.ts (never on the main thread); under tests a resource seam evaluates in process. Results are
// cached per (pointing, telescope); a failure is not cached and the next call retries.
// Hidden identity (decision D5, review 2 finding 4): observeObjectXSpectrum returns only what the display may show before the
// reveal (available with its exposure, or unavailable with no reason); revealObjectXSpectrum is the separate accessor for the
// row, kind, record and typed reasons, for use after the reveal only.
import {evaluateObjectXSpectrum,objectXSpectrumEngine,type ObjectXSpectrumEngine,type ObjectXSpectrumEvaluation,type ObjectXSpectrumReveal,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import type {FieldTelescope} from '../core/fieldEngine';
import type {ObjectXSpectrometerResources} from './objectXSpectrometerInputs';
import type {ObjectXSpectrometerWorkerRequest} from './objectXSpectrometerWorker';
import {workerFailureKind,type WorkerFailureKind} from './workerFailure';
import {workerClient} from './workerClient';

export type {ObjectXSpectrometerResources,ObjectXSpectrumReveal};
export type ObjectXSpectrumView=
 |Readonly<{status:'available';telescope:FieldTelescope;wavelengths:readonly number[];engine:ObjectXSpectrumEngine}>
 |Readonly<{status:'unavailable';telescope:FieldTelescope}>;
/** The spectrometer data could not be loaded (network, resource, a crashed or silent Worker): the caller may retry. */
export class ObjectXSpectrometerLoadError extends Error{constructor(){super('Object X spectrometer: load');this.name='ObjectXSpectrometerLoadError';}}
/** A deterministic evidence mismatch (bundled pack, decoded original or recorded value): final, never retried. */
export class ObjectXSpectrometerEvidenceError extends Error{constructor(){super('Object X spectrometer: evidence');this.name='ObjectXSpectrometerEvidenceError';}}
/** 'evidence' (final) or 'load' (retryable) for any failure of observe/reveal, Worker or in process. */
export function objectXSpectrometerFailure(e:unknown):WorkerFailureKind{return e instanceof ObjectXSpectrometerEvidenceError?'evidence':e instanceof ObjectXSpectrometerLoadError?'load':workerFailureKind(e);}
let resources:ObjectXSpectrometerResources|null=null,inputs:Promise<ObjectXSpectrometerInputs>|null=null;
const cache=new Map<string,Promise<ObjectXSpectrumEvaluation>>();
/** Test seam: recorded local bytes evaluated in process; null restores the browser Worker path. */
export function setObjectXSpectrometerResources(r:ObjectXSpectrometerResources|null){resources=r;inputs=null;cache.clear();}

// A Worker silent for the inactivity timeout is evicted with every request it holds: each rejects as a retryable load failure
// and its cache entry is removed (io/workerClient.ts).
const ask=workerClient(()=>new Worker(new URL('./objectXSpectrometerWorker.ts',import.meta.url),{type:'module'}));
async function viaWorker(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumEvaluation>{
 const m=await ask({pointing:{ra:pointing.ra,dec:pointing.dec},telescope} satisfies Omit<ObjectXSpectrometerWorkerRequest,'ticket'>);
 if(m.ok&&m.evaluation)return m.evaluation as ObjectXSpectrumEvaluation;
 throw m.kind==='evidence'?new ObjectXSpectrometerEvidenceError():new ObjectXSpectrometerLoadError();
}
async function inProcess(r:ObjectXSpectrometerResources,pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumEvaluation>{
 inputs??=import('./objectXSpectrometerInputs').then(m=>m.loadObjectXSpectrometerInputs(r)).catch(e=>{inputs=null;throw e;});
 return evaluateObjectXSpectrum(await inputs,pointing,telescope);
}
function evaluation(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumEvaluation>{
 const k=`${pointing.ra}:${pointing.dec}:${telescope}`;let p=cache.get(k);
 if(!p){p=(resources?inProcess(resources,pointing,telescope):viaWorker(pointing,telescope));cache.set(k,p);p.catch(()=>cache.delete(k));}
 return p;
}
/** What the display may show before the reveal. */
export async function observeObjectXSpectrum(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumView>{
 const d=(await evaluation(pointing,telescope)).display;
 return d.status==='available'?Object.freeze({status:'available',telescope:d.telescope,wavelengths:d.wavelengths,engine:objectXSpectrumEngine(d)}):Object.freeze({status:'unavailable',telescope:d.telescope});
}
/** After the reveal only: the row, kind, record and typed reasons of the same evaluation. */
export async function revealObjectXSpectrum(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumReveal>{
 return (await evaluation(pointing,telescope)).reveal;
}
