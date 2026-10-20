import{projectResource}from'./projectMetadata';
import {legacyClusterNotebook,comparisonHasLegacyScope,legacyScopeFromComparison} from './clusterComparisonScope';
import contractSource from '../../data/photometry/cluster-comparison-contract.json';
const contract=projectResource(contractSource);

import {nativeClusterValues,nativeClusterDraftFromFit,validNativeClusterParameters,readNativeClusterDraft,type NativeClusterParameters,type NativeClusterDraft} from './nativeCluster';
import {readClusterDatabaseWorkspace,type ClusterDatabaseWorkspace,type ClusterReferencePoint} from './clusterDatabase';
export const CLUSTER_COMPARISON_SHA256='1f2c524199f60429c846261d535abe99e0241f19a2b714aa02ed7dcffb504d92';
export const CLUSTER_COMPARISON_POLICY=contract.policy;
export const CLUSTER_DATASET_IDS=['ngc752','m34','mel20','pleiades','hyades','30dor','m41','m44','ic2391','m67','mel111','ic4665','m7','m16','cygob2','m39']as const;
export type ClusterDatasetId=typeof CLUSTER_DATASET_IDS[number];
export const CLUSTER_DATASETS=Object.freeze(contract.clusters.map(c=>Object.freeze({id:c.id as ClusterDatasetId,index:c.index,name:c.name,file:c.file,sha256:c.sha256,rows:c.rows,presetEbvTicks:c.presetEbvTicks})));
export function isClusterDatasetId(id:unknown):id is ClusterDatasetId{return typeof id==='string'&&CLUSTER_DATASET_IDS.some(i=>i===id);}
export function clusterDatasetInfo(id:ClusterDatasetId){const c=CLUSTER_DATASETS.find(c=>c.id===id);if(!c)throw new ClusterComparisonError();return c;}
export type LoadedClusterDataset=Readonly<{id:ClusterDatasetId;points:readonly ClusterReferencePoint[]}>;
export type ComparisonFit=Readonly<{parameters:NativeClusterParameters;reddeningSource:'manual'|'catalog'}>;
export type ClusterNotebook=Readonly<{draft:NativeClusterDraft|null;draftReddeningSource:'manual'|'catalog';fit:ComparisonFit|null}>;
export type ClusterComparisonWorkspace=Readonly<{pendingId:''|ClusterDatasetId;activeId:ClusterDatasetId|null;notebooks:Readonly<Partial<Record<ClusterDatasetId,ClusterNotebook>>>}>;
export const EMPTY_CLUSTER_NOTEBOOK:ClusterNotebook=Object.freeze({draft:null,draftReddeningSource:'manual',fit:null});
export const EMPTY_CLUSTER_COMPARISON:ClusterComparisonWorkspace=Object.freeze({pendingId:'',activeId:null,notebooks:Object.freeze({})});
export class ClusterComparisonError extends Error{constructor(){super('Invalid cluster reference comparison');this.name='ClusterComparisonError';}}
const keys=['modulusTicks','ebvTicks','ageIndex','modelIndex','offsetTicks','extinctionCorrected','interpretation']as const;
function object(value:unknown,keys:readonly string[]){if(!value||typeof value!=='object'||Array.isArray(value))throw new ClusterComparisonError();const r=value as Record<string,unknown>;if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw new ClusterComparisonError();return r;}
function source(value:unknown):'manual'|'catalog'{if(value!=='manual'&&value!=='catalog')throw new ClusterComparisonError();return value;}
function readNotebook(id:ClusterDatasetId,value:unknown):ClusterNotebook{
 const r=object(value,['draft','draftReddeningSource','fit']),draft=r.draft===null?null:readNativeClusterDraft(r.draft),draftReddeningSource=source(r.draftReddeningSource),info=clusterDatasetInfo(id);let fit:ComparisonFit|null=null;
 if(r.fit!==null){const f=object(r.fit,['parameters','reddeningSource']),p=object(f.parameters,keys)as unknown as NativeClusterParameters,reddeningSource=source(f.reddeningSource);if(!validNativeClusterParameters(p)||reddeningSource==='catalog'&&p.ebvTicks!==info.presetEbvTicks)throw new ClusterComparisonError();fit=Object.freeze({parameters:Object.freeze({...p,modulusTicks:p.modulusTicks+0,ebvTicks:p.ebvTicks+0,ageIndex:p.ageIndex+0,modelIndex:p.modelIndex+0,offsetTicks:p.offsetTicks+0}),reddeningSource});}
 if(draft===null&&draftReddeningSource!=='manual'||draftReddeningSource==='catalog'&&draft?.ebv!==String(info.presetEbvTicks/100))throw new ClusterComparisonError();return Object.freeze({draft,draftReddeningSource,fit});
}
export function readClusterComparisonWorkspace(value:unknown):ClusterComparisonWorkspace{
 const r=object(value,['pendingId','activeId','notebooks']);if(r.pendingId!==''&&!isClusterDatasetId(r.pendingId)||r.activeId!==null&&!isClusterDatasetId(r.activeId)||!r.notebooks||typeof r.notebooks!=='object'||Array.isArray(r.notebooks))throw new ClusterComparisonError();const raw=r.notebooks as Record<string,unknown>,ids=Object.keys(raw);if(ids.length>16||ids.some(id=>!isClusterDatasetId(id))||r.activeId!==null&&!Object.hasOwn(raw,r.activeId as string))throw new ClusterComparisonError();
 const notebooks=Object.fromEntries(CLUSTER_DATASET_IDS.filter(id=>Object.hasOwn(raw,id)).map(id=>[id,readNotebook(id,raw[id])]));return Object.freeze({pendingId:r.pendingId as ''|ClusterDatasetId,activeId:r.activeId as ClusterDatasetId|null,notebooks:Object.freeze(notebooks)});
}
export function comparisonFromLegacy(value:ClusterDatabaseWorkspace):ClusterComparisonWorkspace{
 const w=readClusterDatabaseWorkspace(value);return readClusterComparisonWorkspace({pendingId:w.pendingId,activeId:w.loaded?'m67':null,notebooks:w.loaded?{m67:legacyClusterNotebook(w)}:{}});
}
export function comparisonCanUseLegacy(w:ClusterComparisonWorkspace):boolean{return comparisonHasLegacyScope(w);}
export function comparisonToLegacy(w:ClusterComparisonWorkspace):ClusterDatabaseWorkspace{if(!comparisonHasLegacyScope(w))throw new ClusterComparisonError();return readClusterDatabaseWorkspace(legacyScopeFromComparison(w));}

