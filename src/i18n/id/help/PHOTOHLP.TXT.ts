// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's PHOTOHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='PHOTOHLP.TXT';
export const sourceSha256='aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a';
export const text=`**Atur filter**
Gunakan penggeser "Filter" pada panel kontrol fotometer untuk mengatur
filter yang aktif.  Anda harus melakukan pembacaan langit dengan setiap
filter sebelum dapat memakainya untuk mengukur magnitudo bintang.

Topik terkait:
    Lakukan pembacaan langit
    Sakelar penggeser

**Atur detik integrasi**
Gunakan penggeser berlabel "Detik" (Seconds) pada panel kontrol
fotometer untuk mengatur durasi setiap integrasi (lama waktu cacah foton
terkumpul saat pembacaan dilakukan).  Pilihannya berkisar dari 0.1 detik
hingga 100 detik, dengan kelipatan 10.

Topik terkait:
    Atur jumlah integrasi
    Lakukan pembacaan fotometri
    Sakelar penggeser

**Atur jumlah integrasi**
Gunakan penggeser berlabel "Integrasi" (Integrations) pada panel
kontrol fotometer untuk mengatur jumlah integrasi yang membentuk satu
pembacaan lengkap.  Pilihannya berkisar dari 1 hingga 5.

Topik terkait:
    Atur detik integrasi
    Lakukan pembacaan fotometri
    Sakelar penggeser

**Atur ukuran apertur**
Untuk mengatur ukuran apertur fotometer, pilih "Apertur" (Aperture)
dari menu panel kontrol fotometer.  Sebuah kotak kontrol kecil akan
muncul dengan penggeser untuk mengubah ukuran apertur.  Tombol berlabel
"Bawaan" (Default) mengembalikan apertur ke ukuran bawaannya.  Gunakan
ukuran apertur bawaan sebisa mungkin.  Beberapa situasi yang mungkin
mengharuskan Anda mengubah apertur antara lain:

    1)  Objek meluas seperti galaksi terlalu besar untuk masuk ke dalam
        apertur bawaan.

    2)  Bintang-bintang dalam gugus begitu berdekatan sehingga
        diperlukan apertur yang lebih kecil untuk memisahkan masing-
        masing bintang dan mencegah pembacaan terkontaminasi.

    3)  Pembacaan langit dapat lebih akurat dengan waktu integrasi yang
        lebih singkat jika Anda memakai apertur yang lebih besar.  Jika
        melakukannya, pastikan tidak ada bintang di dalam apertur yang
        dapat mengontaminasi pembacaan langit.

    CATATAN: Jika Anda mengubah ukuran apertur setelah melakukan
    pembacaan langit, rata-rata cacah langit per detik akan otomatis
    diskalakan ke ukuran apertur yang baru untuk penentuan magnitudo.

Topik terkait:
    Galaksi dan sumber meluas lainnya
    Lakukan pembacaan langit

**Atur jenis pembacaan**
Sakelar "Pembacaan" (Reading) pada panel kontrol fotometer dipakai
untuk menentukan bagaimana pembacaan ditafsirkan dan dicatat.  Pastikan
sakelar ini berada pada posisi yang benar sebelum menekan tombol "Mulai"
(Start) untuk memulai pembacaan.  Jika Anda membaca bintang atau objek
lain dengan sakelar pembacaan diatur ke "Langit" (Sky), pembacaan
langit Anda saat ini (yang semestinya benar) akan tergantikan oleh
pembacaan tidak valid yang memuat objek tersebut.  Jika ini terjadi,
Anda perlu menjauh dari objek dan melakukan pembacaan langit yang valid
sebelum melanjutkan.

    CATATAN: Sakelar "Pembacaan" mungkin tidak muncul pada panel kontrol
    fotometer untuk praktikum "Fotometri Fotolistrik Gugus"
    (Photoelectric Photometry of Clusters).  Dalam hal ini perangkat
    lunak otomatis mendeteksi ada atau tidaknya objek di dalam apertur
    dan memproses pembacaan sesuai hasilnya.

**Lakukan pembacaan langit**
Anda harus melakukan pembacaan langit melalui setiap filter sebelum
dapat mengukur kecerahan objek melalui filter itu.  Satu set pembacaan
langit sudah cukup selama Anda tetap memakai teleskop yang sama.  Jika
Anda berganti teleskop, Anda harus melakukan satu set pembacaan langit
yang baru, bahkan jika Anda kembali ke teleskop yang pernah dipakai.
Lakukan pembacaan langit sebagai berikut:

    1)  Dari panel kontrol teleskop, pastikan bidang pandang diatur ke
        "Teleskop" (Telescope), lalu gunakan tombol "USTB" untuk
        mengarahkan teleskop sehingga tidak ada bintang di dalam atau
        tepat di samping lingkaran apertur merah.  Jika bingkai memiliki
        cukup langit kosong, Anda dapat meningkatkan akurasi pengukuran
        langit dengan memperbesar ukuran apertur.

    2)  Akses/kembali ke kontrol fotometer.  Jika sakelar "Pembacaan"
        terlihat, pastikan sakelar itu diatur ke "Langit".  Jika tidak
        ada sakelar "Pembacaan", kotak berlabel "Objek" (Object) harus
        berisi "Langit" jika teleskop diarahkan dengan benar, .

    3)  Atur filter ke warna yang diinginkan.  (Jika pembacaan langit
        sudah dilakukan dengan filter tertentu, kotak berlabel "Langit
        Rata-Rata" (Mean Sky) akan berisi rata-rata cacah langit per
        detik untuk filter itu.  Jika belum, isinya menunjukkan "BELUM
        ADA LANGIT!" (NO SKY!).)
 
    4)  Atur waktu integrasi ke 10 detik dan jumlah integrasi ke 5.  

    5)  Tekan "Mulai" dan tunggu pembacaan muncul.  Anda akan melihat
        cacah mentah setiap kali satu integrasi selesai.  Setelah
        pembacaan selesai, rata-rata cacah langit untuk warna itu akan
        muncul di kotak berlabel "Cacah Langit Rata-Rata/Detik" (Mean
        Sky Counts/Sec).

    6)  Ulangi untuk setiap filter yang akan Anda pakai.

    7)  Pilih "File"->"Data"->"Catat/Tinjau" (Record/Review) dari menu
        fotometer untuk menyimpan pembacaan langit.  (Anda mungkin tidak
        perlu melakukannya jika program diatur untuk menghitung
        magnitudo bintang secara otomatis.  Jika Anda menghitung
        magnitudo sendiri dari cacah foton, Anda HARUS mencatat
        pembacaan langit.)

Topik terkait:
    Atur ukuran apertur
    Atur jenis pembacaan
    Topik Bantuan lainnya di bawah "Gunakan fotometer".

**Bintang dan sumber titik lainnya**
Anda harus melakukan pembacaan langit sebelum dapat melakukan
pengukuran fotometri bintang dan objek lain.  Setelah pengukuran langit
selesai, lakukan pembacaan fotometri sumber titik sebagai berikut:

    1)  Dari panel kontrol teleskop, letakkan bintang kira-kira di
        tengah kotak merah pada tampilan "Pencari" (Finder).  Ubah ke
        tampilan "Teleskop", lalu letakkan bintang tepat di tengah
        lingkaran apertur merah.  (Apertur harus diatur ke ukuran
        bawaan.)  Jika bintang itu memiliki pendamping di dekatnya,
        pastikan pendamping itu tetap berada di luar lingkaran apertur.
        Dalam hal ini, bintang yang Anda ukur mungkin tidak berada tepat
        di tengah.  Sebagai alternatif, Anda dapat memakai apertur yang
        lebih kecil untuk menghindari kontaminasi dari bintang di
        dekatnya.

    2)  Kembali ke panel kontrol fotometer.  PASTIKAN sakelar
        "Pembacaan" diatur ke "Objek".  Jika sakelar "Pembacaan" tidak
        muncul, kotak "Objek" mungkin berisi identitas bintang atau
        objek lain yang sedang Anda ukur.  Kotak itu tidak boleh
        berisi "Langit".

    3)  Atur filter ke warna yang diinginkan.  (Jika kotak "Cacah Langit
        Rata-Rata" menunjukkan "BELUM ADA LANGIT!", Anda tidak dapat
        mengukur pada warna itu.  Kembali ke kontrol teleskop, geser
        bintang keluar dari lingkaran apertur merah, lalu kembali ke
        kontrol fotometer dan baca langit.)
 
    4)  Atur waktu integrasi dan jumlah integrasi yang diinginkan.
        (Mungkin perlu coba-coba di sini - lihat Langkah 5 di bawah.)

    5)  Tekan tombol "Mulai" integrasi dan tunggu pembacaan muncul.
        Anda akan melihat cacah mentah setiap kali satu integrasi
        selesai.  Setelah pembacaan selesai, rata-rata cacah per detik,
        rasio sinyal-derau (S/N), dan magnitudo hasil hitung akan muncul
        di kotak berlabel.  Untuk akurasi terbaik, pembacaan Anda harus
        mencerminkan rasio sinyal-derau 100 atau lebih.  Jika S/N lebih
        rendah dari itu, tambah waktu integrasi, jumlah integrasi, atau
        keduanya, lalu lakukan pembacaan baru (jangan catat pembacaan
        yang lama).  (Jika S/N Anda SANGAT rendah, Anda mungkin perlu
        memakai teleskop yang lebih besar untuk mendapatkan fotometri
        yang akurat.)  Jika S/N Anda sangat tinggi (> ~500), Anda dapat
        mengurangi waktu integrasi dan/atau jumlah integrasi pada
        bintang berikutnya yang magnitudonya kira-kira sama untuk
        menghemat waktu.

    6)  Ulangi pembacaan untuk setiap filter yang Anda pakai.
        Perhatikan bahwa sebagian besar bintang tampak lebih redup di
        biru (B), dan lebih redup lagi di ultraviolet (U), daripada di
        visual (V).  Ini disebabkan oleh efek gabungan suhu bintang dan
        pemerahan antarbintang.  Anda mungkin perlu menambah waktu
        integrasi dan jumlah integrasi - selalu periksa rasio
        sinyal-derau.

    7)  Pilih "File"->"Data"->"Catat/Tinjau" dari menu untuk menyimpan
        pembacaan fotometri.  JIKA ANDA KEMBALI KE TAMPILAN UTAMA TANPA
        MENCATAT PEMBACAAN, ANDA AKAN KEHILANGANNYA DAN HARUS MENGULANGI
        PENGUKURAN!

Topik terkait:
    Atur ukuran apertur
    Atur jenis pembacaan
    Topik Bantuan lainnya di bawah "Gunakan fotometer".
    Topik di bawah "Bantuan" pada menu panel kontrol teleskop.

**Galaksi dan sumber meluas lainnya**
Pada umumnya, teknik pengukuran fotometri galaksi dan sumber meluas
lainnya sama dengan teknik untuk bintang, hanya saja untuk galaksi Anda
harus mengatur apertur cukup besar untuk melingkupi seluruh objek.  Hal
ini menimbulkan beberapa komplikasi:

    1)  Luas sebenarnya sebuah galaksi bisa jauh lebih besar daripada
        yang tampak, sehingga pembacaan magnitudo dapat bergantung pada
        ukuran apertur, meskipun apertur yang lebih kecil tampak sudah
        memuat seluruh citra.

    2)  Untuk galaksi besar, mungkin mustahil memasukkan seluruh objek
        ke dalam apertur tanpa ikut memasukkan sejumlah bintang di
        dekatnya, yang jelas akan memengaruhi pembacaan.  Pembacaan
        dapat dikoreksi, tetapi prosesnya cukup melelahkan (lihat #4
        di bawah).

    3)  Demi akurasi saat mengukur magnitudo galaksi, Anda sebaiknya
        (jika mungkin) melakukan pembacaan langit dengan apertur besar.
        Apertur itu tidak perlu sebesar apertur yang diperlukan untuk
        memuat seluruh galaksi, tetapi pembacaan langit dengan apertur
        sekecil ukuran bawaan bisa sangat tidak akurat jika diskalakan
        naik ke apertur besar.

    4)  Untuk menghilangkan efek bintang yang ikut masuk, Anda harus
        mengukur magnitudo masing-masing bintang, lalu mengurangkannya
        dari magnitudo galaksi hasil ukur.  Agar akurat, Anda perlu
        melakukan pembacaan langit (termasuk latar galaksi) di sekitar
        setiap bintang.  Gunakan apertur kecil untuk ini, dan Anda
        mungkin harus melakukan set pembacaan langit tersendiri untuk
        setiap bintang yang Anda ukur.  Ingat juga bahwa magnitudo tidak
        dapat dijumlahkan/dikurangkan secara aljabar, tetapi harus
        memakai rumus magnitudo: m1 - m2 = -2.5*Log(f1/f2).

Topik terkait:
    Atur ukuran apertur
    Bintang dan sumber titik lainnya
    Lakukan pembacaan langit

**Catat pembacaan**
Untuk mencatat pengukuran fotometri yang telah Anda lakukan, pilih
"File"->"Data"->"Catat/Tinjau" dari menu panel kontrol fotometer.
Sebuah panel data akan muncul dengan informasi tentang objek, waktu
pengamatan, dan pembacaan yang telah Anda lakukan.  Anda dapat
memasukkan catatan atau komentar apa pun yang ingin dicatat di kotak
berlabel "Catatan" (Remarks).  Tekan "OK" untuk mencatat semua data.
(Anda tidak perlu mengisi kotak "Tipe Spektrum" (Sp. Type).)

Biasanya, Anda tidak perlu mencatat data untuk setiap warna (filter)
begitu Anda mengambilnya.  Tunggu sampai Anda mengukur bintang (atau
langit) dalam semua warna yang diinginkan.  (Setiap kali Anda mencatat
data, Anda membuat satu catatan tersendiri, meskipun catatan itu hanya
berisi data untuk satu warna.  Hal ini mungkin perlu dilakukan hanya
jika Anda memerlukan pewaktuan yang sangat akurat untuk studi
variabilitas.)  Perhatikan bahwa catatan diberi tanda waktu berupa
tanggal Julian dengan 6 angka desimal (sekitar 0.1 detik).  Ini adalah
waktu saat pengukuran terakhir yang Anda lakukan (apa pun filternya)
selesai.

    CATATAN: Mencatat pembacaan dengan cara ini menyimpannya secara
    internal untuk pemrosesan lebih lanjut, tetapi TIDAK menulisnya ke
    file.  Untuk menulisnya, Anda harus kembali ke panel kontrol
    observatorium dan memilih "Alat"->"Editor Hasil"->"Hasil Pengamatan"
    ->"Tampilkan/Cetak/Simpan..." dari menu.

Topik terkait:
    Topik bantuan "Editor Hasil" pada menu panel kontrol observatorium.

**Kembali ke jendela teleskop**
Anda harus menyelesaikan pengukuran fotometri bintang dalam semua warna
(filter) yang diperlukan dan mencatat hasilnya sebelum kembali ke
jendela teleskop.  Pilih "File"->"Keluar dari Fotometer" (Exit
Photometer) dari menu panel kontrol fotometer (atau tekan tombol "X" di
sudut kanan atas).  Anda akan diberi peringatan dan kesempatan untuk
membatalkan kembali jika belum mencatat semua data yang Anda ambil.
Saat Anda kembali ke jendela teleskop, data tercatat untuk bintang yang
Anda kerjakan ditempatkan dalam daftar di memori, tetapi tidak
disimpan ke file.

Topik terkait:
    Catat pembacaan
`;
