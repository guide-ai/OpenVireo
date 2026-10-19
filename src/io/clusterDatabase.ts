import {validateClusterReferenceRows} from './clusterReferenceRows';
import {boundedResourceBody,resourceSha256} from './boundedResource';
import url from '../../data/photometry/cluster-m67.json?url';
import {ClusterDatabaseError,M67,type ClusterReferencePoint} from '../core/clusterDatabase';
let cached:Promise<readonly ClusterReferencePoint[]>|null=null;
const MAX_DATASET_BYTES=256*1024;
export function loadM67Dataset():Promise<readonly ClusterReferencePoint[]>{
 if(cached)return cached;
 cached=(async()=>{const response=await fetch(url,{cache:'no-cache'}),bytes=await boundedResourceBody(response,MAX_DATASET_BYTES),hash=await resourceSha256(bytes);if(hash!==M67.sha256)throw new ClusterDatabaseError();return validateClusterReferenceRows(bytes,M67.rows,/^N0730\.DAT@[0-9]+$/);
 })().catch(()=>{cached=null;throw new ClusterDatabaseError();});return cached;
}
