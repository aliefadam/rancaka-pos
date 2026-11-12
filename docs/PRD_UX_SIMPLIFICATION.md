# PRD — Penyederhanaan Pengalaman Pengguna Tenant

## 1. Status Dokumen

- Status: Poin 3.1 sampai 3.7 dan poin 3.9 sudah diimplementasikan; verifikasi otomatis ruang lingkup selesai, verifikasi UI manual masih diperlukan
- Sumber: `Review_UX_Rancaka.docx`, bagian 3.1 sampai 3.7, 3.9, 6, dan 7
- Versi aplikasi yang direview: v1.2.1
- Tanggal review sumber: 28 Oktober 2026
- Tanggal pencatatan PRD: 12 November 2026
- Tanggal pembaruan implementasi: 13 November 2026
- Prioritas: Tinggi

## 2. Ringkasan

PRD ini mendokumentasikan penyederhanaan pengalaman pengguna Rancaka untuk pemilik warung, kasir, dan pelaku UMKM. Implementasi berurutan mencakup delapan temuan prioritas tinggi dari review UX:

1. **Poin 3.1 — Sidebar terlalu panjang dan membingungkan**: navigasi tenant diringkas menjadi enam menu utama dengan submenu kontekstual.
2. **Poin 3.2 — Istilah teknis dan bahasa Inggris**: istilah yang terlihat oleh pengguna diganti dengan bahasa Indonesia yang lebih sehari-hari dan konsisten.
3. **Poin 3.3 — Tidak ada panduan untuk pengguna baru**: dashboard baru menampilkan checklist, empty state, data contoh, dan tur interaktif hingga transaksi pertama selesai.
4. **Poin 3.4 — Form tambah produk terlalu padat**: form mengutamakan nama, kategori, harga jual, dan stok awal; konfigurasi lanjutan dapat dibuka saat diperlukan.
5. **Poin 3.5 — Sesi kasir menjadi penghalang transaksi**: pengguna dapat langsung berjualan tanpa sesi, sementara rekonsiliasi sesi tetap tersedia sebagai fitur opsional.
6. **Poin 3.6 — Beranda terlalu padat**: ringkasan dan hal yang perlu ditindaklanjuti diprioritaskan, sedangkan analisis penjualan rinci dibuka saat diperlukan.
7. **Poin 3.7 — Laporan dan filter terlalu padat**: pencarian serta periode utama diprioritaskan, sementara filter tambahan dikelompokkan dan dapat direset dengan jelas.
8. **Poin 3.9 — Kompleksitas tidak sesuai jenis usaha**: owner dapat memilih jenis usaha, Mode Sederhana atau Lengkap, serta modul tambahan yang tampil pada navigasi.

Perubahan ini tidak mengubah perhitungan bisnis, hak akses, maupun URL utama fitur. Poin 3.5 hanya membuat relasi sesi pada transaksi bersifat opsional agar transaksi tanpa sesi dapat disimpan; transaksi dalam sesi tetap memakai alur rekonsiliasi yang sama.

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
- Mempercepat penambahan produk pertama tanpa menghilangkan konfigurasi harga, stok, status, dan resep yang sudah tersedia.
- Memungkinkan pengguna langsung bertransaksi tanpa wajib menghitung uang awal atau membuka sesi kasir.
- Membuat Beranda mudah dipindai dengan memisahkan ringkasan harian dari rincian analisis.
- Membuat laporan lebih mudah digunakan dengan memisahkan filter utama dan filter tambahan.
- Menyesuaikan kepadatan navigasi dengan jenis usaha tanpa menghapus fitur, data, route, atau permission.

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

### 6.4 Poin 3.4 — Penyederhanaan Form Tambah Produk

Form produk menggunakan pengungkapan bertahap agar pengguna baru tidak harus memahami seluruh konfigurasi sekaligus.

Data utama yang langsung ditampilkan:

1. **Nama produk**.
2. **Kategori**.
3. **Harga jual**.
4. **Stok awal**.

Ketentuan form:

