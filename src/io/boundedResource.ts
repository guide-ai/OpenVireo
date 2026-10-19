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
