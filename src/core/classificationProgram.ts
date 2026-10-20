import{CLASSIFICATION_CATALOG,readClassificationState,type ClassificationState}from'./classification';
/** Original CLASSIFY.LST order,not a type/grade key. Native handlers and list
 * hashes:docs/CLASSIFICATION-PROGRAM-LIST-PROVENANCE.json. */
export const CLASSIFICATION_PROGRAM=Object.freeze(CLASSIFICATION_CATALOG.practice.map(p=>Object.freeze({id:p.id,label:p.label,file:p.file,sha256:p.sha256})));
export class ClassificationProgramError extends Error{constructor(readonly code:'source'|'draft'|'stale'){super('Classification program '+code);this.name='ClassificationProgramError';}}
export function classificationProgramIndex(id:string):number{const index=CLASSIFICATION_PROGRAM.findIndex(p=>p.id===id);if(index<0)throw new ClassificationProgramError('source');return index;}
/** Authored safety guard for the web's free-form response,which is absent
 * from the captured native list navigation. No automatic record or grade. */
export function programResponseRecorded(state:ClassificationState):boolean{
 if(!state.proposed.length&&!state.reason.length)return true;
 return state.records.some(r=>r.unknownId===state.unknownId&&r.atlasId===state.atlasId&&r.pair===state.pair&&r.mode===state.mode&&r.line===state.line&&r.proposed===state.proposed.trim()&&r.reason===state.reason.trim());
}
export type ClassificationProgramSelection=Readonly<{base:ClassificationState;next:ClassificationState}>;
export function selectProgramPractice(state:ClassificationState,id:string):ClassificationProgramSelection{
 classificationProgramIndex(state.unknownId);classificationProgramIndex(id);readClassificationState(state);
 if(id!==state.unknownId&&!programResponseRecorded(state))throw new ClassificationProgramError('draft');
 const next=id===state.unknownId?state:Object.freeze({...state,unknownId:id,proposed:'',reason:''});
 return Object.freeze({base:state,next});
}
/** Native50b6bc stops at Count-1 and reports No More Spectra;no wrap. */
export function nextProgramPractice(state:ClassificationState):ClassificationProgramSelection|null{
 const index=classificationProgramIndex(state.unknownId);readClassificationState(state);
 return index===CLASSIFICATION_PROGRAM.length-1?null:selectProgramPractice(state,CLASSIFICATION_PROGRAM[index+1].id);
}
export function commitProgramPractice(current:ClassificationState,selection:ClassificationProgramSelection):ClassificationState{
 if(current!==selection.base)throw new ClassificationProgramError('stale');return selection.next;
}
