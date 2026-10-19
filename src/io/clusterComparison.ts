import {CLUSTER_REFERENCE_ID_PATTERN} from '../core/clusterReferenceIdentity';
import {validateClusterReferenceRows} from './clusterReferenceRows';
import {boundedResourceBody,resourceSha256} from './boundedResource';
import {loadM67Dataset} from './clusterDatabase';
import {isClusterDatasetId,clusterDatasetInfo,ClusterComparisonError,type ClusterDatasetId,type LoadedClusterDataset} from '../core/clusterComparison';
const urls=import.meta.glob('../../data/photometry/cluster-reference-*.json',{query:'?url',import:'default',eager:true})as Record<string,string>;
const cache=new Map<ClusterDatasetId,Promise<LoadedClusterDataset>>();export const MAX_CLUSTER_DATASET_BYTES=256*1024;
export function loadClusterDataset(id:ClusterDatasetId):Promise<LoadedClusterDataset>{
 if(!isClusterDatasetId(id))return Promise.reject(new ClusterComparisonError());const old=cache.get(id);if(old)return old;const info=clusterDatasetInfo(id);
 const promise=(async()=>{if(id==='m67')return Object.freeze({id,points:await loadM67Dataset()});const url=urls['../../data/photometry/'+info.file];if(!url)throw new ClusterComparisonError();const response=await fetch(url,{cache:'no-cache'}),bytes=await boundedResourceBody(response,MAX_CLUSTER_DATASET_BYTES),hash=await resourceSha256(bytes);if(hash!==info.sha256)throw new ClusterComparisonError();return Object.freeze({id,points:validateClusterReferenceRows(bytes,info.rows,CLUSTER_REFERENCE_ID_PATTERN)});
 })().catch(()=>{cache.delete(id);throw new ClusterComparisonError();});cache.set(id,promise);return promise;
}
