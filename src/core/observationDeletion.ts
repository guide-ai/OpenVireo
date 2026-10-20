import{ObservationNotebookError,parseObservationSnapshot,serializeObservationSnapshot,type ObservationSnapshot}from'./observationNotebook';
export type ObservationDeletion=Readonly<{before:ObservationSnapshot;after:ObservationSnapshot;recordId:number}>;
export const DELETION_FORMAT='OpenVireo observation deletion recovery';
export function sameObservationSnapshot(a:ObservationSnapshot,b:ObservationSnapshot):boolean{return serializeObservationSnapshot(a)===serializeObservationSnapshot(b);}
export function stageObservationDeletion(before:ObservationSnapshot,recordId:number):ObservationDeletion{
 before=parseObservationSnapshot(JSON.parse(serializeObservationSnapshot(before)));if(!before.book.records.some(r=>r.id===recordId))throw new ObservationNotebookError('record');
 const after=Object.freeze({mode:before.mode,book:Object.freeze({records:Object.freeze(before.book.records.filter(r=>r.id!==recordId))})});return Object.freeze({before,after,recordId});
}
export function undoObservationDeletion(current:ObservationSnapshot,recovery:ObservationDeletion):ObservationSnapshot{if(!sameObservationSnapshot(current,recovery.after))throw new ObservationNotebookError('record');return recovery.before;}
export function parseObservationDeletion(value:unknown):ObservationDeletion{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ObservationNotebookError('format');const r=value as Record<string,unknown>,keys=['format','version','recordId','before','after'];if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==DELETION_FORMAT||r.version!==1||typeof r.recordId!=='number')throw new ObservationNotebookError('format');
 const before=parseObservationSnapshot(r.before),after=parseObservationSnapshot(r.after),expected=stageObservationDeletion(before,r.recordId);if(!sameObservationSnapshot(expected.after,after))throw new ObservationNotebookError('record');return Object.freeze({before,after,recordId:r.recordId});
}
export function serializeObservationDeletion(recovery:ObservationDeletion):string{const value={format:DELETION_FORMAT,version:1,recordId:recovery.recordId,before:JSON.parse(serializeObservationSnapshot(recovery.before)),after:JSON.parse(serializeObservationSnapshot(recovery.after))};parseObservationDeletion(value);return JSON.stringify(value,null,2)+'\n';}
