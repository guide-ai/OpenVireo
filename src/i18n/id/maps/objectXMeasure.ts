import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ID6: Indonesian (id) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web adaptation by
 * OpenVireo, not CLEA's. Nothing here names or describes a target. */
export const OBJECT_X_MEASURE_ID:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'Ukur posisi',
 intro:'Kedipkan dua citra untuk menemukan apa yang bergerak, lalu klik sebuah sumber untuk mengukurnya. Tandai setidaknya tiga bintang acuan dengan koordinat katalog pada satu citra untuk mendapatkan solusi astrometri, atau gunakan koordinat citra yang tertulis di headernya.',
 adaptation:'Adaptasi web: versi aslinya mengirim citra ke program astrometri eksternal CLEA Astrometry Toolkit. Alat ini mengikuti panduan pengguna toolkit itu (piksel paling terang dalam 8 piksel, bobot dipangkatkan tiga, enam konstanta pelat) dan bukan hasil migrasinya.',
 frame:(n:number,label:string)=>`Citra ${n}: ${label}`,noFrames:'Belum ada citra yang dimuat.',
 blinkStart:'Kedipkan',blinkStop:'Hentikan kedipan',blinkInterval:'Selang kedip (ms)',showFrame:'Tampilkan citra',
 roleTarget:'Target',roleReference:'Bintang acuan',roleLegend:'Tanda berikutnya adalah',
 refRa:'AR katalog (h m s)',refDec:'Dek. katalog (° ′ ″)',refInvalid:'Masukkan AR bintang acuan sebagai h m s dan Dek. sebagai ° ′ ″.',
 cursor:(x:number,y:number)=>`Kursor x ${x}, y ${y}`,measure:'Ukur di kursor',viewport:'Citra; tombol panah menggerakkan kursor, Enter mengukur',
 keyboardHelp:'Tombol panah menggerakkan kursor satu piksel (Shift: sepuluh). Enter atau Spasi mengukur.',
 rangeLow:'Batas bawah',rangeHigh:'Batas atas',
 rangeNote:'Kedua batas menentukan peregangan tampilan sekaligus bobot sentroid (bawaan web: batas bawah pada tingkat langit, yaitu median citra; batas atas pada 50% rentang citra). Jika Ukur tidak menemukan sumber di atas batas bawah, turunkan Batas bawah atau ambil eksposur yang lebih lama.',
 blinkAligned:'Kedipan dijajarkan pada dua bintang acuan pertama dari setiap citra.',
 blinkRaw:'Mengedipkan citra mentah (diasumsikan pengarahannya sama); tandai dua bintang acuan pada setiap citra untuk menjajarkannya.',
 plateTitle:'Solusi astrometri',plateFrame:(n:number,refs:number)=>`Citra ${n}: ${refs} bintang acuan`,plateNone:(n:number,refs:number)=>`Citra ${n}: ${refs} bintang acuan (diperlukan setidaknya 3)`,
 plateDegenerate:(n:number)=>`Citra ${n}: bintang acuan hampir segaris.`,plateRms:(rms:string,scale:string)=>`rms ${rms}″, skala ${scale}″/piksel`,colResidual:'Residu (″)',
 table:'Pengukuran',colFrame:'Citra',colRole:'Tanda',colX:'x',colY:'y',colRa:'AR',colDec:'Dek.',colUt:'UT',colMethod:'Solusi',remove:'Hapus',
 notSolved:'belum terpecahkan',methodPlate:'konstanta pelat',methodWcs:'WCS header',
 motion:(rate:string,pa:string,arcsec:string,hours:string)=>`Gerak: ${rate}″/jam menuju sudut posisi ${pa}° (${arcsec}″ dalam ${hours} jam).`,
 motionNone:'Ukur target pada dua citra yang diambil pada waktu berbeda untuk mendapatkan geraknya.',
 errors:Object.freeze({bounds:'Kursor berada di luar citra.',range:'Batas bawah harus lebih kecil daripada batas atas.','no-signal':'Tidak ada sumber di atas batas bawah di dekat kursor.',references:'Terlalu banyak tanda; hapus sebagian dulu.',degenerate:'Bintang acuan hampir segaris; pilih yang lain.',wcs:'Citra ini tidak memiliki header koordinat yang dapat dipakai.',time:'Kedua citra memiliki waktu yang sama.'}),
});
