# PRD — Pembaruan Sistem, Versi Aplikasi, dan Release Notes

## 1. Ringkasan

Rancaka memerlukan satu sumber informasi resmi untuk setiap pembaruan sistem. Saat versi baru dirilis, superadmin, pemilik tenant, dan pengguna tenant harus dapat mengetahui bahwa sistem telah berubah, memahami dampaknya, serta melihat kembali riwayat perubahan kapan saja.

Sistem yang dirancang dalam PRD ini memperluas mekanisme versi `MAJOR.MINOR.PATCH` yang sudah tersedia. Nomor versi tetap disimpan dalam file `VERSION`, sedangkan informasi rilis dan status baca pengguna disimpan dalam basis data.

PRD ini juga menjadi acuan wajib untuk perubahan berikutnya. Setiap perubahan aplikasi harus:

1. diklasifikasikan sebagai `major`, `minor`, `patch`, atau `no-release`;
2. memiliki catatan perubahan yang mudah dipahami pengguna apabila berdampak pada pengguna;
3. dimasukkan ke rilis yang sesuai sebelum diterapkan ke produksi; dan
4. merujuk ke PRD ini dalam dokumen fitur, pull request, atau catatan implementasinya.

## 2. Latar Belakang

Kondisi sistem saat ini:

- versi aplikasi tersimpan di file `VERSION`;
- format versi mengikuti Semantic Versioning;
- perintah `php artisan app:version` sudah dapat membaca dan menaikkan versi;
- versi aktif ditampilkan di sidebar dan halaman **Versi Aplikasi**; dan
- belum tersedia daftar perubahan per versi, pemberitahuan rilis baru, maupun status sudah dibaca per pengguna.

Akibatnya, admin dan tenant dapat melihat nomor versi tetapi tidak mengetahui apa yang berubah. Informasi pembaruan juga berisiko tersebar di percakapan atau dokumen fitur yang berbeda.

## 3. Tujuan

- Menjadikan halaman **Versi Aplikasi** sebagai pusat informasi pembaruan Rancaka.
- Memberi tahu admin dan tenant ketika ada rilis baru yang relevan bagi mereka.
- Menyediakan release notes yang ringkas, konsisten, dan dapat ditelusuri.
- Memastikan nomor versi, isi rilis, dan kode yang diterapkan tetap sinkron.
- Menetapkan proses klasifikasi versi untuk seluruh perubahan berikutnya.
- Mencegah informasi teknis atau sensitif tampil kepada pengguna yang tidak berwenang.

## 4. Di Luar Ruang Lingkup

- Tenant tidak melakukan instalasi atau pembaruan aplikasi secara manual.
- Sistem ini tidak menggantikan proses deployment, backup, rollback, atau CI/CD.
- Sistem ini tidak menampilkan commit, stack trace, nama tabel, kerentanan yang belum diperbaiki, atau detail internal lainnya kepada pengguna.
- Rilis tidak dibuat otomatis untuk setiap commit. Beberapa perubahan boleh dikelompokkan dalam satu versi yang sama sebelum deployment.

## 5. Istilah dan Aktor

### 5.1 Istilah

- **Versi aktif**: nomor versi yang terdapat di file `VERSION` dan sedang berjalan di produksi.
- **Rilis**: satu versi aplikasi beserta judul, ringkasan, daftar perubahan, waktu terbit, dan target pembaca.
- **Release note**: penjelasan perubahan yang berorientasi pada manfaat atau dampak bagi pengguna.
- **Belum dibaca**: rilis terbit yang relevan bagi pengguna dan belum ditandai dibaca oleh pengguna tersebut.
- **No-release**: perubahan internal yang tidak memerlukan kenaikan versi tersendiri maupun pemberitahuan pengguna.

### 5.2 Aktor

- **Superadmin**: mengelola draft, menerbitkan rilis, dan melihat status publikasi.
- **Owner/admin tenant**: menerima pembaruan yang ditujukan kepada tenant dan dapat membuka riwayat rilis.
- **Karyawan tenant**: menerima pembaruan umum atau pembaruan sesuai izin/perannya.
- **Sistem**: mencocokkan versi aktif, menampilkan notifikasi, dan mencatat status baca.

## 6. Aturan Semantic Versioning

