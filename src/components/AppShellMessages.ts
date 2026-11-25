import {pickMessages} from '../i18n/registry';
/** Presentation catalog for the app shell (header navigation groups, theme switch,
 * investigation toolbar disclosure, the page bar). Kept local so the coordinator can fold it into
 * src/i18n/en.json at merge, like WedgeMessages.ts. English is the default. */
export type AppShellMessageCatalog=Readonly<{
 theme:Readonly<{legend:string;system:string;light:string;dark:string}>;
 navGroups:Readonly<{optical:string;radio:string;analysis:string;files:string;guides:string}>;
 backupHelpSummary:string;
 toolsMenu:string;
 /** Front LAUNCH-2: the skip link, the page's first focusable control, shown on focus (src/components/PortalHeader.tsx). */
 skipToContent:string;
 /** Front HEADER [W]: the page bar at the top of the content area (src/components/PageBar.tsx). `label` names its region; `more` is the
  * visible word of the button beside Save investigation and must start `moreName`, its accessible name (WCAG 2.5.3). */
 pageBar:Readonly<{label:string;more:string;moreName:string}>;
 /** Front GUIDE-COMPANION [W]: the strip that keeps the guide in use on every page (src/components/GuideCompanion.tsx). `label`
  * names its region; `stepOf` follows the guide's name; `show`, `details`, `full` and `hide` are its buttons (`hide` must start
  * `hideName`, its accessible name, WCAG 2.5.3); `notYet` is shown when Show me where finds no control on screen; `allDone` when
  * a guide without a closing line of its own (LSS, Object X) has every step done. */
 companion:Readonly<{label:string;stepOf:(n:number,total:number)=>string;actions:string;show:string;details:string;full:string;hide:string;hideName:string;notYet:string;allDone:string;
  /** Restart exercise: the button, then its confirmation (title, what happens, what is lost, how to keep it, the two answers). */
  restart:string;restartTitle:string;restartWhat:string;restartLost:string;restartSave:string;restartConfirm:string;restartCancel:string}>;
 /** Front NEWCOMER NC1 [W]: the first look (core/firstLook.ts), shown by the companion strip. `name` is its name in the strip;
  * `dome`, `point`, `look` and `spectrum` are its four steps' lines (only `point` names M82, the suggested object);
  * `spectrumDetail` is the last step's Step details (the other three reuse the observatory band's `sky.step1Help..3Help`);
  * `closing` is the line once it is done; `start` is the button under the observatory band and `help` the Help menu item. */
 firstLook:Readonly<{name:string;dome:string;point:string;look:string;spectrum:string;spectrumDetail:string;closing:string;start:string;help:string}>;
 /** Front REL1 review 1 M1 [W]: a part of the site that cannot load or stopped with an error (src/components/LazyBoundary.tsx). */
 recovery:Readonly<{updatedTitle:string;updated:string;errorTitle:string;error:string;kept:string;saveFirst:string;saveHow:string;save:string;reload:string}>;
}>;

export const APP_SHELL_MESSAGES_EN:AppShellMessageCatalog=Object.freeze({
 theme:Object.freeze({legend:'Color theme',system:'System',light:'Light',dark:'Dark'}),
 navGroups:Object.freeze({optical:'Optical observatory',radio:'Radio observatory',analysis:'Analysis',files:'Files',guides:'Exercise guides'}),
 backupHelpSummary:'What a backup includes',
 toolsMenu:'Menu',
 skipToContent:'Skip to content',
 pageBar:Object.freeze({label:'Investigation, language and help',more:'More',moreName:'More investigation actions'}),
 companion:Object.freeze({label:'Current step of the guide',stepOf:(n:number,total:number)=>`Step ${n} of ${total}`,actions:'Guide actions',show:'Show me where',details:'Step details',full:'Full guide',hide:'Hide',hideName:'Hide this guide',
  notYet:'That control is not on screen yet; it appears once an earlier action is done. You are on the right page.',allDone:'Every step is done.',
  restart:'Restart exercise',restartTitle:'Restart this exercise?',restartWhat:'The site loads again and this guide opens at its first step.',
  restartLost:'Everything you have not saved is lost: the work of this exercise and of every other tool in this tab.',
  restartSave:'To keep it, cancel and choose Save investigation first.',restartConfirm:'Restart',restartCancel:'Cancel'}),
 firstLook:Object.freeze({name:'First look',dome:'Open the dome',point:'Choose the galaxy M82 and point the telescope at it',look:'Look at it through the telescope',
  spectrum:'Open its spectrum',spectrumDetail:'Only some objects have a spectrum in VIREO\'s library; M82 has one. It is VIREO\'s original library spectrum, not a new observation.',
  closing:'You have taken a first look. Choose a lab to go further.',start:'Guide me (about 3 min)',help:'Take a first look'}),
 recovery:Object.freeze({
  updatedTitle:'A new version of OpenVireo was published',
  updated:'This part of the site could not be loaded because the site was updated while this page was open.',
  errorTitle:'This part of OpenVireo stopped because of an error',
  error:'Reloading the page usually clears it. If it happens again, note what you did just before.',
  kept:'The rest of the site and your other work in this tab are still here.',
  saveFirst:'Save your investigation first, then reload the page to continue with the current version.',
  saveHow:'Reload the page to continue. Work you saved earlier with Save investigation can then be restored with Restore investigation JSON.',
  save:'Save investigation',
  reload:'Reload the page',
 }),
});
export const APP_SHELL_MESSAGES=pickMessages('appShell',APP_SHELL_MESSAGES_EN);