- Form produk baru membuka bagian data utama terlebih dahulu.
- Modal per item, keuntungan, pilihan harga, status produk, dan resep bahan baku dikelompokkan dalam **Pengaturan tambahan**.
- Produk baru tetap mempunyai satu pilihan **Harga utama** yang mengikuti harga jual, walaupun pengaturan tambahan tidak dibuka.
- Nilai awal modal dan keuntungan adalah nol sehingga produk sederhana dapat langsung disimpan setelah data utama lengkap.
- Pengaturan tambahan otomatis terbuka saat mengedit produk yang memiliki modal, beberapa pilihan harga, resep, status khusus, atau tidak mencatat stok.
- Jika validasi gagal pada data lanjutan, bagian pengaturan tambahan otomatis dibuka agar pesan kesalahan terlihat.
- Stok awal dapat dikosongkan dan disimpan sebagai nol; pencatatan stok dapat dimatikan untuk produk jasa atau produk tanpa stok.
- Pilihan harga dan resep bahan baku tetap memakai aturan bisnis, permission, dan kontrak backend yang sudah berlaku.
- Tombol simpan menggunakan label tindakan yang jelas: **Simpan produk** atau **Simpan perubahan**.

### 6.5 Poin 3.5 — Sesi Kasir Opsional

Kasir dapat memproses dan menahan transaksi tanpa membuka sesi kasir. Fitur sesi tetap tersedia bagi toko yang memerlukan pencocokan uang tunai pada akhir waktu kerja.

Ketentuan sesi opsional:

- Halaman Kasir langsung menampilkan katalog dan keranjang saat tidak ada sesi aktif.
- Status **Berjualan tanpa sesi kasir** ditampilkan tanpa memblokir transaksi.
- Pengguna dapat membuka panel **Mulai sesi** dan mengisi uang di laci saat mulai kapan saja sebelum transaksi berikutnya.
- Transaksi selesai, transaksi ditahan, dan pembayaran awal penjualan bon yang dibuat tanpa sesi disimpan tanpa relasi sesi.
- Transaksi yang dibuat setelah sesi dimulai tetap tercatat pada sesi aktif dan masuk ke perhitungan penutupan kas seperti sebelumnya.
- Transaksi ditahan tetap dapat ditemukan, dilanjutkan, atau dihapus walaupun tidak ada sesi aktif.
- Draf keranjang tanpa sesi disimpan terpisah per toko dan tidak bercampur dengan draf sesi aktif.
- Riwayat sesi hanya menghitung transaksi dan pembayaran yang benar-benar terkait dengan sesi tersebut.
- Penutupan sesi, pencocokan kas, pembulatan kas, permission, stok, struk, dan laporan transaksi tetap mengikuti aturan yang sudah berlaku.

### 6.6 Poin 3.6 — Beranda Ringkas dan Bertahap

Beranda menampilkan informasi yang paling sering dibutuhkan lebih dahulu. Analisis yang lebih rinci tidak dihapus, tetapi dikelompokkan dalam bagian yang dapat dibuka pengguna.

Informasi utama yang langsung terlihat setelah toko mempunyai transaksi:

1. Periode dan cakupan toko yang sedang dilihat.
2. Tiga kartu ringkasan: hasil penjualan, untung bersih atau produk terjual sesuai permission, dan jumlah transaksi.
3. Status sesi aktif jika ada.
4. Daftar **Perlu perhatian** seperti stok menipis, piutang, transaksi ditahan, atau sesi lama yang belum ditutup.

Ketentuan rincian analisis:

- Tren penjualan, produk terlaris, dan komposisi pembayaran dikelompokkan sebagai rincian penjualan.
- Rincian dalam keadaan tertutup saat Beranda pertama dibuka agar layar awal tetap ringkas.
- Tombol **Lihat rincian** membuka seluruh analisis dan berubah menjadi **Sembunyikan rincian** ketika terbuka.
- Kontrol rincian menyampaikan state terbuka/tutup kepada pembaca layar.
- Filter periode tetap memengaruhi kartu ringkasan dan seluruh rincian analisis.
- Bagian **Perlu perhatian** tetap terlihat walaupun rincian analisis ditutup.
- Pengguna tanpa permission laporan keuangan tidak menerima atau melihat nilai untung bersih.
- Istilah **Beranda** digunakan pada judul halaman; identifier internal dan route dashboard tidak perlu diubah.

