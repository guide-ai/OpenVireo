/** The first-visit tour of the site (Front Onboarding [W]): new web text, not a CLEA resource. Each step names the page parts
 * it points at, as CSS selectors tried in order; the first one shown on screen is highlighted, and a step whose parts are all
 * hidden is shown in the middle of the screen. Front NEWCOMER NC2: four steps (welcome, save, help, start); the last asks how the
 * visitor would like to start, with Take a first look and Choose a lab (components/SiteTour.tsx). Pure data;
 * components/SiteTour.tsx renders it. */
import {lazyMessages,pickMessages} from '../i18n/registry';
export type TourStep=Readonly<{id:string;title:string;text:string;targets:readonly string[]}>;

export const TOUR_SEEN_KEY='openvireo.tour.v1';

/** Front ES1: the tour's text, a pickMessages map translated per load (docs/I18N.md); the step ids and the page parts they
 * point at (CSS selectors) are not text and stay in TOUR_TARGETS. */
export const TOUR_EN=Object.freeze({
 label:'Tour of OpenVireo',
 progress:(n:number,of:number)=>`Step ${n} of ${of}`,
 next:'Next',back:'Back',skip:'Skip the tour',done:'Start exploring',
 /** Front NEWCOMER NC2: the last step's two choices (it ends the tour with either, or with Start exploring). */
 firstLook:'Take a first look (about 3 min)',chooseLab:'Choose a lab',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Welcome to OpenVireo',
   text:'OpenVireo is a virtual observatory for astronomy exercises, rebuilt in the browser from Project CLEA\'s VIREO. This short tour shows where things are. It takes under a minute.'}),
  save:Object.freeze({title:'Save your work as a file',
   text:'Your work stays in this browser tab until you save it. Save investigation, at the top of every page, downloads a file; Restore investigation JSON, in the menu beside it, loads it again later.'}),
  help:Object.freeze({title:'Help is always here',
   text:'Open Help for the help topics, or press the ? key anywhere outside a text field. You can take this tour again from the Help menu.'}),
  start:Object.freeze({title:'How would you like to start?',
   text:'Take a three-minute first look at the sky, or choose one of the seven labs; each lab has a guide that stays with you. Every page is in the menu; on a phone it is behind the Menu button.'}),
 }),
});
const TOUR_TEXT=pickMessages('tour',TOUR_EN);
/** The steps in order, with the page parts each one points at. */
export const TOUR_TARGETS=Object.freeze([
 {id:'welcome',targets:[]},
 {id:'save',targets:['[data-testid="investigation-actions"]']},
 {id:'help',targets:['.page-bar .help-trigger']},
 // Front NEWCOMER NC2: the guides' menu section (the old guides step's targets); on a phone, the Menu button it is behind.
 {id:'start',targets:['[data-nav-group="guides"]','.tools-toggle']},
] as const satisfies readonly {id:keyof typeof TOUR_EN.steps;targets:readonly string[]}[]);
/** The tour in this load's language, built on first use. */
export const TOUR=lazyMessages(()=>Object.freeze({
 label:TOUR_TEXT.label,progress:TOUR_TEXT.progress,next:TOUR_TEXT.next,back:TOUR_TEXT.back,skip:TOUR_TEXT.skip,done:TOUR_TEXT.done,firstLook:TOUR_TEXT.firstLook,chooseLab:TOUR_TEXT.chooseLab,
 steps:Object.freeze(TOUR_TARGETS.map(({id,targets}):TourStep=>Object.freeze({id,title:TOUR_TEXT.steps[id].title,text:TOUR_TEXT.steps[id].text,targets}))),
}));
