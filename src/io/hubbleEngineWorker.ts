/// <reference lib="webworker" />
// Front F: prepares engine Hubble fields off the main thread (review 2 finding 1). The continuation source preparer (a function)
// is not cloneable; its plain-data descriptor travels instead and the page rebuilds it (core/fieldContinuation.ts).
import {workerFailureKind} from './workerFailure';
import {browserEngineResources,prepareEngineEntry} from './hubbleEngineEntry';
import type {ExtendedTelescope} from '../core/hubbleEngineTargets';
export type HubbleEngineWorkerRequest=Readonly<{ticket:number;id:string;telescope:ExtendedTelescope}>;
self.onmessage=async(event:MessageEvent<HubbleEngineWorkerRequest>)=>{
 const {ticket,id,telescope}=event.data,post=(m:unknown)=>(self as unknown as DedicatedWorkerGlobalScope).postMessage(m);
 try{
  const e=await prepareEngineEntry(id,telescope,browserEngineResources);
  const {sourcePreparer,...configuration}=e.configuration as typeof e.configuration&{sourcePreparer?:unknown};void sourcePreparer;
  post({ticket,ok:true,definition:e.definition,configuration});
 }catch(e){post({ticket,ok:false,kind:workerFailureKind(e)});}
};