### 6.7 Poin 3.7 — Laporan dan Filter Bertahap

Form filter laporan memprioritaskan kontrol yang paling sering digunakan dan menyembunyikan pilihan tambahan sampai pengguna membutuhkannya.

Ketentuan laporan dan filter:

- Riwayat transaksi langsung menampilkan pencarian; rentang tanggal, status, dan metode pembayaran berada dalam **Filter lainnya**.
- Riwayat sesi kasir langsung menampilkan pencarian nama kasir; tanggal dan status berada dalam **Filter lainnya**.
- Laporan Belanja langsung menampilkan periode; pemasok, jenis barang, dan pencarian barang berada dalam **Filter lainnya**.
- Filter tambahan otomatis terbuka saat halaman dimuat dengan filter tambahan aktif.
- Tombol filter menampilkan jumlah filter tambahan yang sedang aktif.
- Aksi **Hapus filter** mengosongkan filter tambahan tanpa mengubah permission atau cakupan toko.
- Filter riwayat transaksi dan sesi tetap diterapkan otomatis setelah jeda singkat; filter Laporan Belanja diterapkan melalui tombol **Terapkan** agar beberapa pilihan dapat disiapkan sekaligus.
- Judul **Laporan Untung-Rugi** menggantikan Laporan Keuangan pada antarmuka tanpa mengubah route atau rumus.
- Total modal barang yang telah terjual diberi label **Modal barang terjual**, bukan Modal per item.
- Pada riwayat sesi, **Modal Awal** menjadi **Uang Awal di Laci** dan **Modal Akhir Sistem** menjadi **Kas Seharusnya**.

### 6.9 Poin 3.9 — Mode Sederhana/Lengkap dan Modul Usaha

Owner dapat mengatur tampilan aplikasi dari halaman Pengaturan Toko agar navigasi sesuai dengan kebutuhan usahanya. Pengaturan ini hanya mengubah menu yang ditampilkan dan bukan lapisan otorisasi baru.

Pilihan jenis usaha:

- **Toko / retail**: menyarankan stok lanjutan, belanja, biaya, penjualan bon, dan laporan.
- **Makanan & minuman**: menyarankan stok lanjutan, belanja, biaya, dan laporan.
- **Jasa**: menyarankan biaya, penjualan bon, dan laporan.
- **Usaha lainnya**: menyarankan biaya dan laporan.

Ketentuan mode tampilan:

