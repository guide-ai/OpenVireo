import {lazyMessages,pickMessages} from '../i18n/registry';
/** OpenVireo's own help (Front WebHelp [W]), shown by Help › Help topics…. VIREO's main-window help (VIRMNHLP.TXT) describes
 * the Windows program, so this text is written for the web site and describes only what it has. It is new web text, not a
 * CLEA resource. Pure data; WebHelpDialog.tsx renders it. */

export type WebHelpBlock=
 |Readonly<{kind:'p';text:string}>
 |Readonly<{kind:'steps';items:readonly string[]}>
 |Readonly<{kind:'list';items:readonly string[]}>
 |Readonly<{kind:'map';head:readonly [string,string];rows:readonly (readonly [string,string])[]}>
 /** The on/off switch of the ? key (helpShortcut.ts), shown where the key is explained. */
 |Readonly<{kind:'helpKey';label:string}>;
export type WebHelpTopic=Readonly<{id:string;title:string;blocks:readonly WebHelpBlock[];related:readonly string[]}>;
export type WebHelpGroup=Readonly<{title:string;topics:readonly WebHelpTopic[]}>;

const p=(text:string):WebHelpBlock=>({kind:'p',text});
const steps=(...items:string[]):WebHelpBlock=>({kind:'steps',items});
const list=(...items:string[]):WebHelpBlock=>({kind:'list',items});
const topic=(id:string,title:string,blocks:WebHelpBlock[],related:string[]=[]):WebHelpTopic=>({id,title,blocks,related});

const START:WebHelpGroup={title:'Start here',topics:[
 topic('welcome','What OpenVireo is',[
  p('OpenVireo is a browser version of VIREO, the Virtual Educational Observatory of Project CLEA (Gettysburg College). It is rebuilt from VIREO\'s recovered behaviour and its original data files; it is not CLEA\'s own program.'),
  p('Nothing is installed and there is no sign-in or account. Everything runs in this browser tab, and your work stays in the tab until you save it as a file on your computer.'),
  p('Version 1.0 contains the seven VIREO exercises: Hubble\'s law, large-scale structure (LSS), stellar classification, Pleiades photometry, cluster HR diagrams, pulsars and the Quest for Object X. Each has a guide under Exercise guides in the header.'),
 ],['getting-started','exercise-guides','from-vireo']),
 topic('getting-started','Getting started',[
  p('If your instructor gave you an exercise, open its guide first: the guide lists every step and takes you to the right page. To explore freely:'),
  steps(
   'Open Observatory in the header (Optical observatory group).',
   'Press Open dome.',
   'In Choose an object, pick a target from the list (or type in Search catalog), then press Point telescope.',
   'Open Observatory clock & spectral tracking and press Turn tracking on. The cameras and spectrometers need tracking.',
   'Switch to the telescope view and use an instrument: Open spectrometer, the CCD or IR camera, or Multi-Spec.',
   'Measure what you recorded on an Analysis page, then save your work (see Saving your work).'),
 ],['exercise-guides','pointing','saving']),
 topic('exercise-guides','Exercise guides',[
  p('The Exercise guides group in the header has one button per exercise: Hubble lab guide, LSS guide, Object X guide, Pulsar guide, Pleiades lab guide, Classification guide and Cluster HR guide.'),
  p('A guide opens as a window with numbered steps. A tick marks each step you have completed, and a button such as Continue to next step or Go to the next step takes you to the page for the next step. Close the guide whenever you like and open it again from the header; your progress is kept while the tab stays open.'),
  p('Opening a guide also starts that exercise, as choosing an exercise did in VIREO: it sets which telescopes are open (see Telescopes and Request Time) and whether object names and magnitudes are shown. In the Object X exercise the object\'s identity stays hidden until you reveal it.'),
 ],['telescope','getting-started']),
 topic('from-vireo','Coming from VIREO (Windows)',[
  p('If you know the Windows program, or your exercise sheet was written for it, this table shows where each VIREO step is in OpenVireo.'),
  {kind:'map',head:['In VIREO (Windows)','In OpenVireo'],rows:[
   ['File › Log In...','Not needed: there are no accounts or sign-in. Names on printouts stay blank.'],
   ['File › Run Exercise','Open the exercise\'s guide under Exercise guides in the header.'],
   ['File › Set Observation Date/Time, ID...','Site clock › Set Date/Time… on the Observatory page (UT). The Object X page has its own date and time box (Set the observatory clock); its ID box labels your saved data.'],
   ['Telescopes › Optical','The Optical telescope card on the Observatory page: choose a profile, then Use this telescope.'],
   ['Telescopes › Optical › Request Time','The Request Time box in the same card (only in exercises that restrict the larger telescopes).'],
   ['Telescopes › Radio','Radio telescope in the header (Radio observatory group).'],
   ['Open/Close dome switch','Open dome / Close dome on the Observatory page.'],
   ['Telescope Control Panel button','Switch to telescope view, then Move the telescope and the instrument cards.'],
   ['Tools › (analysis tools)','The Analysis group in the header: Spectrum analyzer, Stellar classification, Cluster database, LSS survey, LSS data, Object X, Variable stars; Radio data for pulsars.'],
   ['Tools › Results Editors','The Results Editors group in the header: Observational Results and Pulsar Results.'],
   ['Load Saved Data...','Restore investigation JSON in the backup bar, or the load button of the results editor you saved from.'],
   ['Tools › Spreadsheet','Download results CSV and open the file in any spreadsheet program.'],
   ['Tools › Image Processing (DS9)','Camera images are saved as FITS downloads and can be opened under Files › Saved images or in any FITS viewer, including DS9.'],
   ['File › Exit Observatory','Save your work, then close the browser tab. The File menu of Move the telescope has Exit Observatory, which shows VIREO\'s reminder.'],
   ['Keyboard: Alt, NumLock and MouseKeys','The normal browser keys: see Menus, keyboard and phones.'],
  ]},
 ],['getting-started','saving','navigation']),
]};

