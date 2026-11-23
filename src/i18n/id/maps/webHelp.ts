import type {WEB_HELP_EN} from '../../../help/webHelp';
import type {Translation} from '../../maps';
/** Front ID-HELP: Indonesian (id) for OpenVireo's own help topics (Bantuan › Topik bantuan…). The labels quoted from OpenVireo's screen
 * are the Indonesian ones the interface already shows; VIREO's own menu names come from originals.json. A web adaptation by OpenVireo,
 * not CLEA's. Text only: the topic ids, block kinds and related links are the English source's (webHelp.ts). */
const p=(text:string)=>text;
const steps=(...items:string[])=>items;
const list=(...items:string[])=>items;
const topic=(title:string,blocks:readonly (string|readonly string[]|{head:readonly string[];rows:readonly (readonly string[])[]})[])=>({title,blocks});

const START={title:'Mulai di sini',topics:[
 topic('Apa itu OpenVireo',[
  p('OpenVireo adalah versi browser dari VIREO, Observatorium Pendidikan Virtual milik Project CLEA (Gettysburg College). OpenVireo dibangun ulang dari perilaku VIREO yang dipulihkan dan file data aslinya; ini bukan program CLEA itu sendiri.'),
  p('Tidak ada yang perlu dipasang, dan tidak ada akun maupun proses masuk. Semuanya berjalan di tab browser ini, dan pekerjaan Anda tetap berada di tab sampai Anda menyimpannya sebagai file di komputer Anda. Di layar, angka memakai titik desimal dan spasi tipis di antara ribuan (misalnya 1.5 dan 24 000); ketik juga desimal dengan titik. File yang disimpan situs tetap dalam bahasa Inggris, seperti yang ditulis VIREO.'),
  p('Versi 1.0 berisi tujuh praktikum VIREO: hukum Hubble, struktur skala besar (LSS), klasifikasi bintang, fotometri Pleiades, diagram HR gugus bintang, pulsar, dan Pencarian Objek X. Masing-masing punya panduan di bawah Panduan praktikum pada header.'),
 ]),
 topic('Memulai',[
  p('Jika Anda mengerjakan salah satu praktikum, untuk kursus atau secara mandiri, buka panduannya lebih dahulu: panduan itu mencantumkan setiap langkah dan membawa Anda ke halaman yang tepat. Untuk menjelajah dengan bebas:'),
  steps(
   'Buka Observatorium pada header (grup Observatorium optik).',
   'Tekan Buka kubah.',
   'Pada Pilih objek, pilih sebuah target dari daftar (atau ketik di Cari katalog), lalu tekan Arahkan teleskop.',
   'Buka Jam observatorium dan pelacakan spektrum, lalu tekan Aktifkan pelacakan. Kamera dan spektrometer memerlukan pelacakan.',
   'Beralih ke tampilan teleskop dan gunakan sebuah instrumen: Buka spektrometer, kamera CCD atau kamera IR, atau Multi-Spec.',
   'Ukur apa yang Anda catat pada sebuah halaman analisis, lalu simpan pekerjaan Anda (lihat Menyimpan pekerjaan Anda).'),
 ]),
 topic('Panduan praktikum',[
  p('Grup Panduan praktikum pada header memiliki satu tombol untuk setiap praktikum: Panduan praktikum Hubble, Panduan LSS, Panduan Objek X, Panduan pulsar, Panduan praktikum Pleiades, Panduan klasifikasi, dan Panduan diagram HR gugus bintang.'),
  p('Sebuah panduan terbuka sebagai jendela dengan langkah bernomor. Tanda centang menandai setiap langkah yang sudah Anda selesaikan, dan sebuah tombol seperti Lanjut ke langkah berikutnya membawa Anda ke halaman untuk langkah selanjutnya. Tutup panduan kapan saja dan buka lagi dari header; kemajuan Anda dipertahankan selama tab tetap terbuka.'),
  p('Setelah Anda menutup sebuah panduan, langkahnya saat ini tetap berada di sebuah bilah di bagian bawah setiap halaman. Tunjukkan membawa Anda ke kontrol untuk langkah itu dan menyorotinya, Detail langkah menampilkan teks panduan untuk langkah itu, Panduan penuh membuka kembali panduannya, dan Sembunyikan menghapus bilah tersebut. Bilah berpindah ke langkah berikutnya dengan sendirinya saat Anda bekerja. Seperti panduannya, bilah ini menunjukkan apa yang sudah Anda kerjakan dan tidak pernah menilai hasil.'),
  p('Membuka sebuah panduan juga memulai praktikum itu, seperti memilih praktikum di VIREO: panduan menentukan teleskop mana yang terbuka (lihat Teleskop dan Minta Waktu) dan apakah nama serta magnitudo objek ditampilkan. Pada praktikum Objek X, identitas objek tetap tersembunyi sampai Anda mengungkapkannya.'),
 ]),
 topic('Beralih dari VIREO (Windows)',[
  p('Jika Anda mengenal program Windows, atau lembar praktikum Anda ditulis untuknya, tabel ini menunjukkan di mana setiap langkah VIREO berada di OpenVireo.'),
  {head:['Di VIREO (Windows)','Di OpenVireo'],rows:[
   ['File › Masuk...','Tidak diperlukan: tidak ada akun maupun proses masuk. Nama pada hasil cetak tetap kosong.'],
   ['File › Jalankan Praktikum','Buka panduan praktikum itu di bawah Panduan praktikum pada header.'],
   ['File › Atur Tanggal/Waktu Pengamatan, ID...','Jam lokasi › Atur Tanggal/Waktu… pada halaman Observatorium (UT). Halaman Objek X memiliki kotak tanggal dan waktunya sendiri (Atur jam observatorium); kotak ID-nya memberi label pada data tersimpan Anda.'],
   ['Teleskop › Optik','Kartu Teleskop optik pada halaman Observatorium: pilih sebuah profil, lalu Gunakan teleskop ini.'],
   ['Teleskop › Optik › Minta Waktu','Kotak Minta Waktu pada kartu yang sama (hanya pada praktikum yang membatasi teleskop yang lebih besar).'],
   ['Teleskop › Radio','Teleskop radio pada header (grup Observatorium radio).'],
   ['Sakelar Buka/Tutup kubah','Buka kubah / Tutup kubah pada halaman Observatorium.'],
   ['Tombol Panel Kontrol Teleskop','Beralih ke tampilan teleskop, lalu Gerakkan teleskop dan kartu instrumen.'],
   ['Alat › (alat analisis)','Grup Analisis pada header: Penganalisis spektrum, Klasifikasi bintang, Basis data gugus, Survei LSS, Data LSS, Objek X, Bintang variabel; Data radio untuk pulsar.'],
   ['Alat › Editor Hasil','Grup Editor Hasil pada header: Hasil Pengamatan dan Hasil Pulsar.'],
   ['Muat Data Tersimpan...','Pulihkan investigasi (JSON) pada menu Tindakan di bagian atas halaman, atau tombol muat pada editor hasil tempat Anda menyimpan.'],
   ['Alat › Spreadsheet','Unduh CSV hasil, lalu buka file itu di program spreadsheet mana pun.'],
   ['Alat › Pengolahan Citra (DS9)','Citra kamera disimpan sebagai unduhan FITS dan dapat dibuka di bawah File › Citra tersimpan atau di penampil FITS mana pun, termasuk DS9.'],
   ['File › Keluar dari Observatorium','Simpan pekerjaan Anda, lalu tutup tab browser. Menu File dalam Gerakkan teleskop memuat Keluar dari Observatorium, yang menampilkan pengingat VIREO.'],
   ['Keyboard: Alt, NumLock, dan MouseKeys','Tombol browser yang biasa: lihat Menu, keyboard, dan ponsel.'],
  ]},
 ]),
]};