- **Mode Lengkap** menampilkan seluruh modul yang tersedia dan menjadi nilai awal bagi toko lama.
- **Mode Sederhana** menampilkan fitur inti serta modul tambahan yang dipilih owner.
- Fitur inti meliputi Beranda, Jualan, Riwayat transaksi, Sesi kasir, Produk, Kategori, Stok dasar, Info toko, Struk & pajak, dan Langganan.
- Modul **Stok lanjutan** mencakup bahan baku, cek stok, dan pindah stok.
- Modul **Belanja & pemasok** mencakup belanja stok, hutang ke pemasok, pemasok, dan laporan belanja.
- Modul **Biaya operasional**, **Penjualan bon**, **Untung-rugi**, dan **Karyawan & akses** dapat diaktifkan secara terpisah.
- Mengganti jenis usaha pada Mode Sederhana menerapkan saran modul yang sesuai; owner tetap dapat mengubah pilihan sebelum menyimpan.
- Mengganti jenis usaha pada Mode Lengkap tidak menyembunyikan modul.
- Modul yang disembunyikan tetap menyimpan seluruh data dan tetap dapat diakses melalui URL langsung jika role serta permission pengguna mengizinkannya.
- Permission karyawan, fitur jaringan cabang, dan ketersediaan route tetap disaring seperti sebelumnya.

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
12. Form produk baru menampilkan data utama sebelum pengaturan tambahan.
13. Harga jual selalu diselaraskan dengan pilihan Harga utama tanpa membuat stok terpisah.
14. Form membuka pengaturan tambahan ketika terdapat konfigurasi lanjutan atau kesalahan validasi pada bagian tersebut.
15. Sistem menerima transaksi selesai maupun ditahan ketika tidak ada sesi aktif.
16. Sistem mengaitkan transaksi ke sesi aktif jika sesi tersedia dan menyimpan relasi sesi kosong jika tidak tersedia.
17. Sistem tetap menampilkan transaksi ditahan sesuai batasan akses kasir tanpa bergantung pada keberadaan sesi.
18. Beranda menampilkan maksimal tiga kartu ringkasan utama sesuai permission pengguna.
19. Pengguna dapat membuka dan menutup rincian analisis tanpa memuat ulang halaman.
20. Filter periode dan cakupan toko tetap diterapkan secara konsisten pada ringkasan dan rincian.
21. Form laporan mempertahankan filter aktif pada URL dan pagination seperti sebelumnya.
22. Pengguna dapat membuka, menutup, serta menghapus filter tambahan tanpa kehilangan pencarian utama atau cakupan toko.
23. Penggantian label laporan tidak mengubah perhitungan, ekspor, maupun data historis.
24. Sistem menyimpan jenis usaha, mode tampilan, dan daftar modul per tenant.
25. Mode Sederhana menyaring navigasi owner dan karyawan setelah pemeriksaan modul, role, permission, fitur cabang, dan route.
26. Mode Lengkap mengabaikan daftar modul dan menampilkan seluruh fitur yang diizinkan.
27. Preferensi tampilan tenant dibagikan ke frontend pada setiap respons Inertia tenant.
28. Penyembunyian modul tidak memblokir route langsung dan tidak menghapus data modul.

## 8. Persyaratan UI/UX dan Aksesibilitas

- Navigasi harus tetap dapat digunakan pada desktop dan mobile.
- Navigasi kontekstual yang melebihi lebar layar dapat digulir horizontal tanpa memotong tujuan menu.
- Menu aktif dibedakan bukan hanya dengan warna, tetapi tetap mempunyai kontras dan state yang jelas.
- Nama menu harus singkat, spesifik, dan dapat dipahami tanpa pengetahuan akuntansi atau pergudangan.
- Label ikon dan tombol penting harus tersedia bagi pembaca layar.
- Dark mode mengikuti token warna aplikasi yang berlaku.
- Kontrol **Pengaturan tambahan** menyediakan state terbuka/tutup bagi pembaca layar dan tetap mudah digunakan pada viewport mobile.
- Status sesi dan tombol **Mulai sesi** tidak boleh menutupi katalog, keranjang, maupun aksi pembayaran pada desktop dan mobile.
- Tombol rincian Beranda harus dapat digunakan dengan keyboard, mempunyai state `aria-expanded`, dan tidak menghilangkan bagian Perlu perhatian.
- Tombol Filter lainnya harus mempunyai state `aria-expanded`, badge filter aktif, serta tata letak yang tetap dapat digunakan pada viewport 320 px.
- Pilihan Mode Sederhana/Lengkap harus mempunyai state `aria-pressed`; pilihan modul harus dapat digunakan dengan keyboard dan menjelaskan cakupan setiap modul.

## 9. Di Luar Ruang Lingkup Tahap Ini

- Perubahan route, perhitungan transaksi, atau model permission lainnya.
- Penonaktifan fitur pada backend berdasarkan modul tampilan.

## 10. Kriteria Penerimaan

Poin 3.1, 3.2, dan 3.3 dianggap diterima jika:

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

Poin 3.4 dianggap diterima jika:

- produk sederhana dapat ditambahkan dengan mengisi nama, kategori, harga jual, dan stok awal tanpa membuka pengaturan tambahan;
- modal, keuntungan, pilihan harga, status, dan resep tetap dapat dikelola melalui pengaturan tambahan;
- harga utama mengikuti harga jual dan seluruh pilihan harga tetap memakai satu stok produk;
- form edit tidak menyembunyikan konfigurasi lanjutan yang sudah digunakan;
- kesalahan validasi lanjutan membuka bagian terkait dan tetap terlihat;
- label, urutan fokus, state terbuka/tutup, dan tata letak dapat digunakan pada desktop maupun mobile; dan
- penyederhanaan tidak mengubah hasil perhitungan, data produk lama, permission, maupun kontrak backend.

