import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {AssembledFieldError,assembleFieldPack,assembledFieldArea,type AssemblySources} from './assembledFieldPack';
import {checkGscIndex,createGscTileStore,GscTileError,gscTilePath,tiledBandSource} from './gscTiles';
import {decodeFieldPack,fieldPackFromSnapshot,type FieldPack} from '../core/fieldPack';
import {buildFieldPopulation,freshFieldArea,type FieldOptions} from '../core/fieldEngine';
import {traceCompactGscBandRead} from '../core/compactGscReadOrder';
import {roundNearestEven} from '../core/numericPolicy';
import {nativeCompactBandOrder,nativeRegionIds} from '../core/pinnedNativeField';
import {GSC_RECORD_BYTES,GSC_TILE_RECORDS} from '../core/gscTilePlan';
import {packWithPhotographs,parseGlimagesPositions} from '../core/lssLists';

// Front G (analysis/front-plans/front-g-gsc.md §5, §7): the published bounded GSC subsets stay the certified fast path; these
// proofs read the published tiles from disk and show that (a) every stored band read equals the tile bytes, (b) a pack assembled
// from the tiles for each certified pointing gives the identical field population, and (c) the assembled reads equal the whole
// band, for a fixed sample of other pointings. The whole-sky magnitude-12 tiles are checked against the tiled bands too.
const file=(p:string)=>new Uint8Array(readFileSync(p));
const index=checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8')));
const diskFetch=(async(input:RequestInfo|URL)=>new Response(file('public'+String(input)))) as typeof fetch;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const variables=file('public/original/variables/CLEA_VStrs.dat'),qso=file('public/original/catalogs/CLEA_QSO.DAT'),glimages=file('public/original/images/GLIMAGES.LST');
const glx=file('public/original/catalogs/CLEA_GLX.DAT');
const sources=():AssemblySources=>({index,tiles:createGscTileStore({fetcher:diskFetch,capacity:64}),variables,variablesSha256:sha(variables),qso,qsoSha256:sha(qso),glimages});
const bandCache=new Map<string,Uint8Array>();
function band(name:string):Uint8Array{
 let b=bandCache.get(name);if(b)return b;
 const entry=index.bands.find(x=>x.name===name)!;b=new Uint8Array(entry.bytes);
 entry.tiles.forEach((t,k)=>b!.set(file('public'+gscTilePath(name,k)),t.firstRecord*GSC_RECORD_BYTES));
 if(bandCache.size>3)bandCache.clear();bandCache.set(name,b);return b;
}
const recordHex=(name:string,i:number,len:number)=>Buffer.from(band(name).subarray(i*GSC_RECORD_BYTES,i*GSC_RECORD_BYTES+len)).toString('hex');
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const lssPacks=Array.from({length:9},(_,i)=>`data/lss/lss-field-0${i+1}.json`);
const enginePacks=['data/hubble/engine-coma.json','data/hubble/engine-bootes.json'];
const objectXPacks=readdirSync('data/objectx').filter(f=>/^spectra-.*\.json$/.test(f)).map(f=>'data/objectx/'+f);
const snapshots=['pinned-galaxy-field','pinned-galaxy-36747-field','pinned-galaxy-54876-field','pinned-pegasus-field','pinned-hubble-field','pinned-star-field'].map(f=>`data/hubble/${f}.json`);
const photometry=['pinned-pleiades-v','pleiades-target-fields','pleiades-expanded-fields','pleiades-variable-fields','pleiades-pointing-fields'].map(f=>`data/photometry/${f}.json`);
/** Every stored band read in any of the three published schemas: [index, hex] pairs, {index, rawHex} objects. */
function storedReads(value:unknown,out:{band:string;index:number;hex:string;recordCount?:number}[]=[]){
 if(Array.isArray(value)){for(const v of value)storedReads(v,out);return out;}
 if(!value||typeof value!=='object')return out;
 const o=value as Record<string,unknown>,name=typeof o.name==='string'?o.name:typeof o.band==='string'?o.band:null;
 if(name&&/^[NS]\d{4}$/.test(name)&&Array.isArray(o.reads)){
  for(const r of o.reads as unknown[]){
   if(Array.isArray(r))out.push({band:name,index:r[0] as number,hex:r[1] as string,recordCount:o.recordCount as number|undefined});
   else if(r&&typeof r==='object'){const x=r as {index:number;rawHex?:string;hex?:string};out.push({band:name,index:x.index,hex:(x.rawHex??x.hex)!,recordCount:o.recordCount as number|undefined});}
  }
 }
 for(const v of Object.values(o))if(v&&typeof v==='object')storedReads(v,out);
 return out;
}

