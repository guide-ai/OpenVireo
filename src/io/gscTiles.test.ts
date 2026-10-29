import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {checkGscIndex,createGscTileStore,GscTileError,gscTilePath} from './gscTiles';
import {GSC_RECORD_BYTES,type GscBandIndex} from '../core/gscTilePlan';

// Front G (front-g-gsc.md §4, §7): the tile store with a mocked fetch. Synthetic bytes only.
const tileBytes=(k:number)=>Uint8Array.from({length:3*GSC_RECORD_BYTES},(_,i)=>(i*7+k)&255);
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const band:GscBandIndex={name:'N0000',records:65536*2+3,bytes:(65536*2+3)*GSC_RECORD_BYTES,sha256:'0'.repeat(64),skeleton:[],
 tiles:[0,1,2].map(k=>({firstRecord:k*65536,records:k<2?65536:3,bytes:(k<2?65536:3)*GSC_RECORD_BYTES,sha256:'0'.repeat(64),firstPackedRa:k,lastPackedRa:k}))};
// Small tiles stand in for the real ones; the store only checks what the index records for each tile.
const small:GscBandIndex={...band,tiles:band.tiles.map((t,k)=>({...t,bytes:tileBytes(k).byteLength,sha256:sha(tileBytes(k))}))};
function mock(body:(path:string)=>Response|Promise<Response>){const calls:string[]=[];return {calls,fetcher:(async(input:RequestInfo|URL,init?:RequestInit)=>{calls.push(String(input));expect(init?.credentials).toBe('same-origin');expect(init?.cache).toBe('force-cache');return body(String(input));}) as typeof fetch};}
const byPath=(path:string)=>{const k=Number(/(\d{3})\.bin$/.exec(path)![1]);return new Response(tileBytes(k));};

describe('GSC tile store',()=>{
 it('fetches same-origin tile paths through the HTTP cache, checks size and SHA-256, and shares one request per tile',async()=>{
  const m=mock(byPath),store=createGscTileStore({fetcher:m.fetcher});
  const [a,b]=await Promise.all([store.tile(small,1),store.tile(small,1)]);
  expect(a).toBe(b);expect(m.calls).toEqual(['/original/gsc/N0000/001.bin']);expect(gscTilePath('S8230',12)).toBe('/original/gsc/S8230/012.bin');
  await store.tile(small,1);expect(m.calls).toHaveLength(1);
 });
 it('types a changed tile, a wrong size, a 404 and a network failure; a failure is not cached',async()=>{
  let mode:'changed'|'long'|'404'|'throw'|'ok'='changed';
  const m=mock(path=>{const b=byPath(path);if(mode==='404')return new Response('x',{status:404});if(mode==='throw')throw new TypeError('offline');
   if(mode==='changed')return b.arrayBuffer().then(x=>{const y=new Uint8Array(x);y[0]^=1;return new Response(y);});if(mode==='long')return new Response(new Uint8Array(200));return b;});
  const store=createGscTileStore({fetcher:m.fetcher});
  await expect(store.tile(small,0)).rejects.toMatchObject({code:'integrity',band:'N0000',tile:0});
  mode='long';await expect(store.tile(small,0)).rejects.toMatchObject({code:'integrity'});
  mode='404';await expect(store.tile(small,0)).rejects.toMatchObject({code:'fetch'});
  mode='throw';await expect(store.tile(small,0)).rejects.toBeInstanceOf(GscTileError);
  mode='ok';expect(await store.tile(small,0)).toEqual(tileBytes(0));expect(m.calls).toHaveLength(5);
  await expect(store.tile(small,7)).rejects.toMatchObject({code:'index'});
 });
 it('lets a caller stop waiting with an abort, while the shared request completes for others',async()=>{
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);
  const m=mock(async path=>{await gate;return byPath(path);}),store=createGscTileStore({fetcher:m.fetcher});
  const controller=new AbortController(),waiting=store.tile(small,2,controller.signal),other=store.tile(small,2);
  controller.abort();await expect(waiting).rejects.toMatchObject({name:'AbortError'});
  release();expect(await other).toEqual(tileBytes(2));
  await expect(store.tile(small,2,controller.signal)).rejects.toMatchObject({name:'AbortError'});
 });
 it('keeps at most `capacity` tiles (least recently used evicted) and refuses a band read needing more',async()=>{
  const m=mock(byPath),store=createGscTileStore({fetcher:m.fetcher,capacity:2});
  await store.tile(small,0);await store.tile(small,1);await store.tile(small,0);await store.tile(small,2);
  expect(store.size()).toBe(2);await store.tile(small,0);expect(m.calls).toHaveLength(3);await store.tile(small,1);expect(m.calls).toHaveLength(4);
  await expect(store.tiles(small,[0,1,2])).rejects.toMatchObject({code:'budget'});
  expect(()=>createGscTileStore({capacity:0})).toThrow(GscTileError);
 });
 it('checks the index structure',()=>{
  expect(()=>checkGscIndex({schema:'openvireo-gsc-index-v1',recordBytes:27,tileRecords:65536,bands:[band]})).toThrow(GscTileError);
  expect(()=>checkGscIndex({schema:'x'})).toThrow(GscTileError);
 });
});
