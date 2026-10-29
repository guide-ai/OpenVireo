// Front G (docs/COMPACT-GSC-TILES.md): same-origin tiles of the compact GSC bands (user approval of 2026-10-29). Web adapter,
// not an original contract: VIREO reads each band file directly (0x59af80..0x59b1f7). A tile is fetched only when a band read
// needs it (src/core/gscTilePlan.ts), through the browser's HTTP cache, and checked for its exact recorded size and SHA-256
// before any record is read. Nothing is persisted beyond the HTTP cache or sent anywhere; no IndexedDB, no Worker.
import {GSC_RECORD_BYTES,GSC_TILE_RECORDS,checkGscBandIndex,gscTileOf,type GscBandIndex} from '../core/gscTilePlan';
import {BoundedResourceError,boundedResourceBody,checkResourceAbort,resourceSha256} from './boundedResource';

export class GscTileError extends Error{
 constructor(readonly code:'fetch'|'integrity'|'index'|'missing-tile'|'budget',readonly band?:string,readonly tile?:number){
  super(`GSC tile: ${code}${band?` ${band}`:''}${tile===undefined?'':`/${tile}`}`);this.name='GscTileError';
 }
}
export type GscIndex=Readonly<{schema:'openvireo-gsc-index-v1';recordBytes:number;tileRecords:number;bands:readonly GscBandIndex[]}>;
/** The derived index (data/gsc/gsc-index.json), loaded lazily; its structure is checked once. */
let indexPromise:Promise<GscIndex>|null=null;
export function checkGscIndex(value:unknown):GscIndex{
 const v=value as GscIndex;
 if(!v||v.schema!=='openvireo-gsc-index-v1'||v.recordBytes!==GSC_RECORD_BYTES||v.tileRecords!==GSC_TILE_RECORDS||!Array.isArray(v.bands)||v.bands.length!==24)throw new GscTileError('index');
 try{for(const b of v.bands)checkGscBandIndex(b);}catch{throw new GscTileError('index');}
 return v;
}
export function loadGscIndex():Promise<GscIndex>{
 indexPromise??=import('../../data/gsc/gsc-index.json').then(m=>checkGscIndex(m.default)).catch(e=>{indexPromise=null;throw e instanceof GscTileError?e:new GscTileError('index');});
 return indexPromise;
}
export const gscBandIndex=(index:GscIndex,band:string)=>{const b=index.bands.find(x=>x.name===band);if(!b)throw new GscTileError('index',band);return b;};
export const gscTilePath=(band:string,tile:number)=>`/original/gsc/${band}/${String(tile).padStart(3,'0')}.bin`;

export type GscTileStoreOptions=Readonly<{fetcher?:typeof fetch;capacity?:number}>;
/** Verified tiles by band and tile number, with an LRU of at most `capacity` tiles (default 24, ≤ 42 MB) and one shared
 * request per tile. An abort rejects the caller with the DOMException AbortError; a failure is a GscTileError. */
