# PRD — Sales, Referral Tenant & Komisi

## Status Dokumen

- Status: Implementasi inti tersedia; penyempurnaan dashboard dan laporan masih berjalan
- Tanggal: 20 Agustus 2026
- Audit implementasi terakhir: 27 Agustus 2026
- Cakupan: akun dan dashboard sales, referral registrasi tenant, komisi subscription, payout manual, dan manajemen sales oleh superadmin

## Latar Belakang

Platform SaaS membutuhkan sales yang dapat mengajak calon tenant menggunakan kode referral. Setiap sales mempunyai kode referral unik, akun username/password, dan persentase komisi yang dapat berbeda. Sales dapat melihat downline referral dan estimasi komisinya sendiri, sedangkan pengelolaan sales dan payout tetap dilakukan oleh superadmin.

## Tujuan

- Superadmin dapat membuat dan mengelola profil sales.
- Setiap sales mempunyai kode referral unik dan persentase komisi sendiri.
- Calon tenant dapat memasukkan kode referral saat registrasi.
- Referral tetap bekerja pada registrasi formulir maupun Google OAuth.
- Komisi tercatat secara akurat ketika pembayaran tenant disetujui.
- Sales dapat login dan melihat downline, estimasi komisi, komisi aktual, serta payout miliknya sendiri.
- Sales tidak dapat melihat laporan operasional atau keuangan internal tenant.

## Role dan Hak Akses

### Superadmin

- Membuat, mengubah, mengaktifkan, dan menonaktifkan sales.
- Menentukan kode referral dan persentase komisi setiap sales.
- Melihat seluruh referral dan komisi.
- Mengoreksi atribusi referral sesuai aturan audit.
- Membuat payout manual dan menandai komisi sebagai sudah dibayar.

### Sales

- Setiap sales mempunyai kode referral yang berbeda.
- Sales membagikan kode referral kepada calon tenant.
- Sales login menggunakan username/password yang dibuat superadmin.
- Sales dapat melihat dashboard, downline referral, estimasi komisi, komisi aktual, dan payout miliknya sendiri.
- Sales tidak dapat melihat data sales lain atau data operasional internal tenant.

Kode referral hanya digunakan untuk atribusi tenant dan perhitungan komisi. Kode referral bukan kredensial login.

### Owner Tenant

- Registrasi menggunakan formulir atau Google.
- Dapat memasukkan kode referral secara opsional.
- Tidak dapat mengganti referral sendiri setelah registrasi selesai.

## Registrasi Tenant

### Desain

- Halaman registrasi menggunakan layout split yang sama dengan halaman login.
- Sisi kiri berisi branding, manfaat produk, dan informasi trial.
- Sisi kanan berisi Google OAuth dan formulir registrasi.
- Gaya visual, jarak, lebar panel, dan responsive breakpoint mengikuti halaman login agar autentikasi konsisten.

### Penanda Field

- Semua field wajib mempunyai tanda bintang merah `*` pada label.
- Field yang tidak wajib tidak menggunakan bintang dan harus diberi keterangan `(opsional)`.
- Label referral: **Kode referral (opsional)**.
- Placeholder referral: `Contoh: SALESBUDI`.
- Pesan kode tidak valid: `Kode referral tidak ditemukan atau sudah tidak aktif.`

### Formulir Manual

- Nama toko `*`
- Nama owner `*`
- Email bisnis `*`
- Nomor WhatsApp `*`
- Username `*`
- Password `*`
- Konfirmasi password `*`
- Kode referral `(opsional)`

### Registrasi Google

- Pengunjung dapat memasukkan kode referral sebelum menekan tombol Google.
- Kode disimpan sementara di session sebelum redirect ke Google.
- Setelah callback Google, kode tetap dibawa ke onboarding toko.
- Jika kode tidak valid, pengguna mendapat pesan dan dapat memperbaikinya sebelum membuat toko.
- Atribusi referral disimpan saat onboarding toko berhasil, bukan ketika callback Google baru diterima.

## Kode Referral

- Unik secara case-insensitive.
- Disimpan dalam huruf kapital tanpa spasi.
- Karakter yang diperbolehkan: huruf, angka, dash, dan underscore.
- Panjang yang disarankan: 4–30 karakter.
- Hanya kode sales berstatus aktif yang dapat digunakan untuk registrasi baru.
- Menonaktifkan sales tidak menghapus referral dan histori komisi yang sudah ada.
- Tenant yang mendaftar tanpa kode referral tidak mempunyai atribusi sales.
- Tenant lama tidak otomatis dikaitkan ke sales.

## Persentase Komisi

- Persentase ditentukan per sales oleh superadmin.
- Nilai valid: `0–100`, mendukung dua angka desimal.
- Contoh: Sales A `10%`, Sales B `5%`.
- Saat komisi dibuat, persentase disalin ke `commission_rate_snapshot`.
- Perubahan persentase hanya memengaruhi pembayaran yang disetujui setelah perubahan tersebut.
- Histori komisi lama tidak dihitung ulang.

