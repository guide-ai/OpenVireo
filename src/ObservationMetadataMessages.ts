/** Front S (S4) strings for the Observational Data values of loaded and acquired spectra (docs/OBSERVATION-RESULTS.md). The
 * field captions are VIREO's (TObsRsltsDlg1 DFM). */
export const OBSERVATION_METADATA_EN=Object.freeze({
 time:'Observation Time (JD)',ra:'Right Ascension:',dec:'Declination:',// VIREO
 photometry:'Observed Magnitudes',redshift:'Redshift (Z):',velocity:'Velocity (V):',// VIREO
 empty:'(empty)',
 note:'As in VIREO, a spectrum loaded from a file takes its object ID from the file name, its time from the file\'s last change (converted to JD in UTC here), and its position from the telescope pointing in the file header; photometry and redshift stay empty, and an empty box means the value is not known. A spectrum classified directly from an exposure has no file time, so its JD stays empty.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · RA ${ra||'—'} · Dec ${dec||'—'}`,
});
