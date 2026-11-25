import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front ID6: Indonesian (id) for the E08 guide. A web adaptation by OpenVireo, not CLEA's. The observatory names it quotes are the
 * Indonesian of the observatory's own buttons (sky.coordinates: Masukkan koordinat, sky.pointCoordinates: Arahkan ke koordinat,
 * sky.view › sky.telescope: Bidang pandang › Teleskop · 15′, motion.selected: Gerakkan ke objek terpilih). */
export const OBJECT_X_GUIDE_ID:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'Panduan praktikum E08',title:'Pencarian Objek X',
 intro:'Anda hanya mendapat pengenal dan koordinat. Gunakan instrumen untuk menentukan jenis objeknya, lalu ungkap identitasnya. Langkah-langkah diperbarui seiring pekerjaan Anda; tidak ada yang menilai jawaban Anda sebelum pengungkapan.',
 why:'Objek jenis apa yang ada di koordinat yang Anda terima? Anda akan menentukannya dengan instrumen observatorium sebelum identitasnya diungkap.',
 counts:(done:number,total:number,images:number)=>`${done} dari ${total} langkah · ${images} citra objek Anda`,
 done:'(selesai)',todo:'(belum dikerjakan)',
 steps:Object.freeze({
  target:['Dapatkan objek Anda','Di halaman Objek X, masukkan ID Anda lalu pilih atau terima kode objek.'],
  clock:['Atur tanggal dan waktu','Atur jam observatorium; praktikum asli dimulai pada 2009-06-01 pukul 04:00 UT.'],
  list:['Susun daftar asteroid','Daftar asteroid yang dapat diamati pada tanggal itu disusun saat Anda mengatur jam, sehingga citra Anda menyertakannya; susun ulang hanya setelah mengganti file orbit atau magnitudo batas.'],
  image:['Ambil citra bidang','Salin koordinat ke observatorium, buka kubah, buka Masukkan koordinat, lalu klik Arahkan ke koordinat (bukan Gerakkan ke objek terpilih), pilih Bidang pandang › Teleskop · 15′, aktifkan pelacakan, dan ambil citra CCD (tanpa filter dan dengan eksposur 2 menit, objek redup lebih mudah terlihat).'],
  repeat:['Ambil citra lagi nanti','Ambil citra kedua dari bidang yang sama 30–60 menit kemudian: masukkan waktu yang lebih akhir di halaman Objek X dan klik Atur jam observatorium, lalu kembali ke observatorium. Objek yang cepat meninggalkan jejak gerak pendek selama eksposur panjang. Pada malam berikutnya, daftar asteroid disusun ulang untuk tanggal baru saat Anda mengatur jam, dan asteroid dekat Bumi yang cepat (lebih dari 2° per hari) sudah meninggalkan bidang: cari di sekitar posisi pertamanya.'],
  measure:['Bandingkan kedua citra','Kedipkan kedua citra. Jika ada yang bergerak, ukur pada keduanya untuk mendapatkan laju dan arahnya. Objek di luar Tata Surya tidak bergerak.'],
  classify:['Tentukan apa objek itu','Jika tidak ada yang bergerak, dengarkan denyut dengan teleskop radio, dan ambil spektrum (Spektrometer atau Multi-Spec di halaman Objek X) untuk membedakan bintang, galaksi, dan kuasar; Anda dapat menyimpannya sebagai .SSP dan mengklasifikasikannya.'],
  describe:['Jelaskan bukti Anda','Tulis apa yang Anda lihat dengan setiap instrumen.'],
  reveal:['Ungkap identitas','Ungkap objeknya dan bandingkan dengan jawaban Anda.'],
  save:['Simpan investigasi Anda','Gunakan Simpan investigasi di bilah alat; simpan juga file FITS citra Anda.'],
 }),
 progress:'Kemajuan Anda',go:'Buka Objek X',goObservatory:'Buka observatorium',
 close:'Tutup panduan Objek X',return:'Kembali',
});
