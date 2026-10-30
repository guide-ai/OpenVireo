import {describe,expect,it} from 'vitest';
import {GSC_RECORD_BYTES,GSC_TILE_RECORDS,GscTilePlanError,gscTileOf,planGscBandRead,type GscBandIndex} from './gscTilePlan';
import {CompactBandReadOrderError,traceCompactGscBandRead} from './compactGscReadOrder';

// Front G (analysis/front-plans/front-g-gsc.md §7): the planned tiles must be exactly the tiles the native band read touches.
// Synthetic bands keep the test deterministic and independent of the published tiles; a separate test checks the real index.
function rng(seed:number){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/2**32;};}
/** A sorted packed-RA column; `dupAt` repeats one value across a tile boundary. */
function band(n:number,seed:number,dupAt?:number):number[]{
 const r=rng(seed),ra=Array.from({length:n},()=>Math.floor(r()*240_000_000)).sort((a,b)=>a-b);
 if(dupAt!==undefined)for(let i=dupAt-3;i<dupAt+3;i++)ra[i]=ra[dupAt-3];
 return ra;
}
/** The skeleton rule of the cut tool (analysis/front-g-gsc/tools/cut_gsc_tiles.py). */
function index(name:string,ra:readonly number[]):GscBandIndex{
 const n=ra.length,nodes=new Map<number,[number,number]>(),stack:[number,number][]=[[0,n]];
 while(stack.length){const [lo,hi]=stack.pop()!;if(lo>hi||gscTileOf(lo)===gscTileOf(Math.min(hi,n-1)))continue;const mid=Math.floor((lo+hi)/2);nodes.set(mid,[ra[mid],0]);stack.push([lo,mid-1],[mid+1,hi]);}
 const tiles=Array.from({length:Math.ceil(n/GSC_TILE_RECORDS)},(_,k)=>{const first=k*GSC_TILE_RECORDS,records=Math.min(GSC_TILE_RECORDS,n-first);
  return {firstRecord:first,records,bytes:records*GSC_RECORD_BYTES,sha256:'0'.repeat(64),firstPackedRa:ra[first],lastPackedRa:ra[first+records-1]};});
 return {name,records:n,bytes:n*GSC_RECORD_BYTES,sha256:'0'.repeat(64),tiles,skeleton:[...nodes].map(([i,[r,d]])=>[i,r,d] as const).sort((a,b)=>a[0]-b[0])};
}
/** Tiles the real trace reads; null when the native search runs past the last record (read-boundary). */
function touched(ra:readonly number[],key:number,max:number):number[]|null{
 try{const t=traceCompactGscBandRead({recordCount:ra.length,readPackedRa:i=>ra[i]},key,max,10_000_000);
  return [...new Set([...t.probes,...t.visits].map(v=>gscTileOf(v.recordIndex)))].sort((a,b)=>a-b);}
 catch(e){if(e instanceof CompactBandReadOrderError&&e.code==='read-boundary')return null;throw e;}
}
/** The plan must hold every tile the trace reads (search probes are planned only from the final tile). */
function check(ra:readonly number[],b:GscBandIndex,key:number,max:number){
 const plan=planGscBandRead(b,key,max),real=touched(ra,key,max);
 const outer=new Set(b.skeleton.map(([i])=>gscTileOf(i)));
 if(real===null){expect(plan.tiles.every(k=>k===b.tiles.length-1)).toBe(true);return;}
 // Probes before the final tile come from the skeleton (no fetch); every other tile read must be planned.
 const trace=traceCompactGscBandRead({recordCount:ra.length,readPackedRa:i=>ra[i]},key,max,10_000_000);
 const skeletonIndices=new Set(b.skeleton.map(([i])=>i));
 const needed=[...new Set([...trace.probes.filter(p=>!skeletonIndices.has(p.recordIndex)),...trace.visits].map(v=>gscTileOf(v.recordIndex)))].sort((a,b)=>a-b);
 expect(plan.tiles,`key ${key} max ${max}`).toEqual(needed);
 expect(real.every(k=>plan.tiles.includes(k)||outer.has(k))).toBe(true);
}

describe('GSC tile plan',()=>{
 const ra=band(300_001,7,2*GSC_TILE_RECORDS),b=index('N0000',ra);
 it('plans exactly the tiles the native read needs, for random keys and field widths',()=>{
  const r=rng(11);
  for(let i=0;i<400;i++){const key=Math.floor(r()*240_000_000),max=Math.min(24,key/1e7+r()*0.2);check(ra,b,key,max);}
 });
 it('handles tile boundaries, equal keys across a boundary, the first and last record and EOF',()=>{
  for(const at of [0,GSC_TILE_RECORDS-1,GSC_TILE_RECORDS,2*GSC_TILE_RECORDS-1,2*GSC_TILE_RECORDS,ra.length-1]){
   check(ra,b,ra[at],ra[at]/1e7);check(ra,b,ra[at],ra[Math.min(at+5,ra.length-1)]/1e7);
  }
  // A scan that reaches EOF reads to the last tile; a key past every record ends at the read boundary.
  check(ra,b,ra[ra.length-10],24);check(ra,b,240_000_000,24);
 });
 it('covers a whole band for a polar read (key 0, maximum 24 h) and a wrapped interval as two reads',()=>{
  const whole=planGscBandRead(b,0,24);expect(whole.tiles).toEqual(b.tiles.map((_,k)=>k));check(ra,b,0,24);
  // Wrap (front-g-gsc.md §6, 0x597ac8 splits the interval): [23.98 h, 24) and [0, 0.02 h] are two band reads.
  const east=planGscBandRead(b,239_800_000,24),west=planGscBandRead(b,0,0.02);
  expect(east.tiles.at(-1)).toBe(b.tiles.length-1);expect(west.tiles[0]).toBe(0);
  check(ra,b,239_800_000,24);check(ra,b,0,0.02);
 });
 it('works for a band smaller than one tile and one with an exact tile multiple',()=>{
  for(const n of [5,GSC_TILE_RECORDS,2*GSC_TILE_RECORDS+1]){const x=band(n,n),bx=index('S8230',x);const r=rng(n);
   for(let i=0;i<50;i++){const key=Math.floor(r()*240_000_000);check(x,bx,key,Math.min(24,key/1e7+r()*0.5));}}
 });
 it('refuses a broken index, key or maximum with a typed error',()=>{
  // Every search probes the root midpoint floor(N/2) first; without it the plan cannot replay the search.
  const root=Math.floor(b.records/2);expect(()=>planGscBandRead({...b,skeleton:b.skeleton.filter(([i])=>i!==root)},120_000_000,12.1)).toThrow(GscTilePlanError);
  expect(()=>planGscBandRead({...b,records:b.records+1},0,1)).toThrow(GscTilePlanError);
  expect(()=>planGscBandRead(b,-1,1)).toThrow(GscTilePlanError);expect(()=>planGscBandRead(b,0,25)).toThrow(GscTilePlanError);
 });
});