Nomor versi menggunakan format `MAJOR.MINOR.PATCH`, misalnya `1.4.2`.

| Level | Kapan digunakan | Contoh |
| --- | --- | --- |
| `MAJOR` | Perubahan besar yang tidak kompatibel, mengubah proses utama, kontrak integrasi, atau memerlukan tindakan/migrasi penting dari pengguna | Perombakan total alur transaksi yang tidak mempertahankan perilaku lama |
| `MINOR` | Fitur atau kemampuan baru yang tetap kompatibel dengan fitur lama | Menambahkan modul komisi referral atau metode pembayaran baru |
| `PATCH` | Perbaikan bug, keamanan, stabilitas, aksesibilitas, performa, atau penyempurnaan kecil tanpa kemampuan bisnis baru | Memperbaiki modal mobile yang sebelumnya tidak dapat di-scroll |
| `NO-RELEASE` | Perubahan internal tanpa dampak pengguna dan tidak layak menjadi rilis tersendiri | Refactor internal, komentar kode, atau penambahan test tanpa perubahan perilaku |

Ketentuan tambahan:

- Jika satu rilis memiliki beberapa perubahan dengan level berbeda, gunakan level tertinggi.
- Perbaikan keamanan menggunakan `PATCH` jika kompatibel; detail publik harus tetap aman.
- Perubahan skema basis data tidak otomatis menjadi `MAJOR`; level ditentukan dari dampak terhadap pengguna dan kompatibilitas.
- Nomor versi dinaikkan satu kali untuk satu paket deployment, bukan satu kali per commit.
- Nomor versi yang telah dipublikasikan tidak boleh digunakan kembali.

## 7. Kategori Catatan Perubahan

Setiap item release note menggunakan salah satu kategori berikut:

- **Baru**: kemampuan baru bagi pengguna.
- **Peningkatan**: penyempurnaan fitur atau pengalaman yang sudah ada.
- **Perbaikan**: bug atau perilaku yang tidak sesuai telah diperbaiki.
- **Keamanan**: peningkatan keamanan yang aman untuk diumumkan.
- **Perlu perhatian**: perubahan yang memerlukan tindakan atau pemahaman khusus dari pengguna.

Format penulisan:

- gunakan bahasa Indonesia yang singkat dan berorientasi pada hasil;
- jelaskan bagian aplikasi dan dampaknya;
- hindari istilah implementasi seperti nama class, tabel, endpoint, atau library;
- satu item hanya menjelaskan satu perubahan; dan
- bila perlu tindakan pengguna, letakkan instruksi pada kategori **Perlu perhatian**.

Contoh yang benar:

> **Perbaikan — Modal mobile:** Formulir panjang, termasuk Tambah Sales, kini dapat digulir sehingga seluruh field dan tombol simpan dapat dijangkau.

Contoh yang harus dihindari:

> Memperbaiki flex wrapper pada `Dialog.Panel` dan menambahkan `overflow-y-auto`.

## 8. Ruang Lingkup Fitur

### 8.1 Pusat Pembaruan

Halaman **Versi Aplikasi** dikembangkan menjadi pusat pembaruan yang menampilkan:

- versi aktif;
- status versi terbaru;
- rilis terbaru beserta ringkasannya;
- daftar perubahan yang dikelompokkan berdasarkan kategori;
- tanggal dan waktu rilis dalam zona waktu aplikasi;
- riwayat versi sebelumnya;
- indikator rilis yang belum dibaca; dan
- penjelasan singkat mengenai `MAJOR`, `MINOR`, dan `PATCH`.

Daftar riwayat menggunakan pagination atau pemuatan bertahap agar tetap ringan.

### 8.2 Pemberitahuan Rilis

Ketika terdapat rilis baru yang relevan:

- sidebar/topbar menampilkan badge jumlah rilis yang belum dibaca;
- pengguna mendapat pemberitahuan non-blocking setelah login atau navigasi pertama;
- pemberitahuan menampilkan versi, judul, ringkasan, dan tombol **Lihat pembaruan**;
- pengguna dapat menutup pemberitahuan tanpa kehilangan akses ke release note;
- status dibaca dicatat ketika pengguna membuka detail rilis atau memilih **Tandai sudah dibaca**; dan
- pemberitahuan tidak ditampilkan berulang setelah rilis dibaca.

