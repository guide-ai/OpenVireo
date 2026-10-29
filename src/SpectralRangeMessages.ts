/** Front S (S1) web strings for the spectrometer range (docs/SPECTRAL-RANGE.md). VIREO's own captions and messages are in
 * src/core/spectralRange.ts (SPECTRAL_RANGE_LITERALS). */
export const SPECTRAL_RANGE_EN=Object.freeze({
 current:(min:string,max:string)=>`Spectrometer range: ${min}–${max} Å (600 bins).`,
 note:'As in VIREO, OK starts a fresh exposure on the new range (the current one is discarded); Cancel keeps the range, and Default restores 3700–4700 Å. Outside the template\'s coverage (below 3510 Å) the source gives no counts, as in VIREO. In this web version the range applies to this star and each telescope keeps its own; the range of a restored exposure stays for the next one; Object X, Multi-Spec and the sky keep 3700–4700 Å and the galaxy and LSS routes keep 4000–5000 Å [W].',
 unavailable:'This range cannot be observed for this star in this web version.',
 slider:(edge:string)=>`${edge} slider`,
});
