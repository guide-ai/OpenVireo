// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's PULSRANL.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='PULSRANL.TXT';
export const sourceSha256='9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4';
export const text=`**Muat data pulsar tercatat**
Untuk memuat data pulsar yang telah dicatat dan disimpan ke Jendela
Analisis Data, pilih "File"->"Muat..." (Load...) dari menu analisis
data, lalu pilih file melalui kotak dialog yang muncul.  File berisi
data pulsar tercatat sebaiknya berekstensi ".PLR".

CATATAN: Jika Anda membuka jendela analisis data segera setelah mencatat
data pulsar, data yang terakhir dicatat akan otomatis muncul di jendela
analisis data, baik sudah disimpan maupun belum.

**Simpan data pulsar tercatat**
Untuk menyimpan data pulsar saat ini, pilih "File"->"Simpan..."
(Save...) dari menu analisis data.  Sebuah kotak dialog akan muncul
untuk memasukkan atau memilih nama file simpanan.  Anda bebas memakai
nama apa pun; kotak dialog akan menyarankan nama yang dibuat dari
isian kotak dialog Masuk (Log In).  Selalu gunakan ekstensi ".PLR"
pada file ini agar tidak terjadi kesulitan dan kebingungan nanti.

Anda juga dapat menyimpan data pulsar saat ini dengan memilih
"File"->"Simpan Data Tercatat..." (Save Recorded Data...) dari menu
utama.

**Lihat properti data**
Untuk membuka kotak dialog yang menampilkan properti data pulsar saat
ini, pilih "File"->"Properti..." (Properties...) dari menu analisis
data.  Properti yang ditampilkan pada kotak dialog tersebut meliputi:

    Identifikasi Objek
    Waktu Awal Data (Nomor Hari Julian dikurangi 2 400 000)
    Apertur Teleskop (meter)
    Frekuensi (MHz) dan Gain Relatif untuk setiap penerima yang dicatat
    Jumlah Titik Data (untuk setiap penerima yang dicatat)
    Selang Waktu (msec) antartitik data
    Nama File

Kotak dialog properti juga muncul otomatis saat data dimuat.  Anda tidak
dapat mengubah properti apa pun yang ditampilkan, karena properti itu
mencerminkan informasi tentang data yang sudah disimpan.

**Kontrol**
Kontrol berikut berada di sisi kanan Jendela Analisis Data:

    Skala Vertikal (Vertical Scale) - Gunakan tombol skala vertikal
    untuk mengatur skala setiap panel tampilan.  Skala dapat diubah
    dengan kelipatan 2, dari minimum 0.125 sampai maksimum 8.  (Faktor
    skala 1 menampilkan data persis seperti yang dicatat.)  Faktor ini
    hanya memengaruhi tampilan dan tidak mengubah data yang
    mendasarinya.

    Geser Horizontal (Horizontal Pan) - Gunakan panah geser horizontal
    kiri dan kanan untuk mengubah rentang data tercatat yang ditampilkan
    di panel.  Rentang yang ditampilkan (dalam detik sejak awal data)
    ditunjukkan oleh pembacaan di kiri dan kanan di bawah panel
    tampilan.

    Langkah Geser (Pan Rate) - Kontrol langkah geser mengatur
    kecepatan penggeseran horizontal.

    Zoom Horizontal (Horizontal Zoom) - Gunakan kontrol zoom "Perbesar"
    (In) dan "Perkecil" (Out) untuk memperbesar atau memperkecil rentang
    data tercatat yang ditampilkan di panel.  Faktor zoom berkisar dari
    0.125 sampai 8 dengan kelipatan 2.  (Faktor zoom 1 menampilkan data
    persis seperti yang dicatat.)  Rentang yang ditampilkan (dalam detik
    sejak awal data) ditunjukkan oleh pembacaan di kiri dan kanan di
    bawah panel tampilan.

    Atur Ulang (Reset) - Menekan tombol "Atur Ulang" mengembalikan skala
    vertikal semua panel ke 1, faktor zoom ke 1, dan langkah geser ke
    2.  Tampilan kembali ke awal data, dan semua kursor serta pembacaan
    kursor dikosongkan.

**Lakukan pengukuran**
Posisi dapat diukur pada panel tampilan dengan menekan dan menyeret
mouse.  Tombol mouse kanan mengendalikan kursor "acuan" yang muncul di
posisi yang sama pada ketiga panel.  Pembacaan hijau di bawah panel
menunjukkan posisi kursor acuan dalam detik sejak awal data.

Tombol mouse kiri mengendalikan kursor vertikal sekaligus kursor
horizontal untuk setiap panel.  Di sebelah kanan setiap panel terdapat
pembacaan untuk kursor panel tersebut.  Posisi kursor vertikal
(pembacaan berwarna sian) ditunjukkan dalam detik sejak awal file.
Posisi kursor horizontal (pembacaan berwarna magenta) adalah indikator
kekuatan relatif yang mencakup faktor skala vertikal panel tampilan
sekaligus gain relatif yang diterapkan saat data dicatat (lihat topik
Bantuan "Lihat properti data").  Untuk mengalihkan tombol mouse kiri
antara kursor vertikal dan horizontal pada setiap panel, klik pembacaan
yang sesuai.

Memperbesar tampilan secara horizontal (zoom "Perbesar") dapat membantu
menentukan dan mengukur posisi denyut dengan akurat.

**Catat pengukuran**
Gunakan prosedur berikut untuk mencatat pengukuran Anda:

    1) Lakukan pengukuran dengan memposisikan kursor seperti dijelaskan
    pada topik Bantuan "Lakukan pengukuran".  Jika mau, Anda dapat
    melakukan pengukuran di semua panel tampilan yang aktif saat ini.

    2) Pilih "Hasil" (Results)->"Catat Pengukuran Saat Ini..." (Record
    Current Measurements...) dari menu analisis data.

    3) Serangkaian kotak dialog akan muncul, menampilkan pengukuran dan
    properti yang akan dicatat untuk setiap panel yang memiliki
    pengukuran belum tercatat.  Jika mau, Anda dapat menambahkan
    komentar pada setiap catatan pengukuran.  Pilih "OK" untuk mencatat
    pengukuran, atau "Batal" (Cancel) untuk melewatinya kali ini.

Setiap pengukuran yang Anda catat akan ditambahkan ke daftar pengukuran
saat ini.  Lihat topik Bantuan "Tinjau pengukuran yang tercatat",
"Simpan pengukuran yang tercatat", dan "Kosongkan daftar pengukuran"
untuk informasi tentang cara menangani catatan dalam daftar ini.

**Tinjau pengukuran yang tercatat**
Anda dapat meninjau daftar pengukuran tercatat saat ini kapan saja,
setelah Anda mulai mencatat pengukuran.  Pilih "Hasil" (Results)->
"Tinjau Pengukuran yang Tercatat..." (Review Recorded Measurements...)
dari menu analisis data.  Sebuah kotak dialog yang menampilkan semua
catatan saat ini akan muncul.  Untuk memilih catatan tertentu, klik
catatan itu dengan mouse.  Anda dapat mencari catatan yang memuat teks
tertentu (pilih "Temukan..." (Find...)).  Setelah memilih sebuah
catatan, Anda dapat melihatnya dan mengedit kolom komentar (pilih
"Edit..."), atau menghapus catatan dari daftar (pilih "Hapus" (Delete)).

Setelah selesai meninjau catatan, pilih "OK" atau "Batal" (Cancel).
Perubahan apa pun yang Anda buat pada catatan dalam daftar (pengeditan
atau penghapusan) akan dibuang jika Anda memilih "Batal".

**Simpan pengukuran yang tercatat**
Untuk menyimpan daftar pengukuran tercatat Anda saat ini ke sebuah file,
pilih "Hasil" (Results)->"Simpan Pengukuran yang Tercatat..." (Save
Recorded Measurements...) dari menu analisis data.  Tentukan nama file
melalui kotak dialog yang muncul.  Data disimpan dalam format "nilai
dipisahkan koma" (Comma Separated Values) yang diterima oleh program
spreadsheet standar.  Gunakan ekstensi ".CSV" pada file apa pun yang
Anda buat di sini.  (Lihat topik Bantuan "Akses program spreadsheet".)

Jika Anda memilih nama file yang sudah ada, data yang ada akan tertimpa.
Anda akan diperingatkan dan diberi kesempatan untuk mengubah pilihan
jika itu bukan maksud Anda.  (Lihat topik Bantuan "Kosongkan daftar
pengukuran".)

**Kosongkan daftar pengukuran**
Biasanya daftar pengukuran saat ini tetap utuh, bahkan setelah disimpan
ke file, dan pengukuran baru ditambahkan ke dalamnya.  (Artinya Anda
dapat menyimpan file, menambahkan pengukuran lagi, lalu menyimpan ke
file yang sama tanpa kehilangan data.)  Jika Anda ingin membuat daftar
pengukuran baru, tanpa catatan sebelumnya, pilih "Hasil" (Results)->
"Kosongkan Daftar Pengukuran" (Clear Measurement List) dari menu
analisis data.

**Akses program spreadsheet**
Anda mungkin dapat membuka program spreadsheet untuk menganalisis data
langsung dari praktikum ini.  Jika pilihannya aktif, pilih "Hasil"
(Results)->"Spreadsheet" dari menu analisis data.  Jika Anda baru saja
menyimpan file untuk spreadsheet (lihat topik Bantuan "Simpan pengukuran
yang tercatat"), file itu akan dimuat otomatis saat program spreadsheet
terbuka.  Jika Anda ingin memuat file ke spreadsheet sendiri, ingat
bahwa tipe filenya adalah ".CSV".  Anda mungkin menemukannya di bawah
judul "Text Files" pada kotak dialog pemuatan file spreadsheet.

**Cetak citra layar**
Pilihan "File"->"Cetak Layar..." (Print Screen...) pada menu analisis
data memungkinkan Anda mencetak citra jendela analisis data kapan saja.
Citra ini menampilkan semua kursor pada posisi saat ini dan pembacaan
dengan nilai saat ini.  Fitur ini memakai fasilitas cetak Windows, dan
akan mencetak berwarna jika printer berwarna dipilih.  Hasil cetak
mencakup nama yang diisi saat Masuk (Log In) untuk identifikasi, dan
properti data saat ini.

**Tutup jendela analisis data**
Untuk menutup jendela analisis data dan kembali ke jendela utama, pilih
"File"->"Keluar" (Exit) dari menu analisis data, pilih "Tutup" (Close)
dari Menu Sistem (klik kotak di pojok kiri atas), atau klik kotak "X" di
pojok kanan atas (hanya Windows 95).
`;
