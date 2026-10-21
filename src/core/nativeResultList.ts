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
/** Validate a display refresh without reloading/reversing equal-key runs. */
export function refreshNativeResultList(list:NativeResultList,data:NativeObservationData):NativeResultList{requireList(list);const k=keys(data);for(let i=1;i<k.length;i++)if(compare(k[i-1],k[i])>0)throw new NativeResultListError('order',i+1);return data===list.data?list:wrap(data);}
function insert(existing:NativeObservationData|null,incoming:NativeObservationData):NativeResultList{
 const source=nativeObservationBytes(incoming),incomingKeys=keys(incoming),old=existing?nativeObservationBytes(existing):new Uint8Array(),ordered=existing?keys(existing):[];
 if(ordered.length+incomingKeys.length>NATIVE_RESULT_MAX_RECORDS)throw new NativeResultListError('limit');
 const chunks=Array.from({length:ordered.length},(_,i)=>old.slice(i*NATIVE_RESULT_BYTES,(i+1)*NATIVE_RESULT_BYTES));let cursor=ordered.length-1;
 incomingKeys.forEach((key,i)=>{const upper=cursor>=0&&compare(key,ordered[cursor])>0;let lo=0,hi=ordered.length;while(lo<hi){const mid=(lo+hi)>>>1,c=compare(ordered[mid],key);if(c<0||upper&&c===0)lo=mid+1;else hi=mid;}// The head-equality branch4927d3..4927f2 inserts AFTER the head.
 if(!upper&&lo===0&&ordered.length&&compare(ordered[0],key)===0)lo=1;ordered.splice(lo,0,key);chunks.splice(lo,0,source.slice(i*NATIVE_RESULT_BYTES,(i+1)*NATIVE_RESULT_BYTES));cursor=lo;});
 const bytes=new Uint8Array(chunks.length*NATIVE_RESULT_BYTES);chunks.forEach((chunk,i)=>bytes.set(chunk,i*NATIVE_RESULT_BYTES));return wrap(parseNativeObservationResults(bytes));
}
export function buildNativeResultList(data:NativeObservationData):NativeResultList{return insert(null,data);}
export function appendNativeResultList(list:NativeResultList,incoming:NativeObservationData):NativeResultList{requireList(list);nativeObservationBytes(incoming);return incoming.records.length===0?list:insert(list.data,incoming);}