## Sumber dan Perhitungan Komisi

### Event Pembentukan

Komisi dibuat satu kali ketika pembayaran subscription pertama tenant disetujui superadmin. Pembayaran perpanjangan berikutnya tidak menghasilkan komisi. Komisi tidak dibuat saat tenant baru registrasi, saat invoice dibuat, atau saat bukti pembayaran masih pending.

### Rumus

```text
commission_amount = approved_invoice_amount × commission_rate_snapshot / 100
```

Pembulatan menggunakan rupiah terdekat dan dilakukan di backend.

### Keamanan dan Konsistensi

- Satu pembayaran hanya boleh menghasilkan satu baris komisi.
- Satu tenant hanya boleh menghasilkan satu komisi referral.
- Database menggunakan unique constraint pada pembayaran yang menjadi sumber komisi.
- Database juga menggunakan unique constraint pada tenant untuk mencegah komisi terbentuk kembali dari pembayaran perpanjangan.
- Approval pembayaran dan pembuatan komisi dilakukan dalam satu database transaction.
- Pembayaran yang ditolak tidak menghasilkan komisi.
- Sistem tidak menyediakan refund atau pembatalan pembayaran yang sudah disetujui pada MVP. Karena itu, komisi yang sudah terbentuk tidak dibatalkan otomatis.

## Dashboard Sales

Dashboard sales termasuk cakupan MVP dan seluruh query wajib dibatasi menggunakan `sales_profile_id` milik user yang sedang login.

### Ringkasan

- Total referral terdaftar.
- Referral dengan trial aktif.
- Referral dengan subscription aktif.
- Total invoice yang sudah dibayar dari referral.
- Total komisi diperoleh.
- Total komisi belum dibayar dan sudah dibayar.
- Total estimasi komisi dari seluruh downline.

Estimasi per downline menggunakan nilai komisi aktual jika pembayaran pertama sudah disetujui. Jika belum, estimasi dihitung dari nominal invoice subscription pertama dikali persentase komisi sales saat ini. Nilai estimasi diberi label sebagai proyeksi dan bukan saldo yang dapat dipayout.

### Tabel Referral

- Nama tenant.
- Tanggal registrasi.
- Status subscription: trial, active, expired, atau inactive.
- Tanggal berakhir trial/masa aktif.
- Tidak menampilkan transaksi kasir, omzet toko, produk, stok, atau laporan keuangan tenant.

### Tabel Komisi

- Nomor invoice.
- Nama tenant.
- Tanggal pembayaran disetujui.
- Dasar perhitungan.
- Persentase snapshot.
- Nilai komisi.
- Status komisi.

### Filter

- Rentang tanggal.
- Status referral/subscription.
- Status komisi.

## Panel Superadmin

### Manajemen Sales

- Daftar sales dengan pencarian dan filter status.
- Tambah sales: nama, username, email opsional, password, informasi kontak opsional, kode referral, persentase komisi, dan status.
- Edit identitas, kode referral, persentase, dan status.
- Reset password sales.
- Detail performa sales.

### Laporan Referral dan Komisi

- Filter berdasarkan sales, tenant, tanggal, dan status.
- Total referral dan total komisi seluruh sales.
- Detail dasar perhitungan setiap komisi.
- Aksi payout manual untuk satu atau beberapa komisi yang masih berstatus `accrued`.

## Model Data yang Diusulkan

### `sales_profiles`

- `id`
- `user_id` — unique
- `name`
- `email` — nullable
- `phone` — nullable
- `referral_code` — unique
- `commission_rate` — decimal(5,2)
- `status` — active/inactive
- timestamps

### Penambahan pada `tenants`

- `referred_by_sales_id` — nullable foreign key
- `referral_code_used` — nullable snapshot
- `referred_at` — nullable timestamp

### `sales_commissions`

- `id`
- `sales_profile_id`
- `tenant_id`
- `billing_invoice_id`
- `subscription_payment_id` — unique
- `base_amount`
- `commission_rate_snapshot`
- `commission_amount`
- `status` — accrued/paid
- `approved_at`
- `paid_at` — nullable
- `paid_by` — nullable superadmin
- `note` — nullable
- timestamps

### `commission_payouts`

- `id`
- `sales_profile_id`
- `number`
- `amount`
- `status` — draft/paid
- `paid_at`
- `proof_path` — nullable
- `processed_by`
- timestamps

Relasi payout ke komisi menggunakan pivot agar satu payout dapat mencakup beberapa komisi.

## Login dan Routing

- Role baru: `sales`.
- Sales login dengan username/password melalui halaman login yang sama.
- Setelah login, sales diarahkan ke `/sales/dashboard`.
- Route `/sales/*` hanya dapat diakses role sales.
- Seluruh query dashboard mengambil identitas sales dari akun yang login, bukan dari parameter browser.
- Kode referral tidak dapat digunakan untuk login.

