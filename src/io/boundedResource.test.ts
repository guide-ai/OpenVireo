import{it,expect,vi}from'vitest';import{boundedResourceBody,resourceSha256}from'./boundedResource';
it('bounds declared and actual streamed bytes,ignores malformed lengths and preserves successful bytes',async()=>{let cancelled=false;const oversized=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});await expect(boundedResourceBody(new Response(oversized,{headers:{'content-length':'101'}}),100)).rejects.toMatchObject({code:'size'});expect(cancelled).toBe(true);await expect(boundedResourceBody(new Response('too large',{headers:{'content-length':'not a number'}}),2)).rejects.toMatchObject({code:'size'});const bytes=await boundedResourceBody(new Response('abc',{headers:{'content-length':'invalid'}}),3);expect(new TextDecoder().decode(bytes)).toBe('abc');expect(await resourceSha256(bytes)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');});
it('cancels and releases a failing reader while preserving its original error',async()=>{const error=new Error('stream failed'),cancel=vi.fn(async()=>{}),releaseLock=vi.fn(),response={ok:true,headers:new Headers(),body:{getReader:()=>({read:async()=>{throw error;},cancel,releaseLock})}}as unknown as Response;await expect(boundedResourceBody(response,100)).rejects.toBe(error);expect(cancel).toHaveBeenCalledOnce();expect(releaseLock).toHaveBeenCalledOnce();});
it('abort interrupts a pending streamed read and releases the underlying lock',async()=>{const controller=new AbortController();let cancelled=false;const stream=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}}),response=new Response(stream),reading=boundedResourceBody(response,100,controller.signal);controller.abort();await expect(reading).rejects.toMatchObject({name:'AbortError'});expect(cancelled).toBe(true);expect(stream.locked).toBe(false);});
// Front F2 (closure R1): verified bytes are kept per fetcher and path, and re-checked on reuse instead of fetched again.
import{verifiedSameOriginResource}from'./boundedResource';
const ABC_SHA='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const checkAbc=async(buffer:ArrayBuffer)=>{if(buffer.byteLength!==3||await resourceSha256(buffer)!==ABC_SHA)throw new Error('sha256');return new Uint8Array(buffer);};
const failure=(code:'size'|'download')=>Object.assign(new Error(code),{code});
it('reuses verified bytes without a new request, re-checking them, and refetches bytes that changed',async()=>{
 const fetcher=vi.fn(async()=>new Response('abc'))as unknown as typeof fetch,signal=new AbortController().signal;
 const first=await verifiedSameOriginResource(fetcher,signal,'/original/a',3,checkAbc,failure);
 expect((await verifiedSameOriginResource(fetcher,signal,'/original/a',3,checkAbc,failure)).buffer).toBe(first.buffer);// the same bytes
 expect(fetcher).toHaveBeenCalledTimes(1);
 first[0]=0x41;// a consumer changed the kept bytes: the check fails, they are dropped and fetched again
 const again=await verifiedSameOriginResource(fetcher,signal,'/original/a',3,checkAbc,failure);
 expect(new TextDecoder().decode(again)).toBe('abc');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('keeps nothing that failed its check, and never shares kept bytes between fetchers',async()=>{
 const signal=new AbortController().signal;
 const bad=vi.fn(async()=>new Response('abd'))as unknown as typeof fetch;
 await expect(verifiedSameOriginResource(bad,signal,'/original/b',3,checkAbc,failure)).rejects.toThrow('sha256');
 await expect(verifiedSameOriginResource(bad,signal,'/original/b',3,checkAbc,failure)).rejects.toThrow('sha256');
 expect(bad).toHaveBeenCalledTimes(2);
 const good=vi.fn(async()=>new Response('abc'))as unknown as typeof fetch,other=vi.fn(async()=>new Response('abc'))as unknown as typeof fetch;
 await verifiedSameOriginResource(good,signal,'/original/c',3,checkAbc,failure);await verifiedSameOriginResource(other,signal,'/original/c',3,checkAbc,failure);
 expect(good).toHaveBeenCalledTimes(1);expect(other).toHaveBeenCalledTimes(1);
 const offline=vi.fn(async()=>{throw new TypeError('Failed to fetch');})as unknown as typeof fetch;
 await expect(verifiedSameOriginResource(offline,signal,'/original/c',3,checkAbc,failure)).rejects.toMatchObject({code:'download'});
});
it('an aborted request rejects with AbortError even when the bytes are kept',async()=>{
 const fetcher=vi.fn(async()=>new Response('abc'))as unknown as typeof fetch,controller=new AbortController();
 await verifiedSameOriginResource(fetcher,controller.signal,'/original/d',3,checkAbc,failure);controller.abort();
 await expect(verifiedSameOriginResource(fetcher,controller.signal,'/original/d',3,checkAbc,failure)).rejects.toMatchObject({name:'AbortError'});
});
