import {GALAXY_TARGETS,measurementGalaxyTarget} from './galaxyIdentity';
import {analyzeHubble,type HubbleWorkspace} from './hubbleAnalysis';
import type {Measurement} from './spectrum';

export type LabArchiveEntry=Readonly<{acquisitionId:string;targetId:string;sha256:string}>;
export type HubbleLabProgress=Readonly<{
 targets:readonly Readonly<{id:string;archived:boolean;measured:boolean;inHubble:boolean}>[];
 archived:number;measured:number;inHubble:number;duplicateTargets:boolean;
 next:'acquire'|'measure'|'dataset'|'recipe'|'inputs'|'interpret';
}>;
/** New UI workflow summary, not an original scientific calculation or grade.
 * Only archive-bound galaxy records count. An object label, SSP header or
 * documented/example row cannot assert completion of an acquired target.
 * It exposes no catalogue z, recommended alignment, velocity or fit answer.
 * Progress is derived again after restoration; it is never serialized/trusted.
 */
export function hubbleLabProgress(archive:readonly LabArchiveEntry[],measurements:readonly Measurement[],workspace:HubbleWorkspace):HubbleLabProgress {
 const bound=measurements.filter(m=>m.origin?.kind==='catalog-galaxy-acquisition'&&archive.some(a=>a.acquisitionId===m.origin!.acquisitionId&&a.targetId===measurementGalaxyTarget(m.origin)&&a.sha256===m.sha256));
 const result=analyzeHubble(workspace,measurements);
 const included=workspace.rows.map(({input})=>input.kind==='measurement'?bound.find(m=>m.id===input.measurementId):undefined);
 const includedTargets=included.map(m=>measurementGalaxyTarget(m?.origin)).filter((id):id is string=>!!id);
 const duplicateTargets=new Set(includedTargets).size!==includedTargets.length;
 const targets=GALAXY_TARGETS.map(({id})=>Object.freeze({id,archived:archive.some(a=>a.targetId===id),measured:bound.some(m=>measurementGalaxyTarget(m.origin)===id),inHubble:includedTargets.filter(t=>t===id).length===1&&result.rows.some(r=>r.acquiredTargetId===id&&!r.issues.length)}));
 const archived=targets.filter(t=>t.archived).length,measured=targets.filter(t=>t.measured).length,inHubble=targets.filter(t=>t.inHubble).length;
 const next=archived<targets.length?'acquire':measured<targets.length?'measure':included.some(m=>!m)?'dataset':workspace.recipeId!=='vireo'?'recipe':inHubble<targets.length||workspace.rows.length!==targets.length||result.value===undefined?'inputs':'interpret';
 return Object.freeze({targets:Object.freeze(targets),archived,measured,inHubble,duplicateTargets,next});
}