describe('published GSC subsets equal the published tiles (front-g-gsc.md §5a)',()=>{
 it.each([...lssPacks,...enginePacks,...objectXPacks,...snapshots,...photometry])('%s',p=>{
  const reads=storedReads(json(p));expect(reads.length).toBeGreaterThan(0);
  const bad=reads.filter(r=>!(r.hex.length===54||r.hex.length===16)||recordHex(r.band,r.index,r.hex.length/2)!==r.hex.toLowerCase());
  expect(bad.slice(0,3)).toEqual([]);
  for(const r of reads)if(r.recordCount!==undefined)expect(r.recordCount).toBe(index.bands.find(b=>b.name===r.band)!.records);
 },60_000);
});

/** A certified pack and its listed pointings, with photographs as the runtime adds them (fieldInfoPacks / lssInvestigation). */
function certified():{id:string;pack:FieldPack}[]{
 const glimagesPositions=parseGlimagesPositions(glimages),out:{id:string;pack:FieldPack}[]=[];
 for(const p of lssPacks)out.push({id:p,pack:packWithPhotographs(decodeFieldPack(json(p)),glimagesPositions)});
 for(const p of [...enginePacks,...objectXPacks])out.push({id:p,pack:decodeFieldPack(json(p))});
 for(const p of snapshots.slice(0,4))out.push({id:p,pack:fieldPackFromSnapshot(p.replace(/^.*\/|\.json$/g,''),json(p))});
 return out;
}
const qsoCatalog={bytes:qso,sha256:sha(qso)};
const optionSets:readonly (readonly [string,FieldOptions])[]=[['gate',{}],['merge',{qso:'merge',qsoCatalog}]];

describe('a pack assembled from the tiles gives the identical population at every certified pointing (§5b)',()=>{
 const packs=certified();let populated=0,stars=0;
 it.each(packs.map(p=>[p.id,p] as const))('%s',async(_id,{pack})=>{
  const s=sources();
  for(const pointing of pack.pointings){
   const assembled=await assembleFieldPack(pointing,s);
   // Every assembled read is the stored read or (for a record outside this pointing's area but inside another's) its prefix.
   for(const b of assembled.bands){const stored=pack.bands.find(x=>x.name===b.name)!;for(const [i,h] of b.reads)expect(stored.reads.get(i)?.startsWith(h),`${b.name}@${i}`).toBe(true);}
   for(const [label,options] of optionSets){
    let expected,actual;try{expected=buildFieldPopulation(pack,glx,pointing,options);}catch(e){expected=String(e);}
    try{actual=buildFieldPopulation(assembled,glx,pointing,options);}catch(e){actual=String(e);}
    expect(actual,`${pointing.ra},${pointing.dec} ${label}`).toEqual(expected);
    if(typeof expected!=='string'&&expected.population){populated++;stars+=expected.population.stars.length;}
   }
  }
 },240_000);
 it('covers every certified pointing, and the comparisons are of real populations',()=>{
  expect(packs.reduce((n,p)=>n+p.pack.pointings.length,0)).toBeGreaterThan(200);
  // Not vacuous: most pointings (under both QSO modes) build a population, with tens of thousands of stars in all.
  expect(populated).toBeGreaterThan(300);expect(stars).toBeGreaterThan(20_000);
 });
});

