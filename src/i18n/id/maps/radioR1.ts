import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front ID5: Indonesian (id) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_R1_ID:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:'Perintah File ▸ Simpan Data Tercatat... (Save Recorded Data) di VIREO (SvRcData1Click 0x567f70) menjalankan penyimpanan yang sama dengan tombol Simpan (Save) di Analisis Pulsar (Pulsar Analysis); perintah ini aktif selama data tercatat ada. Di sini perintah ini membuka Analisis Pulsar, yang Simpan terverifikasinya menulis rekaman (adaptasi web).',
 optionEffectsTitle:'Fungsi pengaturan VIREO ini (ditampilkan dengan nilai terkompilasinya; tidak dapat diubah di sini):',
 optionEffects:Object.freeze([
  'Plot Posisi Pulsar (Plot Pulsar Positions; nonaktif): menggambar pulsar katalog pada peta langit radio.',
  'Tulis File Daftar Objek (Write Hot List File; nonaktif): menampilkan Gerakkan ▸ Daftar Objek ▸ Simpan Daftar yang Diperbarui....',
  'Posisi Tepat untuk Daftar Objek (Exact Pos for Hot List; nonaktif): Tambahkan Objek Saat Ini ke Daftar (Add Current Item to List) menyimpan posisi katalog pulsar, bukan arah teleskop.',
  'Fitur Suara (Sound Features; aktif): penerima memutar suara denyutnya jika perangkat suara tersedia.',
  'Mode Uji (Test Mode; nonaktif): pengaturan untuk instruktur; Atur Koordinat (Set Coordinates) menggerakkan teleskop seketika.',
  'Identifikasi Pulsar (Pulsar Identification; Gunakan Nama B1950 [Use B1950 Name]): menentukan nama pada keterangan penerima, header rekaman, dan item yang dibuat oleh Tambahkan Objek Saat Ini ke Daftar (Add Current Item).',
  'Tipe Teleskop (Telescope Type; Dapat Diarahkan Penuh [Fully Steerable]): hanya opsi Hanya Transit (Transit Only) yang mengubah perilaku VIREO; Arecibo tidak punya kode sendiri dan berperilaku seperti Dapat Diarahkan Penuh.',
 ]),
 findNote:'Temukan (Find) mencari setiap baris tersimpan (teks asli tiap pengukuran, seperti yang ditulis oleh Catat [Record]) dari atas atau setelah baris yang dipilih, tanpa membedakan huruf besar dan kecil, tanpa kembali ke awal, seperti di VIREO. Seperti VIREO, Temukan mengingat pencarian terakhir Anda dalam huruf kecil. Adaptasi web: teks yang tersimpan adalah milik situs ini; teks itu bisa berbeda dari VIREO pada bagian akhir nama file (browser tidak memberi folder) dan, jarang, pada digit terakhir sebuah angka. Pencarian yang diingat bertahan selama halaman ini terbuka.',
 saveDataOff:'Belum ada yang dicatat: VIREO menonaktifkan item ini sampai analisis memuat data tercatat.',
});
