import{projectResource}from'./projectMetadata';
import {isClusterReferenceId} from './clusterReferenceIdentity';
import type {NativeClusterParameters} from './nativeCluster';
import contractSource from '../../data/photometry/cluster-exclusion-contract.json';
const contract=projectResource(contractSource);

import {readClusterComparisonWorkspace,clusterDatasetInfo,comparisonNotebook,comparisonDraft,confirmComparison,type ClusterComparisonWorkspace,type ClusterDatasetId,type LoadedClusterDataset} from './clusterComparison';
export const CLUSTER_SELECTION_POLICY=contract.policy;
export const CLUSTER_SELECTION_SHA256='f6f9b8a6ca682b97f8f76bdd4b23cb5f24624a3a60f18b468b6150da9427e13a';
export type ClusterSelectionWorkspace=Readonly<{comparison:ClusterComparisonWorkspace;excluded:Readonly<Partial<Record<ClusterDatasetId,readonly string[]>>>;picked:Readonly<Partial<Record<ClusterDatasetId,string>>>}>;
export class ClusterSelectionError extends Error{constructor(){super('Invalid reference point selection');this.name='ClusterSelectionError';}}
function object(x:unknown,keys:readonly string[]){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==keys.length||keys.some(k=>!Object.hasOwn(x,k)))throw new ClusterSelectionError();return x as Record<string,unknown>;}
/** Structural bounds only;source identity membership is admitted separately before serialization orrestore commit. */
export function readClusterSelectionWorkspace(value:unknown,normalize=false):ClusterSelectionWorkspace{
 const r=object(value,['comparison','excluded','picked']),comparison=readClusterComparisonWorkspace(r.comparison);if(!r.excluded||typeof r.excluded!=='object'||Array.isArray(r.excluded))throw new ClusterSelectionError();const raw=r.excluded as Record<string,unknown>,excluded:Partial<Record<ClusterDatasetId,readonly string[]>>={};
 for(const id of Object.keys(raw)){if(!Object.hasOwn(comparison.notebooks,id))throw new ClusterSelectionError();const rows=raw[id];if(!Array.isArray(rows)||rows.length===0||rows.length>clusterDatasetInfo(id as ClusterDatasetId).rows||rows.some(p=>!isClusterReferenceId(p))||new Set(rows).size!==rows.length||!normalize&&rows.some((id,i)=>i>0&&String(rows[i-1])>=String(id)))throw new ClusterSelectionError();excluded[id as ClusterDatasetId]=Object.freeze([...rows].sort());}
 if(!r.picked||typeof r.picked!=='object'||Array.isArray(r.picked))throw new ClusterSelectionError();const picked:Partial<Record<ClusterDatasetId,string>>={};for(const id of Object.keys(r.picked)){const v=(r.picked as Record<string,unknown>)[id];if(!Object.hasOwn(comparison.notebooks,id)||!isClusterReferenceId(v))throw new ClusterSelectionError();picked[id as ClusterDatasetId]=v;}
 if(!normalize&&Object.keys(excluded).length===0&&Object.keys(picked).length===0)throw new ClusterSelectionError();
 const ordered=Object.fromEntries(Object.keys(comparison.notebooks).filter(id=>Object.hasOwn(excluded,id)).map(id=>[id,excluded[id as ClusterDatasetId]]));return Object.freeze({comparison,excluded:Object.freeze(ordered),picked:Object.freeze(Object.fromEntries(Object.keys(comparison.notebooks).filter(id=>Object.hasOwn(picked,id)).map(id=>[id,picked[id as ClusterDatasetId]])))});
}
export function selectionFromComparison(comparison:ClusterComparisonWorkspace):ClusterSelectionWorkspace{return readClusterSelectionWorkspace({comparison,excluded:{},picked:{}},true);}
export function validateSelectionSource(w:ClusterSelectionWorkspace,data:LoadedClusterDataset):void{if(!Object.hasOwn(w.comparison.notebooks,data.id)||data.points.length!==clusterDatasetInfo(data.id).rows)throw new ClusterSelectionError();const ids=new Set(data.points.map(p=>p.id));if((w.excluded[data.id]??[]).some(id=>!ids.has(id))||w.picked[data.id]!==undefined&&!ids.has(w.picked[data.id]!))throw new ClusterSelectionError();if(w.comparison.notebooks[data.id]?.fit&&data.points.length-(w.excluded[data.id]?.length??0)<2)throw new ClusterSelectionError();}
export function includedClusterPoints(w:ClusterSelectionWorkspace,data:LoadedClusterDataset){validateSelectionSource(w,data);const excluded=new Set(w.excluded[data.id]??[]);return Object.freeze(data.points.filter(p=>!excluded.has(p.id)));}
/** A changed source selection requires a new manual confirmation;retain exact existing draft text andprovenance. */
function unconfirm(comparison:ClusterComparisonWorkspace){const b=comparisonNotebook(comparison);if(b.fit===null)return comparison;return readClusterComparisonWorkspace({...comparison,notebooks:{...comparison.notebooks,[comparison.activeId!]:{draft:comparisonDraft(b),draftReddeningSource:b.draft?b.draftReddeningSource:b.fit?.reddeningSource??'manual',fit:null}}});}
export function excludeClusterPoint(w:ClusterSelectionWorkspace,data:LoadedClusterDataset,id:string):ClusterSelectionWorkspace{
 validateSelectionSource(w,data);if(w.comparison.activeId!==data.id||!data.points.some(p=>p.id===id))throw new ClusterSelectionError();const prior=w.excluded[data.id]??[];if(prior.includes(id))return w;return readClusterSelectionWorkspace({...w,comparison:unconfirm(w.comparison),excluded:{...w.excluded,[data.id]:[...prior,id]}},true);
}
export function restoreClusterPoints(w:ClusterSelectionWorkspace):ClusterSelectionWorkspace{const id=w.comparison.activeId;if(id===null)throw new ClusterSelectionError();if(!w.excluded[id])return w;const excluded={...w.excluded};delete excluded[id];return readClusterSelectionWorkspace({...w,comparison:unconfirm(w.comparison),excluded},true);}

export function chooseClusterPoint(w:ClusterSelectionWorkspace,data:LoadedClusterDataset,id:string):ClusterSelectionWorkspace{validateSelectionSource(w,data);if(w.comparison.activeId!==data.id||id!==''&&!data.points.some(p=>p.id===id))throw new ClusterSelectionError();if((w.picked[data.id]??'')===id)return w;const picked={...w.picked};if(id==='')delete picked[data.id];else picked[data.id]=id;return Object.freeze({...w,picked:Object.freeze(picked)});}
/** Owner-validated comparison transitions retain immutable selection maps andtheir identity. */
export function updateClusterSelectionComparison(w:ClusterSelectionWorkspace,comparison:ClusterComparisonWorkspace):ClusterSelectionWorkspace{if([...Object.keys(w.excluded),...Object.keys(w.picked)].some(id=>!Object.hasOwn(comparison.notebooks,id)))throw new ClusterSelectionError();return Object.freeze({...w,comparison});}
export function confirmClusterSelection(w:ClusterSelectionWorkspace,data:LoadedClusterDataset,parameters:NativeClusterParameters):ClusterSelectionWorkspace{if(w.comparison.activeId!==data.id||includedClusterPoints(w,data).length<2)throw new ClusterSelectionError();return updateClusterSelectionComparison(w,confirmComparison(w.comparison,parameters));}
