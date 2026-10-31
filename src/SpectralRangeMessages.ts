/** Front S (S1) web strings for the spectrometer range (docs/SPECTRAL-RANGE.md). VIREO's own captions and messages are in
 * src/core/spectralRange.ts (SPECTRAL_RANGE_LITERALS). */
export const SPECTRAL_RANGE_EN=Object.freeze({
 current:(min:string,max:string)=>`Spectrometer range: ${min}–${max} Å (600 bins).`,
 note:'As in VIREO, OK starts a fresh exposure on the new range (the current one is discarded); Cancel keeps the range, and Default restores 3700–4700 Å. Outside the template\'s coverage (below 3510 Å) the source gives no counts, as in VIREO. As in VIREO, the range is one setting shared by the star, sky, Object X and field spectrometer routes; an existing exposure keeps the range it was taken on, and restoring a session file makes its range the current one [W]. Galaxy and QSO spectra, Object X and Multi-Spec stay at 3700–4700 Å, and the Hubble and LSS routes at 4000–5000 Å, until their witnesses cover other ranges [W].',
 objectXNote:'As in VIREO, OK starts the spectrometer again on the new range (an unsaved spectrum is discarded); Cancel keeps the range, and Default restores 3700–4700 Å. The range is one setting shared with the other spectrometer routes. In this web version Object X spectra are verified only at 3700–4700 Å; any other range gives the same message for every target [W].',
 skyNote:'The sky source does not depend on the range (VIREO 0x50df64), so only the wavelengths of the 600 bins change.',
 notWitnessed:'This spectral range is not yet verified for this spectrum in this web version; set the range back to 3700–4700 Å (Default) to observe it.',
 multiSpecRange:(min:string,max:string)=>`Multi-Spec reads the spectrometer range (${min}–${max} Å), which is not yet verified for Multi-Spec in this web version; set it back to 3700–4700 Å to take spectra.`,
 unavailable:'This range cannot be observed for this star in this web version.',
 slider:(edge:string)=>`${edge} slider`,
});
