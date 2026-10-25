import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';
import {pulsarPickerCursor,pulsarSeedFromBuffer} from './radioPulsarList';
import {CLOCK_REASSOCIATE_LIMIT,RECEIVER_OPEN_LIMIT,selectNearestPulsar} from './radioPulsarSelect';
import {INITIAL_RADIO_SOURCE_BUFFER,type RadioSourceBuffer} from './radioReceiver';

// [W] contract checks of the shared list cursor (PP-11) and the live-buffer seed (WEB-PP-ACT-01, WEB-PP-FIND-04). Synthetic
// records only. The reference below is a plain data-structure transliteration of the list helpers 0x492628..0x4926db and
// 0x492710/0x49271c (list-cursor.asm, list-predicates.asm) and of the picker's loops 0x562868..0x562924
// (pulsar-select-canonical.asm): it is not CPU or x87 emulation and not a native oracle.
type RefNode={next:RefNode|null;prev:RefNode|null;value:number};
class RefList{
 idx=-1;head:RefNode|null=null;tail:RefNode|null=null;cursor:RefNode|null=null;last=-1;// +0, +8, +0xc, +0x10, +4
 constructor(n:number){let prev:RefNode|null=null;for(let v=0;v<n;v++){const node:RefNode={next:null,prev,value:v};if(prev)prev.next=node;else this.head=node;prev=node;}this.tail=prev;this.last=n-1;}
 /** 0x492628 */ reset(){this.cursor=null;this.idx=-1;}
 /** 0x492634 */ next():number|null{
  if(this.cursor){this.cursor=this.cursor.next;this.idx++;}else{this.cursor=this.head;this.idx=0;}
  if(this.cursor)return this.cursor.value;this.idx=-1;return null;
 }
 /** 0x492668 */ prior():number|null{if(this.cursor){this.cursor=this.cursor.prev;this.idx--;}return this.cursor?this.cursor.value:null;}
 /** 0x492710 */ atHead(){return this.cursor===this.head;}
 /** 0x49271c */ atTail(){return this.cursor===this.tail;}
 /** 0x492688 */ goTo(index:number):number|null{
  if(index>this.last||index<0)return null;
  if(index===this.idx)return this.cursor!.value;
  if(this.idx<index){do this.next();while(index!==this.idx);}
  else{do this.prior();while(index!==this.idx);}
  return this.cursor?this.cursor.value:null;
 }
}
/** The picker's cursor movement (its selection is selectNearestPulsar): Reset; loop 1 Next/setb/AtTail; Prior; loop 2 Next/ja/AtTail. */
function refPicker(list:RefList,catalog:PulsarCatalog,ra:number){
 const gap=(i:number)=>Math.abs(ra-catalog[i].ra),span=Math.fround(1);
 list.reset();
 let inside=false;
 for(;;){const v=list.next()!;inside=gap(v)<span||Number.isNaN(gap(v));if(inside||list.atTail())break;}
 if(!inside)return;
 list.prior();
 for(;;){const v=list.next()!;if(gap(v)>span||list.atTail())break;}
}

const rec=(name:string,ra:number,dec=0,o:Partial<PulsarRecord>={}):PulsarRecord=>Object.freeze({primaryName:name,legacyName:`L${name}`,ra,dec,x2a:0.5,x34:0,x3e:2451545,
 s48:Math.fround(30),s4c:Math.fround(10),s50:Math.fround(5),s54:Math.fround(8),s58:Math.fround(4),s5c:Math.fround(2),...o});
const cat=(...r:PulsarRecord[]):PulsarCatalog=>Object.freeze(r);
const cursorFor=(c:PulsarCatalog,ra:number)=>{const l=new RefList(c.length);refPicker(l,c,ra);return l.idx;};
const both=(c:PulsarCatalog,ra:number,dec=0)=>{const ref=cursorFor(c,ra),port=pulsarPickerCursor(c,{ra,dec});expect(port,`ra ${ra}`).toBe(ref);return port;};

