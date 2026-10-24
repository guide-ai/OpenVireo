import {describe,expect,it} from 'vitest';
import type {PulsarCatalog,PulsarRecord} from './radioPulsarCatalog';
import {CLOCK_REASSOCIATE_LIMIT,INITIAL_RECEIVER_SOURCE,PULSAR_SELECT_CONSTANTS,RECEIVER_OPEN_LIMIT,associateReceiverSource,pulsarSeparation,selectNearestPulsar} from './radioPulsarSelect';

// Synthetic records only (no original catalog rows). The reference below is a source-level transliteration of the
// listing's control flow, not an x86/x87 interpreter and not a native oracle; it checks the array port against it.
const rec=(primaryName:string,ra:number,dec=0):PulsarRecord=>Object.freeze({primaryName,legacyName:'',ra,dec,x2a:1,x34:0,x3e:2400000,s48:0,s4c:0,s50:0,s54:0,s58:0,s5c:0});
const cat=(...rows:readonly PulsarRecord[]):PulsarCatalog=>Object.freeze(rows);

/** 0x562830 over a doubly linked list built by 0x492574 (insert after cursor, cursor := new node), with Reset
 * 0x492628, Next 0x492634, Prior 0x492668 and AtTail 0x49271c as captured. Returns the node's file index. */
function listingReference(catalog:PulsarCatalog|null,ra:number,dec:number,limit:number):{index:number;separation:number}|null{
 if(catalog===null)return null;// Ready (+0x4c) = 0 → 0x562841
 type Node={v:number;prev:Node|null;next:Node|null};
 let head:Node|null=null,tail:Node|null=null,cursor:Node|null=null;
 for(let v=0;v<catalog.length;v++){
  if(!cursor){const n:Node={v,prev:null,next:head};if(head)head.prev=n;else tail=n;head=n;cursor=n;continue;}// 0x492528
  const c:Node=cursor,n:Node={v,prev:c,next:c.next};if(c.next)c.next.prev=n;if(tail===c)tail=n;c.next=n;cursor=n;
 }
 const reset=()=>{cursor=null;};
 const next=()=>{cursor=cursor?cursor.next:head;return cursor?cursor.v:null;};
 const prior=()=>{if(cursor)cursor=cursor.prev;return cursor?cursor.v:null;};
 const atTail=()=>cursor===tail;
 const T=Math.fround(1),abs=(i:number)=>Math.abs(ra-catalog[i].ra);
 let best:number|null=null,L=limit;// [ebp-0x20] := limit, [ebp-0x14] := nil
 reset();
 let i:number,inside:boolean;
 do{i=next()!;inside=abs(i)<T||Number.isNaN(abs(i));}while(!inside&&!atTail());// fcomp; setb bl
 if(!inside)return null;
 prior();
 do{
  i=next()!;
  const sep=pulsarSeparation(catalog[i],{ra,dec});
  if(!(L<=sep||Number.isNaN(sep)||Number.isNaN(L))){L=sep;best=i;}// fcompp ST0=L, ST1=sep; jbe skips
  if(abs(i)>T)break;// ja 0x562918
 }while(!atTail());
 return best===null?null:{index:best,separation:L};
}
function both(catalog:PulsarCatalog|null,ra:number,dec:number,limit:number){
 const port=selectNearestPulsar(catalog,{ra,dec},limit),ref=listingReference(catalog,ra,dec,limit);
 expect(port===null?null:{index:port.index,separation:port.separation}).toEqual(ref);
 if(port)expect(port.record).toBe(catalog![port.index]);
 return port;
}

describe('pulsar separation (0x562950)',()=>{
 it('divides the RA term by Cos(pointing Dec) instead of multiplying',()=>{
  const s=pulsarSeparation(rec('A',1.1,60),{ra:1,dec:60});
  expect(s).toBeCloseTo(3,12);// (−0.1 h × 15) / cos 60° = −3 deg; multiplication would give 0.75
  expect(pulsarSeparation(rec('B',1,62),{ra:1,dec:60})).toBe(2);
  expect(PULSAR_SELECT_CONSTANTS).toEqual({raWindowHours:1,hoursToDegrees:15,degreesToRadians:0.017453292519943295});
 });
 it('grows without bound near the poles and is NaN for NaN input',()=>{
  expect(pulsarSeparation(rec('A',0.01,89.99),{ra:0,dec:90})).toBeGreaterThan(1e15);
  expect(pulsarSeparation(rec('A',0,89.99),{ra:0,dec:90})).toBeCloseTo(0.01,10);
  expect(pulsarSeparation(rec('A',0,0),{ra:Number.NaN,dec:0})).toBeNaN();
 });
});

