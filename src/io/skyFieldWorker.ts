/// <reference lib="webworker" />
// Front G5 review 1 M4: the sky view's field builds off the main thread (as io/multiSpecWorker.ts). A cancel stops a build between
// its stages; replies are plain data (the raster's bytes are transferred) with a WorkerFailureKind on failure, and the Worker
// heartbeats while busy (io/workerClient.ts).
import {workerFailureKind} from './workerFailure';
import {workerBusy} from './workerClient';
import {buildSkyField,type SkyFieldBuildRequest} from './skyFieldBuild';
export type SkyFieldWorkerRequest=Readonly<{ticket:number;op:'build';request:SkyFieldBuildRequest}>|Readonly<{ticket:number;op:'cancel'}>;
const running=new Map<number,AbortController>();
self.onmessage=async(event:MessageEvent<SkyFieldWorkerRequest>)=>{
 const m=event.data;
 if(m.op==='cancel'){running.get(m.ticket)?.abort();return;}
 const scope=self as unknown as DedicatedWorkerGlobalScope,post=(x:unknown,transfer:Transferable[]=[])=>scope.postMessage(x,transfer),settle=workerBusy(x=>post(x));
 const c=new AbortController();running.set(m.ticket,c);
 try{
  const field=await buildSkyField(m.request,c.signal);
  post({ticket:m.ticket,ok:true,field},field.status==='ready'?[field.raster.rgb.buffer as ArrayBuffer,...(field.galaxyRed?[field.galaxyRed.buffer as ArrayBuffer]:[])]:[]);
 }catch(e){if(!c.signal.aborted)post({ticket:m.ticket,ok:false,kind:workerFailureKind(e)});}
 finally{running.delete(m.ticket);settle();}
};
