import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
import {plural} from '../../plural';
/** Front ID0 (the header menu name) and Front ID4 (the rest): Indonesian (id) for the variable-star page’s web text. A web adaptation by OpenVireo, not CLEA’s. VIREO’s own
 * captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are in src/core/variableStarForm.ts
 * and src/core/lightCurvePrint.ts and are translated through vireo() (originals.json). */
/** A count grouped as Indonesian groups thousands on screen, with the registry’s separator (src/i18n/languages.json `thousands`,
 * the one formatNumber uses) where the English map has en-US’s comma. */
const grouped=(n:number)=>n.toLocaleString('en-US').replace(/,/g,' ');
export const VARIABLE_STARS_ID:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'Bintang variabel',
 title:'Bintang variabel dan kurva cahaya',
 scope:'Cari sebuah bintang dalam katalog bintang variabel VIREO (CLEA_VStrs.dat, 31 147 entri), baca data katalognya, dan tampilkan kurva cahaya yang disimulasikan VIREO untuknya.',
 adaptation:'Adaptasi web: di VIREO, data ini adalah jalur instruktur (Mode Edit [Edit Mode]): GCVS di kotak Objek Katalog (Catalog Object), atau Informasi Bidang (Field Information) › Bintang Variabel (Variable Stars) › Ambil Data Pilihan (Get Selection Data) di panel kontrol teleskop. Keduanya ada di situs ini dengan Mode Edit aktif (di Opsi Simulasi Optik [Optical Simulation Options]); halaman ini juga memungkinkan siapa pun mencari langsung di katalog. Jendela Data Bintang Variabel (Variable Star Data) dan Kurva Cahaya Simulasi (Simulated Light Curve) mengikuti aslinya.',
 guideTitle:'Cara memakai alat ini',
 guide:Object.freeze([
  'Ketik sebagian nama bintang (misalnya “del Cep” atau “RR Lyr”) atau pilih tipe variabilitas, lalu tekan Buka pada satu baris.',
  'Jendela Data Bintang Variabel (Variable Star Data) mencantumkan nilai katalog: posisi, tipe, magnitudo maksimum, magnitudo minimum (atau, setelah tanda “(”, amplitudo), epok katalog (yang digambar VIREO sebagai cahaya maksimum, meskipun untuk bintang ganda gerhana katalog memberikan nilai minimum), periode, waktu naik (M-m/D), dan spektrum.',
  'Pilih Data › Tampilkan Kurva Cahaya (Display Light Curve) untuk melihat 1.5 siklus kurva cahaya simulasi. VIREO menggambar epok katalog sebagai cahaya maksimum (fase 0), apa pun tipenya.',
  'Gunakan Data › Simpan Teks (Save Text) › Seperti Ditampilkan (As Displayed) untuk mengunduh daftar sebagai file teks, atau Cetak (Print) untuk mencetaknya.',
 ]),
 guideModel:'Tentang kurva: VIREO menggambar kurva berbentuk Cepheid yang sama untuk setiap tipe, dibangun hanya dari maksimum, minimum, periode, dan M-m/D katalog (50% bila katalog tidak memberikannya). Kurva ini tidak memiliki derau dan bukan pengamatan. Bintang ganda gerhana dan variabel tak beraturan sebenarnya tidak tampak seperti ini.',
 loading:'Memuat katalog bintang variabel…',
 loadError:'Katalog bintang variabel yang disertakan tidak dapat dimuat atau tidak cocok dengan ukuran dan SHA-256 yang tercatat. Muat ulang halaman untuk mencoba lagi.',
 searchTitle:'Temukan bintang variabel',
 nameLabel:'Nama bintang memuat',
 typeLabel:'Tipe variabilitas',
 allTypes:'Semua tipe',
 typeOption:(type:string,count:number)=>`${type||'(kosong)'} — ${grouped(count)}`,
 results:(shown:number,total:number)=>total===0?'Tidak ada entri yang cocok.':shown<total?`Menampilkan ${shown} entri cocok pertama dari ${grouped(total)}, menurut urutan katalog (asensio rekta). Persempit pencarian untuk melihat yang lain.`:plural('id',total,{one:`${grouped(total)} entri cocok.`,other:`${grouped(total)} entri cocok.`}),
 columns:['ID GCVS','Tipe','AR (jam)','Dek. (°)','Maks.','Min / ampl.','Periode (hari)',''],
 open:'Buka',
 openLabel:(name:string)=>`Buka ${name}`,
 noPeriod:'—',
 listTypeCodesNote:'Di VIREO, item menu ini hanya mengganti tanda centangnya sendiri; tidak ada hal lain yang membacanya.',
 saveAdaptation:'Adaptasi web: teks diunduh melalui browser Anda (satu baris per baris daftar, dengan akhir baris Windows) sebagai pengganti dialog Simpan.',
 riseDefaultedNote:'Entri ini tidak memiliki nilai M-m/D. Membuka kurva cahayanya menetapkannya menjadi 50% di memori, seperti yang dilakukan VIREO, sehingga daftar kini menampilkan 0.50.',
 curveLabel:(name:string)=>`Kurva cahaya simulasi ${name}: magnitudo terhadap fase, 1.5 siklus dari epok katalog.`,
 unavailable:Object.freeze({
  'period-zero':'Tidak ada kurva: entri ini tidak memiliki periode (0 hari). VIREO membagi dengan periode dan berhenti dengan kesalahan floating-point setelah menggambar sumbu, sehingga tidak ada titik kurva yang digambar.',
  'zero-decline-fraction':'Tidak ada kurva: M-m/D adalah 100%, sehingga bagian kurva yang menurun memiliki panjang nol dan VIREO berhenti dengan kesalahan floating-point sebelum menggambarnya.',
  'axis-range-zero':'Tidak ada jendela kurva cahaya: batas sumbu untuk magnitudo paling terang dan paling redup sama, dan VIREO membagi dengan selisihnya sebelum menampilkan jendela.',
  'magnitude-system-empty':'Teks sistem magnitudo kosong: VIREO berhenti menggambar dengan kesalahan setelah sumbu magnitudo, sehingga sumbu fase dan kurva tidak digambar.',
  'non-finite':'Tidak ada kurva: sebuah nilai pada entri ini berada di luar yang dapat dihitung model.',
 }),
 curveAdaptation:'Plot mempertahankan tata letak, warna, dan posisi piksel VIREO; font berbeda.',
 printTitle:(caption:string)=>`Cetak — ${caption}`,
 printHelp:'Pratinjau cetak dari apa yang dituangkan VIREO ke kertas: tanggal dan waktu (di sini dalam format browser Anda), baris meja praktikum, baris pelajar dan praktikum yang dimasukkan di VIREO (tidak tersedia di situs ini, sehingga digantikan teks pengganti), baris daftar, dan, untuk kurva cahaya, plotnya. Tata letak halaman dan font tidak direproduksi. Judul tugas cetak VIREO tidak dicetak pada halaman.',
 printCurveLayout:(monochrome:boolean)=>`Halaman kurva cahaya mengikuti cetakan VIREO dalam orientasi yang dipilih di sini (VIREO memakai orientasi printer): dalam potret, plot menyusul pada halaman yang sama; dalam lanskap, VIREO menambahkan “(Citra Layar Dicetak di Halaman Berikutnya)” dan mencetak plot di halaman 2. ${monochrome?'Cetak Berwarna (Print in Color) nonaktif, sehingga plot dicetak hitam di atas putih.':'Cetak Berwarna (Print in Color) aktif, sehingga plot dicetak dengan warna layar.'} VIREO menggambar plot di atas baris judul; di sini plot diletakkan di bawahnya.`,
 printOrientation:'Orientasi halaman',
 portrait:'Potret',
 landscape:'Lanskap',
 printStudentPlaceholder:'[teks pelajar dan praktikum yang dimasukkan di VIREO: tidak dipulihkan di situs ini]',
 printButton:'Cetak…',
 printClose:'Tutup pratinjau',
 printError:'Pencetakan tidak tersedia di jendela browser ini.',
});