## Audit dan Keamanan

- Persentase snapshot dan dasar perhitungan tidak dapat diedit oleh sales.
- Semua perubahan persentase sales dicatat melalui timestamp; audit log rinci dapat menjadi fase berikutnya.
- Setiap endpoint superadmin tetap memvalidasi `sales_profile_id` dan kepemilikan komisi di server; data dari browser tidak dipercaya sebagai dasar perhitungan.
- Nominal komisi dihitung ulang oleh server.
- Bukti payout hanya dapat dilihat sales terkait dan superadmin.
- Kode referral diberi rate limit pada endpoint validasi jika tersedia secara realtime.

## Migrasi dan Kompatibilitas

- Tenant lama mendapatkan nilai referral `null`.
- User lama tidak berubah role.
- Pembayaran dan invoice lama tidak otomatis menghasilkan komisi.
- Komisi mulai dihitung setelah fitur diaktifkan.
- Registrasi tanpa kode referral tetap berjalan seperti sekarang.

## Acceptance Criteria

1. Superadmin dapat membuat dua sales dengan komisi berbeda, misalnya 10% dan 5%.
2. Kedua sales dapat login dengan username/password dan hanya melihat downline serta komisi masing-masing.
3. Customer dapat registrasi tanpa kode referral.
4. Customer dapat registrasi dengan kode referral valid melalui formulir maupun Google.
5. Kode referral invalid/inactive ditolak dengan pesan yang jelas.
6. Semua label wajib pada registrasi mempunyai `*`; referral ditandai `(opsional)`.
7. Halaman registrasi menggunakan layout split yang sama dengan login.
8. Approval invoice membuat tepat satu komisi dengan persentase snapshot milik sales.
9. Perubahan persentase sales tidak mengubah komisi historis.
10. Seluruh route manajemen sales, referral, komisi, dan payout hanya dapat dibuka superadmin.
11. Tenant lama dan registrasi tanpa referral tidak menghasilkan komisi.
12. Perhitungan komisi mempunyai automated test untuk rate berbeda, memastikan pembayaran kedua tidak menghasilkan komisi, duplikasi approval, dan isolasi data.
13. Superadmin dapat membuat payout manual dari komisi `accrued`; komisi yang masuk payout berstatus `paid` dan tidak dapat dibayar dua kali.
14. Referral tenant hanya dapat dikoreksi superadmin sebelum pembayaran subscription pertama disetujui.
15. Estimasi komisi dashboard menggunakan invoice pertama untuk downline yang belum membayar dan menggunakan komisi aktual setelah pembayaran disetujui.

## Keputusan Bisnis Final

1. Komisi hanya berlaku satu kali pada pembayaran subscription pertama yang disetujui. Pembayaran perpanjangan berikutnya tidak menghasilkan komisi.
2. Komisi langsung berstatus `accrued` ketika pembayaran customer disetujui. Payout kepada sales dicatat manual oleh superadmin dan mengubah status komisi menjadi `paid`.
3. Setiap sales mempunyai kode referral unik dan akun login username/password. Kode referral bukan kredensial login.
4. Superadmin hanya boleh mengoreksi referral tenant sebelum pembayaran subscription pertama disetujui.
5. Tidak ada refund atau pembatalan pembayaran yang sudah disetujui pada MVP, sehingga tidak ada pengurangan/cancellation komisi setelah pembayaran tersebut.

## Status Implementasi dan Pekerjaan Tersisa

Akun sales, referral registrasi manual/Google, komisi pembayaran pertama, snapshot persentase, koreksi referral, payout manual, isolasi dashboard, dan manajemen sales oleh superadmin telah tersedia.

### Step 1 — Filter dan Ringkasan Dashboard Sales

- [ ] Menambahkan filter rentang tanggal registrasi referral.
- [ ] Menambahkan filter status referral/subscription dan status komisi.
- [ ] Menambahkan metrik total invoice yang sudah dibayar dari referral.
- [ ] Memastikan metrik dan tabel memakai filter yang sama serta hanya mengambil sales yang sedang login.

### Step 2 — Detail Performa Sales untuk Superadmin

- [ ] Menambahkan halaman detail performa per sales.
- [ ] Menampilkan ringkasan downline, invoice dibayar, komisi proyeksi, accrued, paid, dan riwayat payout.
- [ ] Menambahkan filter tanggal dan status pada detail performa.
- [ ] Menyediakan navigasi dari daftar sales dan laporan komisi ke halaman detail.

### Step 3 — Verifikasi E2E

- [ ] Menambah test filter dashboard dan perhitungan total invoice dibayar.
- [ ] Menambah test otorisasi dan isolasi halaman detail performa.
- [ ] Menjalankan seluruh test backend dan production frontend build.
- [ ] Memperbarui status PRD menjadi selesai setelah seluruh acceptance criteria terverifikasi.
