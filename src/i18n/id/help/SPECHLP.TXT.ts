// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's SPECHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='SPECHLP.TXT';
export const sourceSha256='e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79';
export const text=`**Atur rentang panjang gelombang**
Anda dapat mengubah rentang panjang gelombang yang dicatat oleh
spektrometer, dalam batas maksimum 3500 sampai 7400 angstrom.
(Instruktur Anda akan memberi tahu jika ada alasan untuk melakukannya.)
Untuk mengubah rentang panjang gelombang, pilih "File"->"Preferensi"
(Preferences)->"Rentang Spektrum" (Spectral Range) dari menu panel
kontrol spektrometer.  Gunakan penggeser untuk mengubah nilai minimum
dan/atau maksimum.  Tombol "Bawaan" (Default) mengembalikan nilai ke
rentang optimal untuk klasifikasi spektrum.  Perhatikan bahwa spektrum
yang sudah Anda ambil tetapi belum disimpan akan hilang saat Anda
mengubah rentang panjang gelombang.

**Mulai/lanjutkan penghitungan**
Tekan tombol integrasi "Mulai" (Go) pada spektrometer untuk memulai atau
melanjutkan integrasi spektrum.  Anda akan melihat spektrum mulai
membentuk pola yang dapat dikenali seiring cacah terkumpul di
masing-masing dari 500 saluran spektrometer.  (Tampilan selalu
dinormalisasi terhadap pembacaan tertinggi di saluran mana pun, sehingga
seiring waktu yang tampak berkurang adalah derau, bukan cacah yang
naik.)  Total cacah foton saat ini, waktu integrasi, cacah rata-rata per
saluran, dan rasio sinyal-derau ditampilkan di bawah grafik.
Identifikasi objek dan magnitudo semu juga ditampilkan pada sebagian
praktikum.

**Hentikan penghitungan**
Menekan tombol integrasi "Berhenti" (Stop) menjeda integrasi.  Tampilan
digambar ulang dengan garis yang menghubungkan pembacaan saluran yang
berdekatan agar lebih jelas.  Anda dapat berhenti dan melanjutkan
sebanyak yang Anda mau; integrasi selalu berlanjut dari titik
terakhirnya.  (Spektrum tidak akan "hilang" kecuali Anda menutup panel
kontrol spektrometer tanpa menyimpannya.)

**Cetak spektrum**
Untuk mencetak spektrum saat ini, pilih "File"->"Data"->"Cetak
Spektrum..." (Print Spectrum...) dari menu panel kontrol spektrometer.
Formulir opsi cetak standar Windows akan muncul.  (Instruktur Anda
mungkin memberikan informasi tambahan tentang cara mengatur dan
mengarahkan pencetakan.)  Spektrum dicetak sebagaimana tampil di layar,
beserta informasi header pengenal.

**Simpan spektrum untuk analisis**
Spektrum yang sudah Anda ambil tidak dapat diukur atau diklasifikasikan
kecuali jika disimpan.  Jika Anda merasa rasio sinyal-derau sudah cukup
tinggi untuk analisis yang akurat (lihat di bawah), hentikan
penghitungan lalu pilih "File"->"Data"->"Simpan Spektrum..." (Save
Spectrum...) dari menu panel kontrol spektrometer.  Nama file dibuat
dari nama/ID objek (ekstensi .CSP).  Anda akan diminta memverifikasi
nama file dan jalurnya.  (Pada umumnya, jangan ubah jalur kecuali
diminta.)  Jika file dengan nama itu sudah ada, Anda akan diperingatkan
sebelum file yang ada ditimpa.

Rasio sinyal-derau sekitar 100 disarankan untuk klasifikasi bintang yang
akurat, tetapi nilai yang lebih rendah mungkin cukup untuk beberapa tipe
spektrum.  Rasio sinyal-derau serendah 10 mungkin cukup untuk menentukan
kecepatan radial (Z) pada beberapa galaksi.  Jika Anda tidak yakin
spektrum yang sedang Anda ambil sudah memadai, dan Anda mungkin ingin
kembali ke panel kontrol spektrometer untuk melanjutkan integrasi,
gunakan teknik berikut:

    1)  Simpan spektrum.

    2)  JANGAN tutup panel kontrol spektrometer.  Jika mau, Anda dapat
        meminimalkan panel kontrol spektrometer lewat kotak "_" di pojok
        kanan atas, tetapi itu tidak wajib.

    3)  Pilih alat klasifikasi atau alat pengukur di bawah "Alat"
        (Tools) pada menu panel kontrol observatorium.  Muat file yang
        baru saja Anda simpan, lalu coba klasifikasikan atau ukur.

    4)  Jika spektrum terlalu berderau untuk analisis yang akurat, Anda
        dapat melanjutkan integrasi.  Kembali ke panel kontrol
        spektrometer dan tekan "Mulai".  Setelah selesai, Anda harus
        menyimpannya lagi (Anda dapat menimpa versi lama), lalu
        memuatnya kembali ke alat analisis.

Topik terkait:
    Tutup panel kontrol spektrometer
    Akses alat klasifikasi
    Akses alat pengukur spektrum

**Tutup panel kontrol spektrometer**
Untuk menutup panel kontrol spektrometer dan kembali ke panel kontrol
teleskop, pilih "File"->"Keluar dari Spektrometer" (Exit Spectrometer)
dari menu atau gunakan kotak "X" di pojok kanan atas.  Jika Anda menutup
spektrometer, Anda tidak dapat kembali dan melanjutkan integrasi
spektrum dari titik terakhirnya, meskipun Anda dapat mulai lagi dari
awal dengan bintang yang sama.  Jika spektrum Anda saat ini belum
disimpan, Anda akan diperingatkan dan diberi kesempatan untuk
menyimpannya sebelum panel kontrol spektrometer ditutup.

Topik terkait:
    Simpan spektrum untuk analisis

**Akses alat klasifikasi**
Untuk mengklasifikasikan spektrum, Anda harus membuka alat klasifikasi.
Pilih "Alat"->"Alat Klasifikasi Spektrum" (Spectral Classification Tool)
dari menu panel kontrol observatorium, maka alat klasifikasi akan
muncul.  Anda tidak perlu membuka atau menutup panel kontrol teleskop
sebelum membuka alat klasifikasi.

Topik terkait:
    Simpan spektrum untuk analisis
    Topik di bawah "Bantuan" pada menu alat klasifikasi.

**Akses alat pengukur spektrum**
Untuk mengukur posisi garis spektrum guna menentukan kecepatan radial
(Z), Anda harus membuka alat pengukur spektrum.  Pilih "Alat"->"Alat
Pengukur Spektrum" (Spectrum Measuring Tool) dari menu panel kontrol
observatorium, maka alat pengukur akan muncul.  Anda tidak perlu membuka
atau menutup panel kontrol teleskop sebelum membuka alat pengukur
spektrum.

Topik terkait:
    Simpan spektrum untuk analisis
    Topik di bawah "Bantuan" pada menu alat pengukur spektrum.
`;
