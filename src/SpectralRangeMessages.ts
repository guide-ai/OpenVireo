/** Front S (S1) web strings for the spectrometer range (docs/SPECTRAL-RANGE.md). VIREO's own captions and messages are in
 * src/core/spectralRange.ts (SPECTRAL_RANGE_LITERALS). */
export const SPECTRAL_RANGE_EN=Object.freeze({
 current:(min:string,max:string)=>`Spectrometer range: ${min}–${max} Å (600 bins).`,
 note:'As in VIREO, OK starts a fresh exposure on the new range (the current one is discarded); Cancel keeps the range, and Default restores 3700–4700 Å. Outside the template\'s coverage (below 3510 Å) the source gives no counts, as in VIREO. As in VIREO, the range is one setting shared by the star, sky, Hubble galaxy, LSS, Object X and field spectrometer routes and by Classify; an existing exposure keeps the range it was taken on [W], and restoring a session file makes its range the current one [W]. Every range of the dialog is verified for star, galaxy, QSO and sky spectra on these routes and on Multi-Spec (Front S3); a galaxy whose spectrum does not reach a range, or a source too bright on it for the telescope, says so. Object X admits only the ranges on which every target behaves as at 3700–4700 Å [W].',
 objectXNote:'As in VIREO, OK starts the spectrometer again on the new range (an unsaved spectrum is discarded); Cancel keeps the range, and Default restores 3700–4700 Å. The range is one setting shared with the other spectrometer routes. In this web version Object X admits only the ranges on which every Object X target is observable exactly as at 3700–4700 Å; any other range gives the same message for every target [W].',
 skyNote:'The sky source does not depend on the range (VIREO\'s sky branch of 0x50df64 and Go 0x50f4da read none), so only the wavelengths of the 600 bins change.',
 notWitnessed:'This spectral range cannot be used here in this web version; set the range back to 3700–4700 Å (Default) to observe.',
 multiSpecRange:(min:string,max:string)=>`Multi-Spec reads the spectrometer range (${min}–${max} Å), which cannot be used here in this web version; set it back to 3700–4700 Å to take spectra.`,
 unavailable:'This range cannot be observed for this star in this web version.',
 slider:(edge:string)=>`${edge} slider`,
 locked:'Spectral Range… is disabled: Allow User Change is unchecked in the Optical Simulation Options (Spectrometer tab), as in VIREO.',
});
