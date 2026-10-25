import {useCallback,useMemo,useRef,useState} from 'react';
import {INITIAL_PULSAR_CURRENT_DATA,type PulsarCurrentData,type PulsarDataStep} from './core/pulsarCurrentData';

export type SharedPulsarDataHandle=Readonly<{
 /** The committed document for rendering. */
 doc:PulsarCurrentData;
 /** The latest document, including updates made earlier in the same task (event handlers and async completions). */
 current:()=>PulsarCurrentData;
 /** Applies a pure step to the latest document and returns its result synchronously. */
 update:(step:(doc:PulsarCurrentData)=>PulsarDataStep)=>PulsarDataStep;
}>;
/** Page-lifetime owner of the one current pulsar dataset (WEB-REC-OWNER; not persisted, a reload starts empty). */
export function useSharedPulsarData():SharedPulsarDataHandle{
 const [doc,setDoc]=useState<PulsarCurrentData>(INITIAL_PULSAR_CURRENT_DATA),ref=useRef(doc);
 const current=useCallback(()=>ref.current,[]);
 const update=useCallback((step:(doc:PulsarCurrentData)=>PulsarDataStep)=>{const result=step(ref.current);if(result.doc!==ref.current){ref.current=result.doc;setDoc(result.doc);}return result;},[]);
 return useMemo(()=>({doc,current,update}),[doc,current,update]);
}
