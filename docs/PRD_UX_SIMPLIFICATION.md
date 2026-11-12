# PRD — Penyederhanaan Navigasi, Bahasa, dan Onboarding

## 1. Status Dokumen

- Status: Poin 3.1, 3.2, dan 3.3 sudah diimplementasikan; menunggu verifikasi penerimaan menyeluruh
- Sumber: `Review_UX_Rancaka.docx`, bagian 3.1, 3.2, 3.3, 6, dan 7
- Versi aplikasi yang direview: v1.2.1
- Tanggal review sumber: 28 Oktober 2026
- Tanggal pencatatan PRD: 12 November 2026
- Prioritas: Tinggi

## 2. Ringkasan

PRD ini mendokumentasikan penyederhanaan pengalaman pengguna Rancaka untuk pemilik warung, kasir, dan pelaku UMKM. Implementasi berurutan mencakup tiga temuan prioritas tinggi dari review UX:

1. **Poin 3.1 — Sidebar terlalu panjang dan membingungkan**: navigasi tenant diringkas menjadi enam menu utama dengan submenu kontekstual.
2. **Poin 3.2 — Istilah teknis dan bahasa Inggris**: istilah yang terlihat oleh pengguna diganti dengan bahasa Indonesia yang lebih sehari-hari dan konsisten.
3. **Poin 3.3 — Tidak ada panduan untuk pengguna baru**: dashboard baru menampilkan checklist, empty state, data contoh, dan tur interaktif hingga transaksi pertama selesai.

Perubahan ini tidak mengubah perhitungan bisnis, data transaksi, hak akses, maupun URL utama fitur. Fokusnya adalah arsitektur informasi, penamaan, dan kemudahan menemukan fitur.

## 3. Latar Belakang

Sebelum perubahan, sidebar tenant memiliki sekitar 25 menu dalam tujuh kelompok. Beberapa nama tampil lebih dari sekali, misalnya **Pembelian**, sementara fitur yang berkaitan tersebar di kelompok berbeda. Pengguna juga harus memahami istilah seperti HPP, Stock Opname, Shift, Role, Supplier, dan Billing sebelum dapat menjalankan pekerjaan sehari-hari.

Kondisi tersebut membuat aplikasi terasa seperti perangkat lunak akuntansi atau gudang, bukan aplikasi kasir yang mudah dipahami orang awam. Navigasi dan bahasa perlu mengikuti cara pengguna memikirkan pekerjaan: jualan, mengelola produk, belanja, melihat laporan, dan mengatur toko.

## 4. Tujuan

- Mengurangi beban visual sidebar menjadi enam menu utama.
- Mengelompokkan fitur berdasarkan pekerjaan pengguna, bukan struktur teknis sistem.
- Menghilangkan nama menu yang sama atau berpotensi membingungkan.
- Memindahkan menu akun dan informasi sistem ke menu profil.
- Menggunakan bahasa sehari-hari secara konsisten pada navigasi, judul, label, bantuan, validasi, dan laporan.
- Tetap menghormati role, permission, status jaringan cabang, dan ketersediaan route.
- Mempertahankan kompatibilitas data serta alur bisnis yang sudah berjalan.
- Membantu owner baru menyelesaikan transaksi pertama tanpa harus memahami seluruh fitur aplikasi.
- Menghindari kartu angka dan grafik kosong yang tidak memberi arahan.

## 5. Aktor

- **Owner tenant**: dapat mengakses seluruh menu tenant yang tersedia sesuai fitur toko.
- **Karyawan tenant**: hanya melihat menu dan submenu yang diizinkan oleh permission.
- **Superadmin**: tetap memakai navigasi administrasi pusat; istilah yang relevan diselaraskan tanpa mengikuti seluruh struktur tenant.

## 6. Ruang Lingkup

### 6.1 Poin 3.1 — Penyederhanaan Sidebar

Navigasi tenant menggunakan enam menu utama berikut:

| Menu utama | Submenu/konteks | Menggantikan atau mengelompokkan |
| --- | --- | --- |
| **Beranda** | Ringkasan dan perhatian utama | Dashboard |
| **Kasir** | Jualan, Riwayat transaksi, Penjualan bon (kredit), Sesi kasir | Kasir, Penjualan Kredit, Riwayat Transaksi, Riwayat Shift |
| **Produk & Stok** | Produk, Kategori, Stok, Bahan baku, Cek stok, Pindah stok | Produk, Kategori, Stok Produk, Stok Bahan Baku, Bahan Baku, Stock Opname, Transfer Stok |
| **Belanja & Biaya** | Belanja stok, Biaya operasional, Hutang ke pemasok, Pemasok | Pembelian, Pengeluaran, Hutang Supplier, Supplier |
| **Laporan** | Untung-rugi, Laporan belanja, Laporan penjualan | Keuangan dan Laporan Pembelian |
| **Pengaturan** | Info toko, Struk & pajak, Karyawan & akses, Cabang, Langganan | Pengaturan Toko, Karyawan, Role & Hak Akses, Jaringan Cabang, Billing |

