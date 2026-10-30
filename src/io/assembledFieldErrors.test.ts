import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {AssembledFieldError,assembleFieldPack,type AssemblySources} from './assembledFieldPack';
import {checkGscIndex,createGscTileStore,type GscIndex} from './gscTiles';
import {GSC_RECORD_BYTES} from '../core/gscTilePlan';
import {buildFieldPopulation,freshFieldArea} from '../core/fieldEngine';
import {nativeCompactBandOrder,nativeRegionIds} from '../core/pinnedNativeField';

// Front G review 1 L2: typed codes for a search past a band's last record and for a read outside the planned tiles.
// Synthetic band bytes stand in for the band the regions select; nothing here is catalogue data.
const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const pointing={ra:12,dec:10},bandName=nativeCompactBandOrder(nativeRegionIds(freshFieldArea(pointing)))[0];
/** One synthetic band of three records whose packed RA is below the field's minimum key. */
function synthetic():{index:GscIndex;bytes:Uint8Array}{
 const bytes=new Uint8Array(3*GSC_RECORD_BYTES),v=new DataView(bytes.buffer);
 for(let i=0;i<3;i++){v.setInt32(i*GSC_RECORD_BYTES,1000+i,true);v.setInt32(i*GSC_RECORD_BYTES+4,1_000_000,true);}
 const band={name:bandName,records:3,bytes:bytes.byteLength,sha256:sha(bytes),skeleton:[],
  tiles:[{firstRecord:0,records:3,bytes:bytes.byteLength,sha256:sha(bytes),firstPackedRa:1000,lastPackedRa:1002}]};
 return {index:{...index,bands:index.bands.map(b=>b.name===bandName?band:b)},bytes};
}
const empty=new Uint8Array(0);
const sources=(i:GscIndex,fetcher:typeof fetch):AssemblySources=>({index:i,tiles:createGscTileStore({fetcher}),variables:empty,variablesSha256:'0'.repeat(64),qso:empty,qsoSha256:'0'.repeat(64),glimages:empty});

describe('assembled field error codes',()=>{
 it('a minimum RA key above every record of a band is band-end (VIREO reads past EOF), not source',async()=>{
  const s=synthetic(),fetcher=(async()=>new Response(s.bytes.slice())) as typeof fetch;
  await expect(assembleFieldPack(pointing,sources(s.index,fetcher))).rejects.toEqual(new AssembledFieldError('band-end'));
 });
 it('a read outside the fetched tiles is the typed plan error, not a raw GscTileError',async()=>{
  const s=sources(index,(async()=>new Response(new Uint8Array(0))) as typeof fetch);
  // A store that hands back no tile at all: the trace's first unplanned read must surface as AssembledFieldError('plan').
  const tiles={...s.tiles,tiles:async()=>new Map<number,Uint8Array>()};
  await expect(assembleFieldPack(pointing,{...s,tiles})).rejects.toEqual(new AssembledFieldError('plan'));
 });
});

// G1b review 1 L3: a tiled build stops between band reads and population stages on an abort.
describe('abort checkpoints',()=>{
 const f=(p:string)=>new Uint8Array(readFileSync(p));
 const real=():AssemblySources=>{const v=f('public/original/variables/CLEA_VStrs.dat'),q=f('public/original/catalogs/CLEA_QSO.DAT');
  return {index,tiles:createGscTileStore({fetcher:(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch}),variables:v,variablesSha256:sha(v),qso:q,qsoSha256:sha(q),glimages:f('public/original/images/GLIMAGES.LST')};};
 it('an aborted or aborting signal rejects the assembly with AbortError',async()=>{
  const done=new AbortController();done.abort();
  await expect(assembleFieldPack({ra:15.5,dec:-89.88},real(),done.signal)).rejects.toMatchObject({name:'AbortError'});
  const later=new AbortController(),run=assembleFieldPack({ra:15.5,dec:-89.88},real(),later.signal);
  setTimeout(()=>later.abort(),0);await expect(run).rejects.toMatchObject({name:'AbortError'});
 },60_000);
 it('the population build checks the signal between stages',async()=>{
  const pack=await assembleFieldPack({ra:12,dec:20},real()),glx=f('public/original/catalogs/CLEA_GLX.DAT'),c=new AbortController();c.abort();
  expect(()=>buildFieldPopulation(pack,glx,{ra:12,dec:20},{signal:c.signal})).toThrow(expect.objectContaining({name:'AbortError'}));
  expect(buildFieldPopulation(pack,glx,{ra:12,dec:20},{}).population).not.toBeNull();
 },60_000);
});
