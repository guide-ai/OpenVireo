import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_BYTES } from '../core/spectrum';
const digest=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
beforeEach(()=>{vi.resetModules();vi.stubGlobal('crypto',webcrypto);});
afterEach(()=>vi.unstubAllGlobals());

describe('bounded original-resource and observation byte adapters',()=>{
  it('verifies/caches immutable library samples while preserving its distinct flux domain',async()=>{
    const io=await import('./spectrumFiles'),text='3700 2\n4200 3\n4700 4\n';
    const fetcher=vi.fn(async()=>new Response(text));vi.stubGlobal('fetch',fetcher);
    const source={url:'/original/spectra/test.SP',sha256:digest(text)};
    const one=await io.loadVerifiedLibrarySpectrum(source),two=await io.loadVerifiedLibrarySpectrum(source);
    expect(one).toBe(two);expect(fetcher).toHaveBeenCalledTimes(1);expect(one.samples[1].intensity).toBe(3);
    expect(Object.isFrozen(one.samples)).toBe(true);expect(Object.isFrozen(one.samples[0])).toBe(true);
    await expect(io.readImportedSpectrum(new File([text],'same.sp'))).rejects.toThrow(/normalize intensity/i);
  });
  it('rejects excessive declared size before reading or hashing and cancels the response',async()=>{
    const io=await import('./spectrumFiles');let cancelled=false;
    const body=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(body,{headers:{'Content-Length':String(MAX_FILE_BYTES+1)}})));
    await expect(io.loadVerifiedLibrarySpectrum({url:'/original/too-large.SP',sha256:'0'.repeat(64)})).rejects.toMatchObject({code:'size'});
    expect(cancelled).toBe(true);
  });
  it('enforces a streamed cap when Content-Length is missing and stops the remaining body',async()=>{
    const io=await import('./spectrumFiles');let produced=0,cancelled=false;
    const body=new ReadableStream<Uint8Array>({pull(controller){produced++;controller.enqueue(new Uint8Array(256*1024));if(produced===40)controller.close();},cancel(){cancelled=true;}});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(body)));
    await expect(io.loadVerifiedLibrarySpectrum({url:'/original/stream.SP',sha256:'0'.repeat(64)})).rejects.toMatchObject({code:'size'});
    expect(cancelled).toBe(true);expect(produced).toBeLessThanOrEqual(11);
  });
  it('rejects digest mismatch, invalid UTF8 and nonlocal source paths without returning partial samples',async()=>{
    const io=await import('./spectrumFiles'),text='3700 1\n4200 1\n4700 1\n';
    const fetcher=vi.fn(async()=>new Response(text));vi.stubGlobal('fetch',fetcher);
    await expect(io.loadVerifiedLibrarySpectrum({url:'/original/bad.SP',sha256:'0'.repeat(64)})).rejects.toMatchObject({code:'digest'});
    const invalid=new Uint8Array([255,254,253]);fetcher.mockImplementation(async()=>new Response(invalid));
    await expect(io.loadVerifiedLibrarySpectrum({url:'/original/utf8.SP',sha256:digest(invalid)})).rejects.toThrow();
    for(const url of ['https://example.com/data.SP','//example.com/data.SP','/original/../secret','/original/%2e%2e/file']) await expect(io.loadVerifiedLibrarySpectrum({url,sha256:digest(text)})).rejects.toMatchObject({code:'source'});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('honors aborted callers and checks an imported File byte size before reading',async()=>{
    const io=await import('./spectrumFiles'),abort=new AbortController();abort.abort();
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    await expect(io.loadVerifiedLibrarySpectrum({url:'/original/cancel.SP',sha256:'0'.repeat(64)},abort.signal)).rejects.toMatchObject({name:'AbortError'});expect(fetcher).not.toHaveBeenCalled();
    const arrayBuffer=vi.fn();await expect(io.readImportedSpectrum({size:MAX_FILE_BYTES+1,arrayBuffer} as unknown as File)).rejects.toMatchObject({code:'size'});expect(arrayBuffer).not.toHaveBeenCalled();
    const text='3700 .1\n4200 .2\n4700 .3\n',result=await io.readImportedSpectrum(new File([text],'observation.csv'));
    expect(result.sha256).toBe(digest(text));expect(result.samples[0].intensity).toBe(.1);
  });
});
