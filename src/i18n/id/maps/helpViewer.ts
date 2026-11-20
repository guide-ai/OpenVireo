import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front ID-HELP: Indonesian (id) for the help viewer's language switch and the Spectral Line Table window. A web adaptation by
 * OpenVireo, not CLEA's (VIREO's missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_ID:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'Terjemahan: adaptasi web OpenVireo (bukan teks CLEA)',
 originalLabel:'Asli: teks bahasa Inggris VIREO yang persis',
 viewOriginal:'Lihat aslinya (bahasa Inggris)',
 viewTranslation:'Lihat terjemahan',
 translationError:'Bantuan terjemahan tidak dapat dimuat, atau tidak cocok dengan file asli yang diterjemahkan, sehingga bantuan asli VIREO dalam bahasa Inggris ditampilkan.',
 helpAdaptationTranslation:(list:string)=>`Terjemahan OpenVireo atas bantuan VIREO sendiri (indeksnya ${list} dan file teks yang disebutnya; adaptasi web, bukan teks CLEA), ditampilkan dalam versi web penampil bantuan VIREO. Ukuran jendela, font, dan bunyi bip sistem tidak direproduksi.`,
 linkNoteTranslation:'Klik ganda atau tekan Enter pada judul di bawah baris “Topik terkait” terjemahan untuk membukanya. Baris kosong di sana tidak berfungsi di sini; VIREO berhenti dengan kesalahan pada baris itu.',
 searchFoldNote:'Pada terjemahan, pencarian mengabaikan aksen dan huruf besar/kecil, yang merupakan adaptasi web. Pencarian VIREO sendiri, yang dipertahankan di tampilan asli, hanya mengabaikan huruf besar/kecil A sampai Z.',
 spectralLines:Object.freeze({
  listCaption:'Garis Spektrum',
  rows:'Garis spektrum',helpRows:'Teks bantuan garis spektrum',close:'Tutup',
  loading:'Memuat daftar garis spektrum VIREO…',
  error:'File garis spektrum VIREO (SPECLNS.LNL, SPECLNS.TXT) tidak dapat dimuat atau tidak sesuai dengan ukuran dan SHA-256 yang tercatat.',
  retry:'Coba lagi',ok:'OK',
  note:'Daftar garis spektrum VIREO (SPECLNS.LNL). Klik ganda sebuah garis, atau tekan Enter, untuk membaca bantuannya dari SPECLNS.TXT. Seperti VIREO, bantuan dicari menurut nama garis, sehingga beberapa garis (misalnya garis He I yang lebih akhir) menampilkan bagian dari garis pertama yang bernama sama. Satu klik (atau satu tombol panah) memindahkan kursor klasifikasi ke garis itu, pada kolom piksel terdekat di tampilan; daftar kemudian memilih garis yang paling dekat dengan kolom itu, seperti yang dilakukan VIREO (sehingga Fe I 4143.878 memilih He I 4143.76 pada tampilan penuh). Tombol panah mengikuti aturan yang sama, sehingga ArrowDown tidak dapat berpindah dari He I 4143.76 ke Fe I 4143.88; gunakan End atau Home, atau klik garis yang lebih akhir, untuk melewatinya.',
  cursorAt:(wl:string)=>`Kursor @: ${wl} Å (VIREO menampilkan panjang gelombang kolom piksel kursor, bukan panjang gelombang garis itu sendiri).`,
  cursorOutside:'Garis berada di luar rentang yang ditampilkan, sehingga tidak ada kursor yang digambar (di VIREO, pembacaan kursor dikosongkan, atau menunjuk melewati tepi kanan).',
  textErrorCaption:'Kesalahan File Bantuan',
  textError:(file:string)=>`File bantuan garis spektrum VIREO (${file}) tidak dapat dimuat atau tidak sesuai dengan ukuran dan SHA-256 yang tercatat. Daftar garis tetap terbuka; coba garis itu lagi.`,
 }),
});
