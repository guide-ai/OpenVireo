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
 test('L1: no certified pack is "not-certified"; a load failure is "failed"',async()=>{
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
