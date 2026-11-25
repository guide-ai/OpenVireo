import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front ID0: Indonesian (id) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_ID:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Tur OpenVireo',
 progress:(n:number,of:number)=>`Langkah ${n} dari ${of}`,
 next:'Berikutnya',back:'Kembali',skip:'Lewati tur',done:'Mulai menjelajah',
 firstLook:'Lakukan tinjauan pertama (sekitar 3 menit)',chooseLab:'Pilih praktikum',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Selamat datang di OpenVireo',
   text:'OpenVireo adalah observatorium virtual untuk praktikum astronomi, dibangun ulang di browser dari VIREO milik Project CLEA. Tur singkat ini menunjukkan letak setiap bagian. Durasinya kurang dari semenit.'}),
  save:Object.freeze({title:'Simpan pekerjaan Anda sebagai file',
   text:'Pekerjaan Anda tetap berada di tab browser ini sampai Anda menyimpannya. Simpan investigasi, di bagian atas setiap halaman, mengunduh sebuah file; Pulihkan investigasi (JSON), di menu di sebelahnya, memuatnya kembali nanti.'}),
  help:Object.freeze({title:'Bantuan selalu tersedia',
   text:'Buka Bantuan untuk melihat topik bantuan, atau tekan tombol ? di mana saja di luar kolom teks. Anda dapat mengikuti tur ini lagi dari menu Bantuan.'}),
  start:Object.freeze({title:'Bagaimana Anda ingin memulai?',
   text:'Lakukan tinjauan pertama ke langit selama tiga menit, atau pilih salah satu dari tujuh praktikum; setiap praktikum memiliki panduan yang menemani Anda. Semua halaman ada di menu; di ponsel, menu ada di balik tombol Menu.'}),
 }),
});
