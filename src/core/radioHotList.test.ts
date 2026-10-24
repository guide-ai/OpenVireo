import {describe,expect,it} from 'vitest';
import {encodeHtlExtended,parseHtl,serializeHtl,updateHtlRecord,type HtlList} from './hotList';
import {htlRaKeys,nativeCursorInsertionOrder,radioHotListProjection} from './radioHotList';
import {orderNativeNomadEntries} from './nativeNomadOrder';

// Synthetic records only (no original HTL data). Expected orders were traced by hand against 0x492728/0x590398; they
// test the chosen implementation contract, not the native runtime.
const ext=(significand:bigint,signExponent:number)=>{const b=new Uint8Array(10),v=new DataView(b.buffer);v.setBigUint64(0,significand,true);v.setUint16(8,signExponent,true);return b;};
function record(id:string,ra:number|Uint8Array,dec=0){
 const b=new Uint8Array(86);b[0]=id.length;for(let i=0;i<id.length;i++)b[1+i]=id.charCodeAt(i);
 b.set(typeof ra==='number'?encodeHtlExtended(ra):ra,25);b.set(encodeHtlExtended(dec),35);return b;
}
const htl=(...rows:readonly (readonly [string,number|Uint8Array,number?])[]):HtlList=>{
 const bytes=new Uint8Array(rows.length*86);rows.forEach(([id,ra,dec],i)=>bytes.set(record(id,ra,dec),i*86));return parseHtl(bytes);
};
const ids=(list:HtlList)=>radioHotListProjection(list).rows.map(r=>r.record.id);
const sources=(list:HtlList)=>radioHotListProjection(list).rows.map(r=>r.sourceIndex);

/** Literal transliteration of 0x492728 over a doubly linked list with head/tail/cursor, independent of the array port.
 * greater(edx,ecx) restates 0x590398: fld [edx+0x19]; fld [ecx+0x19]; fcompp; setb → ST0 (ecx) < ST1 (edx). */
function listingReference(keys:readonly bigint[]):number[]{
 type Node={v:number;prev:Node|null;next:Node|null};
 let head:Node|null=null,tail:Node|null=null,cursor:Node|null=null;
 const greater=(edx:number,ecx:number)=>keys[ecx]<keys[edx];
 const insertHead=(v:number)=>{const n:Node={v,prev:null,next:head};if(head)head.prev=n;else tail=n;head=n;cursor=n;};// 0x492528
 const insertAfter=(v:number)=>{if(!cursor){insertHead(v);return;}const c:Node=cursor,n:Node={v,prev:c,next:c.next};if(c.next)c.next.prev=n;else tail=n;c.next=n;cursor=n;};// 0x492574
 for(let v=0;v<keys.length;v++){
  if(!head){insertAfter(v);continue;}// 0x492732 empty → 0x4927ee
  let c:Node=cursor??head;// 0x49273f..0x49274d
  if(greater(v,c.v)){// 0x49275e
   while(c!==tail&&!greater(c.v,v))c=c.next!;// 0x492770..0x492789, 0x492634
   if(greater(c.v,v))c=c.prev!;// 0x49278b..0x49279d, 0x492668
   cursor=c;insertAfter(v);
  }else{
   while(c!==head&&!greater(v,c.v))c=c.prev!;// 0x4927ad..0x4927c6
   cursor=c;
   if(c===head&&greater(c.v,v))insertHead(v);// 0x4927c8..0x4927e7
   else insertAfter(v);// 0x4927ee
  }
 }
 const out:number[]=[];for(let n=head as Node|null;n;n=n.next)out.push(n.v);return out;
}

