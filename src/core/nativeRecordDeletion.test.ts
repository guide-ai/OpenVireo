import{describe,it,expect}from'vitest';
import{parseNativeObservationResults,nativeObservationBytes,openNativeRecordEdit,commitNativeRecordEdit,deleteNativeRecord}from'./nativeObservationResults';
function fixture(count:number){const b=Uint8Array.from({length:144*count},(_,i)=>(i*37+13)%256);for(let r=0;r<count;r++){b[r*144]=0;b[r*144+107]=0;}return b;}
describe('owned144byte native deletion with exact prior snapshot',()=>{
 it('removes first/middle/last whole record while preserving other raw encodings,order and original bytes',()=>{
  const bytes=fixture(7),data=parseNativeObservationResults(bytes);for(const index of[0,3,6]){const next=deleteNativeRecord(data,openNativeRecordEdit(data,index)),expected=new Uint8Array([...bytes.subarray(0,index*144),...bytes.subarray((index+1)*144)]);expect(nativeObservationBytes(next)).toEqual(expected);expect(next.records).toHaveLength(6);expect(next.records.map(r=>r.index)).toEqual([1,2,3,4,5,6]);expect(next.records[index===6?0:5].fields).toEqual(data.records[index===6?0:6].fields);expect(nativeObservationBytes(data)).toEqual(bytes);expect(Object.isFrozen(next)).toBe(true);}
 });
 it('supports deletion to an owned empty file without synthesizing a record and retains exact source for Undo',()=>{
  const source=parseNativeObservationResults(fixture(1)),next=deleteNativeRecord(source,openNativeRecordEdit(source,0));expect(next.records).toHaveLength(0);expect(nativeObservationBytes(next)).toEqual(new Uint8Array());expect(()=>openNativeRecordEdit(next,0)).toThrow('index');expect(nativeObservationBytes(source)).toEqual(fixture(1));
 });
 it('requires branded selection and exact immutable current base,including identical foreign input',()=>{
  const data=parseNativeObservationResults(fixture(3)),edit=openNativeRecordEdit(data,1),next=deleteNativeRecord(data,edit);expect(()=>deleteNativeRecord(data,{...edit})).toThrow('owner');expect(()=>deleteNativeRecord(next,edit)).toThrow('stale');expect(()=>deleteNativeRecord(parseNativeObservationResults(fixture(3)),edit)).toThrow('stale');expect(()=>openNativeRecordEdit(data,3)).toThrow('index');expect(()=>openNativeRecordEdit(data,-1)).toThrow('index');expect(()=>openNativeRecordEdit({...data},0)).toThrow('owner');
 });
 it('composes text edits and deletions while snapshots recover all preceding bytes and unknown metadata',()=>{
  const bytes=fixture(3),original=parseNativeObservationResults(bytes),edited=commitNativeRecordEdit(original,openNativeRecordEdit(original,2),{object:'Manual €'}),removed=deleteNativeRecord(edited,openNativeRecordEdit(edited,0)),after=commitNativeRecordEdit(removed,openNativeRecordEdit(removed,0),{remarks:'Next'});expect(nativeObservationBytes(removed)).toEqual(nativeObservationBytes(edited).subarray(144));expect(nativeObservationBytes(after)).not.toEqual(nativeObservationBytes(removed));expect(nativeObservationBytes(edited).subarray(0,288)).toEqual(bytes.subarray(0,288));expect(nativeObservationBytes(original)).toEqual(bytes);const copy=nativeObservationBytes(removed);copy.fill(0);expect(nativeObservationBytes(removed)).toEqual(nativeObservationBytes(edited).subarray(144));
 });
});
