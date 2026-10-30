import{projectResource}from'./projectMetadata';
import contractSource from '../../data/photometry/cluster-dataset-contract.json';
const contract=projectResource(contractSource);

import {nativeClusterValues,validNativeClusterParameters,readNativeClusterDraft,nativeClusterDraftFromFit,type NativeClusterParameters,type NativeClusterDraft} from './nativeClusterParameters';
export const CLUSTER_DATABASE_SHA256='228907286f3538ccc0b99995ca6f6f871b6e0d93aa2056b931b83cb2d120b152';
export const CLUSTER_DATABASE_POLICY=contract.policy;
export const M67=Object.freeze({...contract.dataset});
export type ClusterReferencePoint=Readonly<{id:string;ra:number;dec:number;v:number;bMinusV:number}>;
export type ClusterReddeningSource='manual'|'catalog-m67';
export type ClusterDatabaseFit=Readonly<{parameters:NativeClusterParameters;reddeningSource:ClusterReddeningSource}>;
export type ClusterDatabaseWorkspace=Readonly<{pendingId:''|'m67';loaded:boolean;draft:NativeClusterDraft|null;draftReddeningSource:ClusterReddeningSource;fit:ClusterDatabaseFit|null}>;
export const EMPTY_CLUSTER_DATABASE:ClusterDatabaseWorkspace=Object.freeze({pendingId:'',loaded:false,draft:null,draftReddeningSource:'manual',fit:null});
export class ClusterDatabaseError extends Error{constructor(){super('Invalid cluster database workspace');this.name='ClusterDatabaseError';}}
function object(value:unknown,keys:readonly string[]){if(!value||typeof value!=='object'||Array.isArray(value))throw new ClusterDatabaseError();const r=value as Record<string,unknown>;if(Object.keys(r).length!==keys.length||keys.some(k=>!Object.hasOwn(r,k)))throw new ClusterDatabaseError();return r;}
function source(value:unknown):ClusterReddeningSource{if(value!=='manual'&&value!=='catalog-m67')throw new ClusterDatabaseError();return value;}
export function readClusterDatabaseWorkspace(value:unknown):ClusterDatabaseWorkspace{
 const r=object(value,['pendingId','loaded','draft','draftReddeningSource','fit']);if(!['','m67'].includes(r.pendingId as string)||typeof r.loaded!=='boolean')throw new ClusterDatabaseError();
 const draft=r.draft===null?null:readNativeClusterDraft(r.draft),draftReddeningSource=source(r.draftReddeningSource);let fit:ClusterDatabaseFit|null=null;
 if(r.fit!==null){const f=object(r.fit,['parameters','reddeningSource']),p=object(f.parameters,['modulusTicks','ebvTicks','ageIndex','modelIndex','offsetTicks','extinctionCorrected','interpretation'])as unknown as NativeClusterParameters;if(!validNativeClusterParameters(p))throw new ClusterDatabaseError();const reddeningSource=source(f.reddeningSource);if(reddeningSource==='catalog-m67'&&p.ebvTicks!==M67.presetEbvTicks)throw new ClusterDatabaseError();fit=Object.freeze({parameters:Object.freeze({...p,modulusTicks:p.modulusTicks+0,ebvTicks:p.ebvTicks+0,ageIndex:p.ageIndex+0,modelIndex:p.modelIndex+0,offsetTicks:p.offsetTicks+0}),reddeningSource});}
 if(!r.loaded&&(draft!==null||fit!==null)||draft===null&&draftReddeningSource!=='manual'||draftReddeningSource==='catalog-m67'&&draft?.ebv!=='0.03')throw new ClusterDatabaseError();return Object.freeze({pendingId:r.pendingId as ''|'m67',loaded:r.loaded,draft,draftReddeningSource,fit});
}
export function clusterDatabaseDisplayFit(w:ClusterDatabaseWorkspace,points:readonly ClusterReferencePoint[]){return w.fit?Object.freeze({...w.fit.parameters,...nativeClusterValues(w.fit.parameters),points}):null;}
export function clusterDatabaseDraft(w:ClusterDatabaseWorkspace):NativeClusterDraft{return w.draft??nativeClusterDraftFromFit(w.fit?{...w.fit.parameters,...nativeClusterValues(w.fit.parameters),points:[]}:null);}
export function setClusterDatabaseDraft(w:ClusterDatabaseWorkspace,draft:NativeClusterDraft|null):ClusterDatabaseWorkspace{
 const prior=clusterDatabaseDraft(w),oldSource=w.draft?w.draftReddeningSource:w.fit?.reddeningSource??'manual';return readClusterDatabaseWorkspace({...w,draft,draftReddeningSource:draft!==null&&draft.ebv===prior.ebv?oldSource:'manual'});
}
export function useClusterCatalogReddening(w:ClusterDatabaseWorkspace):ClusterDatabaseWorkspace{if(!w.loaded)throw new ClusterDatabaseError();return readClusterDatabaseWorkspace({...w,draft:{...clusterDatabaseDraft(w),ebv:'0.03'},draftReddeningSource:'catalog-m67'});}
export function confirmClusterDatabase(w:ClusterDatabaseWorkspace,p:NativeClusterParameters):ClusterDatabaseWorkspace{
 if(!w.loaded||!validNativeClusterParameters(p))throw new ClusterDatabaseError();return readClusterDatabaseWorkspace({...w,draft:null,draftReddeningSource:'manual',fit:{parameters:p,reddeningSource:w.draft?w.draftReddeningSource:w.fit?.reddeningSource??'manual'}});
}

/** Live intent transitions; loaded reference data and unapplied selection are distinct. */
export function selectClusterDataset(w:ClusterDatabaseWorkspace,pendingId:''|'m67'):ClusterDatabaseWorkspace{return readClusterDatabaseWorkspace({...w,pendingId});}
export function markClusterDatasetLoaded(w:ClusterDatabaseWorkspace):ClusterDatabaseWorkspace{if(w.pendingId!=='m67')throw new ClusterDatabaseError();return readClusterDatabaseWorkspace({...w,loaded:true});}
export function emptyClusterDatabaseWorkspace(w:ClusterDatabaseWorkspace):boolean{return w.pendingId===''&&!w.loaded&&w.draft===null&&w.fit===null;}
export function clusterReddeningSourceChanged(w:ClusterDatabaseWorkspace):boolean{return !!w.draft&&!!w.fit&&w.draftReddeningSource!==w.fit.reddeningSource;}
