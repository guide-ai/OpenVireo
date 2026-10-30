/** Web texts of Front P (docs/POLISH-FRONT-P.md): labelled web adaptations, notices and typed reasons. Original literals
 * are quoted from the DFM or code and never translated. */
import type {BundledHotListFailure} from '../io/bundledHotList';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'could not be downloaded',size:'does not have its recorded size',sha256:'does not match its recorded SHA-256'});

/** TObsrvtry File item (OB-SR-03, PrintSkyImage1Click 0x53f934) [D]. */
export const PRINT_SKY_LITERALS=Object.freeze({menu:'&Print Sky Image...',caption:'VIREO Optical Telescope Control Panel'});

/** TWedgePlot File item (DFM Print1, Print1Click 0x580f88; scheme := Env+0x2e8d XOR 1 at 0x580fba–0x580fc3) [D]. */
export const WEDGE_PRINT_LITERALS=Object.freeze({menu:'Print Wedge Plot...'});

/** TPlsrAnalysisForm1 caption and File item (DFM) [D]. */
export const PULSAR_PRINT_LITERALS=Object.freeze({menu:'Print &Window...',caption:'Analyze Pulsar Data'});

/** TEnvironment1 Tools › Results Editors (DFM ResultsEditors1, ObservationalResults1, PulsarResults1) [D]. */
export const RESULTS_EDITORS_LITERALS=Object.freeze({resultsEditors:'Results &Editors',observational:'&Observational Results',pulsar:'&Pulsar Results'});

/** OB-SC-02 literals (0x5393f2..0x5394f8) [D]; Yes/No are the Windows MB_YESNO buttons. */
export const TERMINATE_SLEW_LITERALS=Object.freeze({caption:'Slew Suspended',text:'Terminate Current Slew?',yes:'Yes',no:'No'});

/** TCCDCam/TIRCam DFM GroupBox1, WdLbl, HtLbl [D]. */
export const CAMERA_FIELD_SIZE_LITERALS=Object.freeze({group:'Field Size (Arc Min)',width:'Width',height:'Height'});

/** THotListForm1 PopupMenu items (DFM) [D]; Slew uses RADIO_HOT_LIST_FORM_CAPTIONS.slew. */
export const HOT_LIST_POPUP_LITERALS=Object.freeze({label:'Hot list',edit:'&Edit Selection...',editPopup:'&Edit Selection',delete:'&Delete Selection',undo:'&Undo Edit/Delete'});
/** THotListForm1 EditSelectedLine1Click 0x591488 (box 0x5916e4 / caption 0x59171c, MB_ICONWARNING) and DeleteSelectedLine1Click
 * 0x59172c (MessageDlg 0x5918ac, mtConfirmation, [mbYes,mbNo]) [D]; "Confirm" is Delphi's mtConfirmation caption [I]. */
export const HOT_LIST_EDIT_LITERALS=Object.freeze({noSelectionCaption:'No Selection!',noSelectionText:'Please select an entry, using the left mouse button.',deleteCaption:'Confirm',deleteText:'Delete Highlighted Entry from List?'});

