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
 /** Stops the view request with this ticket (G4b review 1 M1); no reply. */
 |Readonly<{ticket:number;op:'cancel'}>
 |Readonly<{ticket:number;op:'spectra';field:MultiSpecFieldRequest;fibres:readonly MultiSpecFibreRequest[]}>;
let inputs:Promise<MultiSpecInputs>|null=null;
const running=new Map<number,AbortController>();
self.onmessage=async(event:MessageEvent<MultiSpecWorkerRequest>)=>{
 const request=event.data;
 if(request.op==='cancel'){running.get(request.ticket)?.abort();return;}
 const post=(m:unknown)=>(self as unknown as DedicatedWorkerGlobalScope).postMessage(m),settle=workerBusy(post);
 try{
  inputs??=loadMultiSpecInputs(browserMultiSpecResources()).catch(e=>{inputs=null;throw e;});
  const loaded=await inputs;
  if(request.op==='view'){
   const c=new AbortController();running.set(request.ticket,c);
   try{post({ticket:request.ticket,ok:true,view:await evaluateMultiSpecView(loaded,request.field,c.signal)});}finally{running.delete(request.ticket);}
  }
  else post({ticket:request.ticket,ok:true,exposures:await evaluateMultiSpecSpectra(loaded,request.field,request.fibres)});
 }catch(e){post({ticket:request.ticket,ok:false,kind:workerFailureKind(e)});}
 finally{settle();}
};
