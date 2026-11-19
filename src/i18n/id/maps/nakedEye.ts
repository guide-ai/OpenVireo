import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
import {plural} from '../../plural';
/** Front ID1: Indonesian (id) for the naked-eye sky through the open dome (Bintang Kasatmata). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_ID:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · Kubah terbuka',title:'Langit kasatmata',
 help:'Bintang-bintang terang (V ≤ 5.5) yang akan Anda lihat dengan mata telanjang melalui kubah yang terbuka, seperti yang digambar VIREO: lebar sekitar 31° dan tinggi 40°, berpusat 45° di atas cakrawala ke arah yang ditunjuk teleskop. Klik kanan pada sebuah bintang (atau gerakkan kursor dengan tombol panah lalu tekan Enter) untuk melihat datanya.',
 skyLabel:'Langit kasatmata melalui kubah. Klik kanan pada sebuah bintang, atau gunakan tombol panah dan Enter, untuk membuka Bintang Kasatmata (Naked Eye Star).',
 loading:'Memuat file bintang kasatmata…',
 fileError:'File bintang kasatmata (NkdEye.dat) tidak dapat dimuat atau tidak cocok dengan ukuran dan SHA-256 yang tercatat.',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT (saat kubah dibuka; tutup lalu buka kembali kubah untuk menggambar ulang) · ${plural('id',count,{other:`${count} bintang terlihat`})}.`,
 adaptation:'Adaptasi web: bintang digambar sebagai cakram menurut tingkat kecerahan VIREO, bukan sprite bintangnya, dan penutup kubah tidak digambar. Posisi, wilayah yang terlihat (termasuk keanehan VIREO yang menghilangkan banyak bintang tepat di sebelah barat garis tengah saat menghadap selatan), dan pemilihan dengan klik kanan mengikuti aslinya.',
 showAtCursor:'Tampilkan bintang di kursor',
 tapAdaptation:'Adaptasi web untuk layar sentuh: ketuk langit untuk memindahkan kursor (+), lalu tekan “Tampilkan bintang di kursor”. Satu ketukan saja tidak membuka bintang, karena klik kiri tidak melakukan apa-apa di VIREO.',
 magNote:'Seperti di VIREO, Mag. V dapat diketik tetapi tidak ada yang disimpan.',
});