Ketentuan navigasi:

- Sidebar hanya menampilkan enam menu tingkat atas untuk tenant.
- Fitur di dalam satu kelompok ditampilkan sebagai navigasi kontekstual pada area konten.
- Menu **Pengaturan** hanya tersedia bagi owner.
- Submenu karyawan disaring berdasarkan permission yang dimiliki.
- Menu **Cabang** hanya ditampilkan ketika fitur jaringan cabang tersedia.
- Jika karyawan hanya mempunyai akses ke salah satu jenis stok, tujuan menu **Stok** menyesuaikan akses tersebut.
- Penanda menu aktif harus mengikuti route dan konteks halaman; satu halaman tidak boleh menyorot menu yang tidak berkaitan.
- Pencarian menu tetap dapat menemukan submenu, bukan hanya enam menu utama.
- **Akun Saya** dan **Versi Aplikasi** dipindahkan ke menu profil di kanan atas bersama aksi **Keluar**.
- Nama laporan pembelian menjadi **Laporan Belanja** agar tidak sama dengan menu transaksi belanja stok.

### 6.2 Poin 3.2 — Bahasa Antarmuka yang Lebih Mudah

Istilah yang terlihat pengguna menggunakan padanan berikut:

| Istilah lama/teknis | Istilah antarmuka |
| --- | --- |
| HPP | Modal per item / Harga modal |
| Margin (%) | Keuntungan (%) |
| Laba Bersih | Untung bersih |
| Pendapatan | Uang masuk / Hasil jualan |
| Pengeluaran | Biaya / Biaya operasional / Uang keluar |
| Pembelian | Belanja stok |
| Supplier | Pemasok |
| Hutang Supplier | Hutang ke pemasok |
| Penjualan Kredit | Penjualan bon (kredit) |
| Stock Opname | Cek stok |
| Transfer Stok | Pindah stok |
| Shift | Sesi kasir |
| Buka Shift | Mulai sesi kasir |
| Modal Awal Kas | Uang di laci saat mulai |
| Master Data | Data toko / Produk & Stok, sesuai konteks |
| Role & Hak Akses | Akses karyawan |
| Billing | Langganan |
| Rekonsiliasi | Penyesuaian otomatis |
| Snapshot persediaan | Catatan stok saat ini |

Aturan penulisan:

- Gunakan satu istilah yang konsisten pada menu, breadcrumb, judul halaman, tombol, modal, notifikasi, empty state, dan pesan validasi.
- Hindari campuran bahasa Indonesia dan Inggris jika tersedia padanan yang mudah dipahami.
- Istilah internal pada kode, route, database, dan integrasi tidak wajib diubah selama tidak terlihat pengguna.
- Istilah yang tetap diperlukan untuk ketepatan laporan dapat disertai penjelasan satu kalimat dalam konteksnya.
- Penggantian istilah tidak boleh mengubah rumus, nilai, status, atau arti data historis.

### 6.3 Poin 3.3 — Panduan Pengguna Baru

Selama toko belum mempunyai transaksi selesai, owner pada lingkup tokonya sendiri melihat checklist **Mulai dalam 3 langkah**:

1. **Lengkapi info toko**: dinyatakan selesai jika nomor WhatsApp dan alamat telah diisi.
2. **Tambah produk pertama**: dinyatakan selesai jika toko memiliki minimal satu produk.
3. **Coba transaksi pertama**: dinyatakan selesai ketika minimal satu transaksi berstatus selesai tercatat.

Ketentuan onboarding:

- Checklist hanya tampil kepada owner dan tidak menggantikan pembatasan role atau permission.
- Kartu ringkasan, grafik, produk terlaris, dan komposisi pembayaran disembunyikan sebelum transaksi pertama.
- Area statistik kosong diganti ilustrasi, penjelasan singkat, tombol **Kelola produk**, dan tombol **Coba transaksi pertama**.
- Setelah transaksi pertama selesai, checklist dan empty state hilang otomatis; dashboard normal ditampilkan.
- Owner dapat membuka tur interaktif empat langkah yang menjelaskan info toko, produk, kasir, dan hasil dashboard.
- Tur otomatis tampil satu kali pada perangkat/browser dan dapat dibuka kembali dari checklist.

