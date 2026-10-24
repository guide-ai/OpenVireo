import {useCallback,useMemo,useRef,useState} from 'react';
import {INITIAL_SHARED_HOT_LIST,type SharedHotList,type SharedHotListStep} from './core/sharedHotList';

export type SharedHotListHandle=Readonly<{
 /** The committed document for rendering. */
 doc:SharedHotList;
 /** The latest document, including updates made earlier in the same task (event handlers and async completions). */
 current:()=>SharedHotList;
 /** Applies a pure step to the latest document and returns its result synchronously. */
 update:(step:(doc:SharedHotList)=>SharedHotListStep)=>SharedHotListStep;
}>;
/** Temporary page-lifetime owner of the shared HTL document (not persisted; a reload starts empty). */
export function useSharedHotList():SharedHotListHandle{
 const [doc,setDoc]=useState<SharedHotList>(INITIAL_SHARED_HOT_LIST),ref=useRef(doc);
 const current=useCallback(()=>ref.current,[]);
 const update=useCallback((step:(doc:SharedHotList)=>SharedHotListStep)=>{const result=step(ref.current);if(result.doc!==ref.current){ref.current=result.doc;setDoc(result.doc);}return result;},[]);
 return useMemo(()=>({doc,current,update}),[doc,current,update]);
}