Poin 3.5 dianggap diterima jika:

- kasir dapat menyelesaikan transaksi tunai dan non-tunai tanpa sesi aktif;
- transaksi tanpa sesi mempunyai `shift_id` kosong dan tetap muncul pada riwayat serta laporan transaksi umum;
- transaksi saat sesi aktif tetap mempunyai `shift_id` dan masuk ke ringkasan serta rekonsiliasi sesi;
- pembayaran awal penjualan bon dapat dicatat tanpa sesi dan tidak masuk ke rekonsiliasi sesi mana pun;
- transaksi ditahan dapat dibuat dan dibuka kembali tanpa sesi aktif;
- memulai dan menutup sesi tetap berfungsi seperti sebelumnya; dan
- draf keranjang, stok, struk, diskon, pajak, hak akses, serta data historis tidak mengalami regresi.

Poin 3.6 dianggap diterima jika:

- layar awal Beranda hanya menonjolkan tiga kartu ringkasan dan bagian Perlu perhatian;
- tren, produk terlaris, serta komposisi pembayaran tersedia melalui tombol Lihat rincian;
- membuka atau menutup rincian tidak mengubah filter, cakupan toko, maupun hasil perhitungan;
- pengguna tanpa permission keuangan tidak melihat untung bersih;
- onboarding dan empty state tetap menggantikan statistik sebelum transaksi pertama;
- status sesi aktif dan aksi Buka Kasir tetap mudah ditemukan; dan
- kontrol rincian berfungsi pada keyboard, pembaca layar dasar, desktop, dan mobile.

Poin 3.7 dianggap diterima jika:

- pencarian atau periode utama terlihat tanpa membuka filter tambahan;
- filter tambahan dapat dibuka, ditutup, dihitung, diterapkan, dan dihapus dengan jelas;
- halaman otomatis membuka filter tambahan ketika URL memuat filter aktif;
- hasil, ringkasan, pagination, cakupan cabang, ekspor, dan cetak tetap mengikuti filter yang diterapkan;
- Laporan Untung-Rugi serta istilah kas sesi menggunakan bahasa yang konsisten;
- pengguna dengan akses terbatas tetap menerima batasan data yang sama; dan
- form filter dapat digunakan dengan keyboard serta pada desktop dan mobile.

Poin 3.9 dianggap diterima jika:

- toko lama tetap menggunakan Mode Lengkap setelah migrasi;
- owner dapat menyimpan setiap jenis usaha serta Mode Sederhana atau Lengkap;
- preset jenis usaha mengisi saran modul tanpa mencegah perubahan manual;
- Mode Sederhana selalu mempertahankan fitur inti dan hanya menampilkan modul tambahan yang dipilih;
- Mode Lengkap menampilkan semua modul tanpa bergantung pada daftar modul tersimpan;
- karyawan tetap hanya melihat submenu yang diizinkan permission;
- URL langsung ke modul tersembunyi tetap mengikuti otorisasi lama dan tidak diblokir oleh preferensi tampilan;
- perubahan mode tidak menghapus atau mengubah data historis; dan
- kontrol mode serta modul dapat digunakan dengan keyboard pada desktop dan mobile.

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

### Form produk

- Tambahkan produk sederhana tanpa membuka Pengaturan tambahan.
- Uji produk tanpa stok, produk nonaktif, beberapa pilihan harga, dan resep bahan baku.
- Edit produk sederhana dan produk dengan konfigurasi lanjutan.
- Picu validasi pada data utama serta data lanjutan dan pastikan pesan kesalahan terlihat.
- Uji sinkronisasi harga jual dengan Harga utama dan pastikan pilihan harga tidak menggandakan stok.
- Uji keyboard, pembaca layar dasar, dan viewport mobile minimal 320 px.

### Sesi kasir opsional

