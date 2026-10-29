/** Front H English web strings for the Help menus (self-contained, like ClusterHrMessages). VIREO's own captions live in
 * mainHelp.ts. */
export const HELP_MENU_EN=Object.freeze({
 newTab:'(opens in a new tab)',
 noEquivalent:(original:string)=>`— VIREO opened ${original}. That site no longer exists and there is no equivalent page, so no link is offered.`,
 websitesNote:'VIREO opened these pages in a new browser window. Here they open in a new tab only when you click them, and nothing is sent. Two of VIREO\'s addresses no longer exist: 2MASS (xena.harvard.edu) opens the current 2MASS page of IRSA (NASA/IPAC), and NVO (www.us-vo.org) opens the page of its successor, NASA\'s NAVO (NASA Astronomical Virtual Observatories).',
 reminderLoading:'Loading VIREO\'s reminder…',
 reminderError:'VIREO\'s reminder file (Reminder.obs) could not be loaded or did not match its recorded size and SHA-256.',
 ok:'OK',cancel:'Cancel',close:'Close',yes:'Yes',no:'No',
 /** Accessible names; the visible caption stays VIREO's "Help" (review 1 I4). */
 menuName:{main:'Help menu of the observatory',radio:'Help menu of the radio telescope'},
 radioOff:'VIREO\'s radio Help menu (Topics..., About This Exercise...) is on the radio telescope control panel, which opens when you switch the telescope on.',
 reminderErrorQuestion:'VIREO then asks instead:',
 exitDone:'You have finished the exercise. A web page cannot close itself: save your work, then close this browser tab when you are ready.',
 exitNote:'VIREO shows this reminder when you exit the observatory during an exercise (after Run Exercise); otherwise it only asks whether to quit. OpenVireo has no Log In or Run Exercise step, so the observatory is always an exercise in progress. In VIREO, OK or Yes quits the program; Cancel or No keeps it open.',
});

/** Accessible names of each window's Help button, by help index (review 1 I4); the visible caption stays "Help". */
export const HELP_BUTTON_NAMES:Readonly<Record<string,string>>=Object.freeze({
 'OBSRVHLP.LST':'Help for the telescope controls','PHOTOHLP.LST':'Help for the photometer','CAMHLP.LST':'Help for the camera','SPECHLP.LST':'Help for the spectrometer',
 'CLASSHLP.LST':'Help for spectral classification','MEASHLP.LST':'Help for spectrum measuring','HRANALHLP.LST':'Help for the HR diagram','VARTYPEHLP.LST':'Help for variable star types',
 'WDGPLTHLP.LST':'Help for the wedge plot','PLSANHLP.LST':'Help for the pulsar analysis','PLSLSHLP.LST':'Help for the pulsar parameters','MLTSPHLP.LST':'Help for the multi-object spectrometer',
 'SPLSTHLP.LST':'Help for the multi-object spectrum list',
});
