import {describe,expect,it} from 'vitest';
import {BUNDLED_GLX_CATALOG,BundledGlxCatalogError,fetchBundledGlxCatalog,verifyBundledGlxCatalog,type BundledGlxCatalogIdentity} from './bundledGlxCatalog';
import {resourceSha256} from './boundedResource';
import manifest from '../../docs/LOCAL-RESOURCES.json';
// Synthetic bytes only; the identity check is exercised with an injected identity computed from them.
const SYNTHETIC=new TextEncoder().encode('synthetic galaxy catalogue bytes, not a catalogue\r\n');
const identity=async():Promise<BundledGlxCatalogIdentity>=>Object.freeze({path:'/original/catalogs/test.dat',name:'test.dat',bytes:SYNTHETIC.byteLength,sha256:await resourceSha256(SYNTHETIC.slice())});
const code=async(p:Promise<unknown>)=>{try{await p;}catch(e){return e instanceof BundledGlxCatalogError?e.code:e instanceof DOMException?e.name:'other';}return 'resolved';};
describe('bundled CLEA_GLX.DAT fetch',()=>{
 it('is the manifested same-origin identity',()=>{
  expect(manifest.files).toContainEqual({path:'public'+BUNDLED_GLX_CATALOG.path,bytes:BUNDLED_GLX_CATALOG.bytes,sha256:BUNDLED_GLX_CATALOG.sha256});
 });
 it('checks size, then SHA-256',async()=>{
  const id=await identity();
  await expect(verifyBundledGlxCatalog(SYNTHETIC.slice().buffer,id)).resolves.toEqual(SYNTHETIC);
  expect(await code(verifyBundledGlxCatalog(SYNTHETIC.slice().buffer,{...id,bytes:id.bytes+1}))).toBe('size');
  expect(await code(verifyBundledGlxCatalog(SYNTHETIC.slice().buffer,{...id,sha256:'0'.repeat(64)}))).toBe('sha256');
  expect(await code(verifyBundledGlxCatalog(SYNTHETIC.slice().buffer))).toBe('size');
 });
 it('fetches only the identity path, maps failures and honours abort',async()=>{
  const id=await identity(),calls:string[]=[];
  const ok=(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push(String(input));expect(init?.credentials).toBe('same-origin');return new Response(SYNTHETIC.slice());}) as typeof fetch;
  expect(await fetchBundledGlxCatalog(ok,new AbortController().signal,id)).toEqual(SYNTHETIC);expect(calls).toEqual([id.path]);
  expect(await code(fetchBundledGlxCatalog((async()=>new Response('x',{status:404})) as typeof fetch,new AbortController().signal,id))).toBe('download');
  expect(await code(fetchBundledGlxCatalog((async()=>{throw new TypeError('net');}) as typeof fetch,new AbortController().signal,id))).toBe('download');
  expect(await code(fetchBundledGlxCatalog((async()=>new Response(new Uint8Array(id.bytes+5))) as typeof fetch,new AbortController().signal,id))).toBe('size');
  const abort=new AbortController();abort.abort();
  expect(await code(fetchBundledGlxCatalog(ok,abort.signal,id))).toBe('AbortError');
 });
});