#### Data contoh

- Owner dapat mengisi lima produk contoh jika toko belum mempunyai produk dan belum mempunyai transaksi selesai.
- Sistem membuat satu kategori contoh, lima produk, stok awal, modal per item, harga jual, dan pilihan harga utama.
- Data contoh ditandai secara internal agar dapat dibedakan dari data buatan pengguna.
- Owner dapat menghapus seluruh data contoh dalam satu klik setelah konfirmasi.
- Penghapusan hanya menyentuh produk dan kategori bertanda contoh.
- Riwayat transaksi yang pernah memakai produk contoh tetap tersimpan menggunakan snapshot transaksi.
- Tombol dan penanda data contoh tetap tersedia setelah transaksi pertama selama data contoh belum dihapus.

## 7. Persyaratan Fungsional

1. Sistem menentukan menu tenant berdasarkan role dan permission pengguna.
2. Owner melihat enam menu utama beserta submenu yang tersedia untuk tokonya.
3. Karyawan tidak melihat submenu yang tidak diizinkan.
4. Navigasi kontekstual menandai submenu sesuai route dan hash halaman aktif.
5. Pencarian menu mengarahkan pengguna ke halaman atau bagian yang benar.
6. Menu profil tenant menyediakan akses ke **Akun Saya**, **Versi Aplikasi**, dan **Keluar**.
7. Seluruh halaman yang termasuk ruang lingkup menggunakan istilah antarmuka pada bagian 6.2.
8. Perubahan label tidak mengubah identifier internal atau kontrak backend yang sudah berjalan.
9. Sistem menghitung progres onboarding dari data aktual tanpa mengharuskan pengguna menandai langkah secara manual.
10. Sistem menolak pembuatan data contoh jika toko sudah mempunyai produk atau transaksi selesai.
11. Endpoint pembuatan dan penghapusan data contoh hanya dapat digunakan owner.

## 8. Persyaratan UI/UX dan Aksesibilitas

- Navigasi harus tetap dapat digunakan pada desktop dan mobile.
- Navigasi kontekstual yang melebihi lebar layar dapat digulir horizontal tanpa memotong tujuan menu.
- Menu aktif dibedakan bukan hanya dengan warna, tetapi tetap mempunyai kontras dan state yang jelas.
- Nama menu harus singkat, spesifik, dan dapat dipahami tanpa pengetahuan akuntansi atau pergudangan.
- Label ikon dan tombol penting harus tersedia bagi pembaca layar.
- Dark mode mengikuti token warna aplikasi yang berlaku.

## 9. Di Luar Ruang Lingkup Tahap Ini

- Penyederhanaan form tambah produk pada poin 3.4.
- Membuat sesi kasir opsional pada poin 3.5.
- Penyederhanaan dashboard, laporan, filter, dan form pada poin 3.6–3.7.
- Mode Sederhana/Lengkap dan aktivasi modul berdasarkan jenis usaha pada poin 3.9.
- Perubahan route, skema database, perhitungan transaksi, atau model permission.

## 10. Kriteria Penerimaan

Poin 3.1 dan 3.2 dianggap diterima jika:

- tenant melihat maksimal enam menu utama: Beranda, Kasir, Produk & Stok, Belanja & Biaya, Laporan, dan Pengaturan;
- fitur lama tetap dapat dijangkau melalui submenu atau navigasi kontekstual;
- menu Pengaturan tidak tampil untuk karyawan;
- karyawan hanya melihat tujuan yang sesuai permission;
- menu cabang mengikuti ketersediaan fitur jaringan;
- Akun Saya dan Versi Aplikasi tersedia melalui menu profil, bukan sidebar;
- tidak ada dua menu **Pembelian** dengan arti berbeda;
- halaman laporan memakai nama **Laporan Belanja**;
- istilah utama pada bagian 6.2 sudah konsisten pada halaman terkait;
- istilah teknis internal tidak bocor dalam pesan validasi atau notifikasi pengguna;
- menu aktif, pencarian menu, route ber-hash, tampilan mobile, dan dark mode berfungsi benar; dan
- seluruh alur utama tetap dapat digunakan tanpa perubahan hasil transaksi maupun hak akses.
- owner baru melihat checklist tiga langkah dan progres yang sesuai data aktual;
- statistik kosong tidak tampil sebelum transaksi pertama;
- tur interaktif dapat dibuka, dinavigasi, dan ditutup pada desktop maupun mobile;
- lima produk contoh hanya dapat dibuat pada toko yang masih kosong;
- data contoh dapat dihapus tanpa menghapus produk pengguna atau riwayat transaksi; dan
- dashboard normal tampil otomatis setelah transaksi pertama selesai.

