/** Front GUIDE-COMPANION [W]: the page of the companion's current step (the first half of Show me where), by each guide's own
 * destinations. Null: the step's control is on every page (Save investigation, in the page bar) or nothing is left to do.
 * The Object X imaging steps differ from their guide's button, which goes to the observatory, where the images are taken: their
 * first actions (a later time and Set the observatory clock for "repeat", Copy the coordinates for both) are on the Object X
 * page, so the companion goes there while one of them is the next action (core/objectXLab.ts imageAction). The Hubble workspace is a card of the spectrum page; Show me where opens it when its control is inside
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
  // The imaging steps start on the Object X page (a later time, Copy the coordinates) and end in the observatory.
  case 'object-x':{const next=p.progress.next,a=p.progress.imageAction,d=next==='done'?null:a===null?objectXStepDestination(next):a==='clock'||a==='copy'?'object-x':'observatory';return d&&{route:d};}
  case 'stellar-classification':return p.progress.next==='save'?null:{route:'classification'};
  case 'cluster-hr':return p.progress.next==='preserve'?null:{route:'cluster-database'};
  case 'pulsars':return p.progress.next==='investigation'?null:{route:pulsarStepDestination(p.progress.next)};
  case 'pleiades':{
   const next=p.progress.next,d=pleiadesStepDestination(next);
   // 'observations' is a link of the guide's window, never a step's destination.
   return next==='save'||d==='observations'?null:d==='hotlist'?{route:'observatory',hotList:true}:{route:d};
  }
  // Front NEWCOMER NC1: every step of the first look is in the observatory; its closing line points at the welcome's lab list.
  case 'first-look':return {route:p.progress.next==='done'?'home':'observatory'};
 }
}