describe('reference list helpers (0x492628..0x4926db)',()=>{
 it('Next from nil goes to the head, past the tail gives nil and −1; Prior from the head gives nil; GoTo walks and keeps out-of-range',()=>{
  const l=new RefList(3);
  expect([l.next(),l.idx,l.atHead()]).toEqual([0,0,true]);
  expect([l.next(),l.next(),l.idx,l.atTail()]).toEqual([1,2,2,true]);
  expect([l.next(),l.idx]).toEqual([null,-1]);
  l.reset();l.next();expect([l.prior(),l.idx]).toEqual([null,-1]);
  l.reset();l.next();l.next();l.next();// tail
  expect([l.goTo(0),l.idx,l.atHead()]).toEqual([0,0,true]);// walks back with Prior
  expect([l.goTo(5),l.idx]).toEqual([null,0]);expect([l.goTo(-1),l.idx]).toEqual([null,0]);// out of range: nil, cursor unchanged
  expect([l.goTo(0),l.idx]).toEqual([0,0]);expect([l.goTo(2),l.atTail()]).toEqual([2,true]);
 });
});

describe('picker end cursor pulsarPickerCursor (0x562830)',()=>{
 it('no in-window record leaves the cursor on the tail; a run ends at the first |ΔRA| > 1 h record or at the tail',()=>{
  expect(both(cat(rec('a',5),rec('b',9),rec('c',12)),20)).toBe(2);
  expect(both(cat(rec('a',1),rec('b',5.5),rec('c',6.2),rec('d',8),rec('e',9)),6)).toBe(3);// loop 2 stops on d (evaluated, outside)
  expect(both(cat(rec('a',1),rec('b',5.5),rec('c',6.2)),6)).toBe(2);// run reaches the tail
  expect(both(cat(rec('h',6),rec('x',12)),6)).toBe(1);// head match, then x is outside
  expect(both(cat(rec('only',6)),6)).toBe(0);expect(both(cat(rec('only',20)),6)).toBe(0);// one record
 });
 it('NaN counts as inside for loop 1 and continues loop 2; |ΔRA| = 1 exactly is outside for loop 1 and continues loop 2',()=>{
  expect(both(cat(rec('a',20),rec('n',Number.NaN),rec('b',6.5),rec('c',30)),6)).toBe(3);
  expect(both(cat(rec('e',7),rec('f',9)),6)).toBe(1);// 1 h exactly: not inside, so no run: tail
  expect(both(cat(rec('in',6.5),rec('eq',7),rec('out',9),rec('z',9)),6)).toBe(2);// equality continues loop 2
 });
 it('only the first run counts: the cursor never reaches a later in-window run',()=>{
  expect(both(cat(rec('a',6),rec('b',12),rec('c',6.1),rec('d',6.2)),6)).toBe(1);
 });
 it('does not depend on the limit: the same end for Open (2.0) and the clock (5.0), while the selection may differ',()=>{
  const c=cat(rec('near',6,3),rec('far',6.4,0),rec('out',10));
  expect(selectNearestPulsar(c,{ra:6,dec:0},RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(selectNearestPulsar(c,{ra:6,dec:0},CLOCK_REASSOCIATE_LIMIT)?.index).toBe(0);
  expect(pulsarPickerCursor(c,{ra:6,dec:0})).toBe(2);// one function, no limit input
 });
 it('null (Ready = 0) and an empty array leave the cursor untouched',()=>{
  expect(pulsarPickerCursor(null,{ra:0,dec:0})).toBeNull();expect(pulsarPickerCursor(cat(),{ra:0,dec:0})).toBeNull();
 });
 it('matches the reference on 400 seeded random catalogs (in-test LCG)',()=>{
  let x=20261025;const rnd=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/2**32);
  for(let k=0;k<400;k++){
   const n=1+Math.floor(rnd()*12),rows:PulsarRecord[]=[];
   for(let i=0;i<n;i++){const u=rnd();rows.push(rec(`r${i}`,u<0.05?Number.NaN:u<0.15?Math.round(rnd()*4)+4:rnd()*24,rnd()*60-30));}
   both(cat(...rows),Math.round(rnd()*48)/2,rnd()*40-20);
  }
 });
 it('is not a global nearest search: file order, the first in-window run and no RA wrap decide hit, miss and cursor',()=>{
  const at={ra:6,dec:0};
  const unsorted=cat(rec('A',6.5),rec('B',12),rec('C',6));// C sits exactly on the pointing, after an outside record
  expect(selectNearestPulsar(unsorted,at,RECEIVER_OPEN_LIMIT)).toBeNull();expect(pulsarPickerCursor(unsorted,at)).toBe(1);
  const near=cat(rec('A',6.1),rec('B',12),rec('C',6));// A is inside the limit (1.5°) but C (0°) is nearer
  const hit=selectNearestPulsar(near,at,RECEIVER_OPEN_LIMIT);
  expect([hit?.index,hit?.record.primaryName]).toEqual([0,'A']);expect(pulsarPickerCursor(near,at)).toBe(1);
  const wrap=cat(rec('W',23+59/60+50/3600)),past={ra:10/3600,dec:0};// 20 s of RA across 0 h: |ΔRA| ≈ 24 h, no wrap
  expect(selectNearestPulsar(wrap,past,RECEIVER_OPEN_LIMIT)).toBeNull();expect(selectNearestPulsar(wrap,past,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
  expect(pulsarPickerCursor(wrap,past)).toBe(0);// the tail
 });
 it('GoTo restores a saved index from the tail (the Find miss): cursor and pointer return together',()=>{
  const l=new RefList(5);l.reset();l.next();l.next();const saved=l.idx;// cursor at record 1
  l.reset();while(l.next()!==null&&!l.atTail());// a scan that ends on the tail
  expect(l.atTail()).toBe(true);
  const pointer=l.goTo(saved);expect([pointer,l.idx]).toEqual([1,1]);
 });
});

describe('live-buffer seed (WEB-PP-ACT-01, WEB-PP-FIND-04)',()=>{
 const A=rec('J0600+10',6);
 const hit:RadioSourceBuffer=Object.freeze({record:A,primaryNameCleared:false});
 const cleared:RadioSourceBuffer=Object.freeze({record:Object.freeze({...A,primaryName:''}),primaryNameCleared:true});
 it('a never-written or cleared buffer gives no seed, so the stale B1950 name is never used; a hit gives both names',()=>{
  expect(pulsarSeedFromBuffer(null)).toBeNull();expect(pulsarSeedFromBuffer(INITIAL_RADIO_SOURCE_BUFFER)).toBeNull();
  expect(pulsarSeedFromBuffer(cleared)).toBeNull();expect(cleared.record!.legacyName).toBe('LJ0600+10');
  const s=pulsarSeedFromBuffer(hit);expect(s).toEqual({primaryName:'J0600+10',legacyName:'LJ0600+10'});expect(Object.isFrozen(s)).toBe(true);
 });
 it('never mutates its inputs and imports only types plus the picker constants',()=>{
  const c=cat(rec('a',1),rec('b',6)),snap=JSON.stringify(c);pulsarPickerCursor(c,{ra:6,dec:0});pulsarSeedFromBuffer(hit);
  expect(JSON.stringify(c)).toBe(snap);
  const source=readFileSync(new URL('./radioPulsarList.ts',import.meta.url),'utf8');
  const imports=[...source.matchAll(/^import (type )?.* from '([^']+)';$/gm)].map(m=>[m[1]?'type':'value',m[2]]);
  expect(imports).toEqual([['type','./radioAntenna'],['type','./radioPulsarCatalog'],['type','./radioPulsarParameters'],['type','./radioReceiver'],['value','./radioPulsarSelect']]);
 });
});
