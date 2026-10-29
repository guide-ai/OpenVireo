import {readNativeClusterDraft,type NativeClusterDraft} from './nativeClusterParameters';
import type {Measurement} from './spectrum';
import type {PhotometerState} from './photometer';
import {checkHubbleVelocity,HubbleVelocityError} from './hubbleVelocity';
/** OpenVireo editing state; never an observation, original options file or grade. */
export const EDITING_POLICY='OpenVireo-editing-workspace-v1';
export const EDITING_NATIVE_CLUSTER_POLICY='OpenVireo-editing-workspace-v3';
export const EDITING_ANALYSIS_POLICY='OpenVireo-editing-workspace-v2';
export const editingWorkspacePolicy=(w:EditingWorkspace)=>Object.hasOwn(w.photometry,'nativeClusterDraft')?EDITING_NATIVE_CLUSTER_POLICY:Object.hasOwn(w.photometry,'clusterModulusText')?EDITING_ANALYSIS_POLICY:EDITING_POLICY;
export type VelocityDraft=Readonly<{measurementId:number|null;answerText:string;checked:boolean}>;
export type PhotometryDraft=Readonly<{seedText:string;bReadingId:number|null;vReadingId:number|null;clusterModulusText?:string;nativeClusterDraft?:NativeClusterDraft}>;
export type SharedEditingWorkspace=Readonly<{preparationSeedText:string;photometry:PhotometryDraft}>;
export type EditingWorkspace=SharedEditingWorkspace&Readonly<{velocity:VelocityDraft}>;
function record(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))throw new Error('Invalid editing workspace');return value as Record<string,unknown>;}
export function editingText(value:unknown):string{if(typeof value!=='string'||value.length>80)throw new Error('Invalid editing text');return value;}
export const velocityRows=(rows:readonly Measurement[])=>rows.filter(r=>r.origin?.kind!=='catalog-star-acquisition');
export function defaultVelocityDraft(rows:readonly Measurement[]):VelocityDraft{return Object.freeze({measurementId:velocityRows(rows).at(-1)?.id??null,answerText:'',checked:false});}
function readingAllowed(s:PhotometerState|undefined,id:unknown,filter:'B'|'V'):id is number|null{return id===null||(typeof id==='number'&&Number.isSafeInteger(id)&&!!s?.entries.some(e=>e.readingId===id)&&s.readings.some(r=>r.id===id&&r.kind==='object'&&r.filter===filter&&r.targetId===s.targetId));}
export function defaultPhotometryDraft(s?:PhotometerState):PhotometryDraft{return Object.freeze({seedText:String(s?.seedAtStart??42),bReadingId:s?.color?.bReadingId??null,vReadingId:s?.color?.vReadingId??null});}
/** Release/count changes retain unapplied selections. A new segment, target or
 * explicitly calculated color selects only the color already chosen by the learner. */
export function reconcilePhotometryDraft(d:PhotometryDraft,previous:PhotometerState|null,next:PhotometerState):PhotometryDraft{
 const changed=previous?.targetId!==next.targetId||previous?.seedAtStart!==next.seedAtStart||previous?.color!==next.color;
 const pair=changed?defaultPhotometryDraft(next):d;
 const bReadingId=readingAllowed(next,pair.bReadingId,'B')?pair.bReadingId:null,vReadingId=readingAllowed(next,pair.vReadingId,'V')?pair.vReadingId:null;
 return bReadingId===d.bReadingId&&vReadingId===d.vReadingId?d:Object.freeze({...d,bReadingId,vReadingId});
}
export function readEditingWorkspace(value:unknown,photometry:PhotometerState|undefined,rows:readonly Measurement[],policy:unknown=EDITING_POLICY):EditingWorkspace{
 if(policy!==EDITING_POLICY&&policy!==EDITING_ANALYSIS_POLICY&&policy!==EDITING_NATIVE_CLUSTER_POLICY)throw new Error('Invalid editing policy');
 const r=record(value,['preparationSeedText','photometry','velocity']);
 const paper=policy===EDITING_ANALYSIS_POLICY||(policy===EDITING_NATIVE_CLUSTER_POLICY&&!!r.photometry&&typeof r.photometry==='object'&&Object.hasOwn(r.photometry,'clusterModulusText'));
 const p=record(r.photometry,['seedText','bReadingId','vReadingId',...(paper?['clusterModulusText']:[]),...(policy===EDITING_NATIVE_CLUSTER_POLICY?['nativeClusterDraft']:[])]),v=record(r.velocity,['measurementId','answerText','checked']);
 if(!readingAllowed(photometry,p.bReadingId,'B')||!readingAllowed(photometry,p.vReadingId,'V'))throw new Error('Invalid pending photometry selection');
 const eligible=velocityRows(rows);if(typeof v.checked!=='boolean'||(v.measurementId===null?eligible.length>0:!eligible.some(r=>r.id===v.measurementId)))throw new Error('Invalid velocity selection');
 const answerText=editingText(v.answerText);if(v.measurementId===null&&(answerText!==''||v.checked))throw new Error('Velocity draft requires a measurement');
 return Object.freeze({preparationSeedText:editingText(r.preparationSeedText),photometry:Object.freeze({seedText:editingText(p.seedText),bReadingId:p.bReadingId as number|null,vReadingId:p.vReadingId as number|null,...(paper?{clusterModulusText:editingText(p.clusterModulusText)}:{}),...(policy===EDITING_NATIVE_CLUSTER_POLICY?{nativeClusterDraft:readNativeClusterDraft(p.nativeClusterDraft)}:{})}),velocity:Object.freeze({measurementId:v.measurementId as number|null,answerText,checked:v.checked})});
}
export function velocityDraftCheck(draft:VelocityDraft,rows:readonly Measurement[]):Readonly<{kind:'unchecked'}|{kind:'result';accepted:boolean;relativeError:number}|{kind:'error';code:'velocity'|'zero-reference'|'precision-boundary'}>{
 if(!draft.checked)return {kind:'unchecked'};
 const row=velocityRows(rows).find(r=>r.id===draft.measurementId);
 try{if(!row||!(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(draft.answerText.trim())))throw new HubbleVelocityError('velocity');const result=checkHubbleVelocity(row.zFloat32,Number(draft.answerText));return {kind:'result',accepted:result.accepted,relativeError:result.relativeError};}
 catch(e){return {kind:'error',code:e instanceof HubbleVelocityError&&(e.code==='zero-reference'||e.code==='precision-boundary')?e.code:'velocity'};}
}
