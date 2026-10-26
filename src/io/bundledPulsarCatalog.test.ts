import {describe,expect,it} from 'vitest';
import {BUNDLED_PULSAR_CATALOG,BundledPulsarCatalogError,fetchBundledPulsarCatalog,verifyBundledPulsarCatalog,type BundledPulsarCatalogIdentity} from './bundledPulsarCatalog';
import {RECORDED_VIREO_PULSARS_DAT} from '../core/radioPulsarReferenceCatalog';
import {resourceSha256} from './boundedResource';

// Synthetic bytes only: the bundled original file is never read by this suite. The identity check is exercised with an
// injected expected identity computed here from those synthetic bytes.
const SYNTHETIC=new TextEncoder().encode('synthetic catalog bytes, not a catalog\r\n');
const buffer=()=>SYNTHETIC.slice().buffer;
async function identity(bytes:Uint8Array):Promise<BundledPulsarCatalogIdentity>{
 return Object.freeze({path:'/original/radio/test.dat',name:'test.dat',bytes:bytes.byteLength,sha256:await resourceSha256(bytes.slice())});
}
const respond=(body:BodyInit|null,init:ResponseInit={status:200})=>async()=>new Response(body,init);
const code=async(p:Promise<unknown>)=>{try{await p;}catch(e){return e instanceof BundledPulsarCatalogError?e.code:e instanceof DOMException?e.name:'other';}return 'resolved';};

describe('bundled Pulsars.dat identity',()=>{
 it('is the recorded VIREO 1.504 file identity and a same-origin path',()=>{
  expect(BUNDLED_PULSAR_CATALOG).toEqual({path:'/original/radio/Pulsars.dat',name:'Pulsars.dat',bytes:285692,sha256:'ba94ee94c359e2afd4acce940266d69983d24a93893719cca20d3e23ef3dceaa'});
  expect(BUNDLED_PULSAR_CATALOG.sha256).toBe(RECORDED_VIREO_PULSARS_DAT.sha256);expect(BUNDLED_PULSAR_CATALOG.bytes).toBe(RECORDED_VIREO_PULSARS_DAT.bytes);
  expect(BUNDLED_PULSAR_CATALOG.path.startsWith('/')&&!BUNDLED_PULSAR_CATALOG.path.startsWith('//')).toBe(true);
 });
 it('checks the size before hashing and the SHA-256 before any parse',async()=>{
  const id=await identity(SYNTHETIC);
  await expect(verifyBundledPulsarCatalog(buffer(),id)).resolves.toMatchObject({sha256:id.sha256});
  expect(await code(verifyBundledPulsarCatalog(buffer(),{...id,bytes:id.bytes+1}))).toBe('size');
  expect(await code(verifyBundledPulsarCatalog(buffer(),{...id,sha256:'0'.repeat(64)}))).toBe('sha256');
  // The recorded identity never accepts other bytes.
  expect(await code(verifyBundledPulsarCatalog(buffer()))).toBe('size');
 });
});

describe('fetchBundledPulsarCatalog',()=>{
 it('fetches only the identity path with the given signal and returns the verified bytes',async()=>{
  const id=await identity(SYNTHETIC),calls:[string,RequestInit|undefined][]=[];
  const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push([String(input),init]);return new Response(SYNTHETIC.slice());}) as typeof fetch;
  const abort=new AbortController(),r=await fetchBundledPulsarCatalog(fetcher,abort.signal,id);
  expect(new Uint8Array(r.buffer)).toEqual(SYNTHETIC);expect(r.sha256).toBe(id.sha256);
  expect(calls.map(c=>c[0])).toEqual([id.path]);expect(calls[0][1]?.signal).toBe(abort.signal);expect(calls[0][1]?.credentials).toBe('same-origin');
 });
 it('maps HTTP, network, size and hash failures to explicit codes',async()=>{
  const id=await identity(SYNTHETIC),signal=new AbortController().signal;
  expect(await code(fetchBundledPulsarCatalog(respond(null,{status:404}) as typeof fetch,signal,id))).toBe('download');
  expect(await code(fetchBundledPulsarCatalog((async()=>{throw new TypeError('offline');}) as typeof fetch,signal,id))).toBe('download');
  expect(await code(fetchBundledPulsarCatalog(respond(new Uint8Array(id.bytes+1)) as typeof fetch,signal,id))).toBe('size');
  expect(await code(fetchBundledPulsarCatalog(respond(SYNTHETIC.slice(1)) as typeof fetch,signal,id))).toBe('size');
  const other=SYNTHETIC.slice();other[0]^=1;
  expect(await code(fetchBundledPulsarCatalog(respond(other) as typeof fetch,signal,id))).toBe('sha256');
 });
 it('an abort before or during the request rejects with AbortError, never a catalog failure',async()=>{
  const id=await identity(SYNTHETIC),before=new AbortController();before.abort();
  let called=false;
  expect(await code(fetchBundledPulsarCatalog((async()=>{called=true;return new Response(SYNTHETIC.slice());}) as typeof fetch,before.signal,id))).toBe('AbortError');
  expect(called).toBe(false);
  const during=new AbortController();
  const fetcher=(async()=>{during.abort();throw new DOMException('aborted','AbortError');}) as typeof fetch;
  expect(await code(fetchBundledPulsarCatalog(fetcher,during.signal,id))).toBe('AbortError');
 });
});
