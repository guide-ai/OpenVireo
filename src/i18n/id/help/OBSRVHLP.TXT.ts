// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's OBSRVHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='OBSRVHLP.TXT';
export const sourceSha256='2dcae5e678d69ed80784bb2958ed856289ff04779edd19656681288846102bd7';
export const text=`**"Pelacakan"**
Tombol "Pelacakan" (Tracking) menyalakan pelacakan sideris yang menjaga
teleskop tetap mengarah ke titik tertentu di langit saat Bumi berputar.
Jika pelacakan mati, bintang-bintang akan bergeser melintasi bidang
teleskop.  Pelacakan mati saat sebuah teleskop pertama kali diakses.
Kontrol teleskop lainnya baru aktif jika pelacakan menyala.  Lampu
indikator hijau menunjukkan bahwa pelacakan telah dinyalakan.

**Tombol gerak ("U","S","T","B")**
Tombol gerak dipakai untuk menggerakkan teleskop agar mengarah ke titik
(arah) tertentu di langit.  Untuk menggerakkan teleskop, tekan dan tahan
tombol yang sesuai.  Teleskop akan bergerak dengan kecepatan yang
ditentukan oleh pengaturan "Kecepatan Gerak" (Slew Rate).  Lepaskan
tombol untuk menghentikan gerakan.  Pada gerakan yang jauh, tombol akan
tetap tertekan jika Anda menggeser penunjuk mouse keluar dari tombol
sebelum melepaskan tombol mouse.  Dalam hal ini, hentikan gerakan dengan
menekan dan melepaskan tombol mouse saat penunjuk mouse berada di atas
tombol yang aktif.

Tombol gerak terutama dipakai untuk membuat perubahan yang relatif
kecil pada posisi teleskop agar objek berada di area aktif instrumen
yang sedang dipakai.  Untuk menggerakkan teleskop ke bidang atau objek
yang berbeda, gunakan pilihan menu "Gerakkan" (Slew).

    -Akses lewat keyboard-
    Tombol panah pada keypad numerik (tombol "2","4","6","8") dapat
    dipakai untuk menggerakkan teleskop sebagai pengganti tombol gerak.
    NumLock harus "Aktif" dan MouseKeys harus "Nonaktif".  (Jika Anda
    memakai MouseKeys, atur sistem Anda agar MouseKeys diaktifkan saat
    NumLock "Nonaktif".)


Topik terkait:
    "Kecepatan Gerak"
    "Bidang Pandang"
    "Gerakkan"

**"Kecepatan Gerak"**
Sakelar penggeser ini mengatur kecepatan gerak teleskop saat tombol
gerak ("U","S","T","B") ditekan.  Kecepatan menjadi dua kali lipat
setiap kali penggeser digeser satu posisi ke kanan, hingga kecepatan
(relatif) maksimum 16.  Demikian pula, kecepatan gerak menjadi setengah
setiap kali penggeser digeser satu posisi ke kiri.

Topik terkait:
    Sakelar penggeser

**"Bidang Pandang"**
Setiap teleskop memiliki dua bidang pandang (atau ukuran bidang) yang
tersedia.  Bidang pencari berukuran 2 1/2 derajat per sisi dan dipakai
untuk menempatkan bintang dan objek lain tertentu di bidang teleskop
yang perbesarannya lebih tinggi (ditandai oleh kotak merah di tengah
tampilan pencari).  Bidang teleskop berukuran 15 menit busur per sisi
dan menampilkan bintang serta objek lain hingga batas magnitudo yang
jauh lebih redup daripada pencari.  Tampilan ini dipakai untuk
menempatkan objek bagi pengamatan dengan instrumen yang dipilih.

Untuk mengubah bidang pandang, geser penggeser ke "Pencari" (Finder)
atau "Teleskop" (Telescope).  Instrumen hanya dapat diakses saat bidang
pandang teleskop aktif.

Area aktif instrumen yang dipilih digarisbawahi dengan garis merah pada
tampilan teleskop.  Apertur fotometer ditampilkan sebagai lingkaran
merah, sedangkan celah spektrometer ditunjukkan oleh sepasang garis
sejajar pendek yang berdekatan.  Untuk kamera CCD dan IR, sebuah kotak
menunjukkan ukuran bidang kamera.  (Pada beberapa kombinasi teleskop
dan kamera, bidang kamera lebih besar daripada tampilan 15 menit busur.
Hal ini ditandai oleh panah merah yang mengarah ke luar di tepi
tampilan.)

Topik terkait:
    "Instrumen"
    Sakelar penggeser

**"Instrumen"**
Untuk mengakses sebuah instrumen, atur penggeser "Instrumen"
(Instrument) ke posisi yang sesuai lalu tekan tombol "Akses" (Access).
Instrumen yang tersedia bagi Anda bergantung pada praktikum yang
sedang dikerjakan.  Tombol "Akses" hanya aktif jika bidang pandang
diatur ke "Teleskop".

Topik terkait:
    "Bidang Pandang"
    Sakelar penggeser

**Sakelar penggeser**
Beberapa kontrol pada panel kontrol teleskop dan instrumen memakai
sakelar penggeser agar pengguna dapat memilih satu dari beberapa
pilihan.  Untuk membuat pilihan dengan sakelar penggeser, lakukan salah
satu dari berikut:

    A)  Letakkan penunjuk mouse di atas penggeser, tekan dan tahan, lalu
        seret penggeser ke posisi yang diinginkan dengan tombol kiri
        mouse, atau...

    B)  Letakkan penunjuk mouse di atas posisi yang diinginkan pada
        panel penggeser lalu klik tombol kiri mouse, atau...

    C)  Akses lewat keyboard: Gunakan tombol panah untuk menggeser
        penggeser saat kontrol penggeser yang diinginkan telah dipilih.
        (Kontrol yang dipilih diberi garis tepi putus-putus.  Gunakan
        Tab dan Shift-Tab untuk mengubah pilihan.)

**"Gerakkan"**
Pilihan menu "Gerakkan" (Slew) pada panel kontrol teleskop membuka
kotak dialog yang memungkinkan koordinat pengarahan teleskop dimasukkan
langsung.  Cara ini umumnya lebih cepat daripada memakai tombol gerak
untuk memindahkan teleskop dari satu objek ke objek lain, kecuali jika
kedua objek sangat berdekatan di langit.  Sedikit "penyetelan halus"
dengan tombol gerak mungkin diperlukan untuk menempatkan objek di
tengah celah spektrometer, apertur fotometer, atau bidang kamera setelah
koordinat diatur.

Topik terkait:
    Tombol gerak ("U","S","T","B")

**Parameter lokasi dan teleskop**
Pilih "File"->"Informasi Lokasi..." (Site Information...) dari menu
panel kontrol teleskop untuk memperoleh informasi tentang lokasi
pengamatan dan teleskop saat ini.  Parameter yang tercantum meliputi
lintang, bujur, ketinggian di atas permukaan laut, dan zona waktu
lokasi.  Apertur dan panjang fokus teleskop juga ditampilkan.

Topik terkait:
    "Ganti teleskop optik" pada "Bantuan" panel kontrol observatorium
`;
