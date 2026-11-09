import {pickMessages} from './i18n/registry';
/** Front S (S4) strings for the Observational Data values of loaded and acquired spectra (docs/OBSERVATION-RESULTS.md). Front ES5
 * review: the field captions are VIREO's (TObsRsltsDlg1 DFM), so they left this web map; ObservationResults renders them through
 * vireo() of OBSERVATIONAL_DATA_LITERALS (src/core/clusterNativeHrSelect.ts), with the same English. */
export const OBSERVATION_METADATA_EN=Object.freeze({
 empty:'(empty)',
 note:'As in VIREO, a spectrum loaded from a file takes its object ID from the file name, its time from the file\'s last change (converted to JD in UTC here), and its position from the telescope pointing in the file header; photometry and redshift stay empty, and an empty box means the value is not known. A spectrum classified directly from an exposure has no file time, so its JD stays empty.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · RA ${ra||'—'} · Dec ${dec||'—'}`,
});
export const OBSERVATION_METADATA=pickMessages('observationMetadata',OBSERVATION_METADATA_EN);
