// WEB card order of the receiver windows (R-RX5 Align, docs/RADIO-RECEIVER-ALIGN.md). The workspace is one column at every
// width, so a window's only position is its rank in that column (WEB-RX-ALIGN-ARR-01): Left := main.Left holds trivially and
// Top := main.Top + main.ClientHeight · slot is read as "directly below the main, after the lower-numbered channels already
// stacked there". Native overlap (ClientHeight ≠ Height, field 0x4c), 2-D coordinates, off-screen positions and multiple
// monitors are not represented. Pure TypeScript: no React, DOM, clock, RNG or storage. This arranges windows, never signals.
import type {RadioReceiverEvent,RadioReceiverSlots} from './radioReceiver';

export type ReceiverWindowSlot=0|1|2;
/** Card order from top to bottom; a permutation of the open slots once reconciled. */
export type ReceiverArrangement=Readonly<{order:readonly ReceiverWindowSlot[]}>;
export const EMPTY_RECEIVER_ARRANGEMENT:ReceiverArrangement=Object.freeze({order:Object.freeze([])});
export type ReceiverMoveDirection='up'|'down';

const sameOrder=(a:readonly ReceiverWindowSlot[],b:readonly ReceiverWindowSlot[])=>a.length===b.length&&a.every((s,i)=>s===b[i]);
/** The arrangement for order, or a itself when the order is unchanged. */
const withOrder=(a:ReceiverArrangement,order:readonly ReceiverWindowSlot[]):ReceiverArrangement=>
 sameOrder(a.order,order)?a:Object.freeze({order:Object.freeze([...order])});

function placed(order:readonly ReceiverWindowSlot[],slot:1|2):readonly ReceiverWindowSlot[]{
 const rest=order.filter(s=>s!==slot);
 let i=rest.indexOf(0);
 // [W] defensive: no main in the column (no ported path places a child without one) keeps the child last.
 if(i<0)return [...rest,slot];
 i++;
 while(i<rest.length&&rest[i]<slot)i++;
 return [...rest.slice(0,i),slot,...rest.slice(i)];
}
/** One window-placed: the child leaves its rank and goes directly below the main, after any contiguous run of lower-numbered
 * children there. Visiting 2 then 1 always gives [0, 1, 2], [0, 1], [0, 2] or [0]. Absent slots are inserted. */
export function placeReceiverChild(a:ReceiverArrangement,slot:1|2):ReceiverArrangement{
 return withOrder(a,placed(a.order,slot));
}
/** WEB-RX-ALIGN-MOVE-01: the window swaps ranks with its neighbour above or below. null: slot absent, or already at that edge
 * of the column (nothing moves). */
export function moveReceiverWindowOrder(a:ReceiverArrangement,slot:ReceiverWindowSlot,dir:ReceiverMoveDirection):ReceiverArrangement|null{
 const i=a.order.indexOf(slot),j=dir==='up'?i-1:i+1;
 if(i<0||j<0||j>=a.order.length)return null;
 const order=[...a.order];order[i]=order[j];order[j]=slot;
 return withOrder(a,order);
}
/** Reconciles the order after a bank transition: closed windows leave, a new main goes on top, the transition's window-placed
 * events apply in order (only for open slots), and any open child still missing is appended in slot order (defensive; every
 * ported creation path places its child). The same object when nothing changed. */
export function receiverArrangementAfter(a:ReceiverArrangement,slots:RadioReceiverSlots,events:readonly RadioReceiverEvent[]):ReceiverArrangement{
 let order:readonly ReceiverWindowSlot[]=a.order.filter(s=>slots[s]!==null);
 if(slots[0]!==null&&!order.includes(0))order=[0,...order];
 for(const e of events)if(e.kind==='window-placed'&&slots[e.slot]!==null)order=placed(order,e.slot);
 for(const s of [1,2] as const)if(slots[s]!==null&&!order.includes(s))order=[...order,s];
 return withOrder(a,order);
}
/** Main first, then the children in ascending slot order (the column the layout produces). Vacuously true when empty. */
export function isStackedReceiverArrangement(a:ReceiverArrangement):boolean{
 return a.order.every((s,i)=>i===0||a.order[i-1]<s);
}
/** 1-based rank of a window in the column, or null when it is not in the arrangement. */
export function receiverWindowRank(a:ReceiverArrangement,slot:number):number|null{
 const i=a.order.indexOf(slot as ReceiverWindowSlot);return i<0?null:i+1;
}