const OBSERVATORY={title:'Observatorium',topics:[
 topic('Kubah, pengarahan, dan pelacakan',[
  p('Halaman Observatorium mengikuti tiga langkah: 1 · Buka kubah, 2 · Pilih dan arahkan, 3 · Jelajahi instrumen.'),
  list(
   'Buka kubah menampakkan langit dan mengaktifkan kontrol teleskop. Tampilan bidang beralih antara Pencari · 2.5° dan Teleskop · 15′.',
   'Pilih objek menampilkan target yang disarankan, daftar praktikum Hubble, dan setiap target katalog; Cari katalog memfilter daftar (Escape mengosongkannya). Arahkan teleskop memusatkan teleskop pada pilihan Anda. Di bawah Masukkan koordinat, Arahkan ke koordinat mengarahkan teleskop ke asensio rekta dan deklinasi mana pun.',
   'Gerakkan teleskop menggerakkan teleskop selama Anda menahan sebuah tombol arah (dengan mouse, Spasi, atau Enter). Menunya memiliki Atur Koordinat…, Lihat/Pilih dari Daftar… (daftar objek), dan Tambahkan Objek/Posisi Saat Ini ke Daftar….',
   'Pelacakan ada di Jam observatorium dan pelacakan spektrum: Aktifkan pelacakan mempertahankan arah teleskop selama jam berjalan. Kamera dan spektrometer menolak mengambil data selama pelacakan nonaktif.'),
 ]),
 topic('Teleskop dan Minta Waktu',[
  p('Kartu Teleskop optik pada halaman Observatorium menawarkan tiga teleskop VIREO: 0.4 m, 0.9 m KPNO, dan 4 m KPNO. Pilih salah satu di bawah Profil teleskop untuk diperiksa atau dipilih, lalu tekan Gunakan teleskop ini. Menu VIREO menyebut teleskop 0.9 m sebagai teleskop 1.0 Meter.'),
  p('Pada praktikum fotometri Pleiades, diagram HR gugus bintang, dan klasifikasi, teleskop yang lebih besar dibatasi, seperti di VIREO. Sebuah kotak Minta Waktu lalu muncul pada kartu, dengan Minta Teleskop 1.0 Meter dan Minta Teleskop 4.0 Meter. Jika waktu diberikan, Anda mendapat sejumlah pemakaian; jika tidak, Anda dapat mengajukan lagi setelah beberapa menit. Teleskop 0.4 m selalu tersedia, dan praktikum Hubble, LSS, dan Objek X membiarkan semua teleskop terbuka.'),
 ]),
 topic('Tanggal, waktu, dan lokasi',[
  p('Jam observatorium dan pelacakan spektrum memulai dan menjeda jam observatorium serta mengaktifkan atau menonaktifkan pelacakan.'),
  p('Jam lokasi · skenario UT tetap menetapkan tanggal dan waktu pengamatan dengan Atur Tanggal/Waktu… (dalam UT, bukan waktu setempat). Informasi Lokasi… menampilkan observatorium, dan Parameter Lokasi… mengubah lokasinya untuk jam dan cakrawala. Gunakan tanggal dan waktu yang tertera pada materi praktikum Anda.'),
 ]),
 topic('Instrumen',[
  list(
   'Spektrometer: Buka spektrometer pada halaman Observatorium, atau halaman praktikum (Eksposur bintang, Eksposur galaksi, Survei LSS, Objek X). Tombol Spektrometer pada header mencantumkan tempat setiap jenis spektrum diambil.',
   'Fotometer: Fotometri Pleiades pada header.',
   'Eksposur langit, Eksposur bintang, dan Eksposur galaksi pada header mengambil spektrum latar langit, bintang katalog yang didukung, dan galaksi Hubble.',
   'Kamera CCD dan IR: kartu kamera pada halaman Observatorium. Mulai eksposur mengambil sebuah citra; Simpan citra (FITS) mengunduhnya. Bidang tanpa daftar bintang yang disertakan dapat meminta data secara langsung dari layanan katalog VizieR (hanya koordinat dan radius yang dikirim).',
   'Multi-Spec: kartu spektrometer multiobjek pada halaman Observatorium.',
   'Teleskop radio: lihat Teleskop radio dan pulsar.'),
  p('Setiap instrumen memiliki tombol Bantuan sendiri. Tombol itu menampilkan bantuan asli VIREO untuk instrumen tersebut, diterjemahkan, dengan Lihat aslinya (bahasa Inggris); jika panel OpenVireo berbeda dari panel VIREO, panel itu sendiri memuat catatan web.'),
 ]),
 topic('Teleskop radio dan pulsar',[
  p('Teleskop radio pada header membuka panel kontrol teleskop radio. Awali dengan Mulai praktikum pulsar, arahkan ke sebuah pulsar, dan catat sinyalnya dengan penerima. Panel itu memiliki menu Bantuan sendiri dengan bantuan radio VIREO.'),
  p('Data radio membuka analisis pulsar: ukur periode dan tunda antarfrekuensi dengan kursor, pada rekaman Anda atau pada file .PLR yang tersimpan. Pengukuran yang tercatat hilang saat Anda memuat ulang halaman kecuali Anda menyimpannya: Simpan investigasi menyimpan rekaman Anda dan pengukuran yang sudah dikonfirmasi (lihat Menyimpan pekerjaan Anda).'),
 ]),
]};

