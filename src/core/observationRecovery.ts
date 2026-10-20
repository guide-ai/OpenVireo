import {ObservationNotebookError,parseObservationSnapshot,serializeObservationSnapshot,type ObservationSnapshot} from './observationNotebook';
import {DELETION_FORMAT,parseObservationDeletion,serializeObservationDeletion,sameObservationSnapshot,type ObservationDeletion} from './observationDeletion';

/** New local recovery profile; notebook-v1 and deletion-v1 are unchanged. */
export const EDIT_RECOVERY_FORMAT='OpenVireo observation edit recovery';
export type ObservationEditRecovery=Readonly<{kind:'edit';before:ObservationSnapshot;after:ObservationSnapshot;recordId:number}>;
export type ObservationRecovery=ObservationDeletion|ObservationEditRecovery;
export function isObservationEditRecovery(recovery:ObservationRecovery|null):recovery is ObservationEditRecovery {
 return !!recovery&&'kind'in recovery&&recovery.kind==='edit';
}
function snapshotCopy(snapshot:ObservationSnapshot):ObservationSnapshot {
 return parseObservationSnapshot(JSON.parse(serializeObservationSnapshot(snapshot)));
}
/** Selected Edit549620 saves the old row before the modal;Undo54993c copies it
 * back. Full owned web snapshots/index-independent identity and atomic staging
 * are safety adaptations,not native list-pointer/runtime parity. */
export function stageObservationEdit(before:ObservationSnapshot,after:ObservationSnapshot,recordId:number):ObservationEditRecovery {
 before=snapshotCopy(before);after=snapshotCopy(after);
 const old=before.book.records,next=after.book.records,index=old.findIndex(r=>r.id===recordId);
 if(index<0||before.mode!==after.mode||old.length!==next.length)throw new ObservationNotebookError('record');
 for(let i=0;i<old.length;i++) {
  if(i===index) {
   if(old[i].id!==next[i].id||old[i].source!==next[i].source||old[i].spectralCode===next[i].spectralCode&&old[i].remarks===next[i].remarks)throw new ObservationNotebookError('record');
  } else if(JSON.stringify(old[i])!==JSON.stringify(next[i]))throw new ObservationNotebookError('record');
 }
 return Object.freeze({kind:'edit',before,after,recordId});
}
export function parseObservationRecovery(value:unknown):ObservationRecovery {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ObservationNotebookError('format');
 const r=value as Record<string,unknown>;
 if(r.format===DELETION_FORMAT)return parseObservationDeletion(value);
 const keys=['format','version','recordId','before','after'];
 if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k))||r.format!==EDIT_RECOVERY_FORMAT||r.version!==1||typeof r.recordId!=='number')throw new ObservationNotebookError('format');
 return stageObservationEdit(parseObservationSnapshot(r.before),parseObservationSnapshot(r.after),r.recordId);
}
export function serializeObservationRecovery(recovery:ObservationRecovery):string {
 if(!isObservationEditRecovery(recovery))return serializeObservationDeletion(recovery);
 const value={format:EDIT_RECOVERY_FORMAT,version:1,recordId:recovery.recordId,before:JSON.parse(serializeObservationSnapshot(recovery.before)),after:JSON.parse(serializeObservationSnapshot(recovery.after))};
 parseObservationRecovery(value);return JSON.stringify(value,null,2)+'\n';
}
export function undoObservationRecovery(current:ObservationSnapshot,recovery:ObservationRecovery):ObservationSnapshot {
 const owned=parseObservationRecovery(JSON.parse(serializeObservationRecovery(recovery)));
 if(!sameObservationSnapshot(current,owned.after))throw new ObservationNotebookError('record');
 return owned.before;
}
