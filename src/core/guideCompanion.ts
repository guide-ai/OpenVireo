/** Front GUIDE-COMPANION [W]: what the guide companion (components/GuideCompanion.tsx) shows for the guide in use, derived from
 * that guide's own progress object. It adds no rule of its own: the current step is each core's `next`, recomputed from the
 * current state on every render; nothing is stored, nothing is judged and no answer or expected value is involved.
 * Pure: no React, i18n, clock or I/O. */
import type {LabSlug} from '../seo/labSlugs';
import type {HubbleLabProgress} from './hubbleLab';
import {LSS_LAB_STEPS,type LssLabProgress} from './lssLab';
import {OBJECT_X_LAB_STEPS,type ObjectXLabProgress} from './objectXLab';
import {CLASSIFICATION_LAB_STEPS,type ClassificationLabProgress} from './classificationLab';
import {CLUSTER_LAB_STEPS,type ClusterLabProgress} from './clusterLab';
import {PULSAR_LAB_STEPS,type PulsarLabProgress} from './pulsarLab';
import {PLEIADES_LAB_STEPS,type PleiadesLabProgress} from './pleiadesLab';
import {FIRST_LOOK_STEPS,type FirstLookProgress} from './firstLook';

/** The guides the strip can show: the seven labs' guides and the first look (core/firstLook.ts, Front NEWCOMER NC1), a guide
 * without a window of its own. */
export type CompanionGuide=LabSlug|'first-look';

/** One guide's progress, tagged with its lab. */
export type CompanionProgress=
 |Readonly<{lab:'hubble';progress:HubbleLabProgress}>
 |Readonly<{lab:'large-scale-structure';progress:LssLabProgress}>
 |Readonly<{lab:'object-x';progress:ObjectXLabProgress}>
 |Readonly<{lab:'stellar-classification';progress:ClassificationLabProgress}>
 |Readonly<{lab:'cluster-hr';progress:ClusterLabProgress}>
 |Readonly<{lab:'pulsars';progress:PulsarLabProgress}>
 |Readonly<{lab:'pleiades';progress:PleiadesLabProgress}>
 |Readonly<{lab:'first-look';progress:FirstLookProgress}>;

export type CompanionNow=Readonly<{
 lab:CompanionGuide;
 /** The guide's own id of the current step (Hubble: its phase). */
 step:string;
 /** 1-based position of the current step in the guide's list. */
 index:number;
 /** Steps in the guide's list. */
 total:number;
 /** Every counted step of the guide is done; `step` is then its closing state (never a judgement of the work). */
 allDone:boolean;
}>;

/** The five list items of the Hubble guide; its progress reports a phase, and item 4 (keep the investigation) has no mark. */
export const HUBBLE_GUIDE_ITEMS=5;
const HUBBLE_ITEM:Readonly<Record<HubbleLabProgress['next'],number>>=Object.freeze({acquire:1,measure:2,dataset:3,recipe:3,inputs:3,interpret:5});

const at=<S extends string>(lab:CompanionGuide,steps:readonly S[],next:S|'done'|'preserve',closing:S|'done'|'preserve'):CompanionNow=>{
 const index=steps.indexOf(next as S);
 return Object.freeze({lab,step:next,index:index<0?steps.length:index+1,total:steps.length,allDone:next===closing});
};

export function companionNow(p:CompanionProgress):CompanionNow{
 switch(p.lab){
  case 'hubble':return Object.freeze({lab:p.lab,step:p.progress.next,index:HUBBLE_ITEM[p.progress.next],total:HUBBLE_GUIDE_ITEMS,allDone:p.progress.next==='interpret'});
  case 'large-scale-structure':return at(p.lab,LSS_LAB_STEPS,p.progress.next,'done');
  case 'object-x':return at(p.lab,OBJECT_X_LAB_STEPS,p.progress.next,'done');
  case 'stellar-classification':return at(p.lab,CLASSIFICATION_LAB_STEPS,p.progress.next,'save');
  case 'cluster-hr':return at(p.lab,CLUSTER_LAB_STEPS,p.progress.next,'preserve');
  case 'pulsars':return at(p.lab,PULSAR_LAB_STEPS,p.progress.next,'save');
  case 'pleiades':return at(p.lab,PLEIADES_LAB_STEPS,p.progress.next,'save');
  case 'first-look':return at(p.lab,FIRST_LOOK_STEPS,p.progress.next,'done');
 }
}

/** The key of the current step's controls in help/guideTargets.ts (Show me where). It is the step itself, except where a step
 * is a cycle of several actions that the guide's own state tells apart: the two Object X imaging steps (set a later time, copy
 * the coordinates, point, take the image), the Pleiades sample step (the selected star's readings, notebook entries and B−V,
 * as for the first star) and the pulsar setup step while tracking is off. It changes what is outlined, never the step shown. */
export function companionTarget(p:CompanionProgress):string{
 switch(p.lab){
  case 'object-x':{const a=p.progress.imageAction;return a===null?p.progress.next:a==='clock'?'repeat':a==='expose'?'image':`image-${a}`;}// image-copy, image-point, image-any
  case 'pulsars':return p.progress.next==='setup'&&p.progress.trackingOff?'setup-tracking':p.progress.next;
  case 'pleiades':{const need=p.progress.sampleNeed;return need&&need!=='done'?need:p.progress.next;}
  default:return p.progress.next;
 }
}