Rilis dengan kategori **Perlu perhatian** dapat ditampilkan lebih menonjol, tetapi tetap tidak boleh menghalangi transaksi kecuali ada kebutuhan operasional yang dinyatakan secara eksplisit pada PRD fitur terkait.

### 8.3 Target Pembaca

Setiap rilis mempunyai target pembaca:

- `all`: seluruh pengguna;
- `superadmin`: hanya pengguna administrasi pusat; atau
- `tenant`: owner dan pengguna tenant.

Pada pengembangan lanjutan, target dapat diperluas berdasarkan role atau permission. Pengguna tidak boleh menerima atau mengakses catatan rilis yang tidak ditujukan kepadanya.

### 8.4 Pengelolaan Rilis oleh Superadmin

Superadmin dapat:

- membuat draft rilis;
- mengisi versi, judul, ringkasan, target pembaca, dan daftar perubahan;
- mengubah urutan item;
- melihat pratinjau desktop dan mobile;
- menerbitkan rilis;
- membatalkan draft; dan
- melihat waktu publikasi serta pembuat rilis.

Rilis yang sudah diterbitkan tidak boleh dihapus permanen melalui UI. Koreksi hanya boleh memperbaiki penulisan tanpa mengubah makna; perubahan substansial harus menjadi item pada rilis berikutnya. Semua perubahan pada rilis terbit dicatat dalam audit log.

### 8.5 Sinkronisasi dengan File VERSION

- Rilis hanya boleh diterbitkan jika nomor rilis sama dengan versi aktif pada file `VERSION`.
- Sistem menolak versi yang tidak valid atau lebih rendah dari versi terbit terakhir.
- Perintah kenaikan versi tetap menggunakan `php artisan app:version major|minor|patch`.
- Deployment harus gagal atau memberikan peringatan tegas jika versi aktif tidak memiliki draft/published release yang cocok.
- Perubahan `no-release` harus dicatat dalam checklist deployment beserta alasannya dan tidak menaikkan `VERSION`.

## 9. Alur Pengguna

### 9.1 Pengguna Menerima Pembaruan

1. Pengguna login atau membuka halaman baru setelah rilis diterbitkan.
2. Sistem mencari rilis terbit yang sesuai target pengguna dan belum dibaca.
3. Badge pembaruan dan pemberitahuan non-blocking muncul.
4. Pengguna memilih **Lihat pembaruan**.
5. Sistem membuka detail rilis dan mencatat waktu baca.
6. Badge berkurang atau hilang jika tidak ada rilis lain yang belum dibaca.

### 9.2 Superadmin Menerbitkan Rilis

1. Perubahan selesai dikembangkan dan lolos verifikasi.
2. Perubahan diklasifikasikan menggunakan bagian 6 PRD ini.
3. Superadmin/developer membuat atau memperbarui draft release note.
4. Nomor aplikasi dinaikkan sesuai level tertinggi dalam paket perubahan.
5. Sistem memvalidasi kesamaan draft rilis dengan file `VERSION`.
6. Deployment dijalankan.
7. Rilis diterbitkan setelah deployment berhasil.
8. Pengguna yang ditargetkan menerima pemberitahuan.

## 10. Model Data Konseptual

### 10.1 `system_releases`

| Field | Keterangan |
| --- | --- |
| `id` | Primary key |
| `version` | Versi unik dengan format SemVer |
| `title` | Judul rilis |
| `summary` | Ringkasan singkat |
| `audience` | `all`, `superadmin`, atau `tenant` |
| `status` | `draft` atau `published` |
| `published_at` | Waktu publikasi |
| `created_by` | Superadmin pembuat |
| `updated_by` | Superadmin pengubah terakhir |
| `created_at`, `updated_at` | Timestamp |

### 10.2 `system_release_items`

| Field | Keterangan |
| --- | --- |
| `id` | Primary key |
| `system_release_id` | Relasi ke rilis |
| `category` | `added`, `improved`, `fixed`, `security`, atau `attention` |
| `title` | Nama singkat perubahan |
| `description` | Dampak perubahan bagi pengguna |
| `sort_order` | Urutan tampil |

### 10.3 `system_release_reads`

