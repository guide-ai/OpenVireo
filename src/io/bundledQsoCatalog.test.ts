import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BUNDLED_QSO_CATALOG,BundledQsoCatalogError,fetchBundledQsoCatalog,verifyBundledQsoCatalog} from './bundledQsoCatalog';
import manifest from '../../docs/LOCAL-RESOURCES.json';
// The approved byte-exact catalogue (second approval of 2026-10-26) is read only to exercise the identity check.
const bytes=new Uint8Array(readFileSync(new URL('../../public/original/catalogs/CLEA_QSO.DAT',import.meta.url)));
const code=async(p:Promise<unknown>)=>{try{await p;}catch(e){return e instanceof BundledQsoCatalogError?e.code:e instanceof DOMException?e.name:'other';}return 'resolved';};
describe('bundled CLEA_QSO.DAT (the hash the field engine trusts is computed here)',()=>{
 it('is the manifested same-origin identity',()=>{expect(manifest.files).toContainEqual({path:'public'+BUNDLED_QSO_CATALOG.path,bytes:BUNDLED_QSO_CATALOG.bytes,sha256:BUNDLED_QSO_CATALOG.sha256});});
 it('accepts the exact bytes and refuses other sizes or altered bytes',async()=>{
  const ok=await verifyBundledQsoCatalog(bytes.slice().buffer);expect(ok.sha256).toBe(BUNDLED_QSO_CATALOG.sha256);expect(ok.bytes).toEqual(bytes);
  expect(await code(verifyBundledQsoCatalog(bytes.slice(0,-1).buffer))).toBe('size');
  const altered=bytes.slice();altered[1443*52+0x22]^=1;expect(await code(verifyBundledQsoCatalog(altered.buffer))).toBe('sha256');
 });
 it('fetches only its own path and maps failures; abort stays an AbortError',async()=>{
  const seen:string[]=[];
  const fetcher=(async(url:string)=>{seen.push(url);return new Response(bytes.slice());}) as unknown as typeof fetch;
  expect((await fetchBundledQsoCatalog(fetcher,new AbortController().signal)).sha256).toBe(BUNDLED_QSO_CATALOG.sha256);expect(seen).toEqual([BUNDLED_QSO_CATALOG.path]);
  expect(await code(fetchBundledQsoCatalog((async()=>{throw new TypeError('offline');}) as unknown as typeof fetch,new AbortController().signal))).toBe('download');
  expect(await code(fetchBundledQsoCatalog((async()=>new Response(new Uint8Array(10))) as unknown as typeof fetch,new AbortController().signal))).toBe('size');
  const c=new AbortController();c.abort();expect(await code(fetchBundledQsoCatalog(fetcher,c.signal))).toBe('AbortError');
 });
});