export function comparisonNotebook(w:ClusterComparisonWorkspace):ClusterNotebook{if(w.activeId===null)throw new ClusterComparisonError();const b=w.notebooks[w.activeId];if(!b)throw new ClusterComparisonError();return b;}
export function comparisonDraft(b:ClusterNotebook):NativeClusterDraft{return b.draft??nativeClusterDraftFromFit(b.fit?{...b.fit.parameters,...nativeClusterValues(b.fit.parameters),points:[]}:null);}
function replace(w:ClusterComparisonWorkspace,b:ClusterNotebook):ClusterComparisonWorkspace{if(w.activeId===null)throw new ClusterComparisonError();return readClusterComparisonWorkspace({...w,notebooks:{...w.notebooks,[w.activeId]:b}});}
export function selectComparisonDataset(w:ClusterComparisonWorkspace,pendingId:''|ClusterDatasetId){return readClusterComparisonWorkspace({...w,pendingId});}
export function applyComparisonDataset(w:ClusterComparisonWorkspace,id:ClusterDatasetId){if(!isClusterDatasetId(id)||w.pendingId!==id)throw new ClusterComparisonError();return readClusterComparisonWorkspace({...w,activeId:id,notebooks:{...w.notebooks,[id]:w.notebooks[id]??EMPTY_CLUSTER_NOTEBOOK}});}
export function draftComparison(w:ClusterComparisonWorkspace,draft:NativeClusterDraft|null){const b=comparisonNotebook(w),prior=comparisonDraft(b),old=b.draft?b.draftReddeningSource:b.fit?.reddeningSource??'manual';return replace(w,{...b,draft,draftReddeningSource:draft!==null&&draft.ebv===prior.ebv?old:'manual'});}
export function useComparisonPreset(w:ClusterComparisonWorkspace){const b=comparisonNotebook(w);if(w.activeId===null)throw new ClusterComparisonError();return replace(w,{...b,draft:{...comparisonDraft(b),ebv:String(clusterDatasetInfo(w.activeId).presetEbvTicks/100)},draftReddeningSource:'catalog'});}
export function confirmComparison(w:ClusterComparisonWorkspace,parameters:NativeClusterParameters){const b=comparisonNotebook(w);return replace(w,{draft:null,draftReddeningSource:'manual',fit:{parameters,reddeningSource:b.draft?b.draftReddeningSource:b.fit?.reddeningSource??'manual'}});}
export function comparisonDisplayFit(w:ClusterComparisonWorkspace,data:LoadedClusterDataset){if(w.activeId!==data.id||data.points.length!==clusterDatasetInfo(data.id).rows)throw new ClusterComparisonError();const fit=comparisonNotebook(w).fit;return fit?Object.freeze({...fit.parameters,...nativeClusterValues(fit.parameters),points:data.points}):null;}
export function confirmedComparisonRows(w:ClusterComparisonWorkspace){return CLUSTER_DATASETS.flatMap(info=>{const fit=w.notebooks[info.id]?.fit;return fit?[Object.freeze({id:info.id,name:info.name,parameters:fit.parameters,reddeningSource:fit.reddeningSource,...nativeClusterValues(fit.parameters)})]:[];});}

/** Retry reloads an unavailable active dataset;the separate Load action applies an unrelated pending choice. */
export function comparisonRetryRequest(w:ClusterComparisonWorkspace,activeReady:boolean){if(!activeReady&&w.activeId!==null)return Object.freeze({id:w.activeId,apply:false});if(w.pendingId!=='')return Object.freeze({id:w.pendingId,apply:w.pendingId!==w.activeId});return null;}
