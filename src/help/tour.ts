/** The first-visit tour of the site (Front Onboarding [W]): new web text, not a CLEA resource. Each step names the page parts
 * it points at, as CSS selectors tried in order; the first one shown on screen is highlighted, and a step whose parts are all
 * hidden (for example the sections inside the closed phone Tools menu) is shown in the middle of the screen. Pure data;
 * components/SiteTour.tsx renders it. */
export type TourStep=Readonly<{id:string;title:string;text:string;targets:readonly string[]}>;

export const TOUR_SEEN_KEY='openvireo.tour.v1';

export const TOUR=Object.freeze({
 label:'Tour of OpenVireo',
 progress:(n:number,of:number)=>`Step ${n} of ${of}`,
 next:'Next',back:'Back',skip:'Skip the tour',done:'Start exploring',
 steps:Object.freeze<TourStep[]>([
  {id:'welcome',title:'Welcome to OpenVireo',targets:[],
   text:'OpenVireo is a virtual observatory for astronomy exercises, rebuilt in the browser from Project CLEA\'s VIREO. This short tour shows where things are. It takes under a minute.'},
  {id:'sections',title:'Every page is in the menu',targets:['.portal-header nav','.tools-toggle'],
   text:'Pages are grouped into sections: the optical and radio observatories, analysis tools, results and files. Click a section\'s name to open or close it. On a phone, the menu is behind the Tools button.'},
  {id:'guides',title:'Doing an exercise? Start with its guide',targets:['[data-nav-group="guides"]','.tools-toggle'],
   text:'Each exercise has a guide that lists every step, ticks off what you have done and takes you to the right page.'},
  {id:'observatory',title:'Or explore the sky freely',targets:['.first-steps'],
   text:'On the Observatory page: open the dome, choose an object and point the telescope. Then turn tracking on and use an instrument.'},
  {id:'save',title:'Save your work as a file',targets:['.investigation-toolbar'],
   text:'Your work stays in this browser tab until you save it. Save investigation downloads a file; Restore investigation JSON loads it again later.'},
  {id:'help',title:'Help is always here',targets:['.portal-help .help-trigger'],
   text:'Open Help for the help topics, or press the ? key at any time. You can take this tour again from the Help menu.'},
 ]),
});