export const POLISH_MESSAGES=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'Where to take a spectrum',
  intro:'VIREO’s spectrometer is used from the observatory with the telescope pointed at a target. In OpenVireo each exercise has its own verified spectrometer route:',
  routesTitle:'Spectrometer routes',
  routes:Object.freeze([
   Object.freeze({href:'#star-exposure',label:'Catalog star exposure',help:'the spectrum of the supported catalog star, with Save and Print.'}),
   Object.freeze({href:'#galaxy-exposure',label:'Galaxy exposure',help:'the thirteen Hubble.HTL galaxies (Hubble’s law).'}),
   Object.freeze({href:'#lss-survey',label:'LSS survey',help:'galaxy spectra in the nine LSS fields.'}),
   Object.freeze({href:'#object-x',label:'Object X',help:'spectra of the Object X targets.'}),
   Object.freeze({href:'#observatory',label:'Multi-Spec',help:'the multi-object spectrometer card in the observatory, on the bundled exercise fields (and in the Object X lab).'}),
   Object.freeze({href:'#spectrum',label:'Spectrum analyzer',help:'measure line shifts and record redshifts.'}),
   Object.freeze({href:'#classification',label:'Classification',help:'classify star spectra against the standards.'}),
  ]),
  retired:'This page used to show a preview of prepared source profiles (M82, Coma1, Coma2) before acquisition existed. It was retired on 2026-10-29; the routes above replace it.',
 }),
 clusterGuide:Object.freeze({nav:'Cluster HR guide'}),
 multiSpecPrint:Object.freeze({unavailable:'Print Selection Field is not available: no Multi-Spec field is shown here.'}),
 siteInfo:Object.freeze({
  note:'In VIREO this list window hides its Search, Save Text and Edit menus for the site information, so only Print and Close are offered.',
  printNote:'Web adaptation: VIREO prints the list lines under its shared header on the printer; this prints the date, the caption and the lines.',
 }),
 hotListEdit:Object.freeze({
  note:'Edit, Delete and Undo change the shared hot list, as the Original hot lists editor does; Undo reverses only the last Edit or Delete made here.',
  deleteNote:'Web adaptation: the row is removed from the shared list; Undo puts it back where it was in the file (VIREO re-inserts it by RA).',
 }),
 hotListPopup:Object.freeze({
  note:'Edit, Delete and Undo are in the Original hot lists editor on this page.',
 }),
 cameraFieldSize:Object.freeze({
  note:'For the applied telescope, as VIREO shows when the camera opens (two decimals here).',
 }),
 terminateSlew:Object.freeze({
  note:'Web adaptation: VIREO suspends the slew while it asks; here the telescope keeps moving until you answer (if it arrives first, the question closes). Yes stops it where it is; No lets it continue.',
 }),
 comparison:Object.freeze({
  clear:'Clear comparison',none:'None (cleared)',
  note:'VIREO’s Comparison Spectrum › Clear: it removes the comparison lines from the plot and the table. Choose a list to show them again. The cleared state is not saved; a saved investigation keeps the chosen list.',
 }),
 results:Object.freeze({
  help:'VIREO’s Tools › Results Editors. Observational Results opens your observational results in the spectrum analyzer; Pulsar Results opens the saved pulsar measurements in the pulsar analysis.',
 }),
 pulsarPrint:Object.freeze({
  note:'VIREO’s Print Window (PrintScreen1Click 0x56d9d8, Front RE5) prints its own header and the data parameters, then the window picture. Web adaptation: the page is portrait, the date is the browser’s, the table and student names read “(Not Recorded)” (there is no login), and the picture is the web panels as shown, not VIREO’s print-coloured window image.',
 }),
 wedgePrint:Object.freeze({
  note:'Web adaptation: VIREO’s Print sets the colour scheme to the opposite of a program setting (scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3), so it prints in black and white when that setting is 0; the setting’s default is not recovered. This print always uses the black-and-white scheme and the browser’s printer layout. Selection highlighting is not printed.',
 }),
 printSky:Object.freeze({
  note:'VIREO prints its header (the date and time, here in your browser\'s format; the laboratory table number only when one is recorded; then the student name line, blank here because OpenVireo has no log-in), the sky image colour-inverted and scaled 1.5, and the footer with the field centre, field size, telescope and instrument. Web adaptation: the browser lays out the page and prints the view as shown.',
  noInstrument:'(no instrument chosen in OpenVireo\'s telescope view)',
 }),
 about:Object.freeze({
  nativeNote:'VIREO’s About box, with its texts as read from the original program (its logo is not included). The rest of this window describes this web reconstruction.',
  siteTitle:'This site',
  site:'OpenVireo is a local, non-commercial reconstruction of Project CLEA’s VIREO for students, rebuilt in the browser from VIREO’s recovered behaviour and original data files. It is not CLEA’s program and claims no equivalence with it; web adaptations are labelled where they appear.',
  worksTitle:'What works',
  works:Object.freeze([
   'All seven VIREO exercises have a web student path: Hubble’s law (13 galaxies), large-scale structure, stellar classification, Pleiades photometry (24 stars), cluster HR diagrams, pulsars and the Quest for Object X.',
   'Optical observatory: dome, telescopes, finder and telescope views, slewing with the optional horizon limit, hot lists, site and date, catalog and field information, the variable-star and QSO lists.',
   'Instruments: spectrometer and photometer for the exercise targets, CCD and infrared cameras (live catalogue query), the multi-object spectrometer (Multi-Spec, on the bundled exercise fields and in the Object X lab), and the radio telescope with its receiver and pulsar analysis.',
   'Analysis: spectrum measuring and classification, Hubble and Pleiades fits, the LSS wedge plot, your observational results, and saved investigations.',
  ]),
  creditsTitle:'Credits',
  credits:Object.freeze([
   'Project CLEA, Gettysburg College: originator of VIREO and of its data files. Supported by the National Science Foundation and Gettysburg College.',
   'Pulsar data: likely derived from the ATNF Pulsar Catalogue (Manchester, Hobbs, Teoh & Hobbs 2005); that origin is uncertain.',
   'Camera catalogues: CDS/VizieR (doi:10.26093/cds/vizier); NOMAD (Zacharias et al. 2004); USNO-B1.0 (Monet et al. 2003); 2MASS (Skrutskie et al. 2006) through NOMAD.',
   'Star fields: bounded subsets of the Guide Star Catalog as packaged with VIREO.',
  ]),
 }),
 print:Object.freeze({
  title:'Print preview',button:'Print…',close:'Close',error:'Printing is not available in this browser.',
  missing:'Nothing to print: the picture is not shown right now.',
 }),
 pulsarsHtl:Object.freeze({
  button:'Load bundled Pulsars.HTL',
  note:'Web adaptation: VIREO’s pulsar list Pulsars.HTL (8 pulsars) is bundled byte-exact with this site; in VIREO you open it with Load Hot List... from its folder. Loading it replaces the current hot list, as Load Hot List... does.',
  error:(code:BundledHotListFailure)=>`The bundled Pulsars.HTL ${FILE_REASONS[code]}; the current hot list is unchanged.`,
 }),
});
