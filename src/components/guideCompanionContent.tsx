import type {ReactNode} from 'react';
import {t} from '../i18n';
import {companionTarget,withoutStepNumber,type CompanionProgress} from '../core/guideCompanion';
import {hubbleCountsText,hubbleItemBody,hubbleItemTitle,hubbleNextText,hubblePhaseItem} from '../HubbleLabGuide';
import {lssCountsText,lssStepHelp} from '../LssLabGuide';
import {OBJECT_X_LAB_STEPS} from '../core/objectXLab';
import {OBJECT_X_GUIDE,OBJECT_X_LAB} from '../objectx/ObjectXMessages';
import {classificationStepBody,classificationStepTitle} from '../ClassificationLabGuide';
import {clusterNextText,clusterStepBody,clusterStepTitle} from '../ClusterLabGuideText';
import {pulsarNextText,pulsarStepBody,pulsarStepTitle} from '../PulsarLabGuide';
import {pleiadesStepBody,pleiadesStepTitle} from '../PleiadesLabGuide';
import {POLISH_MESSAGES} from '../polish/PolishMessages';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';

/** Front GUIDE-COMPANION [W]: what the companion strip shows for the guide in use. Every text is the guide's own (its menu name,
 * its step title or "Next:" line, and what it says under the step), so the strip and the guide never disagree and nothing is
 * written twice.
 * Front NEWCOMER NC3 (plan §2.3, review M5): the line is the current step's plain title in all seven guides (the classification
 * guide's «n · » number left out, since the strip says «Step n of m»), and Step details opens with the guide's "Next:" line, then
 * what the guide says under the step. Two warning states keep their "Next:" line as the line (Hubble's dataset, pulsars' setup
 * with Tracking off), and every closing state keeps its own line (the guide's closing "Next:" line, or companion.allDone). */
export type CompanionContent=Readonly<{
 /** The guide's name, as in the Exercise guides menu. */
 name:string;
 /** What to do now: the current step's title; a warning or closing state's own line (Front NEWCOMER NC3). */
 line:string;
 /** What the guide says under the current step (Step details). */
 details:ReactNode;
 /** The step's key in help/guideTargets.ts (Show me where). */
 target:string;
 /** The guide's list has no such step (every step is done): the strip then shows no "Step n of m". */
 closing:boolean;
 /** The guide's own counts line, for the guides whose steps are done once per galaxy, record or image: a step that takes
  * many actions then shows that the work is counted (Pleiades: its stars with a confirmed B−V). */
 counts?:string;
}>;

/** Step details for a step whose line is its title: the guide's "Next:" line first, then what the guide says under the step. */
const withNext=(next:string,body:ReactNode)=><><p>{next}</p>{body}</>;

export function companionContent(p:CompanionProgress):CompanionContent{
 const target=companionTarget(p);
 switch(p.lab){
  case 'hubble':{
   const next=p.progress.next,item=hubblePhaseItem(next),body=hubbleItemBody(item),plain=next!=='dataset'&&next!=='interpret';
   // The dataset warning and the closing interpret line stay the line; the other phases show their item's title.
   return {name:t('lab.nav'),line:plain?hubbleItemTitle(item):hubbleNextText(p.progress),details:plain?withNext(hubbleNextText(p.progress),body):body,target,closing:false,counts:hubbleCountsText(p.progress)};
  }
  case 'large-scale-structure':{
   const next=p.progress.next,name=t('lssLab.nav'),counts=lssCountsText(p.progress);
   return next==='done'?{name,line:SHELL.companion.allDone,details:<p>{lssStepHelp('save')}</p>,target,closing:true,counts}
    :{name,line:t(`lssLab.step.${next}`),details:<p>{lssStepHelp(next)}</p>,target,closing:false,counts};
  }
  case 'object-x':{
   const next=p.progress.next,name=OBJECT_X_LAB.guideNav,counts=OBJECT_X_GUIDE.counts(OBJECT_X_LAB_STEPS.filter(step=>p.progress.done[step]).length,OBJECT_X_LAB_STEPS.length,p.progress.summary.imagesOfTarget);
   if(next==='done')return {name,line:SHELL.companion.allDone,details:<p>{OBJECT_X_GUIDE.steps.save[1]}</p>,target,closing:true,counts};
   const [title,help]=OBJECT_X_GUIDE.steps[next];return {name,line:title,details:<p>{help}</p>,target,closing:false,counts};
  }
  case 'stellar-classification':{
   const next=p.progress.next,name=t('classLab.nav'),body=classificationStepBody(next,false);
   return next==='save'?{name,line:t('classLab.next.save'),details:body,target,closing:false}
    :{name,line:withoutStepNumber(classificationStepTitle(next)),details:withNext(t(`classLab.next.${next}`),body),target,closing:false};
  }
  case 'cluster-hr':{
   const next=p.progress.next,name=POLISH_MESSAGES.clusterGuide.nav;
   // The guide's own closing line points at a section of the guide ("see below"); the strip says it in its own words.
   return next==='preserve'?{name,line:SHELL.companion.allDone,details:clusterStepBody(next),target,closing:true}
    :{name,line:clusterStepTitle(next),details:withNext(clusterNextText(next),clusterStepBody(next)),target,closing:false};
  }
  case 'pulsars':{
   const next=p.progress.next,body=pulsarStepBody(next,p.progress,false),own=next==='save'||next==='setup'&&p.progress.trackingOff;
   // Setup with Tracking off names the control that finishes it; save is the closing state: both keep their "Next:" line.
   return {name:t('pulsarLab.nav'),line:own?pulsarNextText(p.progress):pulsarStepTitle(next),details:own?body:withNext(pulsarNextText(p.progress),body),target,closing:false};
  }
  // Front NEWCOMER NC1: the first look has no window; three of its details are the observatory band's own help lines.
  case 'first-look':{
   const next=p.progress.next,F=SHELL.firstLook;
   switch(next){
    case 'dome':return {name:F.name,line:F.dome,details:<p>{t('sky.step1Help')}</p>,target,closing:false};
    case 'point':return {name:F.name,line:F.point,details:<p>{t('sky.step2Help')}</p>,target,closing:false};
    case 'look':return {name:F.name,line:F.look,details:<p>{t('sky.step3Help')}</p>,target,closing:false};
    case 'spectrum':return {name:F.name,line:F.spectrum,details:<p>{F.spectrumDetail}</p>,target,closing:false};
    case 'done':return {name:F.name,line:F.closing,details:<p>{t('home.labsHint')}</p>,target,closing:true};
   }
  }
  case 'pleiades':{
   const next=p.progress.next,body=pleiadesStepBody(next,false),counts=t('pleiadesLab.coverage',{count:p.progress.colorTargets,total:p.progress.sampleTargets});
   return next==='save'?{name:t('pleiadesLab.nav'),line:t('pleiadesLab.next.save'),details:body,target,closing:false,counts}
    :{name:t('pleiadesLab.nav'),line:pleiadesStepTitle(next),details:withNext(t(`pleiadesLab.next.${next}`),body),target,closing:false,counts};
  }
 }
}
