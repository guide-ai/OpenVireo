import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {checkGscIndex,gscTilePath} from './gscTiles';
import {GSC_RECORD_BYTES,GSC_TILE_RECORDS,gscTileOf} from '../core/gscTilePlan';

// Front G (front-g-gsc.md §2): data/gsc/gsc-index.json is a function of the published tiles. Rebuild it from them and require
// exact equality; every band hash must also be the approved one recorded in assembled[] (docs/LOCAL-RESOURCES.json).
describe('the GSC index rebuilds exactly from the published tiles',()=>{
 it('records, hashes, tile ranges, packed RA bounds and the search skeleton',()=>{
  const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
  const manifest=JSON.parse(readFileSync('docs/LOCAL-RESOURCES.json','utf8')) as {assembled:{name:string;bytes:number;sha256:string;tiles:string[]}[]};
  expect(index.bands.map(b=>b.name)).toEqual(manifest.assembled.map(a=>a.name.replace(/\.DAT$/,'')));
  for(const b of index.bands){
   const whole=createHash('sha256'),tiles=[] as unknown[],chunks:Uint8Array[]=[];
   const assembled=manifest.assembled.find(a=>a.name===`${b.name}.DAT`)!;
   expect(assembled.tiles).toEqual(b.tiles.map((_t,k)=>'public'+gscTilePath(b.name,k)));
   b.tiles.forEach((_t,k)=>{
    const bytes=new Uint8Array(readFileSync('public'+gscTilePath(b.name,k))),v=new DataView(bytes.buffer),n=bytes.byteLength/GSC_RECORD_BYTES;
    whole.update(bytes);chunks.push(bytes);
    tiles.push({firstRecord:k*GSC_TILE_RECORDS,records:n,bytes:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),
     firstPackedRa:v.getInt32(0,true),lastPackedRa:v.getInt32((n-1)*GSC_RECORD_BYTES,true)});
   });
   const records=chunks.reduce((s,c)=>s+c.byteLength,0)/GSC_RECORD_BYTES,sha256=whole.digest('hex');
   const position=(i:number)=>{const c=chunks[gscTileOf(i)],v=new DataView(c.buffer),at=(i%GSC_TILE_RECORDS)*GSC_RECORD_BYTES;return [v.getInt32(at,true),v.getInt32(at+4,true)] as const;};
   const nodes=new Map<number,readonly [number,number]>(),stack:[number,number][]=[[0,records]];
   while(stack.length){const [lo,hi]=stack.pop()!;if(lo>hi||gscTileOf(lo)===gscTileOf(Math.min(hi,records-1)))continue;const mid=Math.floor((lo+hi)/2);nodes.set(mid,position(mid));stack.push([lo,mid-1],[mid+1,hi]);}
   const skeleton=[...nodes].sort((x,y)=>x[0]-y[0]).map(([i,[ra,dec]])=>[i,ra,dec]);
   expect({name:b.name,records:b.records,bytes:b.bytes,sha256:b.sha256,tiles:b.tiles,skeleton:b.skeleton}).toEqual({name:b.name,records,bytes:records*GSC_RECORD_BYTES,sha256,tiles,skeleton});
   expect(sha256).toBe(assembled.sha256);expect(b.bytes).toBe(assembled.bytes);
  }
  expect(index.bands.reduce((s,b)=>s+b.records,0)).toBe(18_841_240);expect(index.bands.reduce((s,b)=>s+b.skeleton.length,0)).toBe(4189);
 },300_000);
});
