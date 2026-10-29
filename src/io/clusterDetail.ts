/** Lazy, validated access to the Front V2 derived cluster data (data/clusters, user approval of 2026-10-28): the per-point
 * sidecar (native ID, U−B, flag bits, spectral code) and the 16 CLUSTERS.DAT comments. Bundled as JSON modules (no network
 * beyond the app's own chunks); every entry is validated before use. */
import {validClusterPointDetail,type ClusterPointDetail} from '../core/clusterReport';

export type ClusterDetailIndex=Readonly<{detail:(id:string)=>ClusterPointDetail|undefined;comment:(clusterId:string)=>string|undefined}>;
let shared:Promise<ClusterDetailIndex>|null=null;
export function loadClusterDetail():Promise<ClusterDetailIndex>{
 shared??=Promise.all([import('../../data/clusters/cluster-reference-detail.json'),import('../../data/clusters/cluster-comments.json')]).then(([d,c])=>{
  const points=d.default.points as unknown as Record<string,unknown>,map=new Map<string,ClusterPointDetail>();
  for(const [k,v] of Object.entries(points)){if(!validClusterPointDetail(v))throw new Error('Invalid cluster detail');map.set(k,v);}
  const comments=new Map(c.default.clusters.map(x=>[x.id,x.comment] as const));
  if(map.size!==2873||comments.size!==16)throw new Error('Incomplete cluster detail');
  return Object.freeze({detail:(id:string)=>map.get(id),comment:(id:string)=>comments.get(id)});
 }).catch(error=>{shared=null;throw error;});
 return shared;
}
