import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front ID1: Indonesian (id) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_ID:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'Observatorium Virtual (instruktur, VIREO)',
 virtualObservatoryAdaptation:'Adaptasi web: di VIREO, opsi instruktur ini, yang nonaktif secara bawaan, mengaktifkan Jalankan Praktikum (Run Exercise) › Observatorium Virtual (Virtual Observatory) (Semua Instrumen), mode tempat pelajar mendapatkan File › Daftar QSO (QSO List). Di sini opsi ini hanya terbuka dalam mode instruktur (bentuk web dari Mode Demonstrasi, Demonstration Mode, tanpa kata sandi); nonaktif secara bawaan, tidak disimpan oleh halaman (hanya Simpan Pembaruan [Save Updates] yang menuliskannya, ke file opsi yang Anda simpan sendiri), dinonaktifkan oleh Keluar, dan satu-satunya efeknya adalah menampilkan File › Daftar QSO.',
 sortDisabled:'Opsi Pengurutan (Sort Options) hanya tersedia dalam Mode Edit (Edit Mode), seperti di VIREO; tanpa Mode Edit, daftar diurutkan menurut magnitudo.',
 limitLabel:'Batas magnitudo, V',
 withheld:'Baris di dekat target Objek X tidak dicantumkan, sehingga daftar tidak dapat mengungkap apa target Objek X yang belum diungkap (aturan web; VIREO menampilkan daftar ini hanya dalam mode Observatorium Virtual atau, selama Objek X, dalam Mode Edit).',
 editModeColumns:'Kolom dalam Mode Edit (Edit Mode): Z adalah pergeseran merah katalog; B−V dan U−B dalam tanda kurung adalah warna rata-rata yang ditetapkan. Tidak ada target praktikum dalam daftar ini.',
 noActivate:'Klik ganda pada baris tidak melakukan apa-apa, seperti di VIREO; gunakan Pilihan (Selection) untuk menambahkan QSO ke daftar objek.',
 csvDisabled:'Dipisahkan Koma (Comma Delimit) dinonaktifkan untuk daftar ini di VIREO.',
 modeless:'Daftar tetap terbuka selama Anda mengamati; pilih File › Daftar QSO (QSO List) lagi untuk mengubah batas atau urutannya.',
 printStudent:'Adaptasi web: tanpa Mode Edit (Edit Mode), VIREO mencetak nomor meja praktikum dan nama pelajar di bawah tanggal; situs ini tidak mencatat keduanya, sehingga mencetak “(Tidak Dicatat)” milik VIREO dan tanpa nama.',
 fileError:(reason:string)=>`Adaptasi web: salinan yang disertakan ${reason}.`,
 fileReasons:Object.freeze({download:'tidak dapat diunduh',size:'tidak memiliki ukuran yang tercatat',sha256:'tidak cocok dengan SHA-256 yang tercatat'}),
 objectXUnavailable:'Daftar QSO tidak dapat ditampilkan: posisi target Objek X tidak dapat dimuat, dan tanpanya daftar dapat mengungkap target yang belum diungkap.',
 loading:'Memuat katalog QSO…',
 noSelection:'Pilih baris QSO terlebih dahulu.',
 hst:Object.freeze({
  newTab:'(situs eksternal, terbuka di tab baru)',
  note:`Adaptasi web: VIREO membuka ${HST_ARCHIVE.defaultUrl} (“${HST_ARCHIVE.optionsLabel}” pada Opsi File (File Options)) di jendela browser. Halaman itu sudah tidak ada; tautan ini membuka padanannya yang terkini di hubblesite.org, yang kini dilayani NASA sebagai galeri Hubble Images. Tidak ada data yang dikirim bersamanya.`,
 }),
});
