import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import type {RadioReceiver,RadioReceiverEvent,RadioReceiverSlots} from './radioReceiver';
import {
 EMPTY_RECEIVER_ARRANGEMENT,isStackedReceiverArrangement,moveReceiverWindowOrder,placeReceiverChild,receiverArrangementAfter,receiverWindowRank,
 type ReceiverArrangement,type ReceiverWindowSlot,
} from './radioReceiverArrangement';

// [W] contract checks of the web card order (docs/RADIO-RECEIVER-ALIGN.md WEB-RX-ALIGN-ARR-01/MOVE-01), not native geometry.
const arr=(...order:ReceiverWindowSlot[]):ReceiverArrangement=>Object.freeze({order:Object.freeze(order)});
/** Open-slot pattern only: the arrangement reads nothing but null / non-null. */
const slots=(...open:(0|1|2)[]):RadioReceiverSlots=>[0,1,2].map(i=>open.includes(i as 0|1|2)?({index:i} as unknown as RadioReceiver):null) as unknown as RadioReceiverSlots;
const placedEv=(slot:1|2,cause:'add'|'layout'|'move'='layout'):RadioReceiverEvent=>({kind:'window-placed',slot,cause});

describe('WEB-RX-ALIGN-ARR-01 placement below the main',()=>{
 it('places 2 then 1 into the stacked column from any order',()=>{
  for(const start of [arr(1,0,2),arr(2,1,0),arr(0,2,1),arr(2,0,1),arr(1,2,0),arr(0,1,2)])
   expect(placeReceiverChild(placeReceiverChild(start,2),1).order,start.order.join()).toEqual([0,1,2]);
  expect(placeReceiverChild(arr(1,0),1).order).toEqual([0,1]);
  expect(placeReceiverChild(arr(2,0),2).order).toEqual([0,2]);
  expect(placeReceiverChild(arr(0),1).order).toEqual([0,1]);// an absent child is inserted (Add)
  expect(placeReceiverChild(arr(0,1),2).order).toEqual([0,1,2]);
  // A single placement goes after the contiguous lower-numbered run only.
  expect(placeReceiverChild(arr(1,0,2),2).order).toEqual([1,0,2]);
  expect(placeReceiverChild(arr(0,2,1),2).order).toEqual([0,1,2]);
 });
 it('is idempotent and keeps the same object when nothing moves',()=>{
  const s=arr(0,1,2);
  expect(placeReceiverChild(s,1)).toBe(s);expect(placeReceiverChild(s,2)).toBe(s);
  const once=placeReceiverChild(arr(2,1,0),1);expect(placeReceiverChild(once,1)).toBe(once);
  expect(Object.isFrozen(once)&&Object.isFrozen(once.order)).toBe(true);
 });
});

describe('WEB-RX-ALIGN-MOVE-01 swaps and edges',()=>{
 it('swaps with the neighbour; edges and absent slots give null',()=>{
  expect(moveReceiverWindowOrder(arr(0,1,2),2,'up')!.order).toEqual([0,2,1]);
  expect(moveReceiverWindowOrder(arr(0,2,1),2,'up')!.order).toEqual([2,0,1]);
  expect(moveReceiverWindowOrder(arr(2,0,1),0,'down')!.order).toEqual([2,1,0]);
  expect(moveReceiverWindowOrder(arr(0,1,2),0,'up')).toBeNull();
  expect(moveReceiverWindowOrder(arr(0,1,2),2,'down')).toBeNull();
  expect(moveReceiverWindowOrder(arr(0),0,'down')).toBeNull();
  expect(moveReceiverWindowOrder(arr(0,1),2,'up')).toBeNull();
  const a=arr(0,1,2);moveReceiverWindowOrder(a,1,'up');expect(a.order).toEqual([0,1,2]);// input untouched
 });
 it('stacked means main first and children ascending; rank is 1-based',()=>{
  expect([arr(),arr(0),arr(0,1),arr(0,2),arr(0,1,2)].map(isStackedReceiverArrangement)).toEqual([true,true,true,true,true]);
  expect([arr(1,0),arr(0,2,1),arr(2,0,1)].map(isStackedReceiverArrangement)).toEqual([false,false,false]);
  expect([0,1,2].map(s=>receiverWindowRank(arr(2,0,1),s))).toEqual([2,3,1]);expect(receiverWindowRank(arr(0),2)).toBeNull();
 });
});

describe('reconciliation after a bank transition',()=>{
 it('drops closed windows, puts a new main on top, applies placements in order and appends unplaced children',()=>{
  expect(receiverArrangementAfter(EMPTY_RECEIVER_ARRANGEMENT,slots(0),[]).order).toEqual([0]);// Open
  expect(receiverArrangementAfter(arr(1,0),slots(0,1),[placedEv(2,'add')]).order).toEqual([1,0]);// a placement of a closed slot is ignored
  expect(receiverArrangementAfter(arr(1,0),slots(0,1,2),[placedEv(2,'add'),placedEv(2),placedEv(1)]).order).toEqual([0,1,2]);// Add under Align reset
  expect(receiverArrangementAfter(arr(1,0),slots(0,1,2),[placedEv(2,'add')]).order).toEqual([1,0,2]);// placement only
  expect(receiverArrangementAfter(arr(2,0,1),slots(0,1),[]).order).toEqual([0,1]);// child close
  expect(receiverArrangementAfter(arr(2,0,1),slots(),[]).order).toEqual([]);// main close cascades
  expect(receiverArrangementAfter(arr(0),slots(0,1),[]).order).toEqual([0,1]);// defensive append
  const s=arr(2,0,1);expect(receiverArrangementAfter(s,slots(0,1,2),[{kind:'beam',slot:0,changed:true}])).toBe(s);
  expect(receiverArrangementAfter(EMPTY_RECEIVER_ARRANGEMENT,slots(),[])).toBe(EMPTY_RECEIVER_ARRANGEMENT);
 });
 it('keeps React, DOM, host clocks, RNG and storage out of the module',()=>{
  const text=readFileSync(new URL('./radioReceiverArrangement.ts',import.meta.url),'utf8');
  expect(text).not.toMatch(/from 'react'|document\.|window\.|Date\.now|new Date|Math\.random|performance\.now|localStorage|sessionStorage|indexedDB|fetch\(/);
  expect([...text.matchAll(/from '([^']+)'/g)].map(m=>m[1])).toEqual(['./radioReceiver']);
 });
});
