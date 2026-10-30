import {createHash} from 'node:crypto';
import {composeCameraExposure} from '../core/cameraExposure';
import {readVizierCatalog,selectVizierCatalog,wholeSkySelection} from '../core/vizierNomad';
import {readFileSync} from 'node:fs';
import {afterEach,describe,expect,test} from 'vitest';
import {setFieldInfoResources} from '../io/fieldInfoPacks';
import {loadLssPack} from '../io/lssPack';
import {LSS_ROWS} from '../core/lssFields';
import {cameraFieldInputs,ccdFilterByte,setCcdFilterByte} from './cameraFieldInputs';

const f=(p:string)=>new Uint8Array(readFileSync(p));
const snapFile=(id:string)=>`data/hubble/${id==='36773'?'pinned-galaxy-field':id==='pegasus'?'pinned-pegasus-field':`pinned-galaxy-${id}-field`}.json`;
const resources=()=>({snapshot:async(id:string)=>JSON.parse(readFileSync(snapFile(id),'utf8')),engine:async(id:string)=>JSON.parse(readFileSync(`data/hubble/engine-${id}.json`,'utf8')),lss:loadLssPack,
 glx:async()=>f('public/original/catalogs/CLEA_GLX.DAT'),qso:async()=>({bytes:f('public/original/catalogs/CLEA_QSO.DAT'),sha256:'69ecc5bf1aea34a40507de326d39ee47d23c810d49baa53d5732c064edef90b5'}),glimages:async()=>f('public/original/images/GLIMAGES.LST')});
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
 test('L1: no certified pack is "not-certified"; a load failure is "failed" (a blocking reason is "blocked")',async()=>{
  setFieldInfoResources(resources());
  expect((await cameraFieldInputs({ra:3,dec:-40},2455000.5,0)).status).toBe('not-certified');
  const row=LSS_ROWS.find(r=>r.id==='NGC 5924')!;
  setFieldInfoResources({...resources(),glx:async()=>{throw new Error('offline');}});
  expect(await cameraFieldInputs({ra:row.ra,dec:row.dec},2455000.5,0)).toEqual({status:'failed',objects:null});
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