describe('assembled reads equal the whole band for other pointings (§7)',()=>{
 it('200 fixed pseudo-random pointings, every native read byte-equal',async()=>{
  const s=sources();let state=20261029,done=0,typed=0;
  const next=()=>{state=(state*1664525+1013904223)>>>0;return state/2**32;};
  while(done<200){
   const pointing={ra:next()*24,dec:Math.asin(2*next()-1)*180/Math.PI};
   let pack;try{pack=await assembleFieldPack(pointing,s);}catch(e){if(e instanceof AssembledFieldError&&['ra-wrap','polar','regions','budget'].includes(e.code)){typed++;continue;}throw e;}
   const area=freshFieldArea(pointing),key=roundNearestEven(area.minimumRa*1e7);
   expect(pack.bands.map(b=>b.name)).toEqual(nativeCompactBandOrder(nativeRegionIds(area)));
   for(const b of pack.bands){
    const whole=band(b.name),view=new DataView(whole.buffer);
    const t=traceCompactGscBandRead({recordCount:whole.byteLength/GSC_RECORD_BYTES,readPackedRa:i=>view.getInt32(i*GSC_RECORD_BYTES,true)},key,area.maximumRa,10_000);
    expect([...b.reads.keys()].sort((x,y)=>x-y)).toEqual([...new Set([...t.probes,...t.visits].map(r=>r.recordIndex))].sort((x,y)=>x-y));
    for(const [i,h] of b.reads)expect(recordHex(b.name,i,h.length/2)).toBe(h);
   }
   done++;
  }
  expect(typed).toBeLessThan(40);
 },600_000);
});

describe('typed limits',()=>{
 it('refuses wrap and polar areas with a typed reason, and a read outside the fetched tiles',async()=>{
  expect(()=>assembledFieldArea({ra:0.001,dec:10})).toThrow(new AssembledFieldError('ra-wrap'));
  expect(()=>assembledFieldArea({ra:23.999,dec:-10})).toThrow(new AssembledFieldError('ra-wrap'));
  expect(()=>assembledFieldArea({ra:3,dec:89.5})).toThrow(new AssembledFieldError('polar'));
  expect(()=>assembledFieldArea({ra:3,dec:-89})).toThrow(new AssembledFieldError('polar'));
  expect(()=>assembledFieldArea({ra:24,dec:0})).toThrow(new AssembledFieldError('input'));
  const b=index.bands[0],src=tiledBandSource(b,new Map([[0,file('public'+gscTilePath(b.name,0))]]));
  expect(src.readRecord(GSC_TILE_RECORDS-1)).toHaveLength(27);
  expect(()=>src.readRecord(GSC_TILE_RECORDS)).toThrow(GscTileError);
  // A skeleton probe outside the fetched tiles is answered from the index; its whole record is not.
  const [i]=b.skeleton.find(([k])=>k>=GSC_TILE_RECORDS)!;expect(src.readPosition(i)).toHaveLength(8);expect(()=>src.readRecord(i)).toThrow(GscTileError);
 });
});

describe('the whole-sky magnitude-12 tiles are a filter of the tiled bands',()=>{
 it('equal multiset of [packed RA, packed Dec, magnitude×1000] for every record with −3 ≤ magnitude ≤ 12, per RA hour',()=>{
  const fromBands=Array.from({length:24},()=>[] as number[][]);
  for(const b of index.bands){
   b.tiles.forEach((_t,k)=>{
    const bytes=file('public'+gscTilePath(b.name,k)),v=new DataView(bytes.buffer);
    for(let at=0;at<bytes.byteLength;at+=GSC_RECORD_BYTES){const m=v.getInt16(at+12,true);if(m>=-3000&&m<=12000){const ra=v.getInt32(at,true);fromBands[Math.min(23,Math.floor(ra/10_000_000))].push([ra,v.getInt32(at+4,true),m]);}}
   });
  }
  const cmp=(a:number[],b:number[])=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
  let total=0;
  for(let h=0;h<24;h++){
   const dir=`public/original/sky/${String(h).padStart(2,'0')}`,sky=readdirSync(dir).flatMap(f=>json(`${dir}/${f}`) as number[][]);
   const a=fromBands[h].sort(cmp),c=sky.sort(cmp);expect(c.length,`hour ${h}`).toBe(a.length);
   expect(a.every((x,i)=>cmp(x,c[i])===0),`hour ${h}`).toBe(true);total+=a.length;
  }
  expect(total).toBe(2_369_926);
 },600_000);
});