export function createGscTileStore(options:GscTileStoreOptions={}){
 const fetcher=options.fetcher??((input:RequestInfo|URL,init?:RequestInit)=>fetch(input,init)),capacity=options.capacity??24;
 if(!Number.isInteger(capacity)||capacity<1||capacity>64)throw new GscTileError('budget');
 const cache=new Map<string,Uint8Array>(),pending=new Map<string,Promise<Uint8Array>>();
 const key=(band:string,tile:number)=>`${band}/${tile}`;
 async function download(b:GscBandIndex,tile:number):Promise<Uint8Array>{
  const t=b.tiles[tile];if(!t)throw new GscTileError('index',b.name,tile);
  let buffer:ArrayBuffer;
  // The shared request is not tied to one caller's signal; each caller can still stop waiting (see `tile`).
  try{const response=await fetcher(gscTilePath(b.name,tile),{credentials:'same-origin',cache:'force-cache'});buffer=await boundedResourceBody(response,t.bytes);}
  catch(e){throw new GscTileError(e instanceof BoundedResourceError&&e.code==='size'?'integrity':'fetch',b.name,tile);}
  if(buffer.byteLength!==t.bytes||await resourceSha256(buffer)!==t.sha256)throw new GscTileError('integrity',b.name,tile);
  return new Uint8Array(buffer);
 }
 function remember(k:string,bytes:Uint8Array){cache.delete(k);cache.set(k,bytes);while(cache.size>capacity)cache.delete(cache.keys().next().value!);}
 async function tile(b:GscBandIndex,n:number,signal?:AbortSignal):Promise<Uint8Array>{
  checkResourceAbort(signal);const k=key(b.name,n),hit=cache.get(k);
  if(hit){remember(k,hit);return hit;}
  let request=pending.get(k);
  if(!request){request=download(b,n).then(bytes=>{remember(k,bytes);return bytes;}).finally(()=>pending.delete(k));pending.set(k,request);}
  if(!signal)return request;
  return await new Promise<Uint8Array>((resolve,reject)=>{
   const abort=()=>reject(new DOMException('Source loading was cancelled','AbortError'));signal.addEventListener('abort',abort,{once:true});
   request.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
 }
 /** Fetches the listed tiles of one band (at most `capacity`, so none is evicted before it is used). */
 async function tiles(b:GscBandIndex,list:readonly number[],signal?:AbortSignal):Promise<ReadonlyMap<number,Uint8Array>>{
  if(list.length>capacity)throw new GscTileError('budget',b.name);
  const got=await Promise.all(list.map(async n=>[n,await tile(b,n,signal)] as const));return new Map(got);
 }
 return Object.freeze({tile,tiles,size:()=>cache.size,clear:()=>{cache.clear();}});
}
export type GscTileStore=ReturnType<typeof createGscTileStore>;

/** Synchronous reads of one band over fetched tiles, for the existing trace and decoders. The outer search probes come from
 * the index's skeleton (packed RA and Dec, the 8 bytes a position-only witness holds) when their tile was not fetched. Any
 * other read outside the fetched tiles is a typed missing-tile error (a planning bug), never a skipped record. */
export function tiledBandSource(b:GscBandIndex,tiles:ReadonlyMap<number,Uint8Array>){
 const skeleton=new Map(b.skeleton.map(([i,ra,dec])=>[i,[ra,dec] as const]));
 const at=(recordIndex:number)=>{
  if(!Number.isInteger(recordIndex)||recordIndex<0||recordIndex>=b.records)throw new GscTileError('missing-tile',b.name);
  const n=gscTileOf(recordIndex),bytes=tiles.get(n);
  return bytes?{bytes,offset:(recordIndex-n*GSC_TILE_RECORDS)*GSC_RECORD_BYTES}:null;
 };
 const missing=(recordIndex:number)=>new GscTileError('missing-tile',b.name,gscTileOf(recordIndex));
 /** The first 8 bytes (packed Int32 RA and Dec) of a record. */
 function readPosition(recordIndex:number):Uint8Array{
  const r=at(recordIndex);if(r)return r.bytes.slice(r.offset,r.offset+8);
  const s=skeleton.get(recordIndex);if(!s)throw missing(recordIndex);
  const out=new Uint8Array(8),v=new DataView(out.buffer);v.setInt32(0,s[0],true);v.setInt32(4,s[1],true);return out;
 }
 return Object.freeze({
  recordCount:b.records,readPosition,
  hasRecord:(recordIndex:number)=>at(recordIndex)!==null,
  readPackedRa(recordIndex:number){return new DataView(readPosition(recordIndex).buffer).getInt32(0,true);},
  readRecord(recordIndex:number):Uint8Array{const r=at(recordIndex);if(!r)throw missing(recordIndex);return r.bytes.subarray(r.offset,r.offset+GSC_RECORD_BYTES);},
 });
}
