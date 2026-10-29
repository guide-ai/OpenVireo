import{EMPTY_OBSERVATIONS,MAX_OBSERVATIONS,canonicalObservationSource,observationText,formatObservationType,type ObservationNotebook,type ObservationMode,type ObservationRecord}from'./observationResults';
/** New web-only envelope. Never a native .DAT codec or a legacy session upgrade. */
export const OBSERVATION_NOTEBOOK_FORMAT='OpenVireo observation notebook',OBSERVATION_NOTEBOOK_POLICY='original-practice-id-sha256-web-v1';
/** Front S (S4): version 2 also holds records of loaded or acquired spectra with their metadata. A notebook with practice
 * records only is still written as version 1, byte for byte as before. */
export const OBSERVATION_NOTEBOOK_POLICY_V2='source-id-sha256-metadata-web-v2';
export type ObservationSnapshot=Readonly<{book:ObservationNotebook;mode:ObservationMode}>;
export const EMPTY_OBSERVATION_SNAPSHOT:ObservationSnapshot=Object.freeze({book:EMPTY_OBSERVATIONS,mode:'reuse'});
export class ObservationNotebookError extends Error{constructor(readonly code:'format'|'size'|'source'|'record'){super('Observation notebook '+code);this.name='ObservationNotebookError';}}
function shape(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ObservationNotebookError('format');const r=value as Record<string,unknown>;if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw new ObservationNotebookError('format');return r;}
export function readObservationNotebook(value:unknown,allowExternal=true):ObservationNotebook{
 const r=shape(value,['records']);if(!Array.isArray(r.records)||r.records.length>MAX_OBSERVATIONS)throw new ObservationNotebookError('record');let last=0;
 const records=r.records.map((value):ObservationRecord=>{const row=shape(value,['id','source','spectralCode','remarks']),external=!!row.source&&typeof row.source==='object'&&Object.hasOwn(row.source,'metadata');if(external&&!allowExternal)throw new ObservationNotebookError('source');
  const s=shape(row.source,external?['id','sha256','objectId','metadata']:['id','sha256','objectId']);let source;
  try{if(external){const m=shape(s.metadata,['kind','jd','ra','dec']);source=canonicalObservationSource({id:s.id as string,sha256:s.sha256 as string,objectId:s.objectId as string,metadata:{kind:m.kind as 'imported',jd:m.jd as number|null,ra:m.ra as number|null,dec:m.dec as number|null}});}
   else source=canonicalObservationSource({id:s.id as string,sha256:s.sha256 as string,objectId:s.objectId as string});}catch{throw new ObservationNotebookError('source');}
  if(typeof row.id!=='number'||!Number.isSafeInteger(row.id)||row.id<=last||row.id>=Number.MAX_SAFE_INTEGER||Object.is(row.id,-0)||typeof row.spectralCode!=='number'||Object.is(row.spectralCode,-0))throw new ObservationNotebookError('record');
  try{formatObservationType(row.spectralCode);if(typeof row.remarks!=='string')throw Error();observationText(row.remarks,36);}catch{throw new ObservationNotebookError('record');}last=row.id;
  return Object.freeze({id:row.id,source,spectralCode:row.spectralCode,remarks:row.remarks as string});
 });return Object.freeze({records:Object.freeze(records)});
}
export function parseObservationSnapshot(value:unknown):ObservationSnapshot{
 const r=shape(value,['format','version','policy','mode','notebook']),v2=r.version===2&&r.policy===OBSERVATION_NOTEBOOK_POLICY_V2;if(r.format!==OBSERVATION_NOTEBOOK_FORMAT||!v2&&(r.version!==1||r.policy!==OBSERVATION_NOTEBOOK_POLICY)||r.mode!=='reuse'&&r.mode!=='append')throw new ObservationNotebookError('format');return Object.freeze({book:readObservationNotebook(r.notebook,v2),mode:r.mode});
}
export function serializeObservationSnapshot(snapshot:ObservationSnapshot):string{
 const v2=snapshot.book.records.some(r=>!!r.source.metadata),value={format:OBSERVATION_NOTEBOOK_FORMAT,version:v2?2:1,policy:v2?OBSERVATION_NOTEBOOK_POLICY_V2:OBSERVATION_NOTEBOOK_POLICY,mode:snapshot.mode,notebook:snapshot.book};parseObservationSnapshot(value);return JSON.stringify(value,null,2)+'\n';
}
