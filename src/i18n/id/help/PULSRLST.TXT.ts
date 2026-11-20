// Front ID-HELP [W]: OpenVireo's Indonesian (id) web adaptation of VIREO's PULSRLST.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Indonesian chunk.
export const language='id';
export const sourceName='PULSRLST.TXT';
export const sourceSha256='51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8';
export const text=`**Temukan pulsar di daftar**
Nama pulsar B1950 maupun J2000 disimpan dalam daftar (pulsar yang
ditemukan belakangan mungkin tidak memiliki nama B1950).  Untuk
menemukan pulsar berdasarkan nama:

    o  Pilih "File"->"Temukan Pulsar..." (Find Pulsar...) dari menu
       "Parameter Pulsar" (Pulsar Parameters).
    o  Masukkan nama pulsar di kotak.
    o  Pilih jenis nama.
    o  Tekan "OK".

Anda dapat memakai nama sebagian, selama dimulai dari awal nama.
(Contoh: cari "045", lalu pakai tombol "Berikutnya" (Next) dan
"Sebelumnya" (Prev) untuk menemukan pulsar yang Anda inginkan.)  Karena
nama pulsar dibuat dari posisinya, Anda dapat memakai teknik ini untuk
menemukan pulsar yang asensio rektanya Anda ketahui.  Semua pencarian
dimulai dari awal daftar, bukan dari entri saat ini.

**Ubah tanggal - hitung periode**
Periode saat ini diperoleh dari tanggal pengamatan saat ini, parameter
PDot, dan parameter PEpoch.  Untuk menghitung periode pada tanggal
yang berbeda:

    o  Edit nilai tanggal Julian di kolom berlabel "Tanggal (MJD)"
       (Date (MJD)).
    o  Tekan tombol "Perbarui" (Update) untuk menghitung ulang periode.
    o  Untuk kembali ke tanggal pengamatan saat ini, tekan "Atur Ulang"
       (Reset).

Sebagai alternatif, Anda dapat mengubah tanggal pengamatan saat ini
dalam format tanggal biasa.  Caranya:

    o  Pilih "File"->"Tanggal/Waktu..." (Date/Time...) dari menu Panel
       Kontrol Teleskop.  (Anda tidak perlu menutup tampilan Parameter
       Pulsar untuk melakukannya.  Cukup pindahkan ke samping atau
       minimalkan.)
    o  Masukkan tanggal/waktu yang diinginkan di kotak yang sesuai.
    o  Tekan "OK".
    o  Kembali ke tampilan Parameter Pulsar.  Sebaiknya tekan "Atur
       Ulang" agar tanggal baru dipakai.  (Ini seharusnya terjadi
       otomatis saat tampilan diakses kembali.)

**Ubah kerapatan elektron - hitung jarak**
Jarak turunan dihitung dari parameter Dispersi (Dispersion) dan
Kerapatan Elektron (Electron Density).  Untuk melihat pengaruh
perubahan Kerapatan Elektron pada jarak yang dihitung:

    o  Edit nilai Kerapatan Elektron di kolom berlabel.
    o  Tekan tombol "Perbarui" (Update) untuk menghitung ulang jarak.

**Kembali ke nilai saat ini**
Tombol "Atur Ulang" (Reset) mengembalikan tampilan ke tanggal/waktu
pengamatan saat ini dan kerapatan elektron bawaan 0.03.  Karena jam
selalu berjalan, JD akan selalu berubah sedikit saat Anda melakukannya,
tetapi nilai PDot begitu kecil sehingga hal ini biasanya tidak
menimbulkan perubahan yang berarti pada periode.

**Pilih pulsar untuk dipelajari**
Saat memilih pulsar untuk diamati pelajar, instruktur sebaiknya
memilih objek dari daftar yang memiliki rapat fluks tercatat pada
ketiga frekuensi (400, 600 dan 1400 MHz).  Perlu diketahui juga bahwa
sulit mendeteksi denyut dengan instrumen dan faktor gain bawaan jika
rapat fluks kurang dari 10.0.  Untuk bekerja dengan pulsar yang lebih
redup, naikkan Apertur Teleskop (Telescope Aperture) dan/atau Faktor
Gain Dasar (Base Gain Factor) di Opsi (Options).
`;
