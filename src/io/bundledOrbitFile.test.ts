import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {BUNDLED_ORBIT_FILES,BundledOrbitFileError,DEFAULT_ORBIT_FILE,ORBIT_TILE_RECORDS,ORIGINAL_DEFAULT_ORBIT_FILE,SELECTABLE_ORBIT_FILES,fetchBundledOrbitFile,fetchObjectXHotList,verifyBundledOrbitFile} from './bundledOrbitFile';
import {findOrbitRecord,orbitRecordCount} from '../core/orbitFile';
import {parseHtl} from '../core/hotList';

const read=(path:string)=>{const b=readFileSync(new URL(`../../public${path}`,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength) as ArrayBuffer;};
function fetcher(body:ArrayBuffer|null,log:{path?:string;credentials?:RequestCredentials}={},status=200):typeof fetch{
 return (async(input:RequestInfo|URL,init?:RequestInit)=>{log.path=String(input);log.credentials=init?.credentials;return new Response(body,{status});}) as typeof fetch;
}
/** Serves each public file by path (a fresh copy per request), recording every request; `alter` may change a body. */
function filesFetcher(log:string[]=[],alter:(path:string,bytes:ArrayBuffer)=>ArrayBuffer=(_,b)=>b,type='application/octet-stream'):typeof fetch{
 return (async(input:RequestInfo|URL,init?:RequestInit)=>{const path=String(input);log.push(`${path} ${init?.credentials}`);return new Response(alter(path,read(path)),{headers:{'content-type':type}});}) as typeof fetch;
}
const manifest=JSON.parse(readFileSync(new URL('../../docs/LOCAL-RESOURCES.json',import.meta.url),'utf8')) as {files:{path:string;bytes:number;sha256:string}[];assembled:{name:string;bytes:number;sha256:string;tiles:string[]}[]};
const code=async(p:Promise<unknown>)=>{try{await p;return 'resolved';}catch(e){return e instanceof BundledOrbitFileError?e.code:e instanceof DOMException?e.name:'other';}};

describe('bundled Object X orbit files: lazy same-origin fetch, exact size and SHA-256 before parsing',()=>{
 it('defaults to ObjX_MPC.CMO.sav (web choice), keeps the original default ObjX_MPC.CMO selectable and verifies all three files',async()=>{
  expect([DEFAULT_ORBIT_FILE,ORIGINAL_DEFAULT_ORBIT_FILE]).toEqual(['ObjX_MPC.CMO.sav','ObjX_MPC.CMO']);
  expect(SELECTABLE_ORBIT_FILES).toEqual(['ObjX_MPC.CMO.sav','ObjX_MPC.CMO','ObjX_AST.CMO']);
  for(const id of SELECTABLE_ORBIT_FILES.filter(i=>!BUNDLED_ORBIT_FILES[i].tiles)){
   const identity=BUNDLED_ORBIT_FILES[id],log:{path?:string;credentials?:RequestCredentials}={};
   const result=await fetchBundledOrbitFile(fetcher(read(identity.path),log),new AbortController().signal,id);
   expect([log.path,log.credentials,result.sha256,orbitRecordCount(result.bytes)]).toEqual([identity.path,'same-origin',identity.sha256,identity.records]);
  }
 },30_000);
 it('Front REL1: ObjX_MPC.CMO is served only as three record-aligned tiles that match the manifest, each under 25 MiB',()=>{
  const mpc=BUNDLED_ORBIT_FILES['ObjX_MPC.CMO'],whole=manifest.assembled.find(a=>a.name==='ObjX_MPC.CMO')!;
  expect(BUNDLED_ORBIT_FILES['ObjX_MPC.CMO.sav'].tiles).toBeUndefined();expect(BUNDLED_ORBIT_FILES['ObjX_AST.CMO'].tiles).toBeUndefined();
  expect([whole.bytes,whole.sha256]).toEqual([mpc.bytes,mpc.sha256]);
  expect(mpc.tiles!.map(t=>`public${t.path}`)).toEqual(whole.tiles);
  for(const t of mpc.tiles!)expect(manifest.files.find(f=>f.path===`public${t.path}`)).toEqual({path:`public${t.path}`,bytes:t.bytes,sha256:t.sha256});
  expect(mpc.tiles!.map(t=>t.bytes)).toEqual([ORBIT_TILE_RECORDS*162,ORBIT_TILE_RECORDS*162,(191293-2*ORBIT_TILE_RECORDS)*162]);
  expect(mpc.tiles!.every(t=>t.bytes<25*1024*1024)).toBe(true);
  expect(manifest.files.some(f=>f.path==='public/original/orbit/ObjX_MPC.CMO')).toBe(false);
 });
 it('Front REL1: selecting ObjX_MPC.CMO fetches its tiles same-origin, checks each one and the assembled whole, and keeps it for the tab',async()=>{
  const log:string[]=[],f=filesFetcher(log),mpc=BUNDLED_ORBIT_FILES['ObjX_MPC.CMO'];
  const result=await fetchBundledOrbitFile(f,new AbortController().signal,'ObjX_MPC.CMO');
  expect(log).toEqual(mpc.tiles!.map(t=>`${t.path} same-origin`));
  expect([result.id,result.sha256,result.bytes.byteLength,orbitRecordCount(result.bytes)]).toEqual(['ObjX_MPC.CMO',mpc.sha256,30989466,191293]);
  expect(findOrbitRecord(result.bytes,{number:'433'})).not.toBeNull();
  await fetchBundledOrbitFile(f,new AbortController().signal,'ObjX_MPC.CMO');expect(log).toHaveLength(3);// reused, re-checked, no new request
 },30_000);
 it('Front REL1: a tile with altered or missing bytes, an HTML fallback page or a failed request is rejected before parsing',async()=>{
  const signal=new AbortController().signal,second='/original/orbit/ObjX_MPC/001.bin';
  const flip=(path:string,b:ArrayBuffer)=>{if(path!==second)return b;const x=new Uint8Array(b.slice(0));x[5]^=1;return x.buffer;};
  expect(await code(fetchBundledOrbitFile(filesFetcher([],flip),signal,'ObjX_MPC.CMO'))).toBe('sha256');
  expect(await code(fetchBundledOrbitFile(filesFetcher([],(p,b)=>p===second?b.slice(0,b.byteLength-162):b),signal,'ObjX_MPC.CMO'))).toBe('size');
  expect(await code(fetchBundledOrbitFile(filesFetcher([],(p,b)=>{if(p!==second)return b;const x=new Uint8Array(b.byteLength+1);x.set(new Uint8Array(b));return x.buffer;}),signal,'ObjX_MPC.CMO'))).toBe('size');
  expect(await code(fetchBundledOrbitFile(filesFetcher([],undefined,'text/html; charset=utf-8'),signal,'ObjX_MPC.CMO'))).toBe('download');
  expect(await code(fetchBundledOrbitFile(fetcher(null,{},404),signal,'ObjX_MPC.CMO'))).toBe('download');
  // Tiles swapped in order: every tile passes its own check only if served at its own path, so serve tile 0 at tile 1's path.
  const swapped=filesFetcher([],(p,b)=>p===second?read('/original/orbit/ObjX_MPC/000.bin'):b);
  expect(await code(fetchBundledOrbitFile(swapped,signal,'ObjX_MPC.CMO'))).toBe('sha256');
  // Review 1 L5: a bad copy of a tile is asked for again at once past the HTTP cache (cache: 'reload'), within the same call;
  // if that copy is bad too, the call fails and the next call asks past the cache from the start.
  const serve=(bad:{n:number},log:(string|undefined)[])=>(async(input:RequestInfo|URL,init?:RequestInit)=>{const path=String(input);if(path===second)log.push(init?.cache);let b=read(path);if(path===second&&bad.n>0){bad.n--;b=flip(path,b);}return new Response(b);}) as typeof fetch;
  expect(await code(fetchBundledOrbitFile(serve({n:0},[]),signal,'ObjX_MPC.CMO'))).toBe('resolved');// a good copy clears earlier marks
  const once:(string|undefined)[]=[];
  expect(await code(fetchBundledOrbitFile(serve({n:1},once),signal,'ObjX_MPC.CMO'))).toBe('resolved');
  expect(once).toEqual([undefined,'reload']);
  const twice:(string|undefined)[]=[],bad2={n:2},f2=serve(bad2,twice);
  expect(await code(fetchBundledOrbitFile(f2,signal,'ObjX_MPC.CMO'))).toBe('sha256');
  expect(twice).toEqual([undefined,'reload']);
  expect(await code(fetchBundledOrbitFile(f2,signal,'ObjX_MPC.CMO'))).toBe('resolved');
  expect(twice).toEqual([undefined,'reload','reload']);
  // A failed download is not retried within the call.
  const offline:(string|undefined)[]=[];
  const down=(async(input:RequestInfo|URL,init?:RequestInit)=>{const path=String(input);if(path===second){offline.push(init?.cache);return new Response(null,{status:503});}return new Response(read(path));}) as typeof fetch;
  expect(await code(fetchBundledOrbitFile(down,signal,'ObjX_MPC.CMO'))).toBe('download');expect(offline).toEqual([undefined]);
 },60_000);
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