| Field | Keterangan |
| --- | --- |
| `system_release_id` | Rilis yang dibaca |
| `user_id` | Pengguna yang membaca |
| `read_at` | Waktu pertama dibaca |

Pasangan `system_release_id` dan `user_id` harus unik. Data baca bersifat per akun, bukan per perangkat.

## 11. Aturan Bisnis dan Validasi

- `version`, `title`, `summary`, `audience`, dan minimal satu item perubahan wajib diisi sebelum publikasi.
- Hanya satu rilis yang boleh menggunakan satu nomor versi.
- Versi draft boleh diedit; versi rilis terbit tidak dapat diturunkan statusnya melalui UI biasa.
- `published_at` diisi oleh server saat publikasi.
- Hanya superadmin berwenang membuat dan menerbitkan rilis.
- Semua pengguna terautentikasi boleh membaca rilis sesuai audience.
- Badge menghitung rilis terbit yang relevan dan belum dibaca, bukan jumlah item perubahan.
- Akun baru hanya menerima rilis dalam jangka waktu konfigurasi, dengan default 90 hari, agar tidak dibanjiri seluruh riwayat lama.
- Kegagalan mencatat status baca tidak boleh menghalangi pengguna mengakses fitur utama.

## 12. Persyaratan UI/UX dan Mobile

- Pusat pembaruan harus responsif dari lebar 320 px.
- Detail rilis yang dibuka sebagai modal wajib menggunakan komponen modal global.
- Isi modal harus dapat di-scroll secara vertikal pada layar kecil.
- Header, tombol tutup, dan aksi penting harus tetap dapat dijangkau.
- Scroll modal tidak boleh menggerakkan halaman di belakangnya.
- Badge harus memiliki label aksesibel, bukan hanya mengandalkan warna.
- Pengguna keyboard dapat membuka, membaca, dan menutup detail rilis.
- Fokus kembali ke elemen pemicu setelah modal ditutup.
- Tampilan dark mode mengikuti token warna aplikasi.

## 13. Persyaratan Nonfungsional

- Query rilis belum dibaca harus terindeks dan tidak menimbulkan N+1 query.
- Informasi ringkas untuk badge boleh dibagikan melalui properti Inertia global.
- Daftar detail release notes dimuat hanya saat diperlukan atau dipaginasi.
- Publikasi rilis dan pembuatan record terkait harus transaksional.
- Seluruh waktu disimpan dalam UTC dan ditampilkan sesuai zona waktu aplikasi.
- Akses detail rilis harus divalidasi di server, bukan hanya disembunyikan pada frontend.
- Audit log mencatat pembuat, penerbit, waktu, versi, dan koreksi pada rilis terbit.

## 14. Proses Wajib untuk Setiap Perubahan

Checklist berikut harus digunakan pada setiap pekerjaan berikutnya:

1. Jelaskan dampak perubahan bagi pengguna.
2. Tentukan `major`, `minor`, `patch`, atau `no-release` berdasarkan bagian 6.
3. Tambahkan item release note pada draft versi yang akan diterapkan.
4. Cantumkan referensi `docs/PRD_SYSTEM_UPDATES_AND_RELEASE_NOTES.md` pada PRD fitur atau catatan pekerjaan.
5. Jalankan test yang relevan dan build frontend bila ada perubahan UI.
6. Naikkan versi satu kali menjelang deployment menggunakan perintah Artisan.
7. Pastikan nomor pada `VERSION` sama dengan release note.
8. Deploy dan jalankan migrasi bila ada.
9. Lakukan smoke test sebagai admin dan tenant, termasuk tampilan mobile.
10. Terbitkan release note setelah deployment dinyatakan berhasil.

Perubahan yang belum masuk produksi boleh digabungkan ke draft versi yang sama. Dengan demikian, kewajiban “setiap perubahan merujuk ke sini” tidak berarti setiap commit harus menaikkan nomor versi.

## 15. Release Notes Awal

Versi awal yang menjadi contoh penerapan PRD ini:

### v1.0.2 — HPP bahan baku lebih mudah disiapkan

