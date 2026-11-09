/** The first-visit tour of the site (Front Onboarding [W]): new web text, not a CLEA resource. Each step names the page parts
 * it points at, as CSS selectors tried in order; the first one shown on screen is highlighted, and a step whose parts are all
 * hidden (for example the sections inside the closed phone Tools menu) is shown in the middle of the screen. Pure data;
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
 steps:Object.freeze({
  welcome:Object.freeze({title:'Welcome to OpenVireo',
   text:'OpenVireo is a virtual observatory for astronomy exercises, rebuilt in the browser from Project CLEA\'s VIREO. This short tour shows where things are. It takes under a minute.'}),
  sections:Object.freeze({title:'Every page is in the menu',
   text:'Pages are grouped into sections: the optical and radio observatories, analysis tools, results and files. Click a section\'s name to open or close it. On a phone, the menu is behind the Tools button.'}),
  guides:Object.freeze({title:'Doing an exercise? Start with its guide',
   text:'Each exercise has a guide that lists every step, ticks off what you have done and takes you to the right page.'}),
  observatory:Object.freeze({title:'Or explore the sky freely',
   text:'On the Observatory page: open the dome, choose an object and point the telescope. Then turn tracking on and use an instrument.'}),
  save:Object.freeze({title:'Save your work as a file',
   text:'Your work stays in this browser tab until you save it. Save investigation downloads a file; Restore investigation JSON loads it again later.'}),
  help:Object.freeze({title:'Help is always here',
   text:'Open Help for the help topics, or press the ? key anywhere outside a text field. You can take this tour again from the Help menu.'}),
 }),
});
const TOUR_TEXT=pickMessages('tour',TOUR_EN);
/** The steps in order, with the page parts each one points at. */
export const TOUR_TARGETS=Object.freeze([
 {id:'welcome',targets:[]},
 {id:'sections',targets:['.portal-header nav','.tools-toggle']},
 {id:'guides',targets:['[data-nav-group="guides"]','.tools-toggle']},
 {id:'observatory',targets:['.first-steps']},
 {id:'save',targets:['.investigation-toolbar']},
 {id:'help',targets:['.portal-help .help-trigger']},
] as const satisfies readonly {id:keyof typeof TOUR_EN.steps;targets:readonly string[]}[]);
/** The tour in this load's language, built on first use. */
export const TOUR=lazyMessages(()=>Object.freeze({
 label:TOUR_TEXT.label,progress:TOUR_TEXT.progress,next:TOUR_TEXT.next,back:TOUR_TEXT.back,skip:TOUR_TEXT.skip,done:TOUR_TEXT.done,
 steps:Object.freeze(TOUR_TARGETS.map(({id,targets}):TourStep=>Object.freeze({id,title:TOUR_TEXT.steps[id].title,text:TOUR_TEXT.steps[id].text,targets}))),
}));
