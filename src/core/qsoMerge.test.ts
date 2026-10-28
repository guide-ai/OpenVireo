import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import witnesses from '../../data/hubble/qso-merge-witnesses.json';
import {decodeQsoRecord,loadNativeQsoList,nativeQsoMerge,qsoPositionPredicate,QsoMergeError,QSO_CATALOG,type NativeQso} from './qsoMerge';
import {decodeFieldPack} from './fieldPack';
import {buildFieldPopulation,evaluateField,FieldEngineError} from './fieldEngine';
import {packWithPhotographs,parseGlimagesPositions} from './lssLists';
const file=(p:string)=>new Uint8Array(readFileSync(new URL('../../public/original/'+p,import.meta.url)));
const qsoBytes=file('catalogs/CLEA_QSO.DAT'),glx=file('catalogs/CLEA_GLX.DAT'),photos=parseGlimagesPositions(file('images/GLIMAGES.LST'));
const sha=(v:string|NodeJS.ArrayBufferView)=>createHash('sha256').update(v).digest('hex');
const qsoCatalog={bytes:qsoBytes,sha256:sha(qsoBytes)};
const pack=(f:number)=>packWithPhotographs(decodeFieldPack(JSON.parse(readFileSync(new URL(`../../data/lss/lss-field-0${f}.json`,import.meta.url),'utf8'))),photos);
const q=(id:string,ra:number,dec:number,magnitude:number):NativeQso=>({id,name:id,recordIndex:0,ra,dec,magnitude:Math.fround(magnitude),colorBV:0,colorUB:0,redshift:0,flags:[0,0],type:3,rawHex:''});
const s=(id:string,ra:number,dec:number,magnitude:number)=>({id,type:0,ra,dec,magnitude:Math.fround(magnitude)});
describe('QSO catalogue loader 0x5987e4 and predicate 0x59677c',()=>{
 it('reads the approved byte-exact catalogue: 2269 RA-sorted 52-byte records; records 1443 and 1656',()=>{
  expect(qsoBytes.byteLength).toBe(QSO_CATALOG.bytes);expect(sha(qsoBytes)).toBe(QSO_CATALOG.sha256);
  const r=(i:number)=>decodeQsoRecord(qsoBytes.subarray(i*52,i*52+52),i);
  expect(r(1443)).toMatchObject({name:'CSO  786',ra:13.01688888888889,dec:28.329166666666666,magnitude:Math.fround(17.4),type:3});
  expect(r(1656)).toMatchObject({name:'HS 1431+3144',ra:14.554444444444444,dec:31.523888888888887,magnitude:Math.fround(17.3)});
  for(let i=1;i<QSO_CATALOG.records;i++)expect(r(i).ra).toBeGreaterThanOrEqual(r(i-1).ra);
  expect(()=>decodeQsoRecord(new Uint8Array(51),0)).toThrow(QsoMergeError);
 });
 it('predicate: inclusive bounds, ordered-scan stop past maxRA, wrapping areas',()=>{
  const a={minimumRa:1,maximumRa:2,minimumDec:-1,maximumDec:1};
  expect(qsoPositionPredicate(a,1,1)).toEqual([true,false]);expect(qsoPositionPredicate(a,2,-1)).toEqual([true,false]);expect(qsoPositionPredicate(a,2.0000001,0)).toEqual([false,true]);expect(qsoPositionPredicate(a,.5,0)).toEqual([false,false]);expect(qsoPositionPredicate(a,1.5,1.1)).toEqual([false,false]);
  const w={minimumRa:23.9,maximumRa:.1,minimumDec:-1,maximumDec:1};
  expect(qsoPositionPredicate(w,.05,0)).toEqual([true,false]);expect(qsoPositionPredicate(w,.2,0)).toEqual([false,true]);expect(qsoPositionPredicate(w,23.95,0)).toEqual([true,false]);expect(qsoPositionPredicate(w,12.5,0)).toEqual([false,false]);
 });
 it('scans from record 0 and stops after the first record past maxRA',()=>{
  const l=loadNativeQsoList(qsoBytes,{minimumRa:12.98,maximumRa:13.03,minimumDec:28,maximumDec:28.5});
  expect(l.qsos.map(x=>x.recordIndex)).toContain(1443);expect(decodeQsoRecord(qsoBytes.subarray((l.recordsRead-1)*52,l.recordsRead*52),0).ra).toBeGreaterThan(13.03);
  expect(decodeQsoRecord(qsoBytes.subarray((l.recordsRead-2)*52,(l.recordsRead-1)*52),0).ra).toBeLessThanOrEqual(13.03);
 });
});
describe('QSO merge 0x597f90',()=>{
 const D=1/3600;
 it('no winner: walk from the head, insert after the last record with RA ≤ the QSO (ordered insert)',()=>{
  const stars=[s('a',1,0,10),s('b',2,0,10),s('c',3,0,10)];
  expect(nativeQsoMerge(stars,[q('Q',2.5,0,17)]).rows.map(r=>r.id)).toEqual(['a','b','Q','c']);
  expect(nativeQsoMerge(stars,[q('Q',9,0,17)]).rows.map(r=>r.id)).toEqual(['a','b','c','Q']);
  expect(nativeQsoMerge(stars,[q('Q',2,0,17)]).rows.map(r=>r.id)).toEqual(['a','b','Q','c']);// equal RA: after
 });
 it('a QSO west of the head is inserted after the head (native backward walk stops at the head)',()=>{
  const m=nativeQsoMerge([s('a',1,0,10),s('b',2,0,10)],[q('Q',.5,0,17)]);expect(m.rows.map(r=>r.id)).toEqual(['a','Q','b']);expect(m.witnesses[0]).toMatchObject({operation:'insert',position:1,winnerId:null});
 });
 it('replaces the winner strictly inside 30″ within 1 mag; at or beyond 30″ it inserts from the winner',()=>{
  const cosd=Math.cos(0);
  const near=nativeQsoMerge([s('a',1,0,10),s('b',1+20*D/15,0,17.2),s('c',3,0,10)],[q('Q',1,0,17)]);
  expect(near.rows.map(r=>r.id)).toEqual(['a','Q','c']);expect(near.witnesses[0]).toMatchObject({operation:'replace',replacedId:'b',winnerId:'b'});
  const far=nativeQsoMerge([s('a',1,0,10),s('b',1+40*D/15/cosd,0,17.2),s('c',3,0,10)],[q('Q',1,0,17)]);
  expect(far.rows.map(r=>r.id)).toEqual(['a','Q','b','c']);expect(far.witnesses[0]).toMatchObject({operation:'insert',winnerId:'b'});
  // Outside 1 mag no winner can be chosen, however close.
  expect(nativeQsoMerge([s('a',1,0,10),s('b',1,0,18.5),s('c',3,0,10)],[q('Q',1,0,17)]).rows.map(r=>r.id)).toEqual(['a','b','Q','c']);
 });
 it('runner pruning (two nearest ≤ 0.006° apart) deletes the runner before the walk; the saved index is not repaired',()=>{
  // Runner c before winner d: after deleting c, GetAt(savedIndex) resolves to the record after d.
  const m=nativeQsoMerge([s('a',1,0,10),s('c',1+50*D/15,0,17),s('d',1+45*D/15,0,17),s('e',3,0,10)],[q('Q',1,0,17)]);
  expect(m.witnesses[0]).toMatchObject({removedRunner:'c',winnerId:'d',operation:'insert'});expect(m.rows.map(r=>r.id)).not.toContain('c');
 });
 it('unsupported native paths are typed: empty star list',()=>{
  expect(()=>nativeQsoMerge([],[q('Q',1,0,17)])).toThrow(QsoMergeError);
 });
});
describe('field engine qso option',()=>{
 it("'gate' is the default and keeps the qso-merge reason; 'merge' needs the approved catalogue",()=>{
  const p=pack(3),at={ra:12.99311111111111,dec:27.959722222222222};
  expect(evaluateField(p,glx,at,0).reasons).toEqual(['qso-merge']);
  expect(()=>evaluateField(p,glx,at,0,{qso:'merge'})).toThrow(FieldEngineError);
  expect(()=>evaluateField(p,glx,at,0,{qso:'merge',qsoCatalog:{bytes:qsoBytes,sha256:'0'.repeat(64)}})).toThrow(FieldEngineError);
  const tampered=qsoBytes.slice();tampered[1443*52+0x13]^=1;expect(()=>evaluateField(p,glx,at,0,{qso:'merge',qsoCatalog:{bytes:tampered,sha256:qsoCatalog.sha256}})).toThrow(FieldEngineError);
 });
 it('reproduces the independent Python witnesses for every modelled LSS pointing and the Coma centres',()=>{
  const packs=new Map<number,ReturnType<typeof pack>>();for(let f=1;f<=9;f++)packs.set(f,pack(f));
  let checked=0;
  for(const w of witnesses.pointings){
   const p=[...packs.values()].find(x=>x.pointings.some(pt=>pt.ra===w.pointing.ra&&pt.dec===w.pointing.dec));if(!p)continue;
   const {population,reasons}=buildFieldPopulation(p,glx,w.pointing,{qso:'merge',qsoCatalog});
   expect(population!.qsoMatches.map(i=>`CLEA_QSO.DAT@${i}`)).toEqual(w.qso);
   if(!w.modelled)continue;// a variable in the area: its stage is covered by the existing witnesses
   expect(reasons.filter(r=>r!=='axis-fallback'&&r!=='photographic-image')).toEqual([]);
   expect(population!.qsoStage!.recordsRead).toBe(w.qsoRecordsRead);
   expect(population!.qsoStage!.witnesses.map(x=>[x.qso,x.operation,x.operation==='replace'?x.replacedId:x.position])).toEqual(w.qsoOperations);
   expect(population!.stars).toHaveLength(w.finalStars!);expect(sha(population!.stars.map(x=>x.id).join(','))).toBe(w.finalStarIdsSHA256);
   expect(population!.galaxies.map(g=>g.recordIndex)).toEqual(w.galaxies);expect(population!.mergeWitnesses.filter(x=>x.galaxyDeleted).map(x=>x.galaxy)).toEqual(w.deletedGalaxies);
   checked++;
  }
  expect(checked).toBe(witnesses.pointings.filter(w=>w.modelled&&!w.label.startsWith('GLX@1765')).length);
 },300000);
});
