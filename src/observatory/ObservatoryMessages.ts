/** Presentation catalog for the optical observatory dialogs (Front B), kept apart from the shared i18n catalog on the
 * WedgeMessages pattern so a later coordinator merge can move it. Recovered original captions live in the core modules
 * (SKY_COORDS_CAPTIONS and friends) and are never translated here; these strings are OpenVireo wording and one-line
 * adaptation labels. English is the default. */
export const OBSERVATORY_MESSAGES=Object.freeze({
 /** VCL default button captions (bkOK/bkCancel without DFM captions) and plain box buttons. */
 common:Object.freeze({ok:'OK',cancel:'Cancel'}),
 horizon:Object.freeze({
  enforcementOn:'Limit Slewing: on. Pointing shortcuts and programmed slews below this horizon are refused, manual moves stop at it and tracking turns off when the target sets. Instrument Activate field jumps and acquisitions are not blocked.',
  siteOverride:(name:string)=>`Site in use: your override “${name}” (clocks and horizon only).`,
 }),
 skyCoords:Object.freeze({
  open:'Set Coordinates…',
  openHelp:'Slew ▸ Set Coordinates: enter the target in hours/minutes/seconds and degrees/arcminutes/arcseconds, then OK starts the programmed slew confirmation.',
  help:'Enter J2000.0 or B1950.0 coordinates. OK checks RA 0–24 h and Dec −90° to +90°; Escape or Cancel leaves the telescope where it is.',
  arcminutes:'arcminutes',arcseconds:'arcseconds',
  hotListOrigin:'Opened from the hot list: the epoch is fixed at J2000.0 (as in the original). Cancel returns to the list.',
  b1950Note:'B1950.0 entries are precessed to J2000.0 with the recovered VIREO conversion before the slew.',
  b1950Reopen:'The stored target was converted back to B1950.0 because the last entry used B1950.0 (original behaviour; Cancel keeps it).',
  b1950Pole:'Near the south celestial pole the recovered conversion returns a northern declination (original quirk kept).',
  errorTitle:'Error',
  notice:Object.freeze({
   'ra-invalid':'Right Ascension must be numbers that give 0 to 24 hours. The dialog stays open.',
   'dec-invalid':'Declination must be numbers that give −90° to +90°. The dialog stays open.',
   'ra-unsupported':'This Right Ascension entry is outside the supported numeric domain of the web version. The dialog stays open.',
   'dec-unsupported':'This Declination entry is outside the supported numeric domain of the web version. The dialog stays open.',
  }),
  ok:'OK',
  adaptation:'Adaptation: the dialog is a web modal; Point and the decimal RA/Dec boxes remain as labelled web shortcuts.',
 }),
 hotList:Object.freeze({
  open:'View/Select from List…',
  openHelp:'Slew ▸ Hot List ▸ View/Select: the list opened or loaded in “Original hot lists” below, in the original window order (by right ascension).',
  help:'Choose a row, then Slew to Selection (or double-click it). The coordinate dialog opens fixed at J2000.0; Cancel there returns here.',
  menu:'List and Selection menu',rows:'Hot list rows',search:'Search…',print:'Print…',
  query:'Text to find',matchCase:'Match case',top:'Search from top',next:'Find next',cancel:'Cancel',
  noSelectionTitle:'No selection',noSelection:'No hot-list row is selected. Choose a row, then Slew to Selection; the list stays open.',
  row:(position:number,id:string,remarks:string,ra:string,dec:string)=>`${position}. ${id}${remarks?` · ${remarks}`:''} · RA ${ra} h · Dec ${dec}°`,
  unnamed:'Unnamed entry',foundMark:'◀ found',found:(position:number)=>`Search found row ${position}. Select it to use it.`,
  adaptation:'Adaptation: the native List/Selection menus are shown as buttons (and as the right-click menu); Save List remains in the “Original hot lists” editor.',
 }),
 entry:Object.freeze({
  open:'Add Current Item/Position to List…',
  openHelp:'Slew ▸ Observation Hot List ▸ Add Current Item/Position: adds the current pointing (and the object there, when the observatory identifies one) to the shared list in memory; save it from “Original hot lists”.',
  help:'Right Ascension 0–24 h and Declination −90° to +90° (bounds included). A degree entry of “-0” counts as north, as in the original.',
  raUnsupported:'An RA of exactly 24 h cannot be stored in an HTL file (0 ≤ RA < 24). Enter 0 h instead.',
  busy:'The hot list is being read. Wait for it to finish, then add again.',
  adaptation:'Adaptation: the object is the selected target’s original catalog ID when the telescope points exactly at it (the original pixel lookup is not recovered; web-only keys such as the supported star’s FILE@offset are not proposed); its kind (Star/Galaxy…) is not known here, so Comments start empty. A blank Object ID is allowed here (“Position added…”, as in the original); the list editor’s Add/Edit still requires one (OpenVireo HTL editor rule).',
  sexagesimal:'Enter as h/m/s, d/m/s…',sexagesimalHelp:'Opens the original Add/Edit Hot List Entry fields; OK copies the values into this form.',
 }),
 site:Object.freeze({
  dateOpen:'Set Date/Time…',siteOpen:'Site Parameters…',infoOpen:'Site Information…',reset:'Use compiled site',
  dateHelp:'Universal Time, not local time. OK applies it to the site clock (and the shared observatory clock).',
  siteHelp:'These values change only the clocks (local time, sidereal time) and the horizon. Spectra, photometry and saved observations keep the telescope’s compiled site.',
  dateError:'The date is not valid. Use YYYY/MM/DD with a full year. The dialog stays open.',
  timeError:'The time is not valid. Use whole numbers as HH:MM:SS (24-hour UT). The dialog stays open.',
  rangeError:'Use a date and time from 1900 through 2099 UT. The dialog stays open.',
  errorTitle:'Error',
  nameUnsupported:'Use printable ASCII characters for the site name (at most 40 are kept).',
  horizonUnsupported:'Enter a horizon between −90° and +90° and a finite altitude.',
  compiled:'Site: the telescope’s compiled site.',
  overridden:(name:string)=>`Site: your override “${name}” (clocks and horizon only).`,
  adaptation:'Adaptation: originally Site Parameters is an instructor dialog (Options ▸ Scopes ▸ Telescope Parameters); here students may set it for the clocks and horizon only. Set Date/Time is the main window’s dialog, offered here.',
 }),
 options:Object.freeze({
  open:'Optical Simulation Options…',unavailable:'Not available in OpenVireo',
  othersHeading:'Other options of the original (not available in OpenVireo; each keeps its compiled state, which is not shown here except where recovered):',
  fastSlewing:'compiled: checked (programmed-slew rate index 4)',
  help:'Limit Slewing (off by default, as compiled) stops the telescope at the site horizon: programmed slews below it are refused, a manual move stops there and tracking turns off when the target sets. Natively this is an instructor option; the other controls keep their compiled behaviour.',
 }),
 hotListPrint:Object.freeze({
  title:'Print hot list',help:'Preview of the printed list: the window caption and the rows as shown. Print opens the browser print dialog for this report only.',
  count:(n:number)=>`${n} row${n===1?'':'s'}`,report:'Hot list report',empty:'The list has no rows.',print:'Print…',close:'Close',
  error:'The browser could not open printing. The preview stays open; try again or close it.',
  adaptation:'Adaptation: no date, names or laboratory table number are printed (those original header fields are not recovered).',
 }),
 spectrumSave:Object.freeze({
  title:'Save or print your spectrum',
  help:'Save writes the acquired spectrum as a VIREO .SSP text file with the recovered save routine (object, pointing, catalog magnitude and 600 normalized source-plus-sky bins). Print prints only this spectrum. Pause the exposure first.',
  save:'Save spectrum (.SSP)',print:'Print spectrum',
  saved:(name:string)=>`Spectrum saved as ${name}. Keep the star JSON to preserve raw counts, timing and RNG.`,
  saveError:'This spectrum cannot be saved: it has no positive bin yet. Integrate longer, then pause and save.',
  printed:'Print dialog opened for this spectrum only.',printBusy:'Another print is being prepared. Close it first.',printError:'The browser could not open printing.',
  printMeta:(ms:string,bins:string)=>`exposure ${ms} ms · ${bins} bins · normalized intensity (saved .SSP values)`,
  chartLabel:'Normalized acquired spectrum as saved',normalized:'Normalized intensity (0–1)',
  adaptation:'Adaptation: Save is a browser download instead of the original file dialog; Print is a scoped browser print (no original printer layout).',
 }),
});
export type ObservatoryMessages=typeof OBSERVATORY_MESSAGES;
