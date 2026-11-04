import{nativeObservationBytes,parseNativeObservationResults,NATIVE_RESULT_BYTES,NATIVE_RESULT_MAX_RECORDS,type NativeObservationData,type StoredNumber}from'./nativeObservationResults';
/** Recovered549aa8 reader/492728 insertion/546db4 predicate. Canonical finite
 * normal/zero keys only;exact scalar comparison is not an x87 exception oracle.
 * Wrappers describe the cursor-at-tail profile after a complete display readout. */
export class NativeResultListError extends Error{constructor(readonly code:'owner'|'key'|'limit'|'order'|'format',readonly row=0){super('Native result list '+code);this.name='NativeResultListError';}}
export type NativeResultList=Readonly<{data:NativeObservationData}>;
const lists=new WeakSet<NativeResultList>();
type Key=readonly[StoredNumber,StoredNumber];
function admitted(n:StoredNumber,row:number){if(n.kind!=='normal'&&n.kind!=='zero')throw new NativeResultListError('key',row);return n;}
function keys(data:NativeObservationData):Key[]{nativeObservationBytes(data);return data.records.map(r=>[admitted(r.fields.find(f=>f.id==='time')!.value,r.index),admitted(r.fields.find(f=>f.id==='ra')!.value,r.index)]as const);}
function scalar(a:StoredNumber,b:StoredNumber):number{
 const ac=BigInt(a.coefficient!),bc=BigInt(b.coefficient!);if(ac===0n&&bc===0n)return 0;
 if(a.negative!==b.negative)return a.negative?-1:1;
 const sign=a.negative?-1:1;if(ac===0n||bc===0n)return(ac===0n?-1:1)*sign;
 const ap=a.power!,bp=b.power!,ae=ac.toString(2).length+ap,be=bc.toString(2).length+bp;
 if(ae!==be)return(ae<be?-1:1)*sign;
 const p=Math.min(ap,bp),av=ac<<BigInt(ap-p),bv=bc<<BigInt(bp-p);return(av===bv?0:av<bv?-1:1)*sign;
}
const compare=(a:Key,b:Key)=>scalar(a[0],b[0])||scalar(a[1],b[1]);
function wrap(data:NativeObservationData):NativeResultList{const result=Object.freeze({data});lists.add(result);return result;}
function requireList(list:NativeResultList){if(!lists.has(list))throw new NativeResultListError('owner');}
const sorted=(k:readonly Key[])=>k.every((key,i)=>i===0||compare(k[i-1],key)<=0);
/** Validate a display refresh without reloading/reversing equal-key runs. Front ONERESULTS: a list wrapped in VIREO's own list
 * order (listOrderNativeResultList) may hold keys that are not sorted; its refresh is accepted when every time/RA key is
 * unchanged in place (a text or Sp edit). */
export function refreshNativeResultList(list:NativeResultList,data:NativeObservationData):NativeResultList{requireList(list);const k=keys(data);
 if(!sorted(k)){const before=keys(list.data);if(before.length!==k.length||k.some((key,i)=>compare(key,before[i])!==0)){const at=k.findIndex((key,i)=>i>0&&compare(k[i-1],key)>0);throw new NativeResultListError('order',at+1);}}
 return data===list.data?list:wrap(data);}
/** Front ONERESULTS: VIREO's one Observational Results list as it stands (core/sharedObservationList.ts), wrapped without
 * re-ordering. 0x54a814 inserts each new record with RA = 0 and the route writes RA afterwards, so the list need not be sorted
 * under 0x546db4; the plot 0x542990 walks it as it is. */
export function listOrderNativeResultList(data:NativeObservationData):NativeResultList{keys(data);return wrap(data);}
/** 0x492728 itself, a literal cursor walk (forward while not(current > new), else backward to the first lesser key; the head
 * branch 0x4927c8–0x4927f2), for a base that is not sorted (where the bisection below would not be the same walk). */
function cursorIndex(ordered:readonly Key[],cursor:number,key:Key):number{
 const n=ordered.length;if(!n)return 0;let c=cursor<0?0:cursor;
 if(compare(key,ordered[c])>0){while(c!==n-1&&!(compare(ordered[c],key)>0))c++;return compare(ordered[c],key)>0?c:c+1;}
 while(c!==0&&!(compare(key,ordered[c])>0))c--;
 if(c!==0)return c+1;
 return compare(ordered[0],key)>0?0:1;
}
function insert(existing:NativeObservationData|null,incoming:NativeObservationData):NativeResultList{
 const source=nativeObservationBytes(incoming),incomingKeys=keys(incoming),old=existing?nativeObservationBytes(existing):new Uint8Array(),ordered=existing?keys(existing):[];
 if(ordered.length+incomingKeys.length>NATIVE_RESULT_MAX_RECORDS)throw new NativeResultListError('limit');
 const chunks=Array.from({length:ordered.length},(_,i)=>old.slice(i*NATIVE_RESULT_BYTES,(i+1)*NATIVE_RESULT_BYTES));let cursor=ordered.length-1;
 const literal=!sorted(ordered);
 incomingKeys.forEach((key,i)=>{if(literal){const at=cursorIndex(ordered,cursor,key);ordered.splice(at,0,key);chunks.splice(at,0,source.slice(i*NATIVE_RESULT_BYTES,(i+1)*NATIVE_RESULT_BYTES));cursor=at;return;}const upper=cursor>=0&&compare(key,ordered[cursor])>0;let lo=0,hi=ordered.length;while(lo<hi){const mid=(lo+hi)>>>1,c=compare(ordered[mid],key);if(c<0||upper&&c===0)lo=mid+1;else hi=mid;}// The head-equality branch4927d3..4927f2 inserts AFTER the head.
 if(!upper&&lo===0&&ordered.length&&compare(ordered[0],key)===0)lo=1;ordered.splice(lo,0,key);chunks.splice(lo,0,source.slice(i*NATIVE_RESULT_BYTES,(i+1)*NATIVE_RESULT_BYTES));cursor=lo;});
 const bytes=new Uint8Array(chunks.length*NATIVE_RESULT_BYTES);chunks.forEach((chunk,i)=>bytes.set(chunk,i*NATIVE_RESULT_BYTES));return wrap(parseNativeObservationResults(bytes));
}
export function buildNativeResultList(data:NativeObservationData):NativeResultList{return insert(null,data);}
export function appendNativeResultList(list:NativeResultList,incoming:NativeObservationData):NativeResultList{requireList(list);nativeObservationBytes(incoming);return incoming.records.length===0?list:insert(list.data,incoming);}
