// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's CLASSHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='CLASSHLP.TXT';
export const sourceSha256='9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7';
export const text=`**Muat spektrum**
Untuk memuat spektrum yang akan diklasifikasi:

    1)  Pilih "File"->"Spektrum Tidak Dikenal" (Unknown Spectra) dari
        menu jendela klasifikasi.

    2)  Pilih salah satu dari submenu yang muncul:

        "Spektrum Tersimpan (*.CSP...)" (Saved Spectra)
            Pilih dari daftar spektrum yang diambil dan disimpan untuk
            diklasifikasi dalam praktikum ini.  Untuk memilih, klik
            ganda nama file atau arahkan kursor ke nama file lalu
            tekan "Buka" (Open).

        "Daftar Program" (Program List)
            Pilih dari daftar bintang program untuk praktikum ini.
            Biasanya Anda memulai dari bintang pertama dalam daftar.
            Untuk memilih bintang dalam daftar, klik ganda ID bintang
            atau arahkan kursor ke bintang yang diinginkan lalu pilih
            "File"->"Buka Pilihan" (Open Selection) dari menu.

        "Berikutnya dalam Daftar" (Next On List)
            Memuat spektrum berikutnya dalam daftar program tanpa
            menampilkan daftarnya.  ("Daftar Program" harus sudah
            dipilih sebelumnya.)

Spektrum yang dipilih dimuat dan ditampilkan di tengah area tampilan
spektrum.

**Muat spektrum standar**
Untuk memuat spektrum standar sebagai pembanding:

    1)  Pilih "File"->"Atlas Spektrum Standar..." (Atlas of Standard
        Spectra...) dari menu jendela klasifikasi.

    2)  Pilih satu atlas dari daftar yang muncul.  Biasanya Anda
        memulai dari Deret Utama untuk menetapkan kelas suhu sebelum
        memperhatikan luminositas.  Untuk memilih, klik ganda
        deskripsi atlas atau arahkan kursor ke atlas yang diinginkan
        lalu pilih "File"->"Buka Pilihan" (Open Selection) dari menu.

    3)  Daftar standar dalam atlas akan muncul di tampilan "Standar"
        (Standards) berwarna hijau kebiruan di sisi kanan jendela
        klasifikasi.  Perhatikan bahwa spektrum yang disorot
        ditampilkan di atas spektrum tidak dikenal, sedangkan entri
        atlas berikutnya ditampilkan di bawahnya.

    4)  Gunakan tombol panah atau klik entri dalam daftar standar
        untuk menelusuri atlas.  Perhatikan perubahan bertahap pada
        spektrum seiring perubahan suhu bintang.  Cari spektrum dalam
        atlas yang paling mirip dengan spektrum tidak dikenal.  Anda
        mungkin perlu memeriksa luminositas (muat atlas lain) untuk
        mendapatkan kecocokan terdekat.

**Ukur dan tandai ciri spektrum**
Untuk mengukur panjang gelombang dan intensitas suatu ciri spektrum:

    Dengan kursor di atas tampilan spektrum, tekan dan tahan tombol
    kiri mouse - kursor berubah dari panah menjadi tanda silang.
    Saat Anda menggerakkan kursor di area tampilan spektrum, pembacaan
    panjang gelombang dan intensitas relatif pada kursor ditampilkan
    di bagian bawah jendela.  Setelah kursor berada pada titik yang
    ingin diukur, lepaskan tombol mouse.  Pembacaan itu tidak berubah
    sampai tombol kiri mouse ditekan lagi.

        CATATAN: Jika spektrum ditampilkan sebagai jejak intensitas
        (lihat topik bantuan "Atur tampilan"), posisi vertikal
        (koordinat Y) kursor yang menentukan pengukuran intensitas.
        Jika tampilan dalam mode "Foto" (Photo), yang ditampilkan
        adalah intensitas "di bawah" kursor (pada koordinat horizontal
        atau X).

    Saat tombol mouse dilepaskan, kursor kembali ke bentuk normal, dan
    posisi yang diukur ditandai di layar oleh garis merah vertikal
    yang melintasi spektrum tidak dikenal dan spektrum standar pada
    posisi panjang gelombang itu.  Garis horizontal kecil menunjukkan
    posisi intensitas.  Anda juga dapat menandai garis dengan klik
    ganda pada entrinya di tabel garis spektrum.  Anda dapat
    "menyetel halus" posisi garis dengan tombol panah pada keypad
    numerik (lihat di bawah).

    -Akses Keyboard-
    Tombol panah pada keypad numerik (tombol "2", "4", "6", "8") dapat
    dipakai untuk memosisikan garis pengukuran sebagai pengganti
    mouse.  NumLock harus "On" dan MouseKeys harus "Off".  (Jika Anda
    memakai MouseKeys, atur sistem Anda agar MouseKeys aktif saat
    NumLock "Off".)  Jika garis pengukuran tidak terlihat, tekan
    tombol panah kanan ("6"), dan garis akan muncul dari sisi kiri
    tampilan.

Topik terkait:
    Tabel garis spektrum dan bantuan
    Atur tampilan

**Kontrol**
Kontrol berikut terletak di sisi kanan jendela klasifikasi:

    Perbesar (Zoom In) (ujung panah atas):
        Memperbesar spektrum yang ditampilkan dengan faktor 2, hingga
        maksimum 16 kali tampilan awal.  Jika suatu ciri ditandai,
        zoom berusaha memusatkannya pada tampilan yang diperbesar.
        Jika tidak ada garis yang ditandai, panjang gelombang di
        pusat tampilan tetap sama.

    Perkecil (Zoom Out) (ujung panah bawah):
        Mengurangi pembesaran spektrum yang ditampilkan dengan faktor
        2, hingga pembesaran awal (1X).  Jika suatu garis ditandai,
        zoom berusaha menjaganya tetap di tengah tampilan.

    Panah geser (Pan Arrows) (ujung panah kiri & kanan):
        Gunakan kontrol panah kiri dan kanan untuk menelusuri
        spektrum yang diperbesar.

    Tombol "Atur Ulang" (Reset):
        Mengembalikan tampilan ke citra awal (1X).

**Tabel garis spektrum dan bantuan**
Tabel garis spektrum membantu mengidentifikasi ciri spektrum
berdasarkan panjang gelombang, dan menyediakan fasilitas bantuan yang
menjelaskan makna dan kegunaan setiap garis dalam tabel untuk
mengklasifikasi spektrum bintang.

Untuk memuat tabel garis spektrum, pilih "File"->"Tabel Garis
Spektrum" (Spectral Line Table) dari menu klasifikasi.  Setelah tabel
garis muncul, Anda dapat memindahkannya ke tempat yang nyaman di
layar.  (Arahkan kursor ke bilah judul di bagian atas.  Tekan dan
tahan tombol kiri mouse, lalu seret jendelanya.)

Fitur tabel garis spektrum:

    -Pelacakan Kursor-
        Saat tombol kiri mouse ditekan dengan kursor di mana pun di
        dalam tampilan spektrum, entri yang panjang gelombangnya
        paling dekat dengan posisi kursor disorot pada tabel garis
        spektrum.  Tabel akan bergulir mengikuti kursor saat mouse
        digerakkan dengan tombol kiri tetap ditekan.

            PERHATIAN: Pertimbangkan dengan cermat sebelum menerima
            identifikasi garis dari tabel, karena panjang gelombang
            adalah satu-satunya kriteria - suhu, luminositas, dan
            sebagainya tidak diperhitungkan.  Misalnya, garis besi
            (Fe) tidak muncul pada bintang tipe awal, garis helium
            (He) tidak muncul pada bintang tipe akhir, dan seterusnya.

    -Menandai Posisi Garis-
        Mengeklik tombol kiri mouse pada suatu entri di tabel garis
        spektrum menyorot entri itu, dan posisi garisnya ditandai pada
        tampilan spektrum.

    -Bantuan-
        Saat tombol kiri mouse diklik ganda pada suatu entri di tabel
        garis spektrum, entri itu disorot dan garisnya ditandai seperti
        di atas, lalu jendela Bantuan muncul dengan informasi tentang
        garis yang dipilih.  Setelah dibuka, jendela Bantuan terus
        "mengikuti" pilihan di tabel (tanpa klik ganda) sampai jendela
        Bantuan ditutup.

Topik terkait:
    Ukur dan tandai ciri spektrum

**Atur tampilan**
Opsi yang memengaruhi tampilan dan cara kerja jendela klasifikasi
tersedia melalui pilihan menu "File"->"Tampilan" (Display).

    "File"->"Tampilan"
        Mengatur format tampilan spektrum.  Opsi berikut tersedia:

        "Tampilkan Selisih (Standar - Tidak Dikenal)" (Show
        Difference (Std - Unkn))
            Jika opsi ini dipilih, spektrum standar bawah diganti
            dengan tampilan selisih titik demi titik antara spektrum
            standar atas dan spektrum tidak dikenal.  Ini sangat
            membantu dalam mengklasifikasi spektrum.

        "Jejak Intensitas" (Intensity Trace)
            Menampilkan spektrum sebagai plot intensitas relatif
            terhadap panjang gelombang (bawaan).

        "Skala Abu-abu "Foto"" (Grayscale "Photo")
            Mengonversi intensitas relatif menjadi tingkat abu-abu
            untuk meniru citra fotografi (positif).

        "Gab. (Foto & Jejak)" (Comb. (Photo & Trace))
            Menampilkan spektrum tidak dikenal dalam kedua mode.
            Satu spektrum standar ditampilkan sebagai "Foto".

        "Balik Tampilan Skala Abu-abu" (Reverse Grayscale Displays)
            Membalik konversi intensitas menjadi tingkat abu-abu
            untuk meniru citra fotografi negatif.


**Ukur lebar ekuivalen**
"Lebar ekuivalen" suatu garis spektrum adalah besaran hasil hitung
yang mengukur kekuatan garis itu secara akurat.  Jika Anda berusaha
mengklasifikasi spektrum bintang dengan sangat akurat dan ragu akan
kekuatan relatif ciri-ciri penting, pengukuran lebar ekuivalen dapat
membantu.  Untuk mengukur lebar ekuivalen suatu ciri spektrum:

    1)  Zoom tampilan ke pembesaran yang memungkinkan "bahu" garis
        terlihat jelas dan dapat ditandai.

    2)  Pilih "Lebar Ekuivalen Garis..." (Line Equivalent Width...)
        dari menu klasifikasi.  Sebuah kotak akan muncul dengan
        petunjuk untuk menyelesaikan proses perhitungan lebar
        ekuivalen (ringkasan langkah 3-5 di bawah).

    3)  Tandai perkiraan pusat garis pada tampilan spektrum dengan
        tombol kiri mouse, baik pada tampilan itu sendiri maupun
        pada entri garis di tabel.

    4)  Tandai panjang gelombang dan intensitas kedua bahu garis
        dengan mengeklik tombol kanan mouse dengan kursor di setiap
        bahu secara bergantian.  Posisi vertikal kursor harus
        menunjukkan tingkat kontinum di setiap sisi garis.  Jika Anda
        melakukannya dengan benar, rentang garis akan dibatasi oleh
        kotak biru, dengan penanda posisi garis merah melewati
        sekitar pusatnya.  Jika ingin mengubah suatu posisi, cukup
        arahkan kursor ke posisi baru lalu klik tombol kanan lagi.
        Anda juga dapat memosisikan ulang penanda pusat garis dengan
        mengeklik tombol kiri.

    5)  Setelah ciri itu dibatasi dengan benar, tekan "OK" pada kotak
        petunjuk.  Lebar ekuivalen hasil hitung, beserta panjang
        gelombang dan intensitas pada pusat garis dan kedua bahu yang
        ditandai, akan ditampilkan.

Topik terkait:
    Ukur dan tandai ciri spektrum
    Tabel garis spektrum dan bantuan

**Simpan, tinjau, dan analisis hasil**
Setelah Anda puas dengan klasifikasi suatu spektrum, pilih "Hasil
Klasifikasi" (Classification Results) dari menu dan catat klasifikasi
Anda di kotak berlabel "Tipe Sp." (Sp. Type) pada formulir yang
muncul.  Anda juga dapat mencatat ketidakpastian atau ciri tidak
biasa pada spektrum di kotak "Catatan" (Remarks).  Saat Anda menekan
"OK", informasi yang Anda masukkan ditempatkan pada sebuah daftar,
tetapi tidak disimpan ke file.  Untuk meninjau, mencetak, dan/atau
menyimpan hasil Anda ke file, pilih "Alat" (Tools)->"Editor Hasil"
(Results Editors)->"Hasil Pengamatan" (Observational Results)->
"Tampilkan/Cetak/Simpan" (Display/Print/Save) pada menu panel kontrol
observatorium.

Topik terkait:
    "Editor Hasil" (Results Editors) pada menu "Bantuan" (Help) panel
    kontrol observatorium.

**Atur rentang panjang gelombang**
Anda dapat mengubah rentang panjang gelombang yang terlihat di jendela
klasifikasi, dalam rentang maksimum 3500 sampai 7400 Angstrom.  Untuk
mengubah rentang panjang gelombang, pilih "File"->"Tampilan"
(Display)->"Rentang Spektrum" (Spectral Range) dari menu panel
kontrol klasifikasi.  Gunakan penggeser untuk mengubah nilai minimum
dan/atau maksimum.  Tombol "Bawaan" (Default) mengembalikan nilai ke
rentang optimal untuk klasifikasi spektrum bintang.  Perhatikan bahwa
jika Anda memperluas rentang, Anda mungkin melampaui batas spektrum
yang sedang diklasifikasi.

**Tutup jendela klasifikasi**
Untuk menutup jendela klasifikasi dan kembali ke panel kontrol
observatorium, pilih "File"->"Keluar dari Klasifikasi Spektrum" (Exit
Classify Spectra) pada menu, atau tekan kotak "X" di sudut kanan atas.
`;
