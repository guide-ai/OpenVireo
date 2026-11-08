/** OpenVireo's own help (Front WebHelp [W]), shown by Help › Help topics…. VIREO's main-window help (VIRMNHLP.TXT) describes
 * the Windows program, so this text is written for the web site and describes only what it has. It is new web text, not a
 * CLEA resource. Pure data; WebHelpDialog.tsx renders it. */

export type WebHelpBlock=
 |Readonly<{kind:'p';text:string}>
 |Readonly<{kind:'steps';items:readonly string[]}>
 |Readonly<{kind:'list';items:readonly string[]}>
 |Readonly<{kind:'map';head:readonly [string,string];rows:readonly (readonly [string,string])[]}>;
export type WebHelpTopic=Readonly<{id:string;title:string;blocks:readonly WebHelpBlock[];related:readonly string[]}>;
export type WebHelpGroup=Readonly<{title:string;topics:readonly WebHelpTopic[]}>;

const p=(text:string):WebHelpBlock=>({kind:'p',text});
const steps=(...items:string[]):WebHelpBlock=>({kind:'steps',items});
const list=(...items:string[]):WebHelpBlock=>({kind:'list',items});
const topic=(id:string,title:string,blocks:WebHelpBlock[],related:string[]=[]):WebHelpTopic=>({id,title,blocks,related});

const START:WebHelpGroup={title:'Start here',topics:[
 topic('welcome','What OpenVireo is',[
  p('OpenVireo is a browser version of VIREO, the Virtual Educational Observatory of Project CLEA (Gettysburg College). It is rebuilt from VIREO\'s recovered behaviour and its original data files; it is not CLEA\'s own program.'),
  p('Nothing is installed and there is no sign-in or account. Everything runs in this browser tab, and your work stays on your computer until you save it as a file.'),
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
  p('A guide opens as a window with numbered steps. A tick marks each step you have completed, and the Continue button takes you to the page for the next step. Close the guide whenever you like and open it again from the header; your progress is kept while the tab stays open.'),
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
   ['Tools › Results Editors','The Results editors group in the header: Observational Results and Pulsar Results.'],
   ['Load Saved Data...','Restore investigation JSON in the backup bar, or the load button of the results editor you saved from.'],
   ['Tools › Spreadsheet','Download results CSV and open the file in any spreadsheet program.'],
   ['Tools › Image Processing (DS9)','Camera images are saved as FITS downloads and can be opened under Files › Saved images or in any FITS viewer, including DS9.'],
   ['File › Exit Observatory','Save your work, then close the browser tab. File › Exit Observatory in the telescope panel shows VIREO\'s reminder.'],
   ['Keyboard: Alt, NumLock and MouseKeys','The normal browser keys: see Menus, keyboard and phones.'],
  ]},
 ],['getting-started','saving','navigation']),
]};

