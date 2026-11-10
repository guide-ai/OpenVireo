import {pickMessages} from '../i18n/registry';
/** Front ES-HELP [W]: English web text of the shared help viewer's language switch and of the Spectral Line Table window (the
 * viewer's own VIREO captions stay in ClusterHrMessages.ts). Spanish: src/i18n/es/maps/helpViewer.ts. A web adaptation by
 * OpenVireo; the original files, hashes and provenance are unchanged. */
export const HELP_VIEWER_EN=Object.freeze({
 /** Shown above the translated help text (Spanish loads only). */
 translationLabel:'Translation: an OpenVireo web adaptation (not CLEA\'s)',
 originalLabel:'Original: VIREO\'s exact English text',
 viewOriginal:'View original (English)',
 viewTranslation:'View translation (Spanish)',
 translationError:'The translated help could not be loaded, or did not match the original file it was translated from, so VIREO\'s original English help is shown.',
 /** Review S6: the help viewer's notes in the translation view (the original view keeps ClusterHrMessages' helpAdaptation and linkNote). */
 helpAdaptationTranslation:(list:string)=>`OpenVireo's Spanish translation of VIREO's own help (its index ${list} and the text files it names; a web adaptation, not CLEA's), shown in a web version of VIREO's help viewer. Window sizes, fonts and the system beep are not reproduced.`,
 linkNoteTranslation:'Double-click or press Enter on a title under "Temas relacionados" to open it. A blank line there does nothing here; VIREO stops with an error on it.',
 searchFoldNote:'In the translation, the search ignores accents and letter case, which is a web adaptation. VIREO\'s own search, kept in the original view, only ignores the case of A to Z.',
 spectralLines:Object.freeze({
  listCaption:'Spectral Lines',
  rows:'Spectral lines',helpRows:'Spectral line help text',close:'Close',
  loading:'Loading VIREO\'s spectral line list…',
  error:'VIREO\'s spectral line files (SPECLNS.LNL, SPECLNS.TXT) could not be loaded or did not match their recorded size and SHA-256.',
  retry:'Try again',ok:'OK',
  note:'VIREO\'s spectral line list (SPECLNS.LNL). Double-click a line, or press Enter, to read its help from SPECLNS.TXT. Like VIREO, the help is found by the line\'s name, so some lines (for example the later He I lines) show the section of the first line with that name. A single click (or an arrow key) moves the classification cursor to the line, at the nearest pixel column of the display; the list then selects the line nearest that column, as VIREO does (so Fe I 4143.878 selects He I 4143.76 in the full view). The arrow keys follow the same rule, so ArrowDown cannot pass from He I 4143.76 to Fe I 4143.88; use End or Home, or click a later line, to move past it.',
  cursorAt:(wl:string)=>`Cursor @: ${wl} Å (VIREO shows the wavelength of the cursor's pixel column, not the line's own wavelength).`,
  cursorOutside:'The line lies outside the displayed range, so no cursor is drawn (in VIREO the cursor readouts are cleared, or point beyond the right edge).',
  textErrorCaption:'Help File Error',
  textError:(file:string)=>`VIREO's spectral line help file (${file}) could not be loaded or did not match its recorded size and SHA-256. The line list stays open; try the line again.`,
 }),
});
export const HELP_VIEWER=pickMessages('helpViewer',HELP_VIEWER_EN);
