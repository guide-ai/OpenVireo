export class BoundedResourceError extends Error{constructor(readonly code:'size'|'download'){super(`Bounded resource: ${code}`);this.name='BoundedResourceError';}}
export function checkResourceAbort(signal?:AbortSignal){if(signal?.aborted)throw new DOMException('Source loading was cancelled','AbortError');}
export async function boundedResourceBody(response:Response,maxBytes:number,signal?:AbortSignal):Promise<ArrayBuffer>{
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new BoundedResourceError('size');checkResourceAbort(signal);
 if(!response.ok||!response.body){try{await response.body?.cancel();}catch{}throw new BoundedResourceError('download');}
 const length=response.headers.get('content-length');if(length&&/^\d+$/.test(length)&&Number(length)>maxBytes){try{await response.body.cancel();}catch{}throw new BoundedResourceError('size');}
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;const abort=()=>{void reader.cancel().catch(()=>{});};signal?.addEventListener('abort',abort,{once:true});
 try{for(;;){checkResourceAbort(signal);const{done,value}=await reader.read();checkResourceAbort(signal);if(done)break;total+=value.byteLength;if(total>maxBytes)throw new BoundedResourceError('size');chunks.push(value);}}
 catch(error){try{await reader.cancel();}catch{}throw error;}
 finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes.buffer;
}
export async function resourceSha256(bytes:ArrayBuffer|Uint8Array<ArrayBuffer>):Promise<string>{return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
/** Front F2 (closure R1): the bytes of each same-origin bundled file that passed its exact size and SHA-256 check in this tab,
 * kept per fetcher and path. A later request re-runs the same check on the kept bytes instead of downloading them again, so a
 * replay (Save's self-check, a restore) works without the network and with the guarantee a new download would give. Kept bytes
 * that no longer pass (changed or detached by a consumer) are dropped and the file is fetched again. A different fetcher (a test
 * double) never sees another one's bytes. Memory only: never persisted or sent anywhere. */
const kept=new WeakMap<typeof fetch,Map<string,ArrayBuffer>>();
const isAbort=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError';
export async function verifiedSameOriginResource<T>(fetcher:typeof fetch,signal:AbortSignal,path:string,maxBytes:number,verify:(buffer:ArrayBuffer)=>Promise<T>,failure:(code:'size'|'download')=>Error):Promise<T>{
 checkResourceAbort(signal);
 const files=kept.get(fetcher),held=files?.get(path);
 if(held){try{return await verify(held);}catch(error){if(isAbort(error))throw error;files!.delete(path);}}
 let buffer:ArrayBuffer;
 try{
  const response=await fetcher(path,{signal,credentials:'same-origin'});
  buffer=await boundedResourceBody(response,maxBytes,signal);
 }catch(error){
  checkResourceAbort(signal);
  throw failure(error instanceof BoundedResourceError&&error.code==='size'?'size':'download');
 }
 checkResourceAbort(signal);
 const result=await verify(buffer);
 let map=kept.get(fetcher);if(!map)kept.set(fetcher,map=new Map());map.set(path,buffer);
 return result;
}
