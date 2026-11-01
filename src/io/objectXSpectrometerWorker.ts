/// <reference lib="webworker" />
// E08: evaluates Object X spectrometer fields off the main thread (review 2 finding 1 applied to E08). Inputs are loaded once
// (a failure is not cached); the reply is plain data (display and reveal parts, core/objectXSpectrometer.ts).
import {workerFailureKind} from './workerFailure';
import {workerBusy} from './workerClient';
import {browserObjectXResources,loadObjectXSpectrometerInputs} from './objectXSpectrometerInputs';
import {evaluateObjectXSpectrum,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import type {FieldTelescope} from '../core/fieldEngine';
import type {SpectralRange} from '../core/spectralRange';
/** range (Front S3): absent = the default 3700–4700 Å. */
export type ObjectXSpectrometerWorkerRequest=Readonly<{ticket:number;pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;range?:SpectralRange}>;
let inputs:Promise<ObjectXSpectrometerInputs>|null=null;
self.onmessage=async(event:MessageEvent<ObjectXSpectrometerWorkerRequest>)=>{
 const {ticket,pointing,telescope,range}=event.data,post=(m:unknown)=>(self as unknown as DedicatedWorkerGlobalScope).postMessage(m),settle=workerBusy(post);
 try{
  inputs??=loadObjectXSpectrometerInputs(browserObjectXResources()).catch(e=>{inputs=null;throw e;});
  post({ticket,ok:true,evaluation:evaluateObjectXSpectrum(await inputs,pointing,telescope,range)});
 }catch(e){post({ticket,ok:false,kind:workerFailureKind(e)});}
 finally{settle();}
};