## 11. Strategi Verifikasi

### Owner

- Buka setiap menu utama dan seluruh submenu.
- Pastikan menu profil memuat Akun Saya, Versi Aplikasi, dan Keluar.
- Pastikan navigasi kontekstual menandai tab yang benar.
- Verifikasi toko dengan dan tanpa jaringan cabang.

### Karyawan

- Uji akun dengan permission penuh dan terbatas.
- Pastikan submenu tanpa izin tidak tampil dan tidak dapat diakses langsung.
- Uji karyawan yang hanya mempunyai akses stok produk atau stok bahan baku.

### Bahasa dan konsistensi

- Cari istilah lama pada antarmuka tenant dan superadmin yang relevan.
- Uji judul, breadcrumb, tombol, modal, notifikasi, empty state, pesan error, laporan, dan hasil cetak.
- Pastikan perubahan nama tidak mengubah data atau hasil perhitungan.

### Responsif dan aksesibilitas

- Uji desktop, tablet, dan viewport mobile minimal 320 px.
- Uji navigasi keyboard, pembaca layar dasar, dark mode, dan scroll navigasi kontekstual.

### Onboarding

- Uji owner dengan info toko belum lengkap, tanpa produk, dan tanpa transaksi.
- Uji perubahan progres setelah info toko dilengkapi dan produk ditambahkan.
- Uji pembuatan data contoh dua kali serta penolakan saat produk sudah tersedia.
- Uji penghapusan data contoh sebelum dan setelah produk contoh dipakai bertransaksi.
- Uji bahwa karyawan tidak dapat membuat atau menghapus data contoh.
- Uji bahwa statistik muncul setelah transaksi pertama selesai.

## 12. Klasifikasi Rilis

Klasifikasi perubahan: `MINOR`.

Alasan: selain menyederhanakan navigasi dan bahasa, perubahan menambahkan kemampuan onboarding, tur interaktif, serta pengelolaan data contoh baru yang tetap kompatibel dengan fitur lama.

Usulan item release note:

- **Peningkatan — Navigasi tenant:** Menu aplikasi kini diringkas menjadi enam kelompok utama agar fitur jualan, stok, belanja, laporan, dan pengaturan lebih mudah ditemukan.
- **Peningkatan — Bahasa antarmuka:** Istilah teknis seperti HPP, Stock Opname, Shift, Supplier, dan Billing kini menggunakan bahasa yang lebih mudah dipahami.
- **Baru — Panduan toko baru:** Owner mendapat checklist tiga langkah, tur singkat, serta pilihan produk contoh agar dapat mencoba transaksi pertama dengan lebih cepat.

Proses versi dan publikasi mengikuti `docs/PRD_SYSTEM_UPDATES_AND_RELEASE_NOTES.md`.

## 13. Status Implementasi

| Area | Status | Catatan |
| --- | --- | --- |
| Poin 3.1 — Enam menu utama | Selesai diimplementasikan | Struktur tenant menggunakan menu utama dan submenu kontekstual |
| Poin 3.1 — Menu profil | Selesai diimplementasikan | Akun Saya dan Versi Aplikasi dipindahkan dari sidebar |
| Poin 3.1 — Permission dan fitur cabang | Selesai diimplementasikan | Navigasi disaring berdasarkan role, permission, route, dan fitur jaringan |
| Poin 3.2 — Penggantian istilah | Selesai diimplementasikan | Label utama telah diselaraskan ke bahasa yang lebih mudah |
| Poin 3.3 — Checklist dan empty state | Selesai diimplementasikan | Statistik disembunyikan dan diganti arahan sampai transaksi pertama |
| Poin 3.3 — Data contoh | Selesai diimplementasikan | Lima produk contoh dapat dibuat dan dihapus oleh owner |
| Poin 3.3 — Tur interaktif | Selesai diimplementasikan | Panduan empat langkah tampil satu kali dan dapat dibuka kembali |
| Verifikasi penerimaan menyeluruh | Belum dicatat selesai | Perlu pengujian role, route, UI responsif, konsistensi istilah, dan regresi alur utama |
