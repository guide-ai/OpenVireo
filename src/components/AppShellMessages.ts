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
