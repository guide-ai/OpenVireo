import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,expect,test} from 'vitest';
import {findCertifiedPopulation,setFieldInfoResources} from './fieldInfoPacks';
import {loadLssPack} from './lssPack';
import {LSS_ROWS} from '../core/lssFields';
import {decodeFieldPack} from '../core/fieldPack';
import {catalogObjectView,catalogRecords,catalogScene,floatToStrFExponent4,pickCatalogObject} from '../core/catalogObject';
import {fieldStarCsvLines,fieldStarReport} from '../core/fieldStarReport';
import {freshFieldArea} from '../core/fieldEngine';
import {delphiFixed,formatNativeSexagesimal} from '../core/variableStars';
import {assembleFieldPack} from './assembledFieldPack';
import {checkGscIndex,createGscTileStore} from './gscTiles';
import {createHash} from 'node:crypto';

const f=(p:string)=>new Uint8Array(readFileSync(p));
const snapFile=(id:string)=>`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const diskFetch=(async(input:RequestInfo|URL)=>new Response(f('public'+String(input)))) as typeof fetch;
const variables=f('public/original/variables/CLEA_VStrs.dat'),qsoBytes=f('public/original/catalogs/CLEA_QSO.DAT');
/** Front G: the tiled path reads the published tiles from disk (the browser fetches them from this origin). */
let tileFetch:typeof fetch=diskFetch;
const resources=()=>({snapshot:async (id:string)=>JSON.parse(readFileSync(snapFile(id),'utf8')),engine:async (id:string)=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,
 glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),qso:async()=>({bytes:qsoBytes,sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST'),
 assembled:async(p:Readonly<{ra:number;dec:number}>)=>assembleFieldPack(p,{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:(i,init)=>tileFetch(i,init)}),
  variables,variablesSha256:sha(variables),qso:qsoBytes,qsoSha256:sha(qsoBytes),glimages:f('public/original/images/GLIMAGES.LST')})});
beforeAll(()=>setFieldInfoResources(resources()));
afterAll(()=>setFieldInfoResources(null));
function pointings(){
 const pts:{ra:number;dec:number;k:string}[]=[];
 for(const id of ['36773','36747','54876','pegasus']){const s=JSON.parse(readFileSync(snapFile(id),'utf8'));pts.push({...s.domain.pointing,k:id});}
 for(const id of ['coma','bootes']){const p=decodeFieldPack(JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')));p.pointings.forEach((q,i)=>pts.push({...q,k:id+i}));}
 for(const r of LSS_ROWS)pts.push({ra:r.ra,dec:r.dec,k:`lss${r.field}:${r.id}`});
 return pts;
}
describe('certified population (io/fieldInfoPacks.ts) over every bundled pack pointing',()=>{
 test('tally, and no galaxy redshift in Catalog Object (masked), Star Data List lines or CSV (review 1 M2)',async()=>{
  const tally:Record<string,number>={};
  for(const p of pointings()){
   const r=await findCertifiedPopulation(p);const key=r.status==='ready'?'ready':r.reason+':'+('detail' in r?r.detail:'');tally[key]=(tally[key]??0)+1;
   if(r.status!=='ready')continue;
   const recs=catalogRecords(r.population),report=fieldStarReport(freshFieldArea(p),p,recs.stars),text=[...report.lines,...(fieldStarCsvLines(report.lines)??[])].join('\n');
   for(const g of recs.galaxies){
    const v=catalogObjectView(g,formatNativeSexagesimal,{maskGalaxyRedshift:true});
    expect(v.z).toBe('');expect(v.reasons).toContain('instructor-value-masked');
    if(g.z===0)continue;
    const forms=[floatToStrFExponent4(g.z),delphiFixed(g.z,3),delphiFixed(g.z,4),String(g.z)];
    for(const z of forms){expect(Object.values(v).filter(x=>typeof x==='string').join('|')).not.toContain(z);if(z.length>5)expect(text).not.toContain(z);}
   }
  }
  // Front T (2026-10-28): the 32 pointings formerly gated by variable-merge hold TRUE-dispatch variables, now merged (the
  // population needs no time; Catalog Object marks the values variable-values-unavailable without one).
  expect(tally).toEqual({ready:227});
 },120000);
 test('36773: the e2e picks (centre click → the galaxy, keyboard cursor 150 px west → N5230-00237)',async()=>{
  const p=JSON.parse(readFileSync(snapFile('36773'),'utf8')).domain.pointing,r=await findCertifiedPopulation(p);if(r.status!=='ready')throw new Error('not certified');
  const scene=catalogScene(r.population,p,'test'),control=(web:number)=>web*312/700;
  expect(pickCatalogObject(scene,control(350),control(350))?.id).toBe('36773');
  expect(pickCatalogObject(scene,control(200),control(350))?.id).toBe('N5230-00237');
 });
 // Front G (G2): VIREO builds this field at every pointing (RE-wrap-polar-consumers.md §G-RE3); the web now builds it from the
 // compact GSC tiles wherever no bundled pack lists the pointing (this replaces "a non-pack pointing is field-not-certified").
 test('a non-pack pointing is built from the tiles, across 0 h too; a polar or failed-tile field gets a typed reason',async()=>{
  for(const p of [{ra:3.3,dec:-12},{ra:0.004,dec:41.2},{ra:18.6,dec:-30.1}]){
   const r=await findCertifiedPopulation(p);expect(r.status,`${p.ra} ${p.dec}`).toBe('ready');
   if(r.status==='ready'){expect(r.packId).toBe('gsc-tiles');expect(r.population.stars.length).toBeGreaterThan(0);}
  }
  expect(await findCertifiedPopulation({ra:5,dec:89.9})).toEqual({status:'unavailable',reason:'field-polar'});
  // A tampered tile response: typed, with the GscTileError code; the next request (honest bytes) succeeds again.
  setFieldInfoResources(resources());
  tileFetch=(async()=>new Response(new Uint8Array(27)))as typeof fetch;
  try{expect(await findCertifiedPopulation({ra:7.7,dec:22})).toEqual({status:'unavailable',reason:'field-tiles',detail:'integrity'});}
  finally{tileFetch=diskFetch;}
  setFieldInfoResources(resources());
  expect((await findCertifiedPopulation({ra:7.7,dec:22})).status).toBe('ready');
 },120_000);
});
describe('Object X mask radius for the Variable Stars list (closure N2)',()=>{
 test('only rows within 0.25° of an ObjectX.HTL position mask the list',async()=>{
  const {objectXNear}=await import('./objectXMask');
  const {parseHtl}=await import('../core/hotList');
  const positions=parseHtl(new Uint8Array(readFileSync('public/original/hotlists/ObjectX.HTL'))).map(r=>({ra:r.ra,dec:r.dec}));
  const {separationDegrees}=await import('../core/ephemeris');
  const near=(p:{ra:number;dec:number})=>positions.some(q=>separationDegrees(p.ra,p.dec,q.ra,q.dec)<=.25);
  expect(near({ra:12.7427,dec:32.338+.2})).toBe(true);expect(near({ra:12.7427,dec:32.338+.3})).toBe(false);
  expect(objectXNear(positions,null,{ra:7.6141,dec:65.6027})).toBe(true);// the 2° hide radius still masks Catalog Object / Star Data List
 });
});
