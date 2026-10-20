import{EMPTY_OBSERVATION_SNAPSHOT,ObservationNotebookError,parseObservationSnapshot,serializeObservationSnapshot,type ObservationSnapshot}from'../core/observationNotebook';
export const MAX_OBSERVATION_NOTEBOOK_BYTES=128*1024,OBSERVATION_STORAGE_KEY='openvireo.observation-notebook.v1';
export function parseObservationNotebookText(text:string):ObservationSnapshot{if(new TextEncoder().encode(text).byteLength>MAX_OBSERVATION_NOTEBOOK_BYTES)throw new ObservationNotebookError('size');try{return parseObservationSnapshot(JSON.parse(text));}catch(e){if(e instanceof ObservationNotebookError)throw e;throw new ObservationNotebookError('format');}}
export async function readObservationNotebookFile(file:File):Promise<ObservationSnapshot>{if(file.size>MAX_OBSERVATION_NOTEBOOK_BYTES)throw new ObservationNotebookError('size');const bytes=await file.arrayBuffer();if(bytes.byteLength>MAX_OBSERVATION_NOTEBOOK_BYTES)throw new ObservationNotebookError('size');let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new ObservationNotebookError('format');}return parseObservationNotebookText(text);}
export type NotebookStorage=Pick<Storage,'getItem'|'setItem'>;
export type CacheStatus='empty'|'saved'|'invalid'|'unavailable'|'conflict';
export type CachedNotebook=Readonly<{snapshot:ObservationSnapshot;raw:string|null;status:CacheStatus}>;
export function loadObservationCache(storage:NotebookStorage):CachedNotebook{
 let raw;try{raw=storage.getItem(OBSERVATION_STORAGE_KEY);}catch{return{snapshot:EMPTY_OBSERVATION_SNAPSHOT,raw:null,status:'unavailable'};}
 if(raw===null)return{snapshot:EMPTY_OBSERVATION_SNAPSHOT,raw,status:'empty'};try{return{snapshot:parseObservationNotebookText(raw),raw,status:'saved'};}catch{return{snapshot:EMPTY_OBSERVATION_SNAPSHOT,raw,status:'invalid'};}
}
/** Compare before write prevents a known changed tab/copy from being silently
 * overwritten. localStorage has no cross-process transaction: simultaneous
 * writers remain a documented browser limit; portable backups are primary. */
export function saveObservationCache(storage:NotebookStorage,snapshot:ObservationSnapshot,expected:string|null):Readonly<{status:'saved'|'unavailable'|'conflict';raw:string|null}>{
 const raw=serializeObservationSnapshot(snapshot);try{if(storage.getItem(OBSERVATION_STORAGE_KEY)!==expected)return{status:'conflict',raw:expected};storage.setItem(OBSERVATION_STORAGE_KEY,raw);if(storage.getItem(OBSERVATION_STORAGE_KEY)!==raw)return{status:'conflict',raw:expected};return{status:'saved',raw};}catch{return{status:'unavailable',raw:expected};}
}
