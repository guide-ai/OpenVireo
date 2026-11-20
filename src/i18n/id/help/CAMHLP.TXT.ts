// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's CAMHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='CAMHLP.TXT';
export const sourceSha256='bf4976da1b1f976613646e10c954b95039e646f3362004cafb242da4572155b8';
export const text=`**Atur eksposur**
Untuk mengatur eksposur kamera:

    1)  Masukkan nilai (boleh bilangan bulat atau desimal) di kotak
        "Eksposur" (Exposure).

    2)  Atur sakelar penggeser ke "Detik" (Seconds) atau "Menit"
        (Minutes), sesuai kebutuhan.

Topik terkait:
    Ambil eksposur

**Atur filter**
Gunakan sakelar penggeser filter untuk mengatur filter kamera.  Posisi
berlabel "NF" berarti "tanpa filter" (no filter).

    CATATAN: Karena keterbatasan ukuran file data, hanya filter "J" yang
    tersedia pada kamera inframerah (IR).  Penggeser tidak akan bergerak
    ke posisi "H" dan "K".

Topik terkait:
    Ambil eksposur

**Atur gain**
"Gain" adalah jumlah "tumbukan" foton (elektron) pada sebuah piksel CCD
yang diperlukan agar terdaftar sebagai 1 satuan pada citra yang
direkam.  Anda dapat mengatur gain dengan sakelar penggeser berlabel
"Gain".  Biasanya, gain dapat dibiarkan di 1 kecuali Anda diberi tahu
lain oleh instruktur.

Topik terkait:
    Ambil eksposur

**Ambil eksposur**
Untuk mengambil eksposur dengan kamera CCD dan IR:

    1)  Atur waktu eksposur.  Waktu eksposur 1-2 menit sudah memadai
        untuk sebagian besar kegiatan.

    2)  Atur filter.  Kecuali diarahkan lain secara khusus, gunakan
        pengaturan "NF" (tanpa filter) untuk citra CCD, dan filter "J"
        untuk citra IR.

    3)  Biarkan pengaturan gain di 1, kecuali diarahkan lain.

    4)  Tekan tombol "Mulai" (Start).  Kamera akan menjalani
        inisialisasi lalu membuka rana untuk memulai eksposur.  Tampilan
        "Status Kamera" (Camera Status) dan "Pewaktu Eksposur" (Exposure
        Timer) akan memantau kemajuan eksposur.  Saat waktu eksposur
        yang ditunjukkan tercapai, rana akan menutup dan citra yang baru
        Anda ambil akan muncul di tampilan.  (Anda tidak perlu memakai
        tombol "Berhenti" (Stop) kecuali ingin membatalkan eksposur
        karena melakukan kesalahan - misalnya mengatur eksposur 90 menit
        padahal maksudnya 90 detik.)

    5)  Jika citra sudah memuaskan (bidang dan eksposur benar),
        simpan untuk dianalisis.

Topik terkait:
    Atur eksposur
    Atur filter
    Atur gain
    Tampilan citra
    Simpan citra

**Simpan citra**
Untuk menyimpan citra yang baru Anda ambil, pilih "File"->"Simpan Citra"
(Save Image) dari menu panel kontrol kamera.  Sistem akan membuat nama
file, biasanya berdasarkan ID objek yang paling dekat dengan pusat
bidang.  Anda mungkin ingin menggantinya dengan nama yang berkaitan
dengan praktikum yang sedang Anda kerjakan atau yang lebih bermakna
bagi Anda.  Citra disimpan dalam format FITS (ekstensi file bawaan
".FIT").

    CATATAN: Jika Anda menutup jendela kontrol kamera atau memulai
    eksposur baru tanpa menyimpan citra sebelumnya, citra itu akan
    hilang.  Anda akan diberi peringatan jika mencoba melakukannya.

Topik terkait:
    Analisis citra

**Analisis citra**
Modul VIREO yang tersedia untuk melihat dan menganalisis citra CCD
meliputi modul astrometri dan modul pemrosesan citra (DS9).  Setelah
mengambil dan menyimpan semua citra yang diperlukan, pilih
"Alat"->(modul) dari menu panel kontrol observatorium, lalu muat citra.
Modul analisis seharusnya mengakses direktori yang benar - ingat bahwa
ekstensi file adalah ".FIT".

Topik terkait:
    Topik di bawah "Alat" pada menu "Bantuan" panel observatorium.

**Parameter kamera**
Untuk mengakses informasi dan parameter detektor CCD yang Anda pakai,
pilih "File"->"Informasi..." (Information...) dari menu panel kontrol
kamera.

**Tampilan citra**

**Tutup kamera CCD**
Untuk menutup panel kontrol kamera CCD dan kembali ke panel kontrol
teleskop, pilih "File"->"Keluar dari Kamera CCD" (Exit CCD Camera) dari
menu, atau gunakan kotak "X" di sudut kanan atas.  Jika Anda belum
menyimpan citra terakhir yang Anda ambil, Anda akan diberi peringatan
dan kesempatan untuk menyimpannya.  Jika Anda menutup kamera tanpa
menyimpan citra, citra itu akan hilang.

Topik terkait:
    Simpan citra
`;
