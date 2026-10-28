/// <reference lib="webworker" />
// E08: evaluates Object X spectrometer fields off the main thread (review 2 finding 1 applied to E08). Inputs are loaded once
// (a failure is not cached); the reply is plain data (display and reveal parts, core/objectXSpectrometer.ts).
import {workerFailureKind} from './workerFailure';
import {workerBusy} from './workerClient';
import {browserObjectXResources,loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {evaluateObjectXSpectrum,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import type {FieldTelescope} from '../core/fieldEngine';
export type ObjectXSpectrometerWorkerRequest=Readonly<{ticket:number;pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope}>;
let inputs:Promise<ObjectXSpectrometerInputs>|null=null;
self.onmessage=async(event:MessageEvent<ObjectXSpectrometerWorkerRequest>)=>{
 const {ticket,pointing,telescope}=event.data,post=(m:unknown)=>(self as unknown as DedicatedWorkerGlobalScope).postMessage(m),settle=workerBusy(post);
 try{
  inputs??=loadObjectXSpectrometerInputs(browserObjectXResources()).catch(e=>{inputs=null;throw e;});
  post({ticket,ok:true,evaluation:evaluateObjectXSpectrum(await inputs,pointing,telescope)});
 }catch(e){post({ticket,ok:false,kind:workerFailureKind(e)});}
 finally{settle();}
};
