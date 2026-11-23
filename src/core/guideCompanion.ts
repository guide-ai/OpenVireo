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

/** One guide's progress, tagged with its lab. */
export type CompanionProgress=
 |Readonly<{lab:'hubble';progress:HubbleLabProgress}>
 |Readonly<{lab:'large-scale-structure';progress:LssLabProgress}>
 |Readonly<{lab:'object-x';progress:ObjectXLabProgress}>
 |Readonly<{lab:'stellar-classification';progress:ClassificationLabProgress}>
 |Readonly<{lab:'cluster-hr';progress:ClusterLabProgress}>
 |Readonly<{lab:'pulsars';progress:PulsarLabProgress}>
 |Readonly<{lab:'pleiades';progress:PleiadesLabProgress}>;

export type CompanionNow=Readonly<{
 lab:LabSlug;
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

const at=<S extends string>(lab:LabSlug,steps:readonly S[],next:S|'done'|'preserve',closing:S|'done'|'preserve'):CompanionNow=>{
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
 }
}
