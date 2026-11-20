// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's PULSRHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='PULSRHLP.TXT';
export const sourceSha256='3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc';
export const text=`**Kontrol teleskop radio**
Tombol-tombol berikut dipakai untuk mengoperasikan teleskop radio.
Tombol ini berada di panel kontrol teleskop.  Bergantung pada
pengaturan yang dipilih instruktur Anda, penggerakan dapat dibatasi
oleh cakrawala setempat dan mungkin oleh batasan lain pada teleskop.

    "Pelacakan" (Tracking) - Tombol ini mengaktifkan pelacakan
    sideris, yang membuat teleskop tetap terarah ke satu titik di
    langit selagi Bumi berputar.  Bila pelacakan nonaktif, objek langit
    akan bergeser melintasi medan teleskop, seperti ditunjukkan oleh
    pembacaan asensio rekta yang terus berubah.  Pelacakan nonaktif
    saat teleskop pertama kali diakses.  CATATAN: Jika teleskop adalah
    instrumen transit meridian, tombol "Pelacakan" tidak akan muncul di
    panel kontrol.

    "Kecepatan Gerak" (Slew Rate) - Sepasang tombol ini dipakai untuk
    mengatur kecepatan teleskop bergerak saat tombol gerak (U, S, T, B)
    ditekan.  Kecepatan dapat diubah dengan kelipatan sepuluh dalam
    rentang yang cukup lebar.

    Tombol gerak ("U", "S", "T", "B") - Tombol gerak dipakai untuk
    menggerakkan teleskop agar terarah ke titik (arah) tertentu di
    langit.  Untuk menggerakkan teleskop, tekan dan tahan tombol yang
    sesuai.  Teleskop akan bergerak dengan kecepatan yang ditentukan
    oleh pengaturan kecepatan gerak.  Lepaskan tombol untuk
    menghentikan gerakan.  Untuk gerakan yang panjang, tombol akan
    tetap tertekan jika Anda menggeser penunjuk mouse keluar dari
    tombol sebelum melepaskan tombol mouse.  Dalam hal ini, hentikan
    gerakan dengan menekan dan melepaskan tombol mouse sementara
    penunjuk mouse berada di atas tombol gerak yang aktif.  CATATAN:
    Jika teleskop adalah instrumen transit meridian, tombol "T" dan "B"
    tidak akan muncul di panel kontrol.

    "Penerima" (Receiver) - Tekan tombol ini untuk mengakses penerima
    pertama atau penerima utama ("master").

Topik terkait:
    Atur koordinat
    Catatan tentang penggerakan teleskop
    Menggunakan penerima

**Atur koordinat**
Untuk memasukkan langsung koordinat pengarahan yang diinginkan bagi
teleskop, pilih "Gerakkan" (Slew)->"Atur Koordinat..." (Set
Coordinates...) dari menu panel kontrol teleskop radio, lalu masukkan
koordinat pada formulir yang muncul.  Cara ini umumnya lebih cepat
daripada memakai tombol gerak untuk memindahkan teleskop dari satu
objek ke objek lain, kecuali jika objek-objek itu sangat berdekatan di
langit.  CATATAN: Jika teleskop adalah instrumen transit meridian,
fasilitas ini hanya akan menggerakkan teleskop dalam deklinasi.

Topik terkait:
    Kontrol teleskop radio
    Catatan tentang penggerakan teleskop

**Catatan tentang penggerakan teleskop**
Bagian langit yang dapat dijangkau teleskop pada waktu tertentu
dibatasi oleh beberapa faktor.  Pada kenyataannya, tidak ada teleskop,
baik optik maupun radio, yang dapat "melihat" di bawah cakrawala
setempat.  Jika dikonfigurasi demikian, teleskop dalam praktikum ini
tidak boleh bergerak lebih rendah dari ketinggian beberapa derajat di
atas cakrawala geografis "sebenarnya".

Selain itu, banyak teleskop radio dibatasi oleh rancangannya pada
wilayah langit tertentu di atas kepala.  Yang paling umum adalah
teleskop transit meridian, yang hanya dapat bergerak dalam deklinasi
dan harus menunggu objek yang diamati terbawa melintasi medan
pandang oleh rotasi Bumi.  Jenis pembatasan lain dicontohkan oleh
piringan Arecibo 1000 kaki, yang hanya dapat diarahkan ke objek dalam
jarak beberapa derajat dari zenit setempat.  Perangkat lunak ini dapat
diatur untuk menyimulasikan salah satu pembatasan penggerakan
tersebut - instruktur Anda akan memberi tahu jika hal itu dilakukan.
Jika perangkat lunak diatur untuk menyimulasikan instrumen transit
meridian, tombol "Pelacakan", "T" dan "B" tidak akan muncul di panel
kontrol, dan fasilitas "Atur Koordinat" dan "Daftar Objek" hanya akan
menggerakkan teleskop dalam deklinasi.

Berbeda dengan teleskop optik, teleskop radio dapat dipakai di siang
maupun malam hari, sehingga cara termudah untuk mengamati objek yang
saat ini berada di luar jangkauan teleskop (dalam asensio rekta)
adalah menunggu beberapa jam, atau dengan perangkat lunak ini, mengubah
tanggal/waktu simulasi.

Untuk menyederhanakan praktikum ini, instruktur Anda dapat mengatur
perangkat lunak agar mengabaikan semua pembatasan penggerakan dan
bergerak ke bagian langit mana pun kapan saja.  Anda akan diberi tahu
jika hal itu berlaku.

Lihat juga:
    "Atur tanggal dan waktu pengamatan"

**Pilih objek di "Daftar Objek"**
Untuk menggerakkan teleskop ke salah satu item di Daftar Objek, pilih
"Gerakkan" (Slew)->"Daftar Objek" (Hot List)->"Lihat/Pilih dari
Daftar..." (View/Select from List...) dari menu panel kontrol teleskop
radio.  Saat daftar muncul, klik entri yang diinginkan untuk
menyorotnya.  Tekan "OK", dan teleskop akan bergerak ke objek itu.
(Perangkat lunak dapat dikonfigurasi agar hanya mengizinkan gerakan ke
objek yang berada di atas cakrawala instrumen dan dalam jangkauan
geraknya.)  Jika teleskop adalah instrumen transit meridian, fasilitas
"Daftar Objek" hanya akan menggerakkan teleskop dalam deklinasi.

Lihat juga:
    "Catatan tentang penggerakan teleskop"

**Tambahkan objek ke "Daftar Objek"**
Anda dapat menambahkan objek menarik ke Daftar Objek agar mudah
kembali ke objek itu nanti untuk pengamatan lanjutan.  Untuk
menambahkan objek, arahkan teleskop dengan tepat ke objek tersebut dan
akses penerima untuk memastikan bahwa Anda telah menemukan sebuah
pulsar.  Selanjutnya, pilih "Gerakkan" (Slew)->"Daftar Objek" (Hot
List)->"Tambahkan Objek Saat Ini ke Daftar..." (Add Current Item to
List...) dari menu panel kontrol teleskop radio.  Pada formulir yang
muncul, Anda dapat menambahkan komentar untuk membantu mengenali objek
itu atau alasan mengapa objek itu menarik.  (Anda juga dapat mengubah
identifikasi dan posisi untuk menambahkan objek yang saat ini tidak
berada di medan teleskop.)  Setelah selesai mengisi entri, tekan "OK"
untuk menambahkannya ke daftar.  (Jika Anda tidak sengaja membuat
entri yang salah, lihat topik bantuan "Menghapus objek dari "Daftar
Objek".)

**Hapus objek dari "Daftar Objek"**
Untuk menghapus entri dari Daftar Objek, pilih "Gerakkan" (Slew)->
"Daftar Objek" (Hot List)->"Lihat/Pilih dari Daftar..." (View/Select
from List...) dari menu panel kontrol teleskop radio.  Saat daftar
muncul, klik entri yang diinginkan untuk menyorotnya, lalu tekan tombol
"Hapus" (Delete).  Anda akan diminta mengonfirmasi penghapusan sebelum
entri dihapus dari daftar.  Setelah selesai, Anda dapat menekan
"Batal" (Cancel) untuk menutup Daftar Objek jika tidak ingin
menggerakkan teleskop ke objek lain yang tersisa di Daftar Objek.

**Atur tanggal dan waktu pengamatan**
Untuk mengatur tanggal dan waktu "saat ini" bagi teleskop, tutup panel
kontrol teleskop radio, lalu pilih "File"->"Atur Tanggal/Waktu
Pengamatan, ID..." (Set Observation Date/Time, ID...) dari menu panel
kontrol observatorium.

Topik terkait:
    "Atur tanggal & waktu" (Set Date & Time) di menu "Bantuan" (Help)
    pada panel kontrol observatorium.

**Analisis data pulsar**
Untuk menganalisis data pulsar yang telah Anda ambil dan catat, pilih
"Alat" (Tools)->"Alat Analisis Pulsar Radio" (Radio Pulsar Analysis
Tool) dari menu panel kontrol observatorium.

Topik terkait:
    Terima sinyal
    Catat sinyal
    Ukur sinyal yang diterima
    Topik "Bantuan" pada menu alat analisis pulsar.

**Tutup panel kontrol teleskop radio**
Untuk menutup panel kontrol teleskop radio, pilih "File"->"Keluar"
(Exit) dari menu, atau gunakan fitur standar Windows (Menu Sistem atau
kotak "X") untuk menutup jendela.  Anda akan diingatkan tentang data
yang belum disimpan dan diberi kesempatan menyimpannya sebelum
teleskop ditutup.

**Akses penerima**
Untuk mengakses penerima utama ("master"), tekan tombol "Penerima"
(Receiver) di panel kontrol teleskop radio.  Setelah jendela penerima
utama muncul, hingga dua saluran tambahan atau penerima sekunder
("slave") dapat diakses dengan menekan tombol "Tambah Saluran" (Add
Channel) di panel penerima utama.

**Kontrol penerima**
Kontrol berikut dipakai untuk mengoperasikan penerima.  Perhatikan
bahwa sebagian kontrol hanya berada di penerima utama ("master").
Saat menerima, kontrol Detik Horizontal (Horizontal Seconds), Tambah
Saluran (Add Channel) dan Catat (Record) dinonaktifkan.  Saat
mencatat, semua kontrol kecuali Mode Penerima (Receiver Mode),
Sejajarkan Penerima (Align Receivers) dan Volume dinonaktifkan.

    Frekuensi Penerima (Receiver Frequency) - Kontrol ini mengatur
    frekuensi penerima.  Setiap klik pada tombol panah yang sesuai
    menaikkan atau menurunkan frekuensi sebesar nilai (MHz) yang
    ditentukan oleh kontrol Kenaikan Frekuensi.  Frekuensi dapat diatur
    ke nilai antara 400.00 dan 1400.00 MHz.  Kontrol Frekuensi Penerima
    ada di semua penerima, dan dinonaktifkan saat pencatatan.

    Kenaikan Frekuensi (Frequency Increment) - Kontrol ini mengatur
    kenaikan untuk kontrol Frekuensi Penerima.  Kenaikan dapat diubah
    antara 0.01 dan 100 MHz dengan kelipatan sepuluh.  Kontrol
    Frekuensi Penerima ada di semua penerima, dan dinonaktifkan saat
    pencatatan.

    Gain Vertikal (Vertical Gain) - Kontrol ini mengatur penguatan yang
    diterapkan penerima pada sinyal.  Ini memengaruhi "tinggi" sinyal
    pada tampilan sekaligus kekuatan sinyal yang dicatat.  Gain
    vertikal dapat diubah antara 0.125 dan 8.0 (satuan sembarang)
    dengan kelipatan dua.  Kontrol Gain Vertikal ada di semua penerima,
    dan dinonaktifkan saat pencatatan.

    Detik Horizontal (Horizontal Seconds) - Kontrol ini mengatur skala
    waktu sinyal yang diterima.  Selain menentukan skala horizontal
    tampilan dan sinyal yang dicatat, kontrol ini mengubah "konstanta
    waktu" atau waktu integrasi efektif penerima.  Jadi, mengatur detik
    horizontal ke nilai yang lebih tinggi akan membantu mendeteksi
    sinyal lemah dengan menaikkan rasio sinyal-derau, sedangkan nilai
    yang lebih rendah membuat bentuk denyut terlihat dan memungkinkan
    pengukuran posisi denyut yang lebih akurat.  Detik horizontal dapat
    diubah antara 0.5 dan 16.0 dengan kelipatan dua.  Pengaturan ini
    memengaruhi semua penerima yang terbuka, sehingga kontrolnya hanya
    ada di penerima utama (meskipun pembacaannya muncul di semua
    penerima).  Kontrol Detik Horizontal dinonaktifkan selama
    penerimaan maupun pencatatan.

    Tambah Saluran (Add Channel) - Menekan tombol ini membuka penerima
    sekunder atau penerima "slave".  Frekuensi dan gain
    vertikal penerima sekunder dapat diatur secara terpisah, sedangkan
    semua parameter dan kontrol lainnya ditentukan oleh penerima
    utama.  Paling banyak dua penerima sekunder yang dapat ditambahkan.
    Kontrol "Tambah Saluran" dinonaktifkan selama penerimaan maupun
    pencatatan.  Penerima sekunder dapat ditutup tanpa menutup penerima
    utama, tetapi ada beberapa pembatasan - lihat topik bantuan
    "Tutup penerima".

    Sejajarkan Penerima (Align Receivers) - Tombol ini mengaktifkan
    ("ya") dan menonaktifkan ("tidak") penjajaran penerima.  Bila
    penjajaran nonaktif, semua penerima yang terbuka dapat dipindahkan
    dan diposisikan secara terpisah di mana saja pada layar.  Bila
    penjajaran aktif, penerima menempatkan diri dalam susunan di bawah
    penerima utama dan "mengikuti" penerima utama setiap kali
    dipindahkan.  Penerima sekunder tidak dapat dipindahkan secara
    terpisah saat penjajaran aktif.  Kontrol ini selalu aktif.

    Mode Penerima (Receiver Mode) - Tombol ini dipakai untuk memulai
    dan menghentikan penerima.  Saat mode diatur ke "Terima" (Receive),
    semua penerima yang terbuka mulai menampilkan sinyal yang diterima.
    Pencatatan juga dimulai jika Sakelar Catat (Record Switch) "aktif",
    dan suara terdengar jika komputer dilengkapi dengan benar dan efek
    suara diaktifkan.  Untuk menghentikan penerimaan/pencatatan, tekan
    tombol Mode Penerima lagi untuk mengubah mode menjadi "Berhenti"
    (Stop).  Penerimaan/pencatatan/suara kemudian akan berhenti saat
    tampilan mencapai akhir panel yang sedang berjalan.
    (Lihat juga topik bantuan "Catat sinyal".)

    Sakelar Catat (Record Switch) - Tombol ini mengaktifkan dan
    menonaktifkan pencatatan sinyal.  Tombol ini hanya aktif saat mode
    penerima adalah "Berhenti" (lihat di atas).  Lihat topik bantuan
    "Catat sinyal" untuk informasi selengkapnya.

    Kontrol Volume (Volume Control) - Kontrol ini hanya muncul di
    penerima utama jika komputer dilengkapi dengan benar untuk
    pemutaran suara dan fitur suara perangkat lunak ini telah
    diaktifkan.  Gunakan kontrol ini untuk mengatur volume suara selama
    penerimaan/pencatatan.  Lihat topik bantuan "Suara" untuk informasi
    selengkapnya.

**Terima sinyal**
Untuk menerima sinyal pulsar, arahkan teleskop dengan tepat ke posisi
pulsar.  Pelacakan teleskop sebaiknya aktif.  (Jika Anda memakai
teleskop transit meridian, lihat catatan di bawah.)  Setelah teleskop
berhenti bergerak, akses penerima.  Untuk mulai menerima sinyal, tekan
tombol "Mode".  Untuk berhenti, tekan tombol "Mode" lagi; penerimaan
akan berhenti di akhir tampilan yang sedang berjalan.  Perhatikan bahwa
saat sinyal sedang diterima, Anda dapat mengubah frekuensi dan gain
vertikal secara terpisah untuk setiap penerima yang aktif.  Saat
penerimaan dihentikan, Anda juga dapat membuka saluran penerima baru,
menyesuaikan skala waktu (detik horizontal), dan mengaktifkan
pencatatan data.

Atur setiap penerima agar denyut terlihat jelas.  Jika sinyal
tenggelam dalam derau, menaikkan Detik Horizontal dapat membantu;
ini akan menaikkan rasio sinyal-derau.  Gunakan Gain Vertikal untuk
menyesuaikan tinggi denyut; denyut sebaiknya terlihat jelas tetapi
tidak mencapai atau terpotong oleh bagian atas tampilan.

CATATAN: Untuk teleskop transit meridian, Anda harus memilih waktu
pengamatan saat pulsar berada tepat di sebelah timur meridian
teleskop.  Posisikan deklinasi teleskop dengan tepat, lalu mulai
menerima.  Saat pulsar memasuki berkas teleskop, Anda akan mulai
menerima denyut.  Denyut akan menguat, lalu mulai melemah dan akhirnya
menghilang saat gerak Bumi membawa berkas teleskop melewati objek itu.
Semua pengamatan Anda, termasuk pencatatan sinyal, harus dilakukan
selama waktu singkat saat pulsar berada di dalam berkas.

Topik terkait:
    Kontrol teleskop radio
    Catatan tentang penggerakan teleskop
    Akses penerima
    Kontrol penerima

**Catat sinyal**
Untuk mencatat sinyal yang diterima dari pulsar, lakukan dahulu
langkah-langkah yang dijelaskan pada topik bantuan "Terima sinyal".
Setelah semua penerima diatur agar menghasilkan denyut yang jelas dan
mudah dikenali, hentikan penerimaan, tekan tombol "Catat" (Record)
untuk mengaktifkan pencatatan, lalu mulai menerima lagi.  Semua yang
Anda lihat di layar penerima akan dicatat, hingga maksimum 4 layar
penuh (2 hingga 64 detik, bergantung pada pengaturan Detik Horizontal).
Untuk menghentikan pencatatan, tekan tombol Mode untuk menghentikan
penerimaan (tetapi yang tercatat tidak akan pernah lebih dari empat
layar pertama).

Sinyal yang dicatat dapat diukur dengan alat analisis pulsar radio,
dan/atau disimpan untuk dianalisis nanti.

Topik terkait:
    Simpan sinyal yang diterima
    Analisis data pulsar

**Suara**
Jika komputer Anda dilengkapi dengan benar dan fitur suara perangkat
lunak diaktifkan, Anda akan mendengar suara denyut dan derau latar saat
sinyal diterima.  Anda dapat mengatur volume suara dengan kontrol
volume di penerima utama.  Suara akan mencerminkan dengan akurat
periode dan kekuatan sinyal pulsar yang diamati.

Pada umumnya suara akan disinkronkan dengan tampilan di penerima
utama.  Namun, karena suara dan video pada PC dikendalikan oleh
subsistem yang sepenuhnya terpisah dan independen, suara dan video
dapat menjadi tidak "sinkron".  Hal ini mungkin hanya terasa pada
pulsar dengan periode lebih panjang dari sekitar 1/2 detik.
Menghentikan dan memulai ulang penerima dapat menyinkronkan kembali
suara dan video.

**Ukur sinyal yang diterima**
Sinyal yang diterima dapat diukur langsung pada layar penerima setelah
penerimaan berhenti.  Tekan dan seret dengan tombol kiri mouse untuk
membuat dan memindahkan kursor vertikal di setiap layar penerima.
Posisi kursor, dalam detik dari tepi kiri tampilan, muncul di kiri atas
setiap layar.  Jika Anda menekan dan menyeret dengan tombol kanan
mouse, Anda akan membuat dan memindahkan satu kursor "acuan" yang
muncul di posisi yang sama pada semua layar penerima yang terbuka.
Pembacaannya muncul di kanan atas semua layar.

Dengan cara ini Anda hanya dapat mengukur satu layar (rentang waktu)
data.  Untuk rentang waktu yang lebih panjang, pengukuran yang lebih
akurat (dengan perbesaran dan penggeseran), dan fitur pencatatan
pengukuran, catat data penerima dan gunakan alat analisis pulsar radio.

Topik terkait:
    Catat sinyal
    Simpan sinyal yang diterima
    Analisis data pulsar

**Simpan sinyal yang diterima**
Sinyal yang dicatat berada di memori (RAM).  Dalam keadaan ini sinyal
dapat diteruskan langsung ke alat analisis data, tetapi jika Anda tidak
berencana melakukannya segera, atau memerlukan catatan "permanen" untuk
alasan lain, simpan data ini ke sebuah file.  (Sinyal yang dicatat di
memori akan terhapus saat pencatatan berikutnya dimulai.)  Setelah
selesai mencatat sinyal, Anda diberi kesempatan untuk segera
menyimpannya, atau langsung beralih ke jendela analisis data.  Jika
Anda tidak menyimpan pada saat itu, Anda dapat menyimpan nanti dengan
memilih "File"->"Simpan Data Tercatat..." (Save Recorded Data...) dari
menu kontrol teleskop radio, atau "File"->"Simpan..." (Save...) dari
menu alat analisis data.

Saat Anda memilih untuk menyimpan file, sebuah formulir muncul untuk
memasukkan atau memilih nama file yang disimpan.  Anda dapat memakai
nama apa pun; program akan menyarankan nama yang dibuat dari informasi
login Anda.  Selalu gunakan ekstensi ".PLR" pada file ini untuk
menghindari kesulitan dan kebingungan di kemudian hari.

**Tutup penerima**
Jendela penerima ditutup lewat Menu Sistem (klik kotak kecil di sudut
kiri atas jendela penerima, lalu pilih "Tutup" (Close)) atau kotak "X"
di sudut kanan atas jendela.  Menutup jendela penerima utama akan
menutup semua jendela penerima yang terbuka.  Penerima sekunder dapat
ditutup satu per satu, tetapi harus ditutup dalam urutan terbalik dari
pembuatannya (yakni, tutup penerima yang dibuat paling akhir lebih
dahulu).
`;
