/** Camera catalog transport (front C3). Two web adaptations of the original NOFS request (docs/CAMERA-EXPOSURE.md):
 *  - static: a bundled CDS/VizieR extract whose cone contains the requested cone, checked against its SHA-256;
 *  - live: a browser request to CDS/VizieR Simple Cone Search that carries only RA, DEC and SR.
 * Both return raw bytes plus their hash; parsing is src/core/vizierNomad.ts. Tests inject `fetchImpl`
 * (the recorded-response seam) or intercept the CDS URL with Playwright page.route. Nothing is cached:
 * the original requests a fresh response per exposure. */
import index from '../../data/camera/extracts.json';
import {boundedResourceBody,BoundedResourceError,resourceSha256} from './boundedResource';
import {VIZIER_POLICY,vizierConeUrl,type VizierCatalogId} from '../core/vizierNomad';

export type CameraCatalogMode='static'|'live';
export type CameraCatalogQuery=Readonly<{catalog:VizierCatalogId;raHours:number;decDegrees:number;radiusDegrees:number}>;
export type CameraCatalogSource=Readonly<{mode:CameraCatalogMode;url:string;sha256:string;bytes:number;extractId:string|null;recordedAt:string|null}>;
export type CameraCatalogFailure='no-extract'|'integrity'|'timeout'|'network'|'http'|'size'|'cancelled';
export type CameraCatalogResult=
 |Readonly<{ok:true;bytes:Uint8Array;source:CameraCatalogSource}>
 |Readonly<{ok:false;failure:CameraCatalogFailure;detail:string}>;
export type CameraExtract=Readonly<{id:string;catalog:VizierCatalogId;raDegrees:number;decDegrees:number;radiusDegrees:number;file:string;sha256:string;bytes:number;recordedAt:string;request:string}>;
export const CAMERA_EXTRACTS:readonly CameraExtract[]=Object.freeze((index.extracts as CameraExtract[]).map(e=>Object.freeze({...e})));
export const CAMERA_CATALOG_TIMEOUT_MS=30_000;

const RAD=Math.PI/180;
function separationDegrees(ra1:number,dec1:number,ra2:number,dec2:number):number {
 const a=Math.sin((dec2-dec1)*RAD/2)**2+Math.cos(dec1*RAD)*Math.cos(dec2*RAD)*Math.sin((ra2-ra1)*RAD/2)**2;
 return 2*Math.asin(Math.min(1,Math.sqrt(a)))/RAD;
}
/** [W] An extract serves a request only if the requested cone lies wholly inside the extract's cone. */
export function findCameraExtract(query:CameraCatalogQuery,extracts:readonly CameraExtract[]=CAMERA_EXTRACTS):CameraExtract|null {
 const ra=query.raHours*15;
 let best:CameraExtract|null=null,bestSeparation=Infinity;
 for(const e of extracts){
  if(e.catalog!==query.catalog)continue;
  const d=separationDegrees(ra,query.decDegrees,e.raDegrees,e.decDegrees);
  if(d+query.radiusDegrees<=e.radiusDegrees+1e-9&&d<bestSeparation){best=e;bestSeparation=d;}
 }
 return best;
}
export type CameraCatalogOptions=Readonly<{signal?:AbortSignal;fetchImpl?:typeof fetch;timeoutMs?:number;baseUrl?:string;extracts?:readonly CameraExtract[];extractBase?:string}>;

async function fetchBytes(url:string,options:CameraCatalogOptions):Promise<CameraCatalogResult|Uint8Array> {
 const controller=new AbortController(),timeoutMs=options.timeoutMs??CAMERA_CATALOG_TIMEOUT_MS;
 let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
 const forward=()=>controller.abort();options.signal?.addEventListener('abort',forward,{once:true});
 try{
  if(options.signal?.aborted)return Object.freeze({ok:false as const,failure:'cancelled' as const,detail:''});
  const response=await (options.fetchImpl??fetch)(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
  if(!response.ok){try{await response.body?.cancel();}catch{}return Object.freeze({ok:false as const,failure:'http' as const,detail:String(response.status)});}
  return new Uint8Array(await boundedResourceBody(response,VIZIER_POLICY.maxBytes,controller.signal));
 }catch(error){
  if(options.signal?.aborted)return Object.freeze({ok:false as const,failure:'cancelled' as const,detail:''});
  if(timedOut)return Object.freeze({ok:false as const,failure:'timeout' as const,detail:String(timeoutMs)});
  if(error instanceof BoundedResourceError)return Object.freeze({ok:false as const,failure:error.code==='size'?'size' as const:'http' as const,detail:error.code});
  return Object.freeze({ok:false as const,failure:'network' as const,detail:error instanceof Error?error.name:'error'});
 }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',forward);}
}

export async function loadCameraCatalog(query:CameraCatalogQuery,mode:CameraCatalogMode,options:CameraCatalogOptions={}):Promise<CameraCatalogResult> {
 if(mode==='static'){
  const extract=findCameraExtract(query,options.extracts);
  if(!extract)return Object.freeze({ok:false as const,failure:'no-extract' as const,detail:''});
  const url=`${options.extractBase??import.meta.env?.BASE_URL??'/'}camera/vizier/${extract.file}`;
  const bytes=await fetchBytes(url,options);if(!(bytes instanceof Uint8Array))return bytes;
  const sha256=await resourceSha256(bytes as Uint8Array<ArrayBuffer>);
  if(sha256!==extract.sha256)return Object.freeze({ok:false as const,failure:'integrity' as const,detail:extract.id});
  return Object.freeze({ok:true as const,bytes,source:Object.freeze({mode,url:extract.request,sha256,bytes:bytes.length,extractId:extract.id,recordedAt:extract.recordedAt})});
 }
 const url=vizierConeUrl(query.catalog,query.raHours*15,query.decDegrees,query.radiusDegrees,options.baseUrl);
 const bytes=await fetchBytes(url,options);if(!(bytes instanceof Uint8Array))return bytes;
 const sha256=await resourceSha256(bytes as Uint8Array<ArrayBuffer>);
 return Object.freeze({ok:true as const,bytes,source:Object.freeze({mode,url,sha256,bytes:bytes.length,extractId:null,recordedAt:null})});
}
