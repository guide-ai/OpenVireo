/** Radio Slew ▸ Hot List ▸ View/Select row order (RA-HL-03/04, docs/RADIO-ANTENNA-PROVENANCE.json). CLEA_VEO.exe
 * 781bc970…c54c: the reader 0x5903d8 inserts every 86-byte record through the cursor insertion 0x492728 with the
 * comparator slot +4 = 0x590398, which loads only the Extended RA at +0x19 (fld/fld/fcompp/setb: Greater(EDX,ECX) iff
 * RA(EDX) > RA(ECX)); Dec is never compared. This is a data-structure port, not CPU or x87 emulation and not a stable
 * JS sort. The projection is always computed from the shared file-order list (WEB-HL-04 bridge): no native historic
 * cursor is claimed across web edits, deletes or Undo. The file-order list, its bytes and the optical editor are untouched. */
import {HTL_MAX_RECORDS,HTL_RECORD_BYTES,serializeHtl,type HtlList,type HtlRecord} from './hotList';

/** 0x492728 over source indices 0..count-1 in file order. `greater` must be a strict order (irreflexive, asymmetric).
 * Empty list: head insert (0x492574 with a nil cursor → 0x492528). Greater than the cursor (0x49275e): move forward while
 * the cursor is not the tail (0x49271c) and !greater(cursor,new) (0x492784), step back once if greater(cursor,new)
 * (0x492794/0x49279d), insert after the cursor. Otherwise move back while the cursor is not the head (0x492710) and
 * !greater(new,cursor) (0x4927c1); at the head insert before it iff greater(head,new) (0x4927dc → 0x492528), else
 * after the cursor (0x492574). The cursor ends on the inserted node. 0x492708/0x492710/0x49271c test head = nil,
 * cursor = head and cursor = tail (list-predicates.asm 9bf63bc7…). The constructor 0x4924d4 sets head, tail and cursor
 * to nil (list-init.asm 4f26abbb…). The clear 0x4924fc sets the cursor to the tail and calls 0x4925dc until the head is
 * nil; 0x4925dc unlinks the current node and moves the cursor to its predecessor, so removing the head last leaves the
 * cursor nil (list-clear.asm 468ad6a4…, list-remove-current.asm 55b0ac2f…). */
export function nativeCursorInsertionOrder(count:number,greater:(a:number,b:number)=>boolean):readonly number[]{
 if(!Number.isInteger(count)||count<0||count>HTL_MAX_RECORDS)throw new Error('Unsupported hot list size');
 const ordered:number[]=[];let cursor=0;
 for(let value=0;value<count;value++){
  if(ordered.length===0){ordered.push(value);cursor=0;continue;}
  let current=ordered[cursor];
  if(greater(value,current)){
   while(cursor<ordered.length-1&&!greater(current,value))current=ordered[++cursor];
   if(greater(current,value))cursor--;
  }else{
   while(cursor>0&&!greater(value,current))current=ordered[--cursor];
   if(cursor===0&&greater(current,value)){ordered.unshift(value);cursor=0;continue;}
  }
  ordered.splice(++cursor,0,value);
 }
 return Object.freeze(ordered);
}

/** Exact order key of each record's retained Extended RA bytes 25..34: (biased exponent << 64) | significand. ±0 give
 * 0n (fcompp treats them as equal). Otherwise only positive canonical normals are admitted; the codec (parseHtl /
 * updateHtlRecord) already rejects every other encoding, so the throw is unreachable for codec records. Inside this
 * domain integer comparison of the keys equals comparison of the exact Extended values; Number is never used. */
export function htlRaKeys(list:HtlList):readonly bigint[]{
 const bytes=serializeHtl(list),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 return Object.freeze(list.map((_,i)=>{
  const at=i*HTL_RECORD_BYTES+25,significand=view.getBigUint64(at,true),se=view.getUint16(at+8,true),exp=se&0x7fff;
  if(exp===0&&significand===0n)return 0n;
  if(se>>>15||exp===0||exp===0x7fff||significand>>63n!==1n)throw new Error('Unsupported hot list RA encoding');
  return BigInt(exp)<<64n|significand;
 }));
}

export type RadioHotListRow=Readonly<{sourceIndex:number;record:HtlRecord}>;
export type RadioHotListProjection=Readonly<{list:HtlList;rows:readonly RadioHotListRow[]}>;
const memo=new WeakMap<HtlList,RadioHotListProjection>();
/** Rows of the radio list in native RA insertion order, keyed by file-order source index (duplicates stay separate).
 * Memoized by list identity: reopening an unchanged list returns the same object and never re-sorts its ties. */
export function radioHotListProjection(list:HtlList):RadioHotListProjection{
 const hit=memo.get(list);if(hit)return hit;
 const keys=htlRaKeys(list),order=nativeCursorInsertionOrder(list.length,(a,b)=>keys[a]>keys[b]);
 const projection:RadioHotListProjection=Object.freeze({list,rows:Object.freeze(order.map(sourceIndex=>Object.freeze({sourceIndex,record:list[sourceIndex]})))});
 memo.set(list,projection);return projection;
}
