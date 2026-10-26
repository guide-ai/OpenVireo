import {useCallback,useMemo,useRef,useState} from 'react';
import {INITIAL_PULSAR_CURRENT_DATA,type PulsarCurrentData} from './core/pulsarCurrentData';

/** Any pure step result that carries the next document (PulsarDataStep, R-RX15 PulsarWriteStep); its refusal union is kept. */
type PulsarDocStep=Readonly<{doc:PulsarCurrentData}>;
export type SharedPulsarDataHandle=Readonly<{
 /** The committed document for rendering. */
 doc:PulsarCurrentData;
 /** The latest document, including updates made earlier in the same task (event handlers and async completions). */
 current:()=>PulsarCurrentData;
 /** Applies a pure step to the latest document and returns its result synchronously. */
 update:<S extends PulsarDocStep>(step:(doc:PulsarCurrentData)=>S)=>S;
}>;
/** Page-lifetime owner of the one current pulsar dataset (WEB-REC-OWNER; not persisted, a reload starts empty). */
export function useSharedPulsarData():SharedPulsarDataHandle{
 const [doc,setDoc]=useState<PulsarCurrentData>(INITIAL_PULSAR_CURRENT_DATA),ref=useRef(doc);
 const current=useCallback(()=>ref.current,[]);
 const update=useCallback(<S extends PulsarDocStep>(step:(doc:PulsarCurrentData)=>S):S=>{const result=step(ref.current);if(result.doc!==ref.current){ref.current=result.doc;setDoc(result.doc);}return result;},[]);
 return useMemo(()=>({doc,current,update}),[doc,current,update]);
}
