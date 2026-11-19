import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'tidak dapat diunduh',size:'tidak berukuran seperti yang tercatat',sha256:'tidak cocok dengan SHA-256 yang tercatat'});

/** Front ID0 (the header menu name and the Results Editors note) and ID1 (the rest): Indonesian (id) for the polish texts (About box, credits, results editors, guides). A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_ID:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'Tempat mengambil spektrum',
  intro:'Spektrometer VIREO digunakan dari observatorium dengan teleskop yang diarahkan ke sebuah target. Di OpenVireo, setiap praktikum punya jalur spektrometer terverifikasi sendiri:',
  routesTitle:'Jalur spektrometer',
  routes:Object.freeze([
   Object.freeze({label:'Eksposur bintang katalog',help:'spektrum bintang katalog yang didukung, dengan Simpan dan Cetak.'}),
   Object.freeze({label:'Eksposur galaksi',help:'tiga belas galaksi Hubble.HTL (hukum Hubble).'}),
   Object.freeze({label:'Survei LSS',help:'spektrum galaksi di sembilan bidang LSS.'}),
   Object.freeze({label:'Objek X',help:'spektrum target Objek X.'}),
   Object.freeze({label:'Multi-Spec',help:'kartu spektrometer multiobjek di observatorium, pada bidang praktikum yang disertakan (dan di praktikum Objek X).'}),
   Object.freeze({label:'Penganalisis spektrum',help:'ukur pergeseran garis dan catat pergeseran merah.'}),
   Object.freeze({label:'Klasifikasi',help:'klasifikasikan spektrum bintang terhadap bintang standar.'}),
  ]),
  retired:'Halaman ini dulu menampilkan pratinjau profil sumber yang sudah disiapkan (M82, Coma1, Coma2) sebelum akuisisi tersedia. Halaman ini dihentikan pada 2026-10-29; jalur di atas menggantikannya.',
 }),
 clusterGuide:Object.freeze({nav:'Panduan diagram HR gugus bintang'}),
 multiSpecPrint:Object.freeze({unavailable:'Cetak Bidang Pilihan (Print Selection Field) tidak tersedia: tidak ada bidang Multi-Spec yang ditampilkan di sini.'}),
 infoListPrint:Object.freeze({
  note:'Pratinjau cetak halaman daftar VIREO: tanggal dan waktu (di sini dalam format browser Anda), baris meja praktikum (tidak dicatat di situs ini), baris pelajar (kosong: tidak ada login di sini), judul jendela, dan baris-baris daftar, dalam huruf Courier. Jarak baris dan indentasi mengikuti halaman VIREO; metrik printer tidak ditiru. Judul pekerjaan cetak VIREO tidak dicetak di halaman.',
 }),
 siteInfo:Object.freeze({
  note:'Di VIREO, jendela daftar ini menyembunyikan menu Cari (Search), Simpan Teks (Save Text), dan Edit untuk informasi lokasi, sehingga hanya Cetak (Print) dan Tutup (Close) yang tersedia.',
  printNote:'Adaptasi web: VIREO mencetak baris-baris daftar di bawah header bersamanya pada printer; di sini yang dicetak adalah tanggal, judul, dan baris-barisnya.',
 }),
 hotListEdit:Object.freeze({
  note:'Edit, Hapus, dan Urungkan (Edit, Delete and Undo) mengubah daftar objek bersama, seperti editor Daftar objek asli; Urungkan hanya membatalkan Edit atau Hapus terakhir yang dilakukan di sini.',
  deleteNote:'Adaptasi web: baris dihapus dari daftar bersama; Urungkan mengembalikannya ke tempatnya semula di file (VIREO menyisipkannya kembali menurut AR).',
 }),
 hotListPopup:Object.freeze({
  note:'Edit, Hapus, dan Urungkan (Edit, Delete and Undo) ada di editor Daftar objek asli pada halaman ini.',
 }),
 cameraFieldSize:Object.freeze({
  note:'Untuk teleskop yang diterapkan, seperti yang ditampilkan VIREO saat kamera dibuka (di sini dua desimal).',
 }),
 terminateSlew:Object.freeze({
  note:'Adaptasi web: VIREO menangguhkan gerakan selama bertanya; di sini teleskop terus bergerak sampai Anda menjawab (jika tiba lebih dulu, pertanyaan ditutup). Ya menghentikannya di tempatnya; Tidak membiarkannya berlanjut.',
 }),
 comparison:Object.freeze({
  clear:'Kosongkan pembanding',none:'Tidak ada (dikosongkan)',
  note:'Spektrum Pembanding (Comparison Spectrum) › Kosongkan (Clear) milik VIREO: menghapus garis pembanding dari plot dan tabel. Pilih sebuah daftar untuk menampilkannya lagi. Keadaan kosong tidak disimpan; investigasi yang disimpan mempertahankan daftar yang dipilih.',
 }),
 results:Object.freeze({
  help:'Alat › Editor Hasil (Results Editors) milik VIREO. Hasil Pengamatan membuka hasil pengamatan Anda di penganalisis spektrum; Hasil Pulsar membuka pengukuran pulsar yang tersimpan di analisis pulsar.',
 }),
 pulsarPrint:Object.freeze({
  note:'Cetak Jendela (Print Window) milik VIREO (PrintScreen1Click 0x56d9d8, Front RE5) mencetak headernya sendiri dan parameter data, lalu gambar jendela. Seperti VIREO, membukanya mengalihkan semua panel ke mode kursor vertikal, dan panel dicetak dengan warna cetak VIREO (latar putih, sumbu, label, dan jejak hitam; kursor tetap berwarna). Pada orientasi lanskap, tercetak “(Citra Layar Dicetak di Halaman Berikutnya)” dan gambar ditempatkan di halaman 2. Adaptasi web: orientasi dipilih di sini (VIREO mengikuti printer), tanggalnya milik browser, meja dan nama pelajar tertulis “(Tidak Dicatat)” (tidak ada login), dan gambarnya adalah panel web, bukan gambar jendela VIREO.',
  orientation:'Orientasi halaman',portrait:'Potret',landscape:'Lanskap',
 }),
 wedgePrint:Object.freeze({
  note:'Adaptasi web: Cetak (Print) milik VIREO mengatur skema warna kebalikan dari opsi Cetak Berwarna (Print in Color) (scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3), sehingga mencetak hitam putih kecuali opsi itu dicentang (nonaktif dalam versi terkompilasi; Opsi Simulasi Optik (Optical Simulation Options)). Cetakan ini mengikuti opsi tersebut dan memakai tata letak cetak browser. Sorotan pilihan tidak dicetak.',
 }),
 printSky:Object.freeze({
  note:'VIREO mencetak headernya (tanggal dan waktu, di sini dalam format browser Anda; nomor meja praktikum hanya jika ada yang dicatat; lalu baris nama pelajar, kosong di sini karena OpenVireo tidak memiliki login), citra langit dengan warna terbalik dan skala 1.5, serta footer berisi pusat bidang, ukuran bidang, teleskop, dan instrumen. Adaptasi web: browser mengatur halaman dan mencetak tampilan sebagaimana ditampilkan.',
  noInstrument:'(tidak ada instrumen yang dipilih di tampilan teleskop OpenVireo)',
 }),
 about:Object.freeze({
  nativeNote:'Kotak Tentang (About) milik VIREO, dengan teksnya seperti yang dibaca dari program asli (logonya tidak disertakan). Bagian lain jendela ini menjelaskan rekonstruksi web ini.',
  siteTitle:'Situs ini',
  site:'OpenVireo adalah rekonstruksi web VIREO dari Project CLEA yang gratis dan nonkomersial, terbuka untuk siapa saja, dibangun ulang di browser dari perilaku VIREO yang berhasil dipulihkan dan file data aslinya. Ini bukan program CLEA dan tidak mengklaim kesetaraan dengannya; adaptasi web diberi label di tempat kemunculannya. Terjemahan bahasa Indonesia adalah adaptasi web oleh OpenVireo; file dan teks asli VIREO tidak berubah.',
  worksTitle:'Yang berfungsi',
  works:Object.freeze([
   'Ketujuh praktikum VIREO punya jalur web berpemandu: hukum Hubble (13 galaksi), struktur skala besar, klasifikasi bintang, fotometri Pleiades (24 bintang), diagram HR gugus bintang, pulsar, dan Pencarian Objek X.',
   'Observatorium optik: kubah, teleskop, tampilan pencari dan tampilan teleskop, penggerakan teleskop dengan batas cakrawala opsional, daftar objek, lokasi dan tanggal, informasi katalog dan bidang, serta daftar bintang variabel dan QSO.',
   'Instrumen: spektrometer dan fotometer untuk target praktikum, kamera CCD dan inframerah (kueri katalog langsung), spektrometer multiobjek (Multi-Spec, pada bidang praktikum yang disertakan dan di praktikum Objek X), serta teleskop radio dengan penerima dan analisis pulsarnya.',
   'Analisis: pengukuran dan klasifikasi spektrum, pencocokan Hubble dan Pleiades, diagram kerucut LSS, hasil pengamatan Anda, dan investigasi yang disimpan.',
  ]),
  privacyTitle:'Privasi',
  privacy:Object.freeze([
   'Tanpa cookie dan tanpa akun: OpenVireo tidak pernah meminta nama, alamat email, atau kata sandi Anda.',
   'Investigasi, opsi, dan hasil Anda disimpan hanya di komputer Anda: di penyimpanan browser ini atau di file yang Anda pilih untuk diunduh. Tidak ada yang diunggah.',
   'Kunjungan dihitung hanya secara agregat dan tanpa cookie (Cloudflare Web Analytics). Seperti penyedia hosting web lainnya, Cloudflare menerima data teknis setiap permintaan, seperti alamat IP Anda, untuk menyajikan halaman.',
   'Kueri katalog langsung untuk kamera CCD dan inframerah hanya mengirim koordinat langit dan radius bidang ke CDS/VizieR (atau salah satu mirror resminya). Browser Anda menghubungi server itu secara langsung, sehingga, seperti situs web mana pun, server itu melihat alamat IP Anda.',
   'Tautan eksternal (arsip citra HST, Bantuan › Situs Web) terbuka di tab baru hanya saat Anda mengekliknya, dan tidak ada data yang dikirim bersamanya.',
  ]),
  creditsTitle:'Kredit',
  credits:Object.freeze([
   'Project CLEA, Gettysburg College: pencipta VIREO dan file datanya. Didukung oleh National Science Foundation dan Gettysburg College.',
   'Data pulsar: kemungkinan berasal dari katalog pulsar ATNF (ATNF Pulsar Catalogue; Manchester, Hobbs, Teoh & Hobbs 2005); asal-usul itu belum pasti.',
   'Katalog kamera: CDS/VizieR (doi:10.26093/cds/vizier); NOMAD (Zacharias dkk. 2004); USNO-B1.0 (Monet dkk. 2003); 2MASS (Skrutskie dkk. 2006) melalui NOMAD.',
   'Bidang bintang: subset terbatas dari katalog bintang pemandu (Guide Star Catalog) sebagaimana dikemas bersama VIREO.',
  ]),
 }),
 print:Object.freeze({
  title:'Pratinjau cetak',button:'Cetak…',close:'Tutup',error:'Pencetakan tidak tersedia di browser ini.',
  missing:'Tidak ada yang dicetak: gambar sedang tidak ditampilkan.',
 }),
 pulsarsHtl:Object.freeze({
  button:'Muat Pulsars.HTL yang disertakan',
  note:'Adaptasi web: daftar pulsar VIREO, Pulsars.HTL (8 pulsar), disertakan byte demi byte tanpa perubahan di situs ini; di VIREO, Anda membukanya dengan Muat Daftar Objek... (Load Hot List...) dari foldernya. Memuatnya menggantikan daftar objek saat ini, seperti yang dilakukan perintah itu.',
  error:(code:BundledHotListFailure)=>`Pulsars.HTL yang disertakan ${FILE_REASONS[code]}; daftar objek saat ini tidak berubah.`,
 }),
});
