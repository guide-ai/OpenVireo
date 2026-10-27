import{it,expect}from'vitest';
import{addClusterLabWitness,clusterLabProgress,retainClusterLabWitness,CLUSTER_LAB_PENDING,CLUSTER_LAB_STEPS,EMPTY_CLUSTER_LAB_WITNESS,type ClusterLabSummary}from'./clusterLab';
const none:ClusterLabSummary={loaded:false,inspected:false,validTrial:false,confirmed:false,reportOpened:false};

it('counts only observable database actions;nothing is done without a loaded dataset and saving is never a step',()=>{
 expect(CLUSTER_LAB_STEPS).toEqual(['load','inspect','trial','confirm','report']);expect(CLUSTER_LAB_STEPS).not.toContain('save');expect(CLUSTER_LAB_PENDING).toEqual(['pointing','ownPlot']);
 expect(clusterLabProgress(none)).toEqual({done:{load:false,inspect:false,trial:false,confirm:false,report:false},doneCount:0,next:'load'});
 // Stale witnesses of an unloaded dataset never tick.
 expect(clusterLabProgress({...none,inspected:true,validTrial:true,confirmed:true,reportOpened:true}).doneCount).toBe(0);
 expect(clusterLabProgress({...none,loaded:true}).next).toBe('inspect');
 expect(clusterLabProgress({...none,loaded:true,inspected:true}).next).toBe('trial');
 expect(clusterLabProgress({...none,loaded:true,inspected:true,validTrial:true,reportOpened:true}).next).toBe('confirm');
 const all=clusterLabProgress({loaded:true,inspected:true,validTrial:true,confirmed:true,reportOpened:true});expect(all.doneCount).toBe(5);expect(all.next).toBe('preserve');
 // Live state:a cleared confirmation(e.g. after an exclusion)removes its mark again.
 expect(clusterLabProgress({loaded:true,inspected:true,validTrial:true,confirmed:false,reportOpened:true})).toMatchObject({doneCount:4,next:'confirm'});
});

it('per-dataset witnesses are idempotent(same object,no render loop)and dropped with their notebook',()=>{
 const a=addClusterLabWitness(EMPTY_CLUSTER_LAB_WITNESS,'inspect','m67');expect(a.inspect).toEqual(['m67']);expect(a.report).toEqual([]);expect(addClusterLabWitness(a,'inspect','m67')).toBe(a);
 const b=addClusterLabWitness(addClusterLabWitness(a,'report','m67'),'inspect','hyades');expect(b).toEqual({inspect:['m67','hyades'],report:['m67']});
 expect(retainClusterLabWitness(b,{m67:{},hyades:{}})).toBe(b);expect(retainClusterLabWitness(b,{hyades:{}})).toEqual({inspect:['hyades'],report:[]});expect(retainClusterLabWitness(b,{})).toEqual(EMPTY_CLUSTER_LAB_WITNESS);
});