- Selesaikan transaksi tunai, QRIS, online, dan bon tanpa sesi aktif.
- Buat, lanjutkan, dan hapus transaksi ditahan tanpa sesi aktif.
- Mulai sesi dari halaman Kasir, lakukan transaksi, lalu tutup dan cocokkan kas.
- Pastikan transaksi sebelum sesi tidak ikut ke ringkasan sesi yang dibuka setelahnya.
- Uji draf keranjang tanpa sesi dan draf sesi aktif pada toko yang sama.
- Verifikasi riwayat transaksi, laporan umum, riwayat sesi, stok, dan struk untuk kedua jenis transaksi.

### Beranda ringkas

- Uji Beranda owner dan karyawan dengan serta tanpa permission laporan keuangan.
- Uji tombol Lihat rincian/Sembunyikan rincian menggunakan mouse dan keyboard.
- Pastikan Perlu perhatian tetap terlihat ketika rincian tertutup.
- Ubah periode dan cakupan cabang, lalu bandingkan kartu ringkasan dengan rincian.
- Uji onboarding, empty state, status sesi, dan tampilan pada viewport minimal 320 px.

### Laporan dan filter

- Uji pencarian utama ketika Filter lainnya tertutup pada riwayat transaksi dan sesi.
- Terapkan setiap filter tambahan, muat ulang URL, dan pastikan panel terbuka serta badge sesuai.
- Hapus filter tambahan dan pastikan pencarian utama serta cakupan toko tidak berubah.
- Uji periode dan filter tambahan Laporan Belanja sebelum mencetak atau mengunduh data.
- Bandingkan nilai Laporan Untung-Rugi sebelum dan setelah perubahan label.
- Uji seluruh kontrol menggunakan keyboard dan viewport minimal 320 px.

### Mode tampilan dan modul usaha

- Uji migrasi pada toko lama dan pastikan Mode Lengkap menjadi nilai awal.
- Simpan setiap jenis usaha lalu bandingkan preset modul pada Mode Sederhana.
- Aktifkan dan nonaktifkan setiap modul, lalu verifikasi sidebar owner serta karyawan.
- Pastikan fitur inti tetap terlihat ketika tidak ada modul tambahan yang dipilih.
- Buka URL modul yang disembunyikan dan pastikan permission lama tetap berlaku.
- Kembali ke Mode Lengkap dan pastikan semua modul yang diizinkan tampil kembali tanpa kehilangan data.
- Uji pilihan mode, checkbox modul, keyboard, dan viewport minimal 320 px.

### Hasil verifikasi otomatis — 13 November 2026

- Production build Vite berhasil tanpa error kompilasi.
- 188 feature test yang relevan dengan aplikasi dan ruang lingkup PRD lulus dengan 2.106 assertion.
- Empat feature test preferensi antarmuka tenant lulus, mencakup shared prop Inertia, penyimpanan Mode Sederhana, perilaku Mode Lengkap, dan penolakan modul tidak dikenal.
- Migrasi fresh SQLite berhasil menjalankan migrasi sesi opsional dan preferensi antarmuka tenant.
- Satu browser test Playwright lulus untuk alur kirim dan terima stok antar-cabang tanpa error browser atau request aplikasi.
- Laravel Pint lulus pada seluruh file PHP yang berubah dalam implementasi ini.
- `git diff --check` bersih.
- Full suite saat ini belum dapat menjadi gerbang rilis tunggal: 18 test scaffold lama gagal karena route autentikasi/profil dan factory state yang tidak tersedia, serta satu test contoh tidak menjalankan migrasi. Kegagalan baseline tersebut tidak berada dalam ruang lingkup PRD ini.
- Pint penuh juga masih melaporkan format lama pada sembilan file di luar perubahan ini; file implementasi PRD sudah lulus pemeriksaan.
- Verifikasi manual desktop, tablet, viewport 320 px, pembaca layar dasar, dan dark mode tetap diperlukan sebelum penerimaan produksi final.

## 12. Klasifikasi Rilis

Klasifikasi perubahan: `MINOR`.

Alasan: selain menyederhanakan navigasi dan bahasa, perubahan menambahkan kemampuan onboarding, tur interaktif, pengelolaan data contoh, alur form produk bertahap, transaksi tanpa sesi kasir, Beranda bertahap, filter laporan ringkas, serta preferensi tampilan per tenant yang tetap kompatibel dengan fitur lama.