const OBSERVATORY:WebHelpGroup={title:'The observatory',topics:[
 topic('pointing','Dome, pointing and tracking',[
  p('The Observatory page follows three steps: 1 · Open the dome, 2 · Choose and point, 3 · Explore an instrument.'),
  list(
   'Open dome reveals the sky and enables the telescope controls. The field view switches between Finder · 2.5° and Telescope · 15′.',
   'Choose an object lists suggested targets, the Hubble exercise list and every catalog target; Search catalog filters the list (Escape clears it). Point telescope centres the telescope on your choice. Under Enter coordinates, Point to coordinates points to any right ascension and declination.',
   'Move the telescope moves the telescope while you hold a direction button (with the mouse, Space or Enter). Its menu has Set Coordinates…, View/Select from List… (the hot lists) and Add Current Item/Position to List….',
   'Tracking is in Observatory clock & spectral tracking: Turn tracking on holds the pointing while the clock runs. The cameras and spectrometers refuse to take data while tracking is off.'),
 ],['telescope','clock','instruments']),
 topic('telescope','Telescopes and Request Time',[
  p('The Optical telescope card on the Observatory page offers VIREO\'s three telescopes: the 0.4 m, the KPNO 0.9 m and the KPNO 4 m. Choose one under Telescope profile to inspect or select and press Use this telescope. VIREO\'s menus call the 0.9 m the 1.0 Meter telescope.'),
  p('In the Pleiades photometry, Cluster HR and Classification exercises the larger telescopes are restricted, as in VIREO. A Request Time box then appears in the card, with Request 1.0 Meter Telescope and Request 4.0 Meter Telescope. If time is granted you get a number of uses; if not, you can apply again after a few minutes. The 0.4 m is always available, and the Hubble, LSS and Object X exercises leave every telescope open.'),
 ],['exercise-guides','pointing']),
 topic('clock','Date, time and site',[
  p('Observatory clock & spectral tracking starts and pauses the observatory clock and turns tracking on or off.'),
  p('Site clock · fixed UT scenario sets the observation date and time with Set Date/Time… (in UT, not local time). Site Information… shows the observatory and Site Parameters… changes its site for the clocks and horizon. Use the date and time given in your exercise material.'),
 ],['pointing']),
 topic('instruments','Instruments',[
  list(
   'Spectrometer: Open spectrometer on the Observatory page, or the exercise pages (Star exposure, Galaxy exposure, LSS survey, Object X). The Spectrometer button in the header lists where each kind of spectrum is taken.',
   'Photometer: Pleiades photometry in the header.',
   'Sky exposure, Star exposure and Galaxy exposure in the header take spectra of the sky background, the supported catalog star and the Hubble galaxies.',
   'CCD and IR cameras: the camera card on the Observatory page. Start exposure takes an image; Save image (FITS) downloads it. Fields without a bundled star list can ask the VizieR catalog service live (only the coordinates and radius are sent).',
   'Multi-Spec: the multi-object spectrometer card on the Observatory page.',
   'Radio telescope: see Radio telescope and pulsars.'),
  p('Each instrument has its own Help button. It shows VIREO\'s original help for that instrument; where OpenVireo\'s panel differs from VIREO\'s, the panel itself has a web note.'),
 ],['radio','original-help']),
 topic('radio','Radio telescope and pulsars',[
  p('Radio telescope in the header opens the radio telescope control panel. Start it with Start pulsar exercise, point at a pulsar and record its signal with the receiver. The panel has its own Help menu with VIREO\'s radio help.'),
  p('Radio data opens the pulsar analysis: measure the period and the delay between frequencies with the cursors, on your recording or on a saved .PLR file. Recorded measurements are lost when you reload the page unless you save them: Save investigation keeps your recording and confirmed measurements (see Saving your work).'),
 ],['saving','instruments']),
]};

