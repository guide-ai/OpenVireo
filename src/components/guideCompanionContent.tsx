import type {ReactNode} from 'react';
import {t} from '../i18n';
import type {CompanionProgress} from '../core/guideCompanion';
import {hubbleItemBody,hubbleNextText,hubblePhaseItem} from '../HubbleLabGuide';
import {lssStepHelp} from '../LssLabGuide';
import {OBJECT_X_GUIDE,OBJECT_X_LAB} from '../objectx/ObjectXMessages';
import {classificationStepBody} from '../ClassificationLabGuide';
import {clusterNextText,clusterStepBody} from '../ClusterLabGuideText';
import {pulsarNextText,pulsarStepBody} from '../PulsarLabGuide';
import {pleiadesStepBody} from '../PleiadesLabGuide';
import {POLISH_MESSAGES} from '../polish/PolishMessages';
import {APP_SHELL_MESSAGES as SHELL} from './AppShellMessages';

/** Front GUIDE-COMPANION [W]: what the companion strip shows for the guide in use. Every text is the guide's own (its menu name,
 * its "Next:" line or step title, and what it says under the step), so the strip and the guide never disagree and nothing is
 * written twice. */
export type CompanionContent=Readonly<{
 /** The guide's name, as in the Exercise guides menu. */
 name:string;
 /** What to do now: the guide's "Next:" line, or the current step's title for the guides without one. */
 line:string;
 /** What the guide says under the current step (Step details). */
 details:ReactNode;
 /** The step's key in help/guideTargets.ts (Show me where). */
 target:string;
 /** The guide's list has no such step (every step is done): the strip then shows no "Step n of m". */
 closing:boolean;
}>;

export function companionContent(p:CompanionProgress):CompanionContent{
 switch(p.lab){
  case 'hubble':{const next=p.progress.next;return {name:t('lab.nav'),line:hubbleNextText(p.progress),details:hubbleItemBody(hubblePhaseItem(next)),target:next,closing:false};}
  case 'large-scale-structure':{
   const next=p.progress.next,name=t('lssLab.nav');
   return next==='done'?{name,line:SHELL.companion.allDone,details:<p>{lssStepHelp('save')}</p>,target:next,closing:true}
    :{name,line:t(`lssLab.step.${next}`),details:<p>{lssStepHelp(next)}</p>,target:next,closing:false};
  }
  case 'object-x':{
   const next=p.progress.next,name=OBJECT_X_LAB.guideNav;
   if(next==='done')return {name,line:SHELL.companion.allDone,details:<p>{OBJECT_X_GUIDE.steps.save[1]}</p>,target:next,closing:true};
   const [title,help]=OBJECT_X_GUIDE.steps[next];return {name,line:title,details:<p>{help}</p>,target:next,closing:false};
  }
  case 'stellar-classification':{const next=p.progress.next;return {name:t('classLab.nav'),line:t(`classLab.next.${next}`),details:classificationStepBody(next,false),target:next,closing:false};}
  case 'cluster-hr':{
   const next=p.progress.next,name=POLISH_MESSAGES.clusterGuide.nav;
   // The guide's own closing line points at a section of the guide ("see below"); the strip says it in its own words.
   return next==='preserve'?{name,line:SHELL.companion.allDone,details:clusterStepBody(next),target:next,closing:true}
    :{name,line:clusterNextText(next),details:clusterStepBody(next),target:next,closing:false};
  }
  case 'pulsars':{
   const next=p.progress.next;
   return {name:t('pulsarLab.nav'),line:pulsarNextText(p.progress),details:pulsarStepBody(next,p.progress,false),target:next==='setup'&&p.progress.trackingOff?'setup-tracking':next,closing:false};
  }
  case 'pleiades':{const next=p.progress.next;return {name:t('pleiadesLab.nav'),line:t(`pleiadesLab.next.${next}`),details:pleiadesStepBody(next,false),target:next,closing:false};}
 }
}
