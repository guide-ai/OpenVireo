import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front ID1: Indonesian (id) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_ID:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'satu potongan katalog tidak tiba',
  integrity:'satu potongan katalog tidak cocok dengan ukuran dan SHA-256 yang tercatat',
  index:'indeks katalog tidak dapat dibaca atau tidak cocok dengan situs ini',
  budget:'bidang ini memerlukan lebih banyak potongan katalog sekaligus daripada yang disimpan situs ini di memori',
  'missing-tile':'situs ini meminta potongan katalog yang salah (mohon laporkan)',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'di VIREO, bidang ini membaca melewati ujung sebuah pita deklinasi pada katalognya, yang memicu kesalahan masukan/keluaran dan meninggalkan daftar bintang yang tidak lengkap. Situs ini menampilkan tanpa bidang sebagai gantinya [adaptasi web].',
  regions:'VIREO akan memperingatkan “Field Contains Too Many Regions!” dan mempertahankan 100 wilayah pertama; situs ini tidak mereproduksinya [adaptasi web].',
  budget:'bidang ini memuat lebih banyak catatan katalog daripada yang dibaca situs ini dalam satu pita deklinasi [batasan web].',
  plan:'situs ini membaca di luar potongan katalog yang telah direncanakannya (mohon laporkan).',
  source:'file katalog yang disertakan tidak berbentuk seperti yang diharapkan (mohon laporkan).',
  input:'arah pengamatan ini bukan posisi langit yang valid.',
  evidence:'mesin bidang mendapati catatannya tidak konsisten (mohon laporkan).',
 } as Record<string,string>),
});