describe('nearest pulsar picker (0x562830) against the linked-list reference',()=>{
 it('finds a match at the head (Prior gives nil, Next gives the head) and at the tail',()=>{
  expect(both(cat(rec('H',5,1),rec('F',9)),5,0,RECEIVER_OPEN_LIMIT)?.index).toBe(0);
  expect(both(cat(rec('F',1),rec('G',9),rec('T',12.1,0.5)),12,0,RECEIVER_OPEN_LIMIT)?.index).toBe(2);
 });
 it('returns null with no in-window record or no record under the limit',()=>{
  expect(both(cat(rec('A',1),rec('B',3)),6,0,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
  expect(both(cat(rec('A',6,10)),6,0,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
 });
 it('searches only the first in-window run, in file order',()=>{
  const c=cat(rec('first',5,1.5),rec('break',10),rec('closer',5,0.1));
  expect(both(c,5,0,RECEIVER_OPEN_LIMIT)?.record.primaryName).toBe('first');
 });
 it('evaluates the record that ends the run, so a wide limit can pick it',()=>{
  const c=cat(rec('in',5,500),rec('out',7,0));// out: |ΔRA| = 2 h > 1 h, sep = 30
  expect(both(c,5,0,1000)).toMatchObject({index:1,separation:30});
  expect(both(c,5,0,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
 });
 it('treats |ΔRA| = 1 h as outside for the first match but continues the run on it',()=>{
  expect(both(cat(rec('edge',6)),5,0,100)).toBeNull();
  const c=cat(rec('a',5,1.9),rec('edge',6,0),rec('c',5,0.5));
  expect(both(c,5,0,RECEIVER_OPEN_LIMIT)?.record.primaryName).toBe('c');
 });
 it('does not select a separation equal to the limit',()=>{
  expect(both(cat(rec('A',3,2)),3,0,RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(both(cat(rec('A',3,1.5)),3,0,RECEIVER_OPEN_LIMIT)?.separation).toBe(1.5);
 });
 it('keeps the earlier record on a tie, duplicates included',()=>{
  expect(both(cat(rec('up',3,1),rec('down',3,-1)),3,0,RECEIVER_OPEN_LIMIT)?.index).toBe(0);
  const dup=cat(rec('X',0),rec('1927+18',3,0.25),rec('Y',3.2,1.9),rec('1927+18',3,0.25));
  expect(both(dup,3,0,RECEIVER_OPEN_LIMIT)?.index).toBe(1);
 });
 it('passes the window but selects nothing for NaN pointing or limit',()=>{
  const c=cat(rec('A',3),rec('B',20));
  expect(both(c,Number.NaN,0,RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(both(c,3,Number.NaN,RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(both(c,3,0,Number.NaN)).toBeNull();
 });
 it('does not wrap RA at 0/24 h',()=>{
  expect(both(cat(rec('A',0.05)),23.9,0,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
  expect(both(cat(rec('A',23.95)),0.02,0,CLOCK_REASSOCIATE_LIMIT)).toBeNull();
 });
 it('gives a huge separation at Dec ±90 unless ΔRA is exactly zero',()=>{
  expect(both(cat(rec('A',0.01,89.99)),0,90,RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(both(cat(rec('A',0,-89.5)),0,-90,RECEIVER_OPEN_LIMIT)?.index).toBe(0);
 });
 it('returns null for a null catalog (not Ready) and, as a web guard, an empty one',()=>{
  expect(both(null,0,0,RECEIVER_OPEN_LIMIT)).toBeNull();
  expect(selectNearestPulsar(cat(),{ra:0,dec:0},RECEIVER_OPEN_LIMIT)).toBeNull();
 });
 it('matches the reference on deterministic pseudo-random catalogs',()=>{
  let seed=0x2f6e2b1;const rnd=()=>((seed=(Math.imul(seed,1103515245)+12345)>>>0)/2**32);
  for(let n=0;n<400;n++){
   const rows=Array.from({length:1+Math.floor(rnd()*12)},(_,i)=>rec(String(i),Math.round(rnd()*48)/2,Math.round(rnd()*40-20)/4));
   if(rnd()<0.2)rows.push(rows[Math.floor(rnd()*rows.length)]);
   both(cat(...rows),Math.round(rnd()*48)/2,Math.round(rnd()*40-20)/4,[RECEIVER_OPEN_LIMIT,CLOCK_REASSOCIATE_LIMIT,30][n%3]);
  }
 });
});

describe('receiver source association (0x56575d..0x5657c4)',()=>{
 const c=cat(rec('A',3,0.5),rec('B',10,0));
 it('stores an owned frozen copy and the separation on a hit',()=>{
  const s=associateReceiverSource(INITIAL_RECEIVER_SOURCE,c,{ra:3,dec:0},CLOCK_REASSOCIATE_LIMIT);
  expect(s.offset).toBe(0.5);expect(s.source).toEqual(c[0]);expect(s.source).not.toBe(c[0]);
  expect(Object.isFrozen(s)).toBe(true);expect(Object.isFrozen(s.source)).toBe(true);
 });
 it('clears the source and keeps the previous offset on a miss',()=>{
  const hit=associateReceiverSource(INITIAL_RECEIVER_SOURCE,c,{ra:10,dec:1.25},CLOCK_REASSOCIATE_LIMIT);
  const miss=associateReceiverSource(hit,c,{ra:6,dec:0},CLOCK_REASSOCIATE_LIMIT);
  expect(miss).toEqual({source:null,offset:1.25});
  expect(associateReceiverSource(miss,null,{ra:10,dec:0},CLOCK_REASSOCIATE_LIMIT)).toEqual({source:null,offset:1.25});
  expect(associateReceiverSource(INITIAL_RECEIVER_SOURCE,c,{ra:6,dec:0},RECEIVER_OPEN_LIMIT)).toEqual({source:null,offset:null});
 });
 it('returns new objects on every call and never shares the catalog record',()=>{
  const a=associateReceiverSource(INITIAL_RECEIVER_SOURCE,c,{ra:3,dec:0},RECEIVER_OPEN_LIMIT),b=associateReceiverSource(a,c,{ra:3,dec:0},RECEIVER_OPEN_LIMIT);
  expect(a).not.toBe(b);expect(a.source).not.toBe(b.source);expect(a).toEqual(b);
  expect(Object.isFrozen(c[0])).toBe(true);expect(INITIAL_RECEIVER_SOURCE).toEqual({source:null,offset:null});
 });
});
