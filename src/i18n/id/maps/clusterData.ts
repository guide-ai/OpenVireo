import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front ID4: Indonesian (id) for the File › Cluster Data... web texts (Front K). A web adaptation by OpenVireo, not CLEA’s.
 * VIREO’s own captions and messages are rendered through vireo() and originals.json, not here. */
export const CLUSTER_DATA_ID:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'VIREO menampilkan File › Data Gugus... dalam mode fotometri, diagram H-R, dan semua instrumennya; situs ini tidak memiliki mode, sehingga item ini selalu ada.',
 groupsDisabled:'Tipe Daftar (Type of Listing) dan Urutkan Menurut (Sort By) adalah pengaturan instruktur (Mode Edit [Edit Mode]) di VIREO; tanpa Mode Edit, daftar adalah daftar pencarian pelajar, diurutkan menurut AR.',
 useTelescopeOff:'Gunakan Koordinat Teleskop (Use Telescope Coordinates) memerlukan kubah terbuka dan pelacakan aktif, seperti VIREO memerlukan penggerak teleskop menyala.',
 loading:'Memuat data gugus…',loadError:'Data gugus tidak dapat dimuat.',
 unavailableCaption:'Data Gugus',
 tileReason:Object.freeze({
  polar:'Daftar ini tidak dapat dibuat di sini: sedekat ini dengan kutub langit, persegi panjang VIREO di sekitar pusat melipat dengan cara yang tidak direproduksi situs ini. Geser pusat sedikit menjauh dari kutub.',
  regions:'Daftar ini tidak dapat dibuat di sini: persegi panjang mencakup lebih dari 100 wilayah katalog, lebih banyak daripada yang disimpan VIREO. Gunakan diameter yang lebih kecil.',
  budget:'Daftar ini tidak dapat dibuat di sini: persegi panjang memuat lebih banyak entri katalog daripada yang dibaca situs ini sekaligus. Gunakan diameter yang lebih kecil.',
  'band-end':'Daftar ini tidak dapat dibuat di sini: pada pusat ini VIREO membaca melewati akhir sebuah file katalog dan berhenti dengan kesalahan.',
  plan:'Daftar ini tidak dapat dibuat di sini: sebuah potongan katalog tidak berada di tempat yang diharapkan.',
 }),
 tileFetch:'Potongan katalog untuk bidang ini tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
 reportNoteTiles:'Daftar ini adalah kueri VIREO terhadap Guide Star Catalog (katalog bintang pemandu) lengkap (dibaca dari potongan katalog situs ini) pada pusat dan diameter dialog, disaring menurut batas magnitudo. Posisi dan magnitudo berasal dari katalog; hanya 16 gugus yang dipublikasikan memiliki komentar.',
 spectral:'Daftar ini tidak dapat ditampilkan: sebuah kode spektrum pada bidang ini tidak memiliki teks yang dipulihkan.',
 editModeColumns:'Mode Edit (Edit Mode): VIREO juga mencantumkan untuk setiap gugus warna titik belok deret utama (turn-off), jarak, modulus jarak, dan usia; nilai katalog itu tidak dipublikasikan di situs ini, sehingga hanya E(B−V) yang ditampilkan.',
 saveListUnavailable:'Simpan Daftar (Save List) tidak tersedia di sini: VIREO menulis seluruh entri gugus 102 byte, yang mencakup nilai katalog yang tidak dipublikasikan situs ini.',
 noSelection:'Pilih baris gugus terlebih dahulu (klik kiri).',
 reportNote:'Daftar ini adalah kueri VIREO terhadap bidang gugus yang dipublikasikan pada pusat dan diameter dialog (diperiksa secara luring untuk menghasilkan tepat bintang yang dipublikasikan), disaring menurut batas magnitudo.',
 emptyField:'Tidak ada bintang pada bidang ini yang seterang batas magnitudo. Setelah kotak di atas, VIREO tetap membuka laporannya, dengan “0 Stars” (0 bintang) dan baris dari kuerinya sebelumnya; situs ini tidak menampilkan daftar.',
 emptyUnknown:'Tidak ada bintang yang dipublikasikan pada bidang ini yang seterang batas magnitudo. VIREO mungkin tidak mencantumkan satu pun atau menjawab “Tidak Ada Bintang di Bidang!” (No Stars Found in Field!), tergantung pada bintang katalog yang tidak dipublikasikan situs ini, sehingga tidak ada daftar yang ditampilkan.',
 listModal:'Adaptasi web: VIREO menampilkan daftar ini sebagai jendela terpisah di samping dialog; di sini daftar terbuka di atasnya.',
 listNote:'Klik dua kali sebuah baris (atau Ambil Data Pilihan [Get Selection Data]) untuk menyalinnya ke Parameter Data Gugus; klik kanan baris yang dipilih untuk item daftar objek.',
 printNote:'Adaptasi web: pratinjau cetak daftar; VIREO mencetak lanskap dalam Mode Edit dan potret selain itu.',
});
