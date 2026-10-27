import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BUNDLED_ORBIT_FILES,BundledOrbitFileError,DEFAULT_ORBIT_FILE,fetchBundledOrbitFile,fetchObjectXHotList,verifyBundledOrbitFile} from './bundledOrbitFile';
import {orbitRecordCount} from '../core/orbitFile';
import {parseHtl} from '../core/hotList';

const read=(path:string)=>{const b=readFileSync(new URL(`../../public${path}`,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;};
function fetcher(body:ArrayBuffer|null,log:{path?:string;credentials?:RequestCredentials}={},status=200):typeof fetch{
 return (async(input:RequestInfo|URL,init?:RequestInit)=>{log.path=String(input);log.credentials=init?.credentials;return new Response(body,{status});}) as typeof fetch;
}
const code=async(p:Promise<unknown>)=>{try{await p;return 'resolved';}catch(e){return e instanceof BundledOrbitFileError?e.code:e instanceof DOMException?e.name:'other';}};

describe('bundled Object X orbit files: lazy same-origin fetch, exact size and SHA-256 before parsing',()=>{
 it('defaults to the original ObjX_MPC.CMO and verifies both files into whole 162-byte records',async()=>{
  expect(DEFAULT_ORBIT_FILE).toBe('ObjX_MPC.CMO');
  for(const id of ['ObjX_MPC.CMO','ObjX_AST.CMO'] as const){
   const identity=BUNDLED_ORBIT_FILES[id],log:{path?:string;credentials?:RequestCredentials}={};
   const result=await fetchBundledOrbitFile(fetcher(read(identity.path),log),new AbortController().signal,id);
   expect([log.path,log.credentials,result.sha256,orbitRecordCount(result.bytes)]).toEqual([identity.path,'same-origin',identity.sha256,identity.records]);
  }
 },30_000);
 it('rejects other sizes and altered bytes before parsing, and failed responses as download',async()=>{
  const ast=read(BUNDLED_ORBIT_FILES['ObjX_AST.CMO'].path);
  expect(await code(fetchBundledOrbitFile(fetcher(ast.slice(0,162)),new AbortController().signal,'ObjX_AST.CMO'))).toBe('size');
  const longer=new Uint8Array(ast.byteLength+162);longer.set(new Uint8Array(ast));
  expect(await code(fetchBundledOrbitFile(fetcher(longer.buffer),new AbortController().signal,'ObjX_AST.CMO'))).toBe('size');
  const altered=new Uint8Array(ast.slice(0));altered[100]^=1;
  expect(await code(verifyBundledOrbitFile(altered.buffer,'ObjX_AST.CMO'))).toBe('sha256');
  expect(await code(fetchBundledOrbitFile(fetcher(ast,{},404),new AbortController().signal,'ObjX_AST.CMO'))).toBe('download');
  expect(await code(fetchBundledOrbitFile((async()=>{throw new TypeError('offline');}) as typeof fetch,new AbortController().signal))).toBe('download');
 });
 it('an aborted request rejects with AbortError',async()=>{
  const c=new AbortController();c.abort();
  expect(await code(fetchBundledOrbitFile(fetcher(new ArrayBuffer(1)),c.signal))).toBe('AbortError');
 });
 it('loads ObjectX.HTL through the hot-list adapter: 17 targets',async()=>{
  const result=await fetchObjectXHotList(fetcher(read('/original/hotlists/ObjectX.HTL')),new AbortController().signal);
  expect(parseHtl(result.bytes)).toHaveLength(17);
 });
});
