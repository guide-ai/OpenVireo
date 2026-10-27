/** Message handling for the camera Worker (front C review fix H2). Pure: the Worker shell (cameraWorker.ts) only posts
 * what this returns. Parsing and composing a 1024^2 exposure take 0.4 s to several seconds, so they run off the main
 * thread; Stop terminates the Worker. */
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection,VizierCatalogError,type VizierRowContext,type VizierSelection} from '../core/vizierNomad';
import {composeCameraExposure,type CameraExposure,type CameraExposureRecipe,type CameraExtraSource} from '../core/cameraExposure';

export type CameraWorkerRequest=
 |Readonly<{type:'parse';bytes:Uint8Array;context:VizierRowContext;magnitudeLimit:number}>
 |Readonly<{type:'compose';recipe:CameraExposureRecipe;extras:readonly CameraExtraSource[]}>;
export type CameraWorkerExposure=Omit<CameraExposure,'plane'>&Readonly<{plane:Omit<CameraExposure['plane'],'pixels'>&{pixels:Float32Array}}>;
export type CameraWorkerReply=
 |Readonly<{type:'parsed';ok:true;rows:number;selected:number}>
 |Readonly<{type:'parsed';ok:false;code:string}>
 |Readonly<{type:'composed';ok:true;exposure:CameraWorkerExposure}>
 |Readonly<{type:'composed';ok:false;code:string}>;
export type CameraWorkerState={selection:VizierSelection|null};

export function handleCameraWorkerRequest(state:CameraWorkerState,request:CameraWorkerRequest):{reply:CameraWorkerReply;transfer:Transferable[]} {
 if(request.type==='parse'){
  try{
   const catalog=readVizierCatalog(request.bytes,request.context);
   state.selection=selectVizierCatalog(catalog,wholeSkySelection(request.magnitudeLimit));
   return {reply:{type:'parsed',ok:true,rows:catalog.entries.length,selected:state.selection.selectedEntries.length},transfer:[]};
  }catch(error){
   state.selection=null;
   const code=error instanceof VizierCatalogError?(error.code==='overflow'||error.code==='query-status'||error.code==='row-limit'?error.code:'catalog'):'catalog';
   return {reply:{type:'parsed',ok:false,code},transfer:[]};
  }
 }
 try{
  if(!state.selection)return {reply:{type:'composed',ok:false,code:'preparation'},transfer:[]};
  const x=composeCameraExposure(request.recipe,state.selection,request.extras);
  // Pixels are Single values, so a Float32Array carries them exactly.
  const pixels=Float32Array.from(x.plane.pixels);
  return {reply:{type:'composed',ok:true,exposure:{...x,plane:{...x.plane,pixels}}},transfer:[pixels.buffer]};
 }catch{return {reply:{type:'composed',ok:false,code:'preparation'},transfer:[]};}
}
/** Main-thread view: back to the CameraExposure shape (plain number array). */
export function exposureFromWorker(x:CameraWorkerExposure):CameraExposure {
 return Object.freeze({...x,plane:Object.freeze({...x.plane,pixels:Object.freeze(Array.from(x.plane.pixels))})}) as CameraExposure;
}
