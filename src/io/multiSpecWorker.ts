/// <reference lib="webworker" />
// Front M: Multi-Spec field views and fibre spectra off the main thread (as io/objectXSpectrometerWorker.ts). Inputs are loaded
// once (a failure is not cached); replies are plain data with a WorkerFailureKind on failure (io/workerFailure.ts), and the
// Worker heartbeats while busy (io/workerClient.ts).
import {workerFailureKind} from './workerFailure';
import {workerBusy} from './workerClient';
import {browserMultiSpecResources,loadMultiSpecInputs,type MultiSpecFieldRequest,type MultiSpecInputs} from './multiSpecInputs';
import {evaluateMultiSpecSpectra,evaluateMultiSpecView,type MultiSpecFibreRequest} from './multiSpecEvaluate';
export type MultiSpecWorkerRequest=
 |Readonly<{ticket:number;op:'view';field:MultiSpecFieldRequest}>
 |Readonly<{ticket:number;op:'spectra';field:MultiSpecFieldRequest;fibres:readonly MultiSpecFibreRequest[]}>;
let inputs:Promise<MultiSpecInputs>|null=null;
self.onmessage=async(event:MessageEvent<MultiSpecWorkerRequest>)=>{
 const request=event.data,post=(m:unknown)=>(self as unknown as DedicatedWorkerGlobalScope).postMessage(m),settle=workerBusy(post);
 try{
  inputs??=loadMultiSpecInputs(browserMultiSpecResources()).catch(e=>{inputs=null;throw e;});
  const loaded=await inputs;
  if(request.op==='view')post({ticket:request.ticket,ok:true,view:await evaluateMultiSpecView(loaded,request.field)});
  else post({ticket:request.ticket,ok:true,exposures:await evaluateMultiSpecSpectra(loaded,request.field,request.fibres)});
 }catch(e){post({ticket:request.ticket,ok:false,kind:workerFailureKind(e)});}
 finally{settle();}
};