Usulan item release note:

- **Peningkatan — Navigasi tenant:** Menu aplikasi kini diringkas menjadi enam kelompok utama agar fitur jualan, stok, belanja, laporan, dan pengaturan lebih mudah ditemukan.
- **Peningkatan — Bahasa antarmuka:** Istilah teknis seperti HPP, Stock Opname, Shift, Supplier, dan Billing kini menggunakan bahasa yang lebih mudah dipahami.
- **Baru — Panduan toko baru:** Owner mendapat checklist tiga langkah, tur singkat, serta pilihan produk contoh agar dapat mencoba transaksi pertama dengan lebih cepat.
- **Peningkatan — Form produk:** Data penting kini tampil lebih dahulu, sementara pengaturan harga lanjutan, status, dan resep dapat dibuka saat diperlukan.
- **Peningkatan — Kasir lebih cepat:** Transaksi kini dapat langsung dilakukan tanpa membuka sesi kasir; sesi tetap tersedia untuk toko yang membutuhkan pencocokan uang kas.
- **Peningkatan — Beranda lebih ringkas:** Ringkasan dan hal yang perlu diperhatikan kini tampil lebih dahulu; tren serta analisis penjualan dapat dibuka saat dibutuhkan.
- **Peningkatan — Filter laporan:** Pencarian dan periode utama kini tampil lebih dahulu, sementara filter tambahan dapat dibuka, dihitung, dan dihapus saat diperlukan.
- **Baru — Mode tampilan usaha:** Owner dapat memakai Mode Sederhana dengan modul pilihan atau Mode Lengkap tanpa mengubah data dan hak akses fitur.

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
| Poin 3.4 — Form produk bertahap | Selesai diimplementasikan | Data utama diprioritaskan dan konfigurasi lanjutan dikelompokkan dalam Pengaturan tambahan |
| Poin 3.4 — Kompatibilitas konfigurasi | Selesai diimplementasikan | Pilihan harga, stok, status, resep, validasi, dan alur edit lama tetap tersedia |
| Poin 3.5 — Transaksi tanpa sesi | Selesai diimplementasikan | Transaksi selesai dan ditahan dapat disimpan dengan relasi sesi kosong |
| Poin 3.5 — Sesi dan rekonsiliasi | Selesai diimplementasikan | Sesi tetap dapat dimulai dan transaksi dalam sesi tetap mengikuti rekonsiliasi lama |
| Poin 3.6 — Ringkasan Beranda | Selesai diimplementasikan | Tiga metrik utama dan Perlu perhatian diprioritaskan pada layar awal |
| Poin 3.6 — Rincian analisis | Selesai diimplementasikan | Tren, produk terlaris, dan metode pembayaran dapat dibuka atau disembunyikan |
| Poin 3.7 — Filter laporan bertahap | Selesai diimplementasikan | Filter tambahan riwayat transaksi, sesi, dan belanja dikelompokkan serta dapat direset |
| Poin 3.7 — Bahasa laporan | Selesai diimplementasikan | Judul Untung-Rugi dan istilah kas sesi diselaraskan tanpa mengubah perhitungan |
| Poin 3.9 — Preferensi tenant | Selesai diimplementasikan | Jenis usaha, mode tampilan, dan modul pilihan disimpan per tenant; toko lama memakai Mode Lengkap |
| Poin 3.9 — Navigasi modular | Selesai diimplementasikan | Mode Sederhana menyaring modul tambahan tanpa mengubah route atau permission |
| Verifikasi otomatis ruang lingkup | Selesai | Build, 188 feature test/2.106 assertion, migrasi fresh, browser test, Pint file berubah, dan diff check lulus |
| Verifikasi penerimaan manual | Belum selesai | Perlu uji desktop, tablet, viewport 320 px, pembaca layar dasar, dark mode, serta pemeriksaan visual seluruh alur utama |
| Kesehatan baseline di luar PRD | Perlu tindak lanjut terpisah | Full suite masih memuat test scaffold autentikasi/profil yang tidak sesuai route aktif dan satu test tanpa migrasi |
