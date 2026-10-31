import {createHash} from 'node:crypto';
import {composeCameraExposure} from '../core/cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from '../core/vizierNomad';
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,describe,expect,test,vi} from 'vitest';
import {assembleFieldPack} from '../io/assembledFieldPack';
import {checkGscIndex,createGscTileStore} from '../io/gscTiles';
import {loadObjectXPositions} from '../io/objectXMask';
import {setFieldInfoResources} from '../io/fieldInfoPacks';
import {loadLssPack} from '../io/lssPack';
import {LSS_ROWS} from '../core/lssFields';
import {cameraFieldInputs,ccdFilterByte,setCcdFilterByte} from './cameraFieldInputs';

const f=(p:string)=>new Uint8Array(readFileSync(p));
const snapFile=(id:string)=>`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`;
const resources=()=>({snapshot:async(id:string)=>JSON.parse(readFileSync(snapFile(id),'utf8')),engine:async(id:string)=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,
 glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),qso:async()=>({bytes:f('public/original/catalogs/CLEA_QSO.DAT'),sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST'),
 // Front G: the tiled path reads the published compact GSC tiles from disk (the browser fetches them from this origin).
 assembled:async(p:Readonly<{ra:number;dec:number}>,signal?:AbortSignal)=>{const variables=f('public/original/variables/CLEA_VStrs.dat'),qso=f('public/original/catalogs/CLEA_QSO.DAT');
  return assembleFieldPack(p,{index:checkGscIndex(JSON.parse(readFileSync('data/gsc/gsc-index.json','utf8'))),tiles:createGscTileStore({fetcher:diskFetch}),variables,variablesSha256:sha(variables),qso,qsoSha256:sha(qso),glimages:f('public/original/images/GLIMAGES.LST')},signal);}});
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const diskFetch=(async(u:RequestInfo|URL)=>new Response(f('public'+String(u)))) as typeof fetch;
// The Object X mask reads the bundled, hash-checked ObjectX.HTL from this origin; serve same-origin paths from disk here.
const realFetch=globalThis.fetch;
beforeAll(()=>{globalThis.fetch=diskFetch;});
afterAll(()=>{globalThis.fetch=realFetch;});
afterEach(()=>setFieldInfoResources(null));

describe('camera field inputs (Front R2 review 1)',()=>{
 test('H1: LSS Field 8 at NGC 5924 carries a class 1/2 variable with V − 30 (NF, R) and V − 60 (I)',async()=>{
  setFieldInfoResources(resources());
  const row=LSS_ROWS.find(r=>r.id==='NGC 5924')!;expect(row.field).toBe(8);
  const nf=await cameraFieldInputs({ra:row.ra,dec:row.dec},2455000.5,0);
  expect(nf.status).toBe('run');
  expect(nf.objects!.some(o=>Math.abs(o.magnitude-(-21.27))<0.01)).toBe(true);
  const i=await cameraFieldInputs({ra:row.ra,dec:row.dec},2455000.5,4);
  expect(i.objects!.some(o=>Math.abs(o.magnitude-(-51.27))<0.01)).toBe(true);
 });
 test('Front G merge: a pointing with no listed pack builds a tiled field; a tile failure is "failed", a polar field "blocked"',async()=>{
  setFieldInfoResources(resources());
  // (3 h, −40°) had no pack before Front G; it now gets a field assembled from the GSC tiles, so the pass runs or finds none.
  expect(['run','none']).toContain((await cameraFieldInputs({ra:3,dec:-40},2455000.5,0)).status);
  setFieldInfoResources({...resources(),assembled:async()=>{const {GscTileError}=await import('../io/gscTiles');throw new GscTileError('fetch');}});
  expect((await cameraFieldInputs({ra:3,dec:-40},2455000.5,0)).status).toBe('failed');
  setFieldInfoResources(resources());
  expect((await cameraFieldInputs({ra:0,dec:89.99},2455000.5,0)).status).toBe('blocked');
  const row=LSS_ROWS.find(r=>r.id==='NGC 5924')!;
  setFieldInfoResources({...resources(),glx:async()=>{throw new Error('offline');}});
  expect(await cameraFieldInputs({ra:row.ra,dec:row.dec},2455000.5,0)).toEqual({status:'failed',objects:null});
 });
 test('Object X: within the mask of an ObjectX.HTL position nothing is loaded and the pass does not run',async()=>{
  let calls=0;setFieldInfoResources({...resources(),assembled:async()=>{calls++;throw new Error('must not load');}});
  const [x]=await loadObjectXPositions();
  expect(await cameraFieldInputs(x,2455000.5,0)).toEqual({status:'masked',objects:null});
  expect(await cameraFieldInputs({ra:3,dec:-40},2455000.5,0,{hidden:{ra:3,dec:-40}})).toEqual({status:'masked',objects:null});
  expect(calls).toBe(0);
 });
 test('G merge review L1: the mask reaches the field box\'s farthest corner (0.53° at the equator, up to 0.663° near the pole)',async()=>{
  const {fieldMaskReach,FIELD_MASK_REACH_BOUND}=await import('../io/objectXMask');
  expect(fieldMaskReach({ra:3,dec:0})).toBeCloseTo(0.5303,3);
  expect(fieldMaskReach({ra:3,dec:88})).toBeCloseTo(0.5539,3);
  expect(fieldMaskReach({ra:3,dec:-89.805})).toBeCloseTo(0.6630,3);
  expect(fieldMaskReach({ra:3,dec:90})).toBe(FIELD_MASK_REACH_BOUND);
  // A hidden target alone at (3 h, −40°): 2.45° north (inside 2° + 0.53°) is masked with nothing loaded; 2.7° is not masked.
  let calls=0;const base=resources();setFieldInfoResources({...base,assembled:async(p,signal)=>{calls++;return base.assembled(p,signal);}});
  const hidden={ra:3,dec:-40};
  expect((await cameraFieldInputs({ra:3,dec:-37.55},2455000.5,0,{hidden})).status).toBe('masked');
  expect(calls).toBe(0);
  expect(['run','none']).toContain((await cameraFieldInputs({ra:3,dec:-37.3},2455000.5,0,{hidden})).status);
 });
 test('G merge review L3: when ObjectX.HTL cannot be read the pass is "unchecked" (its own text) at any pointing, then retried',async()=>{
  vi.resetModules();
  globalThis.fetch=(async()=>{throw new TypeError('offline');}) as typeof fetch;
  try{
   const fresh=await import('./cameraFieldInputs');
   expect(await fresh.cameraFieldInputs({ra:3,dec:-40},2455000.5,0)).toEqual({status:'unchecked',objects:null});
   globalThis.fetch=diskFetch;// retried: the hidden target alone is now checked and masked
   expect(await fresh.cameraFieldInputs({ra:3,dec:-40},2455000.5,0,{hidden:{ra:3,dec:-40}})).toEqual({status:'masked',objects:null});
  }finally{globalThis.fetch=diskFetch;vi.resetModules();}
  const {CAMERA_MESSAGES}=await import('./CameraMessages');
  expect(CAMERA_MESSAGES.fieldObjects.unchecked).not.toBe(CAMERA_MESSAGES.fieldObjects.masked);
 });
 test('an abort rejects before any tile work',async()=>{
  setFieldInfoResources(resources());const c=new AbortController();c.abort();
  await expect(cameraFieldInputs({ra:3,dec:-40},2455000.5,0,{signal:c.signal})).rejects.toThrow();
 });
 test('L5: the CCD filter byte is page-wide and only takes filter positions',()=>{
  const before=ccdFilterByte();setCcdFilterByte(3);expect(ccdFilterByte()).toBe(3);setCcdFilterByte(9);expect(ccdFilterByte()).toBe(3);setCcdFilterByte(before);
 });
});

describe('closure M1 control at NGC 5924 (LSS Field 8), CCD NF 1 s, telescope 0',()=>{
 test('the class 1/2 variable is drawn as a saturated tail star; pixels, draws and saturated count pinned',async()=>{
  setFieldInfoResources(resources());
  const row=LSS_ROWS.find(r=>r.id==='NGC 5924')!,jd=2455000.5;
  const field=await cameraFieldInputs({ra:row.ra,dec:row.dec},jd,0);
  // The recorded NOMAD answer with its rows moved onto the pointing (as the e2e), so a catalog row is the tail.
  const dRa=row.ra*15-56.75,dDec=row.dec-24.12;
  const xml=readFileSync('tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml','utf8').replace(/<TD>(0?56\.7\d+)<\/TD>/g,(_,v:string)=>`<TD>${(Number(v)+dRa).toFixed(7)}</TD>`).replace(/<TD>\+(24\.1\d+)<\/TD>/g,(_,v:string)=>`<TD>+${(Number(v)+dDec).toFixed(7)}</TD>`);
  const selection=selectVizierCatalog(readVizierCatalog(new TextEncoder().encode(xml),{catalog:'I/297',band:'R',epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5}),wholeSkySelection(21.5));
  const x=composeCameraExposure({camera:'ccd',opticalIndex:0,filterPosition:0,seconds:1,gain:1,centerRaHours:row.ra,centerDecDegrees:row.dec,seed:20261030},selection,[],field.objects);
  expect(x.fieldObjects).toMatchObject({tail:'catalog',tailDrawn:true,tailSaturatedAdmission:true});
  let top=-Infinity;for(const v of x.plane.pixels)if(v>top)top=v;const saturated=x.plane.pixels.filter(v=>v===top).length;
  const b=Buffer.alloc(x.plane.pixels.length*4);x.plane.pixels.forEach((v,i)=>b.writeFloatBE(v,i*4));
  expect({sha:createHash('sha256').update(b).digest('hex'),draws:x.drawsConsumed,saturated,top}).toEqual(PINNED);
 });
});
// Pinned from this branch's composition (closure M1): the 65,536 well clipped by the saturated tail star.
const PINNED={sha:'457c2573cff2091ebcef2c07866ca14559658bb38fa19725940455e3755493f2',draws:1053939,saturated:2766,top:65536};