const ANALYSIS={title:'Analisis dan hasil',topics:[
 topic('Halaman analisis',[
  list(
   'Penganalisis spektrum: sejajarkan garis acuan dengan sebuah spektrum untuk mengukur pergeseran merahnya, dan simpan hasil Anda.',
   'Klasifikasi bintang: bandingkan sebuah spektrum dengan bintang standar atlas dan pilih tipe spektrumnya.',
   'Basis data gugus: plot diagram HR gugus bintang dan cocokkan deret utama serta isokron.',
   'Survei LSS: ambil spektrum galaksi pada bidang survei. Data LSS: plot pergeseran merah dalam diagram kerucut.',
   'Objek X: identifikasi objek tak dikenal dari pengenal dan koordinatnya.',
   'Bintang variabel: cari sebuah bintang variabel dan plot kurva cahayanya.',
   'Data radio: ukur pulsar (lihat Teleskop radio dan pulsar).'),
 ]),
 topic('Menyimpan pekerjaan Anda',[
  p('OpenVireo tidak menyimpan apa pun di server. Sebagian besar pekerjaan Anda berada di tab ini dan hilang saat Anda memuat ulang atau menutupnya, jadi simpan sebagai file di komputer Anda.'),
  list(
   'Simpan investigasi (di bagian atas setiap halaman) mengunduh satu file berisi spektrum, pengukuran, dan pengaturan Anda. Pulihkan investigasi (JSON), pada menu di sebelahnya, memuat file itu lagi nanti; Isi cadangan pada menu yang sama mencantumkan persis apa yang dicakupnya.',
   'Hasil Pengamatan (pada grup Editor Hasil) membuka pergeseran merah Anda yang sudah dikonfirmasi: Unduh teks hasil, Unduh CSV hasil (untuk program spreadsheet), dan Cetak hasil.',
   'Simpan investigasi juga menyimpan rekaman pulsar dan pengukuran pulsar Anda yang sudah dikonfirmasi. Untuk file .CSV, gunakan Simpan pengukuran yang tercatat (.CSV) pada Data radio; Hasil Pulsar membuka file yang tersimpan untuk ditinjau.',
   'Citra kamera diunduh sebagai file FITS; buka di bawah File › Citra tersimpan.',
   'Daftar objek disimpan sebagai file .HTL dari editor Daftar objek asli.'),
  p('Hanya tema warna, bagian menu yang Anda biarkan terbuka, apakah Anda sudah melihat tur, apakah tombol ? membuka bantuan, Mode Demonstrasi (Demonstration Mode) milik instruktur, dan buku catatan pengamatan klasifikasi yang diingat oleh browser itu sendiri.'),
 ]),
 topic('Mencetak',[
  p('Beberapa tombol cetak, seperti Cetak hasil dan Cetak spektrum, langsung membuka kotak dialog cetak browser Anda. Yang lain, seperti Cetak Citra Langit... dan Cetak Diagram Kerucut..., lebih dahulu menampilkan pratinjau cetak; tombol Cetak… di pratinjau itu membuka kotak dialog cetak. Kotak dialog cetak browser juga dapat menyimpan sebagai PDF.'),
 ]),
 topic('Menyelesaikan praktikum',[
  p('Simpan investigasi Anda dan file hasil apa pun yang Anda perlukan untuk laporan, lalu tutup tab browser. Keluar dari Observatorium, pada menu File dalam Gerakkan teleskop, menampilkan pengingat akhir praktikum VIREO; halaman web tidak dapat menutup dirinya sendiri, jadi tutup sendiri tab itu.'),
 ]),
]};