const ANALYSIS:WebHelpGroup={title:'Analysis and results',topics:[
 topic('tools','Analysis pages',[
  list(
   'Spectrum analyzer: align reference lines with a spectrum to measure its redshift, and keep your results.',
   'Stellar classification: compare a spectrum with the standard stars of the atlas and choose its spectral type.',
   'Cluster database: plot cluster HR diagrams and fit the main sequence and isochrones.',
   'LSS survey: take the galaxy spectra of the survey fields. LSS data: plot redshifts in a wedge diagram.',
   'Object X: identify an unknown object from its identifier and coordinates.',
   'Variable stars: look up a variable star and plot its light curve.',
   'Radio data: measure pulsars (see Radio telescope and pulsars).'),
 ],['saving','printing']),
 topic('saving','Saving your work',[
  p('OpenVireo keeps nothing on a server. Most of your work lives in this tab and is lost when you reload or close it, so save it as a file on your computer.'),
  list(
   'Save investigation (in the backup bar near the top of the page) downloads one file with your spectra, measurements and settings. Restore investigation JSON loads that file again later. What a backup includes lists exactly what it covers.',
   'Observational Results (in the Results Editors group) opens your confirmed redshifts: Download results text, Download results CSV (for a spreadsheet program) and Print results.',
   'Save investigation also keeps your pulsar recording and confirmed pulsar measurements. For a .CSV file use Save recorded measurements (.CSV) in Radio data; Pulsar Results opens a saved file to review it.',
   'Camera images download as FITS files; open them under Files › Saved images.',
   'Hot lists save as .HTL files from the Original hot lists editor.'),
  p('Only the colour theme, which menu sections you left open, whether you have seen the tour, whether the ? key opens help, instructor Demonstration Mode and the classification observation notebook are remembered by the browser itself.'),
 ],['finishing','printing']),
 topic('printing','Printing',[
  p('Some print buttons, such as Print results and Print spectrum, open your browser\'s print dialog directly. Others, such as Print Sky Image... and Print Wedge Plot..., first show a print preview whose Print… button opens it. The browser\'s print dialog can also save as PDF.'),
 ],['saving']),
 topic('finishing','Finishing an exercise',[
  p('Save your investigation and any results files you need for your report, then close the browser tab. Exit Observatory, in the File menu of Move the telescope, shows VIREO\'s end-of-exercise reminder; a web page cannot close itself, so you close the tab yourself.'),
 ],['saving']),
]};

