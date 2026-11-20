// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's MEASHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='MEASHLP.TXT';
export const sourceSha256='e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac';
export const text=`**Muat spektrum untuk diukur**
Untuk memuat spektrum yang akan diukur, pilih "File"->"Data"->"Muat
Spektrum Tersimpan..." (Load Saved Spectrum...) dari menu alat pengukur,
lalu pilih file spektrum yang akan dimuat.

Topik terkait:
    "Simpan spektrum untuk analisis" (Save Spectrum for Analysis) pada
    menu "Bantuan" (Help) spektrometer.

**Ukur ciri spektrum satu per satu**
Anda dapat mengukur posisi dan intensitas relatif tiap ciri spektrum
pada spektrum yang ditampilkan.  Tekan dan tahan tombol kiri mouse
sambil memosisikan kursor tanda silang pada ciri yang ingin diukur.
Posisi kursor ditampilkan pada pembacaan di bagian bawah layar dalam
bentuk terkonversi sebagai panjang gelombang dan intensitas relatif.
Saat tombol mouse dilepaskan, garis vertikal muncul di layar pada
posisi panjang gelombang, dan garis horizontal pendek muncul pada
tingkat intensitas.  Anda dapat menyesuaikan posisi garis-garis ini
dengan tombol panah keypad numerik untuk memperbaiki pengukuran
sebelum mencatatnya.  Anda juga dapat memindahkan garis ke ciri
berikutnya yang ingin diukur dengan menekan dan menahan tombol panah
(lihat di bawah).

    -Akses keyboard-
    Tombol panah pada keypad numerik (tombol "2", "4", "6", "8") dapat
    dipakai untuk memosisikan garis pengukuran sebagai pengganti
    mouse.  NumLock harus "Aktif" dan MouseKeys harus "Nonaktif".  (Jika
    Anda memakai MouseKeys, atur sistem Anda agar MouseKeys aktif saat
    NumLock "Nonaktif".)  Jika garis pengukuran tidak terlihat, tekan
    tombol panah kanan ("6"), dan garis akan muncul dari sisi kiri
    tampilan.

Lihat juga:
    Muat spektrum pembanding
    Ukur dengan spektrum pembanding
    Catat pengukuran

**Muat spektrum pembanding**
Untuk memuat spektrum pembanding, pilih "Spektrum Pembanding"
(Comparison Spectrum)->"Pilih" (Select) dari menu alat pengukur, lalu
pilih satu set garis dari daftar yang muncul.  Garis pembanding akan
muncul pada tampilan dan kontrol penggeser menjadi aktif.  Anda dapat
memuat set garis sebanyak yang diinginkan.  Semua garis yang dipilih
tetap ditampilkan sampai spektrum pembanding dikosongkan.

Lihat juga:
    Ukur dengan spektrum pembanding
    Identifikasi garis pembanding
    Kosongkan spektrum pembanding

**Ukur dengan spektrum pembanding**
Anda dapat mengukur pergeseran Doppler suatu spektrum terhadap
spektrum pembanding yang berisi banyak garis.  Cukup muat spektrum
pembanding (perhatikan bahwa lebih dari satu set garis dapat dimuat)
lalu gunakan penggeser untuk menggeser spektrum pembanding sampai
cocok dengan garis spektrum objek.  Nilai Z yang sesuai dengan
pergeseran spektrum pembanding ditampilkan di bawah penggeser.
Perhatikan hal berikut:

    1)  Anda mungkin tidak mendapatkan kecocokan yang tepat pada
        setiap garis.  Anda harus menilai sendiri kecocokan
        keseluruhan yang terbaik.

    2)  Pengukuran Anda akan lebih akurat jika spektrum diperbesar.
        Namun hal ini dapat membuat semua garis tidak terlihat
        sekaligus.  (Lihat topik bantuan di bawah.)

    3)  Anda mungkin merasa mengukur garis satu per satu lebih akurat.
        (Lihat topik bantuan "Ukur ciri spektrum satu per satu".)  Anda
        dapat memakai spektrum pembanding untuk mengidentifikasi garis,
        tetapi Anda harus mencatat hasil dan menghitung rata-rata Z
        secara terpisah.  Nilai apa pun yang muncul pada pembacaan Z
        tidak akan valid.

Lihat juga:
    Muat spektrum pembanding
    Identifikasi garis pembanding
    Kosongkan spektrum pembanding
    Zoom dan geser spektrum
    Atur kepekaan penggeser
    Pusatkan ulang penggeser
    Catat pengukuran
    Ciri spektrum satu per satu

**Identifikasi garis pembanding**
Untuk mengidentifikasi garis pada spektrum pembanding, arahkan kursor
mouse ke dekat garis pada tampilan lalu tekan tombol kanan mouse.
Kotak yang muncul akan menampilkan ID garis, panjang gelombang diam
dan panjang gelombang bergeser, serta kategori sumber garis.

Lihat juga:
    Muat spektrum pembanding
    Ukur dengan spektrum pembanding

**Kosongkan spektrum pembanding**
Untuk mengosongkan spektrum pembanding dari tampilan, pilih "Spektrum
Pembanding" (Comparison Spectrum)->"Kosongkan" (Clear) dari menu alat
pengukur.  Semua garis pembanding akan dihapus dari tampilan.

**Catat pengukuran**
Untuk mencatat nilai Z yang Anda ukur, pilih "File"->"Data"->"Catat
Pengukuran..." (Record Measurements...).  Jika Anda mengukur dengan
penggeser spektrum pembanding, nilai Z dari pembacaan sudah terisi
pada formulir.  Jika Anda mengukur garis satu per satu, nilai yang
terisi tidak benar dan Anda harus menggantinya dengan nilai
rata-rata hasil hitung Anda.

Saat Anda menekan "OK", informasi yang Anda masukkan ditempatkan pada
sebuah daftar, tetapi belum disimpan ke file.  Untuk meninjau,
mencetak, dan/atau menyimpan hasil Anda ke file, pilih "Alat"
(Tools)->"Editor Hasil" (Results Editors)->"Hasil Pengamatan"
(Observational Results)->"Tampilkan/Cetak/Simpan..."
(Display/Print/Save...) pada menu panel kontrol observatorium.

Lihat juga:
    Ukur dengan spektrum pembanding
    Ukur ciri spektrum satu per satu
    "Editor Hasil" (Results Editors) pada menu "Bantuan" (Help) panel
    kontrol observatorium.

**Zoom dan geser spektrum**
Untuk memperbesar spektrum yang sedang diukur, tekan tombol "Zoom".
Sebuah kotak dengan penggeser akan muncul untuk mengatur rentang panjang
gelombang yang ditampilkan di jendela pengukuran.  Penggeser mengubah
panjang gelombang dalam langkah 100 Angstrom.  Tombol "Atur Ulang"
(Reset) mengembalikan tampilan ke rentang panjang gelombang awal
(penuh).

Saat tampilan diperbesar, tombol panah geser di bawah tombol "Zoom"
menjadi aktif.  Gunakan tombol itu untuk mengubah bagian spektrum
yang terlihat.  Seperti penggeser, tombol itu bekerja dalam langkah
100 Angstrom.

Memperbesar spektrum memungkinkan penentuan Z yang lebih akurat, karena
piksel yang lebih halus menghasilkan ukuran langkah yang lebih kecil
dalam penempatan garis pengukuran dan/atau spektrum pembanding.
Kekurangannya saat mengukur dengan spektrum pembanding adalah tidak
semua garis dapat terlihat sekaligus untuk menentukan kecocokan
keseluruhan yang terbaik.

Topik terkait:
    Ukur dengan spektrum pembanding
    Ukur garis spektrum satu per satu

**Atur kepekaan penggeser**
Sakelar "Halus" (Fine)/"Kasar" (Coarse) di atas penggeser spektrum
pembanding mengatur kepekaan penggeser.  Gunakan pengaturan "Kasar"
hanya saat Anda perlu menggeser spektrum pembanding cukup jauh.

Topik terkait:
    Pusatkan ulang penggeser
    Ukur dengan spektrum pembanding

**Pusatkan ulang penggeser**
Jika Anda mencapai ujung penggeser spektrum pembanding dan perlu
menggeser spektrum pembanding lebih jauh, tekan tombol kecil di
sebelah kanan pembacaan Z untuk memusatkan ulang penggeser.

Topik terkait:
    Atur kepekaan penggeser
    Ukur dengan spektrum pembanding

**Tutup jendela pengukuran**
Untuk menutup jendela alat pengukur dan kembali ke panel kontrol
observatorium, pilih "File"->"Keluar dari Pengukuran Spektrum" (Exit
Spectrum Measuring) pada menu, atau tekan kotak "X" di sudut kanan
atas.
`;