- **Perbaikan — Master bahan baku:** HPP awal kini dapat diisi langsung ketika menambah atau mengedit bahan baku, sehingga bahan baku dengan stok awal dapat digunakan pada pembelian.
- **Peningkatan — Keamanan HPP:** HPP yang sudah menjadi moving average ditampilkan sebagai informasi dan tidak dapat ditimpa secara manual dari master bahan baku.
- **Peningkatan — Catat pembelian:** Sistem memberi peringatan lebih awal, menandai bahan baku yang HPP-nya belum siap, dan menyediakan akses langsung untuk mengatur HPP bagi owner.

Klasifikasi: `PATCH`, karena perubahan memperbaiki kelengkapan input dan hambatan pada alur pembelian tanpa menambah modul bisnis baru.

### v1.0.1 — Perbaikan pengalaman mobile

- **Perbaikan — Modal mobile:** Formulir panjang, termasuk Tambah Sales, kini dapat digulir sehingga seluruh field dan tombol simpan dapat dijangkau.
- **Peningkatan — Konsistensi modal:** Batas tinggi modal menyesuaikan tinggi layar perangkat dan mendukung scroll sentuh yang lebih stabil.

Klasifikasi: `PATCH`, karena perubahan memperbaiki perilaku UI tanpa menambahkan kemampuan bisnis baru atau mengubah kompatibilitas.

## 16. Kriteria Penerimaan

Fitur dianggap selesai jika:

- superadmin dapat membuat draft dan menerbitkan release note;
- sistem menolak nomor versi tidak valid, duplikat, atau tidak sama dengan `VERSION`;
- admin dan tenant hanya melihat rilis sesuai targetnya;
- rilis baru menghasilkan badge/pemberitahuan bagi pengguna yang belum membaca;
- membuka atau menandai rilis mencatat status baca secara idempoten;
- badge hilang setelah seluruh rilis relevan dibaca;
- halaman Versi Aplikasi menampilkan versi aktif dan riwayat rilis;
- modal detail dapat di-scroll pada viewport mobile 320 × 568 px;
- dark mode dan navigasi keyboard berfungsi;
- akses tidak sah ditolak oleh server;
- unit test, feature test, dan build frontend berhasil; dan
- release note v1.0.1 memuat perbaikan modal mobile.

## 17. Strategi Pengujian

### Unit

- validasi dan perbandingan Semantic Versioning;
- penentuan target pembaca;
- perhitungan status belum dibaca; dan
- validasi transisi status draft ke published.

### Feature

- superadmin dapat mengelola dan menerbitkan rilis;
- role lain tidak dapat mengelola rilis;
- audience membatasi daftar dan detail rilis;
- status baca bersifat unik dan idempoten;
- rilis tidak dapat diterbitkan jika versi tidak cocok; dan
- properti global Inertia memberikan versi dan jumlah belum dibaca yang benar.

### UI

- badge dan pemberitahuan rilis baru;
- riwayat, filter, pagination, empty state, dan error state;
- detail release note pada desktop dan mobile;
- modal scroll pada layar pendek serta saat keyboard virtual terbuka; dan
- aksesibilitas keyboard, focus trap, label, serta dark mode.

## 18. Tahapan Implementasi

### Fase 1 — Fondasi

- migrasi dan model rilis, item, dan status baca;
- policy/authorization;
- CRUD draft dan proses publikasi superadmin; dan
- validasi sinkronisasi dengan `VERSION`.

### Fase 2 — Informasi Pengguna

- pengembangan halaman Versi Aplikasi menjadi pusat pembaruan;
- detail rilis;
- badge belum dibaca; dan
- pencatatan status baca.

### Fase 3 — Notifikasi dan Guardrail Deployment

- pemberitahuan non-blocking setelah login/navigasi;
- audit log;
- pemeriksaan release note pada proses deployment; dan
- dokumentasi operasional final.

## 19. Keputusan Produk

- Sistem menggunakan release notes dalam basis data agar dapat ditargetkan dan ditandai sudah dibaca.
- File `VERSION` tetap menjadi sumber versi aplikasi yang berjalan.
- Notifikasi bersifat informatif dan tidak menghambat penggunaan POS.
- Status baca disimpan per pengguna.
- Satu deployment memiliki satu versi, tetapi dapat berisi banyak item perubahan.
- Perbaikan modal mobile dikategorikan sebagai patch dan menjadi contoh rilis `1.0.1`.
