/** WEB-CLUSTER-GUIDE-01: progress of the cluster HR (E05, database route) student guide, recomputed from the current
 * state on every render. "Done" means an observable action or a currently visible result(dataset loaded, values
 * inspected, valid trial with its model shown, confirmation present, report opened); it never grades a fit. Saving is
 * listed as instructions only: no saved mark without a genuine download/restore witness. Pure: no React, i18n or I/O. */
import type{ClusterDatasetId}from'./clusterComparison';

export type ClusterLabStep='load'|'inspect'|'trial'|'confirm'|'report';
export const CLUSTER_LAB_STEPS:readonly ClusterLabStep[]=Object.freeze(['load','inspect','trial','confirm','report']);
/** Pending dependencies of the full E05 exercise(phase1 items1.7 and1.9);never counted or ticked here. */
export const CLUSTER_LAB_PENDING=Object.freeze(['pointing','ownPlot']as const);
export type ClusterLabSummary=Readonly<{
 /** The active dataset is verified and shown. */
 loaded:boolean;
 /** The values table was opened or a reference point is inspected for the active dataset. */
 inspected:boolean;
 /** A whole valid trial is drawn with its selected original isochrone loaded. */
 validTrial:boolean;
 /** The active notebook holds a confirmation. */
 confirmed:boolean;
 /** View/Print Parameters was opened for the active dataset. */
 reportOpened:boolean;
}>;
export type ClusterLabProgress=Readonly<{done:Readonly<Record<ClusterLabStep,boolean>>;doneCount:number;next:ClusterLabStep|'preserve'}>;
export function clusterLabProgress(s:ClusterLabSummary):ClusterLabProgress{
 const done=Object.freeze({load:s.loaded,inspect:s.loaded&&s.inspected,trial:s.loaded&&s.validTrial,confirm:s.loaded&&s.confirmed,report:s.loaded&&s.reportOpened});
 return Object.freeze({done,doneCount:CLUSTER_LAB_STEPS.filter(k=>done[k]).length,next:CLUSTER_LAB_STEPS.find(k=>!done[k])??'preserve'});
}

/** Per-dataset action witnesses(values opened, report opened). Adding an existing witness returns the same object,
 * so effects that record a witness cannot loop. Witnesses of datasets without a notebook are dropped. */
export type ClusterLabWitness=Readonly<{inspect:readonly ClusterDatasetId[];report:readonly ClusterDatasetId[]}>;
export const EMPTY_CLUSTER_LAB_WITNESS:ClusterLabWitness=Object.freeze({inspect:Object.freeze([]),report:Object.freeze([])});
export function addClusterLabWitness(w:ClusterLabWitness,kind:keyof ClusterLabWitness,id:ClusterDatasetId):ClusterLabWitness{return w[kind].includes(id)?w:Object.freeze({...w,[kind]:Object.freeze([...w[kind],id])});}
export function retainClusterLabWitness(w:ClusterLabWitness,notebooks:Readonly<Partial<Record<ClusterDatasetId,unknown>>>):ClusterLabWitness{
 const keep=(ids:readonly ClusterDatasetId[])=>ids.filter(id=>Object.hasOwn(notebooks,id));const inspect=keep(w.inspect),report=keep(w.report);
 return inspect.length===w.inspect.length&&report.length===w.report.length?w:Object.freeze({inspect:Object.freeze(inspect),report:Object.freeze(report)});
}
