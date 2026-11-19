import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front ID2: Indonesian (id) for the measuring engine’s web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA’s. */
export const ENGINE_VIEW_ID:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'Geser jendela 100 Å ke kiri',
 panRight:'Geser jendela 100 Å ke kanan',
 readoutEmpty:'Seret di dalam plot, atau fokuskan plot lalu gunakan tombol panah, untuk membaca panjang gelombang.',
 nearest:'Garis pembanding terdekat',
 nearestNone:'Tidak ada garis pembanding dalam jarak 100 Å dari kursor.',
 nearestFound:(label:string,shifted:string)=>`Garis pembanding terdekat: ${label} pada ${shifted} Å.`,
 plotHelp:'Plot spektrum. Seret, atau gunakan tombol panah, untuk menggerakkan kursor; klik kanan atau tekan N untuk garis pembanding terdekat.',
 window:(min:string,max:string)=>`Jendela ${min}–${max} Å`,
 fullViewNote:'Tampilan penuh dan H/K adalah prasetel web; Zoom dan tombol panah berlaku pada tampilan normal.',
 note:'Seperti di VIREO, Zoom memilih jendela dengan langkah 100 Å dari awal spektrum yang dimuat dan lebih dulu melipat kontrol z ke dalam basisnya (seperti Pusatkan Ulang); tombol panah menggeser jendela 100 Å dan dapat melewati ujungnya kurang dari 100 Å; pembacaan menunjukkan panjang gelombang teramati di bawah kursor dan ketinggian kursor pada sumbu plot, bukan nilai spektrum.',
});