describe('radio hot list RA projection (0x492728 + 0x590398)',()=>{
 it('follows the hand-traced cursor cases, ties included',()=>{
  expect(ids(htl(['A',1],['B',1],['C',1]))).toEqual(['A','C','B']);
  expect(sources(htl(['A',1],['B',1],['C',1]))).toEqual([0,2,1]);
  expect(ids(htl(['L',0],['A',1],['B',1]))).toEqual(['L','B','A']);
  expect(ids(htl(['B',1],['A',0],['C',1]))).toEqual(['A','B','C']);// from a lower cursor an equal key goes after the run
  expect(sources(htl(['L',0],['A',1],['H',2],['B',1]))).toEqual([0,3,1,2]);// from a higher cursor, before it
  expect(ids(htl(['L',0],['A',1],['H',2],['Z',0],['B',1]))).toEqual(['L','Z','A','B','H']);// head equality, then lower cursor
 });
 it('treats ±0 as equal (fcompp) and keeps them as distinct rows',()=>{
  expect(sources(htl(['P',0],['M',-0]))).toEqual([0,1]);
  const mixed=htl(['H',0.5],['M',-0],['P',0]);
  expect(ids(mixed)).toEqual(['M','P','H']);
  expect(Object.is(radioHotListProjection(mixed).rows[0].record.ra,-0)).toBe(true);
  expect(htlRaKeys(mixed)[1]).toBe(0n);expect(htlRaKeys(mixed)[2]).toBe(0n);
 });
 it('orders by the retained Extended RA, not by the decoded Number',()=>{
  const list=htl(['X',ext(0x8000000000000001n,0x3fff)],['Y',ext(0x8000000000000000n,0x3fff)]);
  expect(list[0].ra).toBe(1);expect(list[1].ra).toBe(1);
  expect(ids(list)).toEqual(['Y','X']);
  // Coordinator fixture names (values here are this test's own): Z, HIGH = 1 + 2^-63, LOW = 1, DUP = 1, MID.
  const fixture=htl(['Z',23.5],['HIGH',ext(0x8000000000000001n,0x3fff)],['LOW',1],['DUP',1],['MID',12]);
  expect(sources(fixture)).toEqual([2,3,1,4,0]);
 });
 it('never compares Dec and keeps identical duplicates as a bijection',()=>{
  expect(ids(htl(['A',1,5],['B',1,-5]))).toEqual(['A','B']);
  const dup=htl(['D',3,1],['D',3,1],['D',3,1],['E',2,0]);
  const order=sources(dup);expect([...order].sort()).toEqual([0,1,2,3]);expect(order).toEqual([3,0,2,1]);
 });
 it('memoizes by list identity and never changes the file-order list or its bytes',()=>{
  const list=htl(['C',3],['A',1],['B',2]),before=serializeHtl(list);
  const first=radioHotListProjection(list);
  expect(radioHotListProjection(list)).toBe(first);
  expect(first.list).toBe(list);expect(list.map(r=>r.id)).toEqual(['C','A','B']);
  expect(serializeHtl(list)).toEqual(before);
  expect(Object.isFrozen(first)&&Object.isFrozen(first.rows)&&Object.isFrozen(first.rows[0])).toBe(true);
  // A web edit is a new list: recomputed from its file order (bridge policy), not from the old projection.
  const edited=Object.freeze([...list,updateHtlRecord(null,{id:'Z',remarks:'',ra:0,dec:0})]);
  expect(radioHotListProjection(edited)).not.toBe(first);expect(ids(edited)).toEqual(['Z','A','B','C']);
  expect(radioHotListProjection(Object.freeze([]) as HtlList).rows).toEqual([]);
 });
 it('matches the linked-list transliteration exhaustively for short lists and the accepted NOMAD port on RA-only keys',()=>{
  const values=[0n,1n,2n];
  for(let n=0;n<=7;n++)for(let code=0;code<3**n;code++){
   const keys:bigint[]=[];for(let i=0,c=code;i<n;i++,c=Math.floor(c/3))keys.push(values[c%3]);
   const port=nativeCursorInsertionOrder(n,(a,b)=>keys[a]>keys[b]);
   expect(port).toEqual(listingReference(keys));
   // orderNativeNomadEntries (0x492728 with comparator 0x59be88) reduces to RA order when every Dec is equal.
   const entries=keys.map((k,i)=>({i,result:{row:{raHours:Number(k),decDegrees:0}}}));
   expect(orderNativeNomadEntries(entries).map(e=>e.i)).toEqual([...port]);
  }
 });
 it('bounds its input and rejects encodings outside the codec domain',()=>{
  expect(()=>nativeCursorInsertionOrder(-1,()=>false)).toThrow();expect(()=>nativeCursorInsertionOrder(1001,()=>false)).toThrow();
  expect(()=>nativeCursorInsertionOrder(1.5,()=>false)).toThrow();
  // The codec refuses these before any projection exists.
  expect(()=>htl(['N',ext(0x8000000000000000n,0xbfff)])).toThrow();// −1 h
  expect(()=>htl(['I',ext(0x8000000000000000n,0x7fff)])).toThrow();// infinity
  expect(()=>htl(['U',ext(0x4000000000000000n,0x3fff)])).toThrow();// unnormal
 });
});
