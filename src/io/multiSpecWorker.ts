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
 // G4 closure I1: the cancel handle exists before the inputs load, so a cancel during the first load stops the build too.
 const c=request.op==='view'?new AbortController():null;if(c)running.set(request.ticket,c);
 try{
  inputs??=loadMultiSpecInputs(browserMultiSpecResources()).catch(e=>{inputs=null;throw e;});
  const loaded=await inputs;c?.signal.throwIfAborted();
  if(request.op==='view')post({ticket:request.ticket,ok:true,view:await evaluateMultiSpecView(loaded,request.field,c!.signal)});
  else post({ticket:request.ticket,ok:true,exposures:await evaluateMultiSpecSpectra(loaded,request.field,request.fibres)});
 }catch(e){post({ticket:request.ticket,ok:false,kind:workerFailureKind(e)});}
 finally{running.delete(request.ticket);settle();}
};
