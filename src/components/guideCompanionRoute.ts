/** Front GUIDE-COMPANION [W]: the page of the companion's current step (the first half of Show me where), by each guide's own
 * destinations. Null: the step's control is on every page (Save investigation, in the page bar) or nothing is left to do.
 * One step differs from its guide's button. Object X "repeat": the guide's button returns to the observatory, where the second
 * image is taken, but the step's first action (a later time and Set the observatory clock) is on the Object X page, so the
 * companion goes there. The Hubble workspace is a card of the spectrum page; Show me where opens it when its control is inside
 * (help/spot.ts revealGuideTarget). guideTargets.test.ts checks that every control a step points at is on the step's page.
 * Pure: no React, DOM or state. */
import type {CompanionProgress} from '../core/guideCompanion';
import type {Route} from './routePages';
import {hubblePhaseDestination} from '../HubbleLabGuide';
import {lssStepDestination} from '../LssLabGuide';
import {objectXStepDestination} from '../ObjectXLabGuide';
import {pulsarStepDestination} from '../PulsarLabGuide';
import {pleiadesStepDestination} from '../PleiadesLabGuide';

export type CompanionPlace=Readonly<{route:Route;
 /** The observatory's hot-list part is opened and focused first, as the Pleiades guide's own button does. */
 hotList?:true}>;

export function companionPlace(p:CompanionProgress):CompanionPlace|null{
 switch(p.lab){
  case 'hubble':{const d=hubblePhaseDestination(p.progress.next);return {route:d==='hubble'?'spectrum':d};}
  case 'large-scale-structure':{const next=p.progress.next,d=next==='done'?null:lssStepDestination(next,p.progress);return d&&{route:d};}
  case 'object-x':{const next=p.progress.next,d=next==='done'?null:next==='repeat'?'object-x':objectXStepDestination(next);return d&&{route:d};}
  case 'stellar-classification':return p.progress.next==='save'?null:{route:'classification'};
  case 'cluster-hr':return p.progress.next==='preserve'?null:{route:'cluster-database'};
  case 'pulsars':return p.progress.next==='investigation'?null:{route:pulsarStepDestination(p.progress.next)};
  case 'pleiades':{
   const next=p.progress.next,d=pleiadesStepDestination(next);
   // 'observations' is a link of the guide's window, never a step's destination.
   return next==='save'||d==='observations'?null:d==='hotlist'?{route:'observatory',hotList:true}:{route:d};
  }
 }
}
