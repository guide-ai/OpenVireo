import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front ID0: Indonesian (id) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_ID:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'Bahasa / Language',
 title:'Ganti bahasa?',
 reload:(language:string)=>`Halaman akan dimuat ulang dalam ${language}, tetap di halaman situs yang sama.`,
 lost:'Pekerjaan yang hanya ada di layar akan hilang: posisi teleskop saat ini, eksposur yang sedang berjalan, pengukuran, jendela yang terbuka, mode instruktur, dan semua yang belum Anda simpan ke file.',
 kept:'File yang Anda simpan di komputer tidak terpengaruh; Pulihkan investigasi (JSON) memuat kembali sebuah investigasi. Browser ini juga menyimpan hasil pengamatan Anda yang sudah dikonfirmasi dan preferensi tampilan Anda.',
 save:'Simpan investigasi',
 saveNote:'Simpan investigasi mengunduh file pekerjaan Anda saat ini terlebih dahulu. Setelah itu, ganti bahasa.',
 change:'Ganti dan muat ulang',
 cancel:'Batal',
 preview:'Pratinjau sebelum rilis: bahasa dipilih lewat alamat (?lang=) dan tidak disimpan.',
 notRemembered:'Browser ini tidak mengizinkan OpenVireo menyimpan pilihan tersebut, sehingga pilihan hanya berlaku untuk pemuatan halaman ini.',
 originals:'Tampilkan teks asli VIREO dalam bahasa Inggris',
 originalsNote:'Teks menu, jendela, dan pesan VIREO muncul dalam bahasa Inggris, persis seperti yang ditulis VIREO. Teks OpenVireo sendiri tetap dalam bahasa yang dipilih. Berlaku saat halaman dimuat berikutnya.',
 originalsNotStored:'Browser ini tidak mengizinkan OpenVireo menyimpan opsi ini.',
});
