// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's HRAnalHlp.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='HRAnalHlp.TXT';
export const sourceSha256='3a2f0ef20fd5d89384e429783ceda62325e59a752fd076e02a2c4256143c956b';
export const text=`**Muat data dari pengamatan**
Untuk memuat dan menganalisis data fotometri gugus yang baru saja Anda
ambil dengan teleskop dan fotometer, pilih "File"->"Muat/Plot"
(Load/Plot)->"Data dari Pengamatan" (Data from Observations) dari menu
alat analisis diagram HR.  Diagram warna-magnitudo (HR) mentah akan
muncul setelah data dimuat.  Jika Anda telah menyimpan data fotometri
dari sesi sebelumnya, muat ulang data itu sebelum mengaksesnya dengan
cara ini.

Topik terkait:
    Topik di bawah "Alat analisis gugus"
    Topik bantuan "Editor Hasil" dan "Muat data tersimpan" pada menu
      panel kontrol observatorium.

**Muat data dari basis data gugus**
Untuk memuat dan menganalisis data fotometri masing-masing gugus dari
basis data VIREO, pilih "File"->"Muat/Plot" (Load/Plot)->"Pilih Data
Gugus" (Select Cluster Data) dari menu alat analisis diagram HR.  Pada
daftar yang muncul, klik satu entri untuk memilihnya, lalu pilih
"Pilihan" (Selection)->"Plot" dari menu.  Atau, klik ganda satu entri
pada daftar untuk memuat dan memplot datanya.

Topik terkait:
    Topik di bawah "Alat analisis gugus"
    Muat gugus baru dari basis data

**Muat gugus baru dari basis data**
Memuat gugus baru dari basis data akan menggantikan titik data pada
tampilan diagram HR.  Jika deret utama usia nol (ZAMS) dan/atau sebuah
isokron sedang ditampilkan, kurva itu tidak akan dihapus otomatis.

Topik terkait:
    Muat data dari basis data gugus
    Hapus ZAMS, isokron dari tampilan

**Tampilkan deret utama usia nol**
Mencocokkan deret utama usia nol (ZAMS) dengan data gugus memungkinkan
Anda menentukan modulus jarak V-Mv dan ekses warna E(B-V) gugus itu.
Untuk menampilkan ZAMS, pilih "Alat" (Tools)->"Deret Utama Usia Nol"
(Zero Age Main Sequence) dari menu alat analisis diagram HR.  Mula-mula
ZAMS ditampilkan dengan V-Mv = 0.

Topik terkait:
    Cocokkan deret utama usia nol
    Hapus ZAMS, isokron dari tampilan

**Cocokkan deret utama usia nol**
Gunakan penggeser penyesuaian V-Mv di sisi kanan plot diagram HR untuk
mencocokkan ZAMS dengan deret utama yang ditunjukkan plot gugus.
Ingatlah bahwa bagian atas deret utama gugus telah berevolusi menjauh
dari deret utama usia nol.  Seberapa jauh evolusinya bergantung pada
usia gugus.  (Mencocokkan sebuah isokron setelah Anda menempatkan ZAMS
akan membuatnya lebih jelas.)  Pada diagram HR gugus juga terdapat
bintang yang bukan anggota gugus, tetapi pada sebagian besar kasus deret
utama gugus cukup jelas sehingga ZAMS dapat dicocokkan dengan cukup
akurat.

Penggeser di bagian bawah plot menggeser ZAMS ke samping dengan
menerapkan ekses warna E(B-V) untuk mengompensasi efek pemerahan oleh
debu antarbintang di antara gugus dan Matahari.  Untuk menyederhanakan
proses pencocokan, secara bawaan perangkat lunak otomatis mengatur
E(B-V) ke nilai yang benar untuk gugus yang Anda pelajari, sehingga Anda
tidak perlu mengubahnya.  Instruktur Anda seharusnya memberi tahu Anda
jika nilai bawaan ini telah diubah, dan Anda perlu mempertimbangkan
untuk menyesuaikan E(B-V) saat mencocokkan ZAMS.

Topik terkait:
    Tampilkan deret utama usia nol
    Tambahkan isokron ke tampilan
    Hapus ZAMS, isokron dari tampilan

**Tambahkan isokron ke tampilan**
Mencocokkan isokron yang benar dengan data gugus akan memberi tahu Anda
usia gugus dan metalisitas bintang-bintang gugus.  Tampilan isokron
memakai hasil pencocokan deret utama usia nol untuk "menjangkarkan"
parameter V-Mv dan E(B-V), sehingga Anda harus mencocokkan ZAMS terlebih
dahulu sebelum menambahkan isokron.  Setelah itu, tambahkan tampilan
isokron dengan memilih "Alat" (Tools)->"Isokron..." (Isochrones...) dari
menu.  Kotak kontrol Parameter Isokron (Isochrone Parameters) yang
muncul memungkinkan Anda menyesuaikan isokron dengan data gugus.  (Saat
isokron ditampilkan, perubahan pada penggeser di tampilan diagram HR
yang mengatur nilai V-Mv dan E(B-V) akan membuat tampilan ZAMS dan
isokron bergerak bersama.)

CATATAN: Isokron diperoleh dari model teoretis yang tersedia pada nilai
usia dan metalisitas tertentu yang tercakup oleh kontrolnya.  Nilai di
antaranya tidak tersedia, dan pencocokan yang tepat dengan gugus
tertentu tidak selalu mungkin.  Bagian bawah deret utama dari isokron
mungkin tidak persis sama dengan ZAMS.  Usahakan mencocokkan dengan baik
deret utama tepat di bawah titik belok deret utama (turn-off), titik
belok itu sendiri, dan bagian diagram yang telah berevolusi di atas dan
di kanan titik belok.

Topik terkait:
    Cocokkan deret utama usia nol
    Atur usia isokron
    Atur metalisitas isokron
    Atur warna isokron
    Hapus ZAMS, isokron dari tampilan

**Atur usia isokron**
Gunakan penggeser di bagian atas kotak kontrol Parameter Isokron untuk
mengatur usia isokron yang ditampilkan.  Penggeser mengatur logaritma
usia dalam tahun dari 7.80 hingga 10.25, dengan langkah 0.05.  Ini
sesuai dengan usia gugus dari 63 juta tahun hingga hampir 18 miliar
tahun.  (Lihat CATATAN di bawah "Tambahkan isokron ke tampilan".)
Mungkin usia gugus yang Anda pelajari berada di luar rentang isokron
yang tersedia.  Dalam hal ini Anda menyimpulkan bahwa usia gugus kurang
dari batas bawah atau lebih dari batas atas yang berlaku.

Topik terkait:
    Tambahkan isokron ke tampilan
    Atur metalisitas isokron
    Atur warna isokron
    Hapus ZAMS, isokron dari tampilan

**Atur metalisitas isokron**
Model isokron tersedia untuk 6 nilai metalisitas.  (Lihat CATATAN di
bawah "Tambahkan isokron ke tampilan".)  Selain nilai Matahari, tersedia
4 model dengan metalisitas lebih rendah dan 1 model dengan metalisitas
lebih tinggi.  Sebagian besar gugus terbuka di Galaksi memiliki
metalisitas mendekati nilai Matahari, dan Anda sebaiknya selalu memulai
dari nilai itu.  Jika Anda tidak mendapatkan kecocokan yang memuaskan,
Anda dapat mencoba mengubah metalisitas.  (Anda mungkin juga ingin
mencoba beberapa nilai sekadar untuk melihat pengaruhnya.)  Pada kotak
kontrol Parameter Isokron, gunakan tombol panah kecil di tepi kanan
pembacaan metalisitas untuk menampilkan berbagai nilai.  Untuk mengubah
metalisitas isokron yang ditampilkan, atur model yang Anda inginkan di
kotak itu, lalu klik ganda kotak tersebut.

Topik terkait:
    Tambahkan isokron ke tampilan
    Atur warna isokron

**Atur warna isokron**
Penggeser "Atur (B-V)" (Adjust (B-V)) pada kotak kontrol Parameter
Isokron menggeser isokron ke samping pada diagram HR tanpa menggeser
ZAMS.  Ini dapat memberi Anda kecocokan yang lebih baik, terutama jika
Anda kesulitan mencocokkan deret utama isokron dengan ZAMS.  (Anda juga
dapat mencoba mengubah metalisitas untuk memperbaikinya.)  Sampai batas
tertentu, penyesuaian (B-V) meniru pengaruh variasi metalisitas yang
lebih kecil daripada selisih antarmodel.

Topik terkait:
    Tambahkan isokron ke tampilan
    Atur metalisitas isokron

**Hapus ZAMS, isokron dari tampilan**
Pilih "Alat" (Tools)->"Kosongkan" (Clear) dari menu alat analisis
diagram HR untuk menghapus ZAMS dan isokron dari tampilan.  Anda juga
dapat menghapus keduanya satu per satu dengan memilih ulang pilihan menu
yang sesuai ("Alat"->"Deret Utama Usia Nol" atau "Alat"->"Isokron...").
Ini mungkin paling berguna untuk menghapus isokron dengan membiarkan
ZAMS tetap ada, terutama setelah gugus baru dimuat.

Topik terkait:
    Muat gugus baru dari basis data

**Tampilkan/cetak parameter usia/jarak gugus**
Pilih "Alat" (Tools)->"Lihat/Cetak Parameter" (View/Print Parameters)
dari menu alat analisis diagram HR untuk menampilkan nilai parameter
yang dihasilkan dari analisis Anda terhadap diagram HR gugus.  Pilih
"Daftar" (List)->"Cetak" (Print) untuk mendapatkan salinan cetak.
`;
