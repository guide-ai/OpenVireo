/** Front H English web strings for the Help menus (self-contained, like ClusterHrMessages). VIREO's own captions live in
 * mainHelp.ts. */
export const HELP_MENU_EN=Object.freeze({
 newTab:'(opens in a new tab)',
 noEquivalent:(original:string)=>`— VIREO opened ${original}. That site no longer exists (the US National Virtual Observatory project has ended) and there is no equivalent page, so no link is offered.`,
 websitesNote:'VIREO opened these pages in a new browser window. Here they open in a new tab only when you click them, and nothing is sent. The 2MASS address in VIREO (xena.harvard.edu) no longer exists; the link opens the current 2MASS page of IRSA (NASA/IPAC) instead.',
 reminderLoading:'Loading VIREO\'s reminder…',
 reminderError:'VIREO\'s reminder file (Reminder.obs) could not be loaded or did not match its recorded size and SHA-256.',
 ok:'OK',cancel:'Cancel',close:'Close',
 exitDone:'You have finished the exercise. A web page cannot close itself: save your work, then close this browser tab when you are ready.',
 exitNote:'VIREO shows this reminder when you exit the observatory during an exercise. In VIREO, OK quits the program and Cancel keeps it open.',
});
