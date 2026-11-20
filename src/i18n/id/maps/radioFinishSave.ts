import type {FINISH_SAVE_MESSAGES_EN} from '../../../components/RadioFinishSaveMessages';
import type {Translation} from '../../maps';
/** Front ID5: Indonesian (id) for the finish question's web Save (R-RX17). A web adaptation by OpenVireo, not CLEA's; VIREO's own captions are translated through
 * vireo() (originals.json). */
export const RADIO_FINISH_SAVE_ID:Translation<typeof FINISH_SAVE_MESSAGES_EN>=Object.freeze({
 'finishSave.yes.reason':'Ya membuka Simpan web untuk rekaman ini, bukan dialog Simpan asli: setelah itu Anda memilih satu file di browser, dan hanya salinan yang dibaca ulang dengan hasil identik yang menandai rekaman sebagai sudah ditulis dan mengakhiri penyelesaian ini. Ya sendiri tidak memilih atau menulis apa pun.',
 'finishSave.yes.webDefault':'Tombol bawaan di web: Batal (tombol bawaan asli adalah Ya).',
 'finishSave.yes.unsupported.insecure-context':'Ya (simpan) tidak tersedia: halaman ini bukan konteks aman, yang diwajibkan oleh API file browser. Tidak dan Batal berfungsi seperti sebelumnya; Analisis Pulsar (Pulsar Analysis) tetap dapat mengunduh salinan .PLR setelah penyelesaian ini berakhir.',
 'finishSave.yes.unsupported.no-api':'Ya (simpan) tidak tersedia: browser ini tidak menyediakan pemilih file simpan dengan file yang dapat ditulis (showSaveFilePicker dan createWritable). Tidak dan Batal berfungsi seperti sebelumnya; Analisis Pulsar (Pulsar Analysis) tetap dapat mengunduh salinan .PLR setelah penyelesaian ini berakhir.',
 'finishSave.yes.webDefaultUnsupported':'Tombol bawaan di web: Batal (Ya, tombol bawaan asli, menyimpan, dan itu tidak dapat dilakukan browser ini di sini).',
 'finishSave.heading':'Simpan rekaman baru (Simpan web dengan verifikasi)',
 'finishSave.intro':'Dibuka oleh Ya pada pertanyaan penyelesaian. Ini bukan dialog Simpan asli. Selama dialog ini terbuka, rekaman tetap memuat data pulsar saat ini, sehingga Analisis Pulsar (Pulsar Analysis) tidak dapat memuat, menyimpan, atau mengunduh. Hanya salinan terverifikasi yang mengakhiri penyelesaian: rekaman lalu tetap menjadi data pulsar saat ini, ditandai sudah ditulis (pemeriksaan pada saat itu), dan Analisis Pulsar tidak dibuka. Percobaan yang gagal atau dibatalkan tetap di sini dan mungkin sudah membuat atau mengosongkan sebuah file. Kembali membawa Anda ke pertanyaan penyelesaian, di mana Tidak membuka Analisis Pulsar dan Batal mempertahankan data tanpa disimpan.',
 'finishSave.back':'Kembali ke pertanyaan penyelesaian',
 'finishSave.pendingNote':'Selama percobaan berjalan, Pilih dan Kembali tidak melakukan apa pun, dan rekaman tetap memuat data. Menyembunyikan halaman Teleskop radio atau memulai operasi proyek menghentikannya.',
 'finishSave.refusal.not-ready':'Penyimpanan tidak dimulai dan tidak ada file yang dipilih: Analisis Pulsar (Pulsar Analysis) sedang membaca file, rekaman tidak lagi memuat data, atau percobaan penyimpanan lain masih berjalan. Coba lagi setelah selesai.',
 'finishSave.fail.abandoned':'Percobaan penyimpanan dihentikan karena halaman Teleskop radio disembunyikan atau sebuah operasi proyek dimulai. File yang dipilih mungkin sudah dibuat, dikosongkan, atau ditulis sebagian atau seluruhnya; OpenVireo tidak dapat memulihkannya dan tidak menandai rekaman sebagai sudah ditulis. Rekaman masih memuat data. Pilih dan Kembali berfungsi lagi setelah aliran file ditutup.',
 'finishSave.busy':'Menyelesaikan percobaan yang dihentikan: menunggu aliran filenya ditutup…',
 'finishSave.status.opened':'Dialog Simpan dibuka. Belum ada file yang dipilih; rekaman masih memuat data pulsar saat ini.',
 'finishSave.status.back':'Kembali ke pertanyaan penyelesaian. Dialog Simpan tidak menandai rekaman sebagai sudah ditulis; file yang dipilih di sana mungkin sudah dibuat, dikosongkan, atau diubah.',
 'finishSave.status.verified':'Salinan terverifikasi disimpan sebagai “{file}” ({bytes} byte dibaca ulang dengan hasil identik). Penyelesaian telah berakhir: rekaman tetap menjadi data pulsar saat ini dan ditandai sudah ditulis pada saat pemeriksaan; ini hasil historis. Analisis Pulsar tidak dibuka.',
 'finishSave.status.unavailable':'Dialog Simpan tidak terbuka: rekaman tidak lagi memuat data pulsar saat ini seperti yang diharapkan penyelesaian ini. Tidak ada file yang dipilih; Tidak dan Batal tetap menjawab pertanyaan.',
});
