import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import controls from './ephemeris.controls.json';
import {OrbitFileError,findOrbitRecord,orbitRecordCount,readOrbitRecord,orbitRecordLabel} from './orbitFile';

const load=(name:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/orbit/${name}`,import.meta.url)));
const files={'ObjX_MPC.CMO':load('ObjX_MPC.CMO'),'ObjX_AST.CMO':load('ObjX_AST.CMO')} as const;
const code=(f:()=>unknown)=>{try{f();}catch(error){return error instanceof OrbitFileError?error.code:'other';}return 'none';};

describe('CMO orbit files (162-byte records)',()=>{
 it('holds whole records: 191293 in ObjX_MPC.CMO and 29323 in ObjX_AST.CMO',()=>{
  expect(orbitRecordCount(files['ObjX_MPC.CMO'])).toBe(191293);
  expect(orbitRecordCount(files['ObjX_AST.CMO'])).toBe(29323);
 });
 it.each(controls.records.filter(c=>c.file!=='synthetic'))('decodes $file record $record.name like the independent Python decoder',c=>{
  const bytes=files[c.file as keyof typeof files],r=readOrbitRecord(bytes,c.record.index);
  expect([r.name,r.number,r.prefix,r.epochJd,r.centralBody,r.magnitudeModel,r.h,r.g]).toEqual([c.record.name,c.record.number,c.record.prefix,c.record.epoch,c.record.body,c.record.model,c.record.h,c.record.g]);
  expect([...r.position]).toEqual(c.record.pos);expect([...r.velocity]).toEqual(c.record.vel);
  expect([r.frame.type,r.frame.sub,r.frame.tag,r.frame.equinoxJd]).toEqual(c.record.frame);
  expect(r.flags).toEqual(c.record.flags);
 });
 it('decodes every record of both files with the J2000 frame header, the Sun as centre and the H,G model',()=>{
  for(const bytes of Object.values(files)){
   const n=orbitRecordCount(bytes);let bad=0;
   for(let i=0;i<n;i++){const r=readOrbitRecord(bytes,i);if(r.frame.type!==2||r.frame.sub!==0||r.frame.tag!==1||r.frame.equinoxJd!==2451545||r.centralBody!==0||r.magnitudeModel!==1||!r.name)bad++;}
   expect(bad).toBe(0);
  }
 },60_000);
 it('finds the three Object X movers by number and keeps MPC name padding apart from the display name',()=>{
  const mpc=files['ObjX_MPC.CMO'];
  expect(['433','134340','136617'].map(n=>orbitRecordLabel(mpc,findOrbitRecord(mpc,{number:n})!).name)).toEqual(['Eros','Pluto','1994 CC']);
  expect(readOrbitRecord(mpc,0).rawName).toBe('Ceres              ');
  expect(findOrbitRecord(files['ObjX_AST.CMO'],{name:'Eros'})).toBe(432);
  expect(findOrbitRecord(mpc,{number:'no such'})).toBeNull();
 });
 it('rejects partial records, bad indices, overlong strings and invalid Extended values with typed errors',()=>{
  const one=files['ObjX_MPC.CMO'].slice(0,162);
  expect(code(()=>orbitRecordCount(one.subarray(0,161)))).toBe('layout');
  expect(code(()=>orbitRecordCount(new Uint8Array(0)))).toBe('size');
  expect(code(()=>readOrbitRecord(one,1))).toBe('index');
  const longName=one.slice();longName[1]=41;expect(code(()=>readOrbitRecord(longName,0))).toBe('text');
  const nan=one.slice();nan[0x33+9]=0x7f;nan[0x33+8]=0xff;expect(code(()=>readOrbitRecord(nan,0))).toBe('number');
  const unnormal=one.slice();unnormal[0x33+7]&=0x7f;expect(code(()=>readOrbitRecord(unnormal,0))).toBe('number');
 });
});
