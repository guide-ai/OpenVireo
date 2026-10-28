/** Original menu captions of the optical observatory's File and Tools items (TEnvironment1 / TObsrvtry DFM; Front O, O2), kept
 * in this dependency-free module so the always-loaded menu does not pull the field engine into the observatory bundle.
 * Never translated. */
/** TObsrvtry File › Variable Stars submenu captions (DFM; Front O, RECOVERY-C). */
export const VARIABLE_STARS_MENU=Object.freeze({fieldInformation:'&Field Information',variableStars:'&Variable Stars',gcvs:'&All GCVS variables in region.',modeled:'&VIREO-modeled varibles in region.'});
/** TEnvironment1 File › QSOList1 (DFM Visible = False; shown by the run handlers, docs/QSO-LIST-HST.md). */
export const QSO_LIST_MENU='&QSO List...';
/** TEnvironment1 Tools (Analysis1, caption `&Tools`) › HSTImageArchive1: 0x58e78c → 0x58ebe0 WebBrowser1.Navigate of the File
 * Options URL (options+0x23cd), compiled default 0x5a2f00 (48-byte ShortString), label in TFileOptsDlg. */
export const HST_ARCHIVE=Object.freeze({tools:'&Tools',menu:'HS&T Image Archive...',defaultUrl:'http://hubblesite.org/newscenter/archive/browse/',optionsLabel:'HST Newscenter Archive URL',
 /** [W] Checked 2026-10-28 (one GET each from a shell): the original address now redirects to https://science.nasa.gov/mission/hubble/
  * (the mission home, not an archive); this hubblesite.org address redirects to https://science.nasa.gov/mission/hubble/multimedia/hubble-images/
  * ("Hubble Images"), the current equivalent of the image archive. */
 webUrl:'https://hubblesite.org/resource-gallery/images'});
/** TOptionsDlg VObsBox (DFM caption and hint; options+0x27d5, compiled default 0 at 0x5a2b59). It enables Run Exercise ›
 * `&Virtual Observatory (All Instruments)` (SetEnabled at 0x587f91 / 0x588898), the only student route to File › QSO List. */
export const VIRTUAL_OBSERVATORY_CAPTIONS=Object.freeze({box:'Virtual Observatory',hint:'Enables Virtual Observatory (read-only access to all data)',runItem:'&Virtual Observatory (All Instruments)'});
export const COMPILED_VIRTUAL_OBSERVATORY=false;