const SITE:WebHelpGroup={title:'Using the site',topics:[
 topic('navigation','Menus, keyboard and phones',[
  list(
   'The menu groups every page into sections: Optical observatory, Radio observatory, Analysis, Results Editors, Files and Exercise guides. Click a section\'s name to open or close it; the section of the page you are on opens by itself, and the browser remembers the rest. On a phone the menu is behind the Tools button.',
   'Help is always at the top of the page, also on a phone. Press the ? key anywhere outside a text field to open these help topics; you can turn that key off below.',
   'Help › Take the tour of the site shows the first-visit tour again.',
   'Source code and Report a problem, at the foot of the menu and in Help, open OpenVireo\'s page on GitHub in a new tab. Report a problem starts a new issue with the name of the page you were on filled in; GitHub asks you to sign in, and nothing is sent until you submit it there.',
   'Tab and Shift+Tab move between controls; Enter or Space presses a button.',
   'Escape closes menus and dialogs.',
   'Direction buttons (telescope and radio) move while held with the mouse, Space or Enter.',
   'Spectrum cursors move with the arrow keys (Shift for larger steps); Enter or Space applies, Escape cancels.',
   'The theme switch chooses System, Light or Dark colours.'),
  {kind:'helpKey',label:'Open the help topics with the ? key'},
 ],['getting-started']),
 topic('instructor','Instructor mode',[
  p('Instructor mode… in the header, after a confirmation, opens VIREO\'s instructor options to this browser tab: Optical Simulation Options… in the Move the telescope menu and the radio preferences, which are closed to students. It has no password, is not a lock and shows no answers. Leave turns it off.'),
 ],['telescope']),
 topic('original-help','VIREO\'s original help',[
  p('The Help buttons inside each instrument and tool show VIREO\'s own help for that window, unchanged from the original program.'),
  p('VIREO\'s main-window help described the Windows program\'s menus, which OpenVireo replaces with its own pages, so it is not offered here: Coming from VIREO (Windows) maps each of those menus to its place in OpenVireo.'),
 ],['from-vireo','instruments']),
]};

/** Front ES-HELP: only the text of the topics is translated. The structure (topic ids, block kinds, related links) is this file's in
 * every language, so a translation cannot break a link or change a block; the map `webHelp` (WEB_HELP_EN, Spanish in
 * src/i18n/es/maps/webHelp.ts) holds the text of each block by position: a string (paragraph or the help-key label), a list of
 * strings (steps, bullets) or a table `{head, rows}`. Web adaptations by OpenVireo, not CLEA's. */
type TextBlock=string|readonly string[]|Readonly<{head:readonly [string,string];rows:readonly (readonly [string,string])[]}>;
const textOf=(b:WebHelpBlock):TextBlock=>b.kind==='p'?b.text:b.kind==='helpKey'?b.label:b.kind==='map'?{head:b.head,rows:b.rows}:b.items;
const GROUPS:readonly WebHelpGroup[]=[START,OBSERVATORY,ANALYSIS,SITE];
export const WEB_HELP_EN=Object.freeze({
 caption:'OpenVireo help',
 close:'Close',
 navLabel:'Help topics',
 related:'See also:',
 groups:GROUPS.map(g=>({title:g.title,topics:g.topics.map(t=>({title:t.title,blocks:t.blocks.map(textOf)}))})),
});
const WEB_HELP_TEXT=pickMessages('webHelp',WEB_HELP_EN);
function merge(b:WebHelpBlock,x:TextBlock):WebHelpBlock{
 switch(b.kind){
  case 'p':return {kind:'p',text:x as string};
  case 'helpKey':return {kind:'helpKey',label:x as string};
  case 'steps':return {kind:'steps',items:x as readonly string[]};
  case 'list':return {kind:'list',items:x as readonly string[]};
  case 'map':{const m=x as Extract<TextBlock,{head:unknown}>;return {kind:'map',head:m.head,rows:m.rows};}
 }
}
/** The help for this load's language, built on first read (no text is read when the module evaluates). */
export const WEB_HELP:Readonly<{caption:string;close:string;navLabel:string;related:string;groups:readonly WebHelpGroup[]}>=lazyMessages(()=>({
 caption:WEB_HELP_TEXT.caption,close:WEB_HELP_TEXT.close,navLabel:WEB_HELP_TEXT.navLabel,related:WEB_HELP_TEXT.related,
 groups:GROUPS.map((g,gi)=>({title:WEB_HELP_TEXT.groups[gi].title,topics:g.topics.map((t,ti)=>{
  const text=WEB_HELP_TEXT.groups[gi].topics[ti];
  return {id:t.id,title:text.title,related:t.related,blocks:t.blocks.map((b,bi)=>merge(b,text.blocks[bi] as TextBlock))};
 })})),
}));

export function webHelpTopic(id:string):WebHelpTopic{
 for(const g of WEB_HELP.groups)for(const t of g.topics)if(t.id===id)return t;
 throw new RangeError(`Unknown help topic ${id}`);
}