const OBSERVATORY:WebHelpGroup={title:'The observatory',topics:[
 topic('pointing','Dome, pointing and tracking',[
  p('The Observatory page follows three steps: 1 · Open the dome, 2 · Choose and point, 3 · Explore an instrument.'),
  list(
   'Open dome reveals the sky and enables the telescope controls. The field view switches between Finder · 2.5° and Telescope · 15′.',
   'Choose an object lists suggested targets and the original hot lists; Search catalog filters the list (Escape clears it). Point telescope centres the telescope on your choice. Enter coordinates points to any right ascension and declination.',
   'Move the telescope moves the telescope while you hold a direction button (with the mouse, Space or Enter). Its menu has Set Coordinates…, View/Select from List… (the hot lists) and Add Current Item/Position to List….',
   'Tracking is in Observatory clock & spectral tracking: Turn tracking on holds the pointing while the clock runs. Instruments refuse to take data while tracking is off.'),
 ],['telescope','clock','instruments']),
 topic('telescope','Telescopes and Request Time',[
  p('The Optical telescope card on the Observatory page offers VIREO\'s three telescopes: the 0.4 m, the 0.9 m and the 4 m. Choose one under Telescope profile to inspect or select and press Use this telescope.'),
  p('In the Pleiades photometry, Cluster HR and Classification exercises the larger telescopes are restricted, as in VIREO. A Request Time box then appears in the card. If time is granted you get a number of uses; if not, you can apply again after a few minutes. The 0.4 m is always available, and the Hubble, LSS and Object X exercises leave every telescope open.'),
 ],['exercise-guides','pointing']),
 topic('clock','Date, time and site',[
  p('Observatory clock & spectral tracking starts and pauses the observatory clock and turns tracking on or off.'),
  p('Site clock sets the observation date and time with Set Date/Time… (in UT, not local time), and shows the observatory with Site Information… and Site Parameters…. Use the date and time given in your exercise material.'),
 ],['pointing']),
 topic('instruments','Instruments',[
  list(
   'Spectrometer: Open spectrometer on the Observatory page, or the exercise pages (Star exposure, Galaxy exposure, LSS survey, Object X). The Spectrometer button in the header lists where each kind of spectrum is taken.',
   'Photometer: Pleiades photometry in the header.',
   'CCD and IR cameras: the camera card on the Observatory page. Start exposure takes an image; Save image (FITS) downloads it. Fields without a bundled star list can ask the VizieR catalog service live (only the coordinates and radius are sent).',
   'Multi-Spec: the multi-object spectrometer card on the Observatory page.',
   'Radio telescope: see Radio telescope and pulsars.'),
  p('Each instrument has its own Help button. It shows VIREO\'s original help for that instrument, which matches the panel you see because those panels are rebuilt from VIREO\'s own.'),
 ],['radio','original-help']),
 topic('radio','Radio telescope and pulsars',[
  p('Radio telescope in the header opens the radio telescope control panel. Start it with Start pulsar exercise, point at a pulsar and record its signal with the receiver. The panel has its own Help menu with VIREO\'s radio help.'),
  p('Radio data opens the pulsar analysis: measure the period and the delay between frequencies with the cursors, on your recording or on a saved .PLR file. Recorded measurements are lost when you reload the page, so save them (see Saving your work).'),
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
   'Observational Results (in the Results editors group) opens your confirmed redshifts: Download results text, Download results CSV (for a spreadsheet program) and Print results.',
   'Pulsar Results keeps your recorded pulsar measurements: save them as .CSV and load them again later.',
   'Camera images download as FITS files; open them under Files › Saved images.',
   'Hot lists save as .HTL files from the Original hot lists editor.'),
  p('Only the colour theme, instructor Demonstration Mode and the classification observation notebook are remembered by the browser itself.'),
 ],['finishing','printing']),
 topic('printing','Printing',[
  p('Print buttons (Print results, Print spectrum, Print Sky Image..., Print Wedge Plot... and others) open a print preview. Its Print… button opens your browser\'s print dialog, where you can also save as PDF.'),
 ],['saving']),
 topic('finishing','Finishing an exercise',[
  p('Save your investigation and any results files you need for your report, then close the browser tab. File › Exit Observatory in the telescope panel shows VIREO\'s end-of-exercise reminder; a web page cannot close itself, so you close the tab yourself.'),
 ],['saving']),
]};

const SITE:WebHelpGroup={title:'Using the site',topics:[
 topic('navigation','Menus, keyboard and phones',[
  list(
   'The header groups every page: Optical observatory, Radio observatory, Analysis, Results editors, Files and Exercise guides. On a phone they fold behind the Tools button.',
   'Tab and Shift+Tab move between controls; Enter or Space presses a button.',
   'Escape closes menus and dialogs.',
   'Direction buttons (telescope and radio) move while held with the mouse, Space or Enter.',
   'Spectrum cursors move with the arrow keys (Shift for larger steps); Enter or Space applies, Escape cancels.',
   'The theme switch chooses System, Light or Dark colours.'),
 ],['getting-started']),
 topic('instructor','Instructor mode',[
  p('Instructor mode… in the header opens VIREO\'s instructor options, such as Optical Simulation Options… and the radio preferences, which are closed to students. It has no password, is not a lock and shows no answers. Leave turns it off.'),
 ],['telescope']),
 topic('original-help','VIREO\'s original help',[
  p('The Help buttons inside each instrument and tool show VIREO\'s own help for that window, unchanged from the original program.'),
  p('Help › VIREO help topics… shows the help of VIREO\'s main window. It describes the Windows program\'s menus, which OpenVireo replaces with its own pages; Coming from VIREO (Windows) maps each of them. Help › About VIREO 1.504… shows the original program\'s About box.'),
 ],['from-vireo','instruments']),
]};

export const WEB_HELP=Object.freeze({
 caption:'OpenVireo help',
 close:'Close',
 navLabel:'Help topics',
 related:'See also:',
 groups:[START,OBSERVATORY,ANALYSIS,SITE] as readonly WebHelpGroup[],
});

export function webHelpTopic(id:string):WebHelpTopic{
 for(const g of WEB_HELP.groups)for(const t of g.topics)if(t.id===id)return t;
 throw new RangeError(`Unknown help topic ${id}`);
}
