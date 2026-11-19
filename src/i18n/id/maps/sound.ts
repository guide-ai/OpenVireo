import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front ID1: Indonesian (id) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_ID:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'Efek suara',
 toggle:'Efek Suara (suara kubah dan teleskop VIREO)',
 hint:'Suara untuk kubah, penggerakan, dan sebagainya.',
 note:'Nonaktif kecuali Anda mengaktifkannya, dan hanya untuk kunjungan ini. Tidak ada yang diunduh selama nonaktif; mengaktifkannya menyiapkan suara motor, dan suara lainnya dimuat saat pertama kali diperlukan. Di VIREO, ini adalah opsi instruktur yang aktif secara bawaan. Pintu kubah berbunyi saat dibuka atau ditutup, lalu satu dari delapan suara akhir; gerakan manual memutar suara servo, dan gerakan ke koordinat memutar suara motor. Beberapa efek dari tahun 1992–93 ini mungkin berasal dari koleksi pihak ketiga yang disertakan CLEA.',
 loading:'Memuat suara…',
 failed:'Fitur suara VIREO tidak tersedia: browser ini tidak dapat memuat atau memutar suara, sehingga Efek Suara nonaktif lagi.',
 channel:{dome:'Suara kubah',telescope:'Suara teleskop'},
});