const SITE={title:'Menggunakan situs',topics:[
 topic('Menu, keyboard, dan ponsel',[
  list(
   'Menu mengelompokkan setiap halaman ke dalam bagian: Observatorium optik, Observatorium radio, Analisis, Editor Hasil, File, dan Panduan praktikum. Klik nama sebuah bagian untuk membuka atau menutupnya; bagian dari halaman yang sedang Anda buka terbuka sendiri, dan browser mengingat sisanya. Di ponsel, menu berada di balik tombol Menu.',
   'Bantuan selalu ada di bagian atas halaman, juga di ponsel. Tekan tombol ? di mana saja di luar kolom teks untuk membuka topik bantuan ini; Anda dapat menonaktifkan tombol itu di bawah.',
   'Bantuan › Ikuti tur situs menampilkan lagi tur kunjungan pertama.',
   'Kode sumber dan Laporkan masalah, di bagian bawah menu dan di Bantuan, membuka halaman OpenVireo di GitHub pada tab baru. Laporkan masalah memulai isu baru dengan nama halaman yang sedang Anda buka sudah terisi; GitHub meminta Anda masuk, dan tidak ada yang dikirim sampai Anda mengirimkannya di sana.',
   'Tab dan Shift+Tab berpindah antarkontrol; Enter atau Spasi menekan sebuah tombol.',
   'Escape menutup menu dan kotak dialog.',
   'Tombol arah (teleskop dan radio) bergerak selama ditahan dengan mouse, Spasi, atau Enter.',
   'Kursor spektrum bergerak dengan tombol panah (Shift untuk langkah yang lebih besar); Enter atau Spasi menerapkan, Escape membatalkan.',
   'Sakelar tema memilih warna Sistem, Terang, atau Gelap.'),
  'Buka topik bantuan dengan tombol ?',
 ]),
 topic('Mode instruktur',[
  p('Mode instruktur…, pada header, setelah konfirmasi, membuka opsi instruktur VIREO pada tab browser ini: Opsi Simulasi Optik… pada menu Gerakkan teleskop dan preferensi radio, yang tertutup bagi pelajar. Mode ini tidak memakai kata sandi, bukan kunci, dan tidak menampilkan jawaban. Keluar menonaktifkannya.'),
 ]),
 topic('Bantuan asli VIREO',[
  p('Tombol Bantuan di dalam setiap instrumen dan alat menampilkan bantuan VIREO sendiri untuk jendela itu, diterjemahkan ke bahasa Indonesia sebagai adaptasi web OpenVireo; Lihat aslinya (bahasa Inggris) menampilkan teks program asli tanpa perubahan.'),
  p('Bantuan jendela utama VIREO menjelaskan menu program Windows, yang digantikan OpenVireo dengan halamannya sendiri, sehingga bantuan itu tidak ditawarkan di sini: Beralih dari VIREO (Windows) memetakan setiap menu itu ke tempatnya di OpenVireo.'),
 ]),
]};

export const WEB_HELP_ID:Translation<typeof WEB_HELP_EN>=Object.freeze({
 caption:'Bantuan OpenVireo',
 close:'Tutup',
 navLabel:'Topik bantuan',
 related:'Lihat juga:',
 groups:[START,OBSERVATORY,ANALYSIS,SITE],
});
