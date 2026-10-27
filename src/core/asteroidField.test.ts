import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {DEFAULT_LIMITING_MAGNITUDE,FIELD_BOX_DEGREES,asteroidLabel,buildObservableList,movingPairs,newObservableScan,oppositionRaHours,orbitFileType,raInWindow,scanObservable,finishObservableList} from './asteroidField';
import {ORBIT_RECORD_BYTES,findOrbitRecord} from './orbitFile';
import {separationDegrees} from './ephemeris';

const sav=new Uint8Array(readFileSync('public/original/orbit/ObjX_MPC.CMO.sav'));
/** Original Object X default: 2009/06/01 04:00:00 UT (TUTTimeDlg 0x4fde9c/0x4fdeb0). */
const JD=2454983.5+4/24;
const EROS={ra:22.722017,dec:-8.03989};

describe('asteroid list (0x519e94)',()=>{
 it('recognises the orbit-file type by name, as 0x519357',()=>{
  expect(orbitFileType('ObjX_AST.CMO')).toBe(0);
  expect(orbitFileType('orbit\\objx_mpc.cmo')).toBe(1);
  expect(orbitFileType('ObjX_MPC.CMO.sav')).toBe(1);
  expect(orbitFileType('MPCORB.CMO')).toBe(2);
  expect(buildObservableList(sav,2,JD)).toBeNull();
 });
 it('labels "(number) name", trimmed to 24 characters',()=>{
  expect(asteroidLabel({number:'433',name:'Eros'})).toBe('(433) Eros');
  expect(asteroidLabel({number:'',name:'2009 AB  '})).toBe('2009 AB');
  expect(asteroidLabel({number:'123456',name:'An exceptionally long name'})).toHaveLength(24);
 });
 it('puts the antisolar point 12 h from the Sun and tests RA windows with wrap',()=>{
  expect(oppositionRaHours(JD)).toBeGreaterThan(16.4);expect(oppositionRaHours(JD)).toBeLessThan(16.9);
  expect(raInWindow(23.5,22,2)).toBe(true);expect(raInWindow(1.5,22,2)).toBe(true);expect(raInWindow(3,22,2)).toBe(false);
 });
 it('keeps V ≤ 16 and (near-Earth flag or within ±3 h of opposition), sorted by RA, with no errors on the bundled file',()=>{
  const list=buildObservableList(sav,1,JD)!;
  expect(list.records).toBe(29618);expect(list.errors).toEqual([]);
  expect(list.entries.length).toBe(list.neaCount+list.oppositionCount);
  expect(list.entries.length).toBeGreaterThan(50);
  const opp=list.oppositionRaHours;
  for(const e of list.entries){
   expect(e.magnitude).toBeLessThanOrEqual(DEFAULT_LIMITING_MAGNITUDE);
   if(!e.nea){const d=Math.abs(((e.raHours-opp+36)%24)-12);expect(d).toBeLessThanOrEqual(3+1e-9);}
  }
  for(let i=1;i<list.entries.length;i++)expect(list.entries[i].raHours).toBeGreaterThanOrEqual(list.entries[i-1].raHours);
  const eros=list.entries.find(e=>e.label==='(433) Eros')!;
  expect(eros.nea).toBe(true);expect(eros.notes[0]).toBe(4);// MPC orbit type 4 = Amor
  expect(separationDegrees(eros.raHours,eros.decDeg,EROS.ra,EROS.dec)*3600).toBeLessThan(0.1);
 });
 it('splits the scan across chunks with the same result',()=>{
  const whole=buildObservableList(sav,1,JD)!,scan=newObservableScan();
  for(let i=0;i<29618;i+=7000)scanObservable(sav,1,JD,16,i,Math.min(29618,i+7000),scan);
  expect(finishObservableList(sav,1,JD,16,scan)).toEqual(whole);
 });
 it('skips a record whose ephemeris or decoding fails with a typed reason and continues (L5)',()=>{
  const eros=findOrbitRecord(sav,{number:'433'})!;
  const bytes=new Uint8Array(3*ORBIT_RECORD_BYTES);
  for(let k=0;k<3;k++)bytes.set(sav.subarray(eros*ORBIT_RECORD_BYTES,(eros+1)*ORBIT_RECORD_BYTES),k*ORBIT_RECORD_BYTES);
  bytes[0x79]=200;// record 0: unknown central body
  bytes[ORBIT_RECORD_BYTES+0x33+9]=0x7f;bytes[ORBIT_RECORD_BYTES+0x33+8]=0xff;// record 1: epoch is Inf/NaN
  const list=buildObservableList(bytes,1,JD)!;
  expect(list.errors.map(e=>[e.index,e.code])).toEqual([[0,'ephemeris'],[1,'record']]);
  expect(list.errors[0].reason).toBe('central-body');
  expect(list.entries.map(e=>e.index)).toEqual([2]);
 });
});

describe('moving pairs (ComputeMovers 0x59940c)',()=>{
 const list=buildObservableList(sav,1,JD)!;
 it('places Eros at T and T + exposure inside the field box, magnitude before the filter offset',()=>{
  const r=movingPairs(sav,list,EROS,JD,600);
  const eros=r.pairs.find(p=>p.label==='(433) Eros')!;
  expect(eros).toBeDefined();
  expect(eros.source.kind).toBe('pair');
  expect(eros.source.storedMag).toBe(eros.startMagnitude);
  expect(Math.fround(eros.source.storedMag)).toBe(eros.source.storedMag);
  const moved=separationDegrees(eros.source.raHours,eros.source.decDeg,eros.source.end.raHours,eros.source.end.decDeg)*3600;
  expect(moved).toBeGreaterThan(1);expect(moved).toBeLessThan(60);// ″ in 10 min
  for(const p of r.pairs)expect(separationDegrees(list.entries.find(e=>e.index===p.index)!.raHours,list.entries.find(e=>e.index===p.index)!.decDeg,EROS.ra,EROS.dec)).toBeLessThanOrEqual(FIELD_BOX_DEGREES);
  for(let i=1;i<r.pairs.length;i++)expect(r.pairs[i].startMagnitude).toBeGreaterThanOrEqual(r.pairs[i-1].startMagnitude);
  expect(r.errors).toEqual([]);
 });
 it('returns one position when the exposure is 0 s and nothing far from every entry',()=>{
  const r=movingPairs(sav,list,EROS,JD,0),eros=r.pairs.find(p=>p.label==='(433) Eros')!;
  expect(eros.source.end).toEqual({raHours:eros.source.raHours,decDeg:eros.source.decDeg});
  const empty=movingPairs(sav,{...list,entries:[]},EROS,JD,60);
  expect(empty.pairs).toEqual([]);expect(empty.candidates).toBe(0);
 });
});
