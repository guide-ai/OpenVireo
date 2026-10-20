import{parseObservationRecovery,serializeObservationRecovery,type ObservationRecovery}from'../core/observationRecovery';
import{sameObservationSnapshot}from'../core/observationDeletion';
import{serializeObservationSnapshot}from'../core/observationNotebook';
import{OBSERVATION_STORAGE_KEY,MAX_OBSERVATION_NOTEBOOK_BYTES,parseObservationNotebookText,type NotebookStorage}from'./observationNotebook';
export const OBSERVATION_RECOVERY_KEY='openvireo.observation-deletion-recovery.v1',MAX_OBSERVATION_RECOVERY_BYTES=2*MAX_OBSERVATION_NOTEBOOK_BYTES+4096;
export type RecoveryStorage=NotebookStorage&Pick<Storage,'removeItem'>;
export type StoredRecovery=Readonly<{status:'empty'|'present'|'invalid'|'unavailable';raw:string|null;recovery:ObservationRecovery|null}>;
export const EMPTY_RECOVERY:StoredRecovery=Object.freeze({status:'empty',raw:null,recovery:null});
export function loadObservationRecovery(storage:NotebookStorage):StoredRecovery{let raw;try{raw=storage.getItem(OBSERVATION_RECOVERY_KEY);}catch{return{status:'unavailable',raw:null,recovery:null};}if(raw===null)return EMPTY_RECOVERY;try{if(new TextEncoder().encode(raw).byteLength>MAX_OBSERVATION_RECOVERY_BYTES)throw Error();return{status:'present',raw,recovery:parseObservationRecovery(JSON.parse(raw))};}catch{return{status:'invalid',raw,recovery:null};}}
type Result=Readonly<{status:'saved'|'cleanup'|'conflict'|'unavailable';mainRaw?:string}>;
/** Historical key retained so older deletion-only clients preserve an unknown
 * edit envelope as unreadable and pause notebook mutations. Deletion-v1 and
 * notebook-v1 bytes remain unchanged. Stage recovery BEFORE the main write. Not an atomic
 * two-key transaction; interrupted stages remain visible/recoverable. */
export function storeObservationRecovery(storage:RecoveryStorage,recovery:ObservationRecovery,expectedMain:string|null):Result{
 const raw=serializeObservationRecovery(recovery),after=serializeObservationSnapshot(recovery.after);
 try{if(expectedMain===null||!sameObservationSnapshot(parseObservationNotebookText(expectedMain),recovery.before)||storage.getItem(OBSERVATION_STORAGE_KEY)!==expectedMain||storage.getItem(OBSERVATION_RECOVERY_KEY)!==null)return{status:'conflict'};storage.setItem(OBSERVATION_RECOVERY_KEY,raw);if(storage.getItem(OBSERVATION_RECOVERY_KEY)!==raw||storage.getItem(OBSERVATION_STORAGE_KEY)!==expectedMain)return{status:'conflict'};storage.setItem(OBSERVATION_STORAGE_KEY,after);if(storage.getItem(OBSERVATION_STORAGE_KEY)!==after||storage.getItem(OBSERVATION_RECOVERY_KEY)!==raw)return{status:'conflict'};return{status:'saved',mainRaw:after};}catch{return{status:'unavailable'};}
}
export function restoreObservationRecovery(storage:RecoveryStorage,recovery:ObservationRecovery,expectedMain:string|null,expectedRecovery:string):Result{
 const before=serializeObservationSnapshot(recovery.before);try{if(serializeObservationRecovery(parseObservationRecovery(JSON.parse(expectedRecovery)))!==serializeObservationRecovery(recovery))return{status:'conflict'};if(expectedMain===null||!sameObservationSnapshot(parseObservationNotebookText(expectedMain),recovery.after)||storage.getItem(OBSERVATION_STORAGE_KEY)!==expectedMain||storage.getItem(OBSERVATION_RECOVERY_KEY)!==expectedRecovery)return{status:'conflict'};storage.setItem(OBSERVATION_STORAGE_KEY,before);if(storage.getItem(OBSERVATION_STORAGE_KEY)!==before||storage.getItem(OBSERVATION_RECOVERY_KEY)!==expectedRecovery)return{status:'conflict'};try{storage.removeItem(OBSERVATION_RECOVERY_KEY);}catch{/* Verify actual cleanup outcome below. */}if(storage.getItem(OBSERVATION_STORAGE_KEY)!==before)return{status:'conflict'};return{status:storage.getItem(OBSERVATION_RECOVERY_KEY)===null?'saved':'cleanup',mainRaw:before};}catch{return{status:'unavailable'};}
}
export function finishObservationRecovery(storage:RecoveryStorage,expectedMain:string|null,expectedRecovery:string):Result{try{if(storage.getItem(OBSERVATION_STORAGE_KEY)!==expectedMain||storage.getItem(OBSERVATION_RECOVERY_KEY)!==expectedRecovery)return{status:'conflict'};storage.removeItem(OBSERVATION_RECOVERY_KEY);return{status:storage.getItem(OBSERVATION_RECOVERY_KEY)===null&&storage.getItem(OBSERVATION_STORAGE_KEY)===expectedMain?'saved':'conflict'};}catch{return{status:'unavailable'};}}
