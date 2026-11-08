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
 * double) never sees another one's bytes. Memory only: never persisted or sent anywhere. The kept ArrayBuffer is shared by
 * every consumer of that file (views and subarrays), so consumers must treat it as read-only: never write into it or transfer
 * it (postMessage transfer lists detach it for everyone) (F2 review L2). */
const kept=new WeakMap<typeof fetch,Map<string,ArrayBuffer>>();
const isAbort=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError';
export async function verifiedSameOriginResource<T>(fetcher:typeof fetch,signal:AbortSignal,path:string,maxBytes:number,verify:(buffer:ArrayBuffer)=>Promise<T>,failure:(code:'size'|'download')=>Error):Promise<T>{
 return verifiedKept(fetcher,signal,path,async()=>{
  try{
   const response=await fetcher(path,{signal,credentials:'same-origin'});
   return await boundedResourceBody(response,maxBytes,signal);
  }catch(error){
   checkResourceAbort(signal);
   throw failure(error instanceof BoundedResourceError&&error.code==='size'?'size':'download');
  }
 },verify);
}
/** Front REL1: one byte-exact tile of a same-origin original file stored in byte ranges (docs/LOCAL-RESOURCES.json assembled[]). */
export type SameOriginTile=Readonly<{path:string;bytes:number;sha256:string}>;
/** Tiles whose bytes failed their check in this tab; the next request for them bypasses the HTTP cache (cache: 'reload'). */
const badTiles=new Set<string>();
/** Front REL1 (web adapter): a whole original file stored as in-order byte-range tiles under the host's per-file limit. Every
 * tile is fetched from this origin, bounded to and checked for its exact recorded size and SHA-256, then the tiles are
 * concatenated and the whole file goes through `verify` (its own size and SHA-256), exactly as a single download would. The
 * verified whole file is kept for the tab under `key`, as verifiedSameOriginResource does. A tile answered with an HTML page (a
 * host's SPA fallback for a missing file) is a failed download. Abort rejects with the DOMException AbortError. */
export async function verifiedSameOriginTiles<T>(fetcher:typeof fetch,signal:AbortSignal,key:string,tiles:readonly SameOriginTile[],verify:(buffer:ArrayBuffer)=>Promise<T>,failure:(code:'size'|'download'|'sha256')=>Error):Promise<T>{
 if(!tiles.length||tiles.some(t=>!Number.isSafeInteger(t.bytes)||t.bytes<1))throw failure('size');
 return verifiedKept(fetcher,signal,key,async()=>{
  const parts=await Promise.all(tiles.map(async tile=>{
   let buffer:ArrayBuffer;
   try{
    const response=await fetcher(tile.path,{signal,credentials:'same-origin',...(badTiles.has(tile.path)?{cache:'reload' as const}:{})});
    if(/^\s*text\/html\b/i.test(response.headers.get('content-type')??'')){try{await response.body?.cancel();}catch{/* ignore */}throw new BoundedResourceError('download');}
    buffer=await boundedResourceBody(response,tile.bytes,signal);
   }catch(error){
    checkResourceAbort(signal);
    const size=error instanceof BoundedResourceError&&error.code==='size';if(size)badTiles.add(tile.path);
    throw failure(size?'size':'download');
   }
   checkResourceAbort(signal);
   if(buffer.byteLength!==tile.bytes){badTiles.add(tile.path);throw failure('size');}
   if(await resourceSha256(buffer)!==tile.sha256){badTiles.add(tile.path);throw failure('sha256');}
   checkResourceAbort(signal);badTiles.delete(tile.path);
   return new Uint8Array(buffer);
  }));
  const whole=new Uint8Array(parts.reduce((sum,p)=>sum+p.byteLength,0));let offset=0;
  for(const part of parts){whole.set(part,offset);offset+=part.byteLength;}
  return whole.buffer;
 },verify);
}
async function verifiedKept<T>(fetcher:typeof fetch,signal:AbortSignal,key:string,download:()=>Promise<ArrayBuffer>,verify:(buffer:ArrayBuffer)=>Promise<T>):Promise<T>{
 checkResourceAbort(signal);
 const files=kept.get(fetcher),held=files?.get(key);
 if(held){try{return await verify(held);}catch(error){if(isAbort(error))throw error;files!.delete(key);}}
 const buffer=await download();
 checkResourceAbort(signal);
 const result=await verify(buffer);
 let map=kept.get(fetcher);if(!map)kept.set(fetcher,map=new Map());map.set(key,buffer);
 return result;
}
