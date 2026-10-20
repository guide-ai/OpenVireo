import{EMPTY_OBSERVATIONS,MAX_OBSERVATIONS,observationSource,observationText,formatObservationType,type ObservationNotebook,type ObservationMode,type ObservationRecord}from'./observationResults';
/** New web-only envelope. Never a native .DAT codec or a legacy session upgrade. */
export const OBSERVATION_NOTEBOOK_FORMAT='OpenVireo observation notebook',OBSERVATION_NOTEBOOK_POLICY='original-practice-id-sha256-web-v1';
export type ObservationSnapshot=Readonly<{book:ObservationNotebook;mode:ObservationMode}>;
export const EMPTY_OBSERVATION_SNAPSHOT:ObservationSnapshot=Object.freeze({book:EMPTY_OBSERVATIONS,mode:'reuse'});
export class ObservationNotebookError extends Error{constructor(readonly code:'format'|'size'|'source'|'record'){super('Observation notebook '+code);this.name='ObservationNotebookError';}}
function shape(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ObservationNotebookError('format');const r=value as Record<string,unknown>;if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw new ObservationNotebookError('format');return r;}
export function readObservationNotebook(value:unknown):ObservationNotebook{
 const r=shape(value,['records']);if(!Array.isArray(r.records)||r.records.length>MAX_OBSERVATIONS)throw new ObservationNotebookError('record');let last=0;
 const records=r.records.map((value):ObservationRecord=>{const row=shape(value,['id','source','spectralCode','remarks']),s=shape(row.source,['id','sha256','objectId']);let source;
  try{if(typeof s.id!=='string')throw Error();source=observationSource(s.id);if(s.sha256!==source.sha256||s.objectId!==source.objectId)throw Error();}catch{throw new ObservationNotebookError('source');}
  if(typeof row.id!=='number'||!Number.isSafeInteger(row.id)||row.id<=last||row.id>=Number.MAX_SAFE_INTEGER||Object.is(row.id,-0)||typeof row.spectralCode!=='number'||Object.is(row.spectralCode,-0))throw new ObservationNotebookError('record');
  try{formatObservationType(row.spectralCode);if(typeof row.remarks!=='string')throw Error();observationText(row.remarks,36);}catch{throw new ObservationNotebookError('record');}last=row.id;
  return Object.freeze({id:row.id,source,spectralCode:row.spectralCode,remarks:row.remarks as string});
 });return Object.freeze({records:Object.freeze(records)});
}
export function parseObservationSnapshot(value:unknown):ObservationSnapshot{
 const r=shape(value,['format','version','policy','mode','notebook']);if(r.format!==OBSERVATION_NOTEBOOK_FORMAT||r.version!==1||r.policy!==OBSERVATION_NOTEBOOK_POLICY||r.mode!=='reuse'&&r.mode!=='append')throw new ObservationNotebookError('format');return Object.freeze({book:readObservationNotebook(r.notebook),mode:r.mode});
}
export function serializeObservationSnapshot(snapshot:ObservationSnapshot):string{
 const value={format:OBSERVATION_NOTEBOOK_FORMAT,version:1,policy:OBSERVATION_NOTEBOOK_POLICY,mode:snapshot.mode,notebook:snapshot.book};parseObservationSnapshot(value);return JSON.stringify(value,null,2)+'\n';
}
