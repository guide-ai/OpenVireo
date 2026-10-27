/// <reference lib="webworker" />
import {handleCameraWorkerRequest,type CameraWorkerRequest,type CameraWorkerState} from './cameraWorkerCore';
const state:CameraWorkerState={selection:null};
self.onmessage=(event:MessageEvent<CameraWorkerRequest>)=>{
 const {reply,transfer}=handleCameraWorkerRequest(state,event.data);
 (self as unknown as DedicatedWorkerGlobalScope).postMessage(reply,transfer);
};
