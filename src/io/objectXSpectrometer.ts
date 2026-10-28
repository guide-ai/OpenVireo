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

export type {ObjectXSpectrometerResources,ObjectXSpectrumReveal};
export type ObjectXSpectrumView=
 |Readonly<{status:'available';telescope:FieldTelescope;wavelengths:readonly number[];engine:ObjectXSpectrumEngine}>
 |Readonly<{status:'unavailable';telescope:FieldTelescope}>;
/** The spectrometer data could not be loaded or evaluated (network, worker): the caller may retry. */
export class ObjectXSpectrometerLoadError extends Error{constructor(){super('Object X spectrometer: load');this.name='ObjectXSpectrometerLoadError';}}
let resources:ObjectXSpectrometerResources|null=null,inputs:Promise<ObjectXSpectrometerInputs>|null=null;
const cache=new Map<string,Promise<ObjectXSpectrumEvaluation>>();
/** Test seam: recorded local bytes evaluated in process; null restores the browser Worker path. */
export function setObjectXSpectrometerResources(r:ObjectXSpectrometerResources|null){resources=r;inputs=null;cache.clear();}

let worker:Worker|null=null,ticket=0;
const waiting=new Map<number,(m:{ok:boolean;evaluation?:ObjectXSpectrumEvaluation})=>void>();
function viaWorker(pointing:Readonly<{ra:number;dec:number}>,telescope:FieldTelescope):Promise<ObjectXSpectrumEvaluation>{
 if(!worker){
  worker=new Worker(new URL('./objectXSpectrometerWorker.ts',import.meta.url),{type:'module'});
  worker.onmessage=e=>{const w=waiting.get(e.data.ticket);waiting.delete(e.data.ticket);w?.(e.data);};
  worker.onerror=()=>{for(const w of waiting.values())w({ok:false});waiting.clear();worker?.terminate();worker=null;};
 }
 const mine=++ticket;
 return new Promise((resolve,reject)=>{
  waiting.set(mine,m=>m.ok&&m.evaluation?resolve(m.evaluation):reject(new ObjectXSpectrometerLoadError()));
  worker!.postMessage({ticket:mine,pointing:{ra:pointing.ra,dec:pointing.dec},telescope} satisfies ObjectXSpectrometerWorkerRequest);
 });
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
