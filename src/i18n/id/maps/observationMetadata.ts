import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front ID1: Indonesian (id) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_ID:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(kosong)',
 note:'Seperti di VIREO, spektrum yang dimuat dari file mengambil ID objeknya dari nama file, waktunya dari perubahan terakhir file (di sini dikonversi ke JD dalam UTC), dan posisinya dari arah teleskop di header file; fotometri dan pergeseran merah tetap kosong, dan kotak kosong berarti nilainya tidak diketahui. Spektrum yang diklasifikasikan langsung dari sebuah eksposur tidak memiliki waktu file, sehingga JD-nya tetap kosong.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · AR ${ra||'—'} · Dek. ${dec||'—'}`,
});
