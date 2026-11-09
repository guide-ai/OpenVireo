import {pickMessages} from './i18n/registry';
/** Front ES3: VIREO's own captions of the engine (TSpectrumEngine / TSpecDsplyRngDlg DFM), kept beside the web map as literals so
 * their render sites go through vireo() and "View original (English)" applies (docs/I18N.md). */
export const ENGINE_VIEW_LITERALS=Object.freeze({
 zoom:'&Zoom',// VIREO ZoomBtn (opens "Set Wavelength Range")
 dialogCaption:'Set Wavelength Range',// VIREO (TSpecDsplyRngDlg)
 minimum:'Minimum Wavelength (Angstroms):',maximum:'Maximum Wavelength (Angstroms):',// VIREO (TSpecDsplyRngDlg)
 reset:'&Reset',ok:'&OK',cancel:'&Cancel',// VIREO
 resetHint:'Sets optimal range for stellar classification.',// VIREO's hint (the button restores the full loaded range)
 readoutTitle:'Cursor',wavelength:'Wavelength:',intensity:'Rel. Intensity:',// VIREO display captions
});
/** Front S (S5) English web strings for the measuring engine's zoom, pan and readout (docs/SPECTRUM-ENGINE-VIEW.md). */
export const ENGINE_VIEW_EN=Object.freeze({
 panLeft:'Shift window 100 Å to the left',panRight:'Shift window 100 Å to the right',
 readoutEmpty:'Drag in the plot, or focus it and use the arrow keys, to read a wavelength.',
 nearest:'Nearest comparison line',
 nearestNone:'No comparison line within 100 Å of the cursor.',
 nearestFound:(label:string,shifted:string)=>`Nearest comparison line: ${label} at ${shifted} Å.`,
 plotHelp:'Spectrum plot. Drag, or use the arrow keys, to move the cursor; right-click or press N for the nearest comparison line.',
 window:(min:string,max:string)=>`Window ${min}–${max} Å`,
 fullViewNote:'The Full and H/K views are web presets; Zoom and the arrows apply to the normal view.',
 note:'As in VIREO, Zoom chooses a window in 100 Å steps from the start of the loaded spectrum and first folds the z control into its base (like Recenter); the arrows move the window 100 Å and may pass its ends by less than 100 Å; the readout shows the observed wavelength under the cursor and the cursor\'s height on the plot axis, not the spectrum\'s value.',
});
export const ENGINE_VIEW=pickMessages('engineView',ENGINE_VIEW_EN);
