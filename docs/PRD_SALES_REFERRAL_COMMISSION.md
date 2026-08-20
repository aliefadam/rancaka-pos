# PRD — Sales, Referral Tenant & Komisi

## Status Dokumen

- Status: Draft untuk konfirmasi bisnis
- Tanggal: 20 Agustus 2026
- Cakupan: role sales platform, referral registrasi tenant, komisi subscription, dashboard sales, dan manajemen sales oleh superadmin

## Latar Belakang

Platform SaaS membutuhkan sales yang dapat mengajak calon tenant menggunakan kode referral. Setiap sales mempunyai persentase komisi yang dapat berbeda. Sales harus dapat login sendiri, tetapi hanya boleh melihat tenant, pembayaran, dan komisi yang berasal dari referral miliknya.

## Tujuan

- Superadmin dapat membuat dan mengelola akun sales.
- Setiap sales mempunyai kode referral unik dan persentase komisi sendiri.
- Calon tenant dapat memasukkan kode referral saat registrasi.
- Referral tetap bekerja pada registrasi formulir maupun Google OAuth.
- Komisi tercatat secara akurat ketika pembayaran tenant disetujui.
- Sales mempunyai dashboard terbatas untuk melihat performa referral sendiri.
- Sales tidak dapat melihat laporan operasional atau keuangan internal tenant.

## Role dan Hak Akses

### Superadmin

- Membuat, mengubah, mengaktifkan, dan menonaktifkan sales.
- Menentukan kode referral dan persentase komisi setiap sales.
- Melihat seluruh referral dan komisi.
- Mengoreksi atribusi referral sesuai aturan audit.
- Menandai komisi sebagai sudah dibayar jika fitur payout manual disetujui.

### Sales

- Login menggunakan akun sendiri.
- Membuka dashboard sales saja.
- Melihat jumlah referral miliknya.
- Melihat daftar tenant hasil referral miliknya dalam informasi terbatas.
- Melihat nilai pembayaran subscription yang menghasilkan komisi.
- Melihat total komisi sesuai status yang diizinkan.
- Tidak dapat membuka tenant, kasir, stok, laporan keuangan tenant, billing tenant lain, atau data sales lain.

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

Komisi dibuat ketika superadmin menyetujui pembayaran subscription tenant. Komisi tidak dibuat saat tenant baru registrasi, saat invoice dibuat, atau saat bukti pembayaran masih pending.

### Rumus

```text
commission_amount = approved_invoice_amount × commission_rate_snapshot / 100
```

Pembulatan menggunakan rupiah terdekat dan dilakukan di backend.

### Keamanan dan Konsistensi

- Satu pembayaran hanya boleh menghasilkan satu baris komisi.
- Database menggunakan unique constraint pada pembayaran yang menjadi sumber komisi.
- Approval pembayaran dan pembuatan komisi dilakukan dalam satu database transaction.
- Pembayaran yang ditolak tidak menghasilkan komisi.
- Jika pembayaran dibatalkan di masa depan, ledger membuat koreksi/cancelled entry; histori tidak dihapus.

## Dashboard Sales

### Ringkasan

- Total referral terdaftar.
- Referral dengan trial aktif.
- Referral dengan subscription aktif.
- Total invoice yang sudah dibayar dari referral.
- Total komisi diperoleh.
- Total komisi belum dibayar dan sudah dibayar jika payout manual disertakan.

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
- Status komisi jika payout manual digunakan.

## Panel Superadmin

### Manajemen Sales

- Daftar sales dengan pencarian dan filter status.
- Tambah sales: nama, username, email, password, kode referral, persentase komisi, status.
- Edit identitas, kode referral, persentase, dan status.
- Reset password sales.
- Detail performa sales.

### Laporan Referral dan Komisi

- Filter berdasarkan sales, tenant, tanggal, dan status.
- Total referral dan total komisi seluruh sales.
- Detail dasar perhitungan setiap komisi.
- Aksi payout manual jika disetujui dalam cakupan.

## Model Data yang Diusulkan

### `sales_profiles`

- `id`
- `user_id` — unique
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
- `status` — accrued/paid/cancelled
- `approved_at`
- `paid_at` — nullable
- `paid_by` — nullable superadmin
- `note` — nullable
- timestamps

### `commission_payouts` — jika payout manual disetujui

- `id`
- `sales_profile_id`
- `number`
- `amount`
- `status` — draft/paid/cancelled
- `paid_at`
- `proof_path` — nullable
- `processed_by`
- timestamps

Relasi payout ke komisi menggunakan pivot agar satu payout dapat mencakup beberapa komisi.

## Login dan Routing

- Role baru: `sales`.
- Login menggunakan halaman yang sama dengan role lain.
- Setelah login, sales selalu diarahkan ke `/sales/dashboard`.
- Middleware role membatasi seluruh route `/sales/*` hanya untuk sales.
- Query dashboard selalu diberi scope `sales_profile_id` milik user yang login.
- Sales tidak dimasukkan ke navigation superadmin atau tenant.

## Audit dan Keamanan

- Persentase snapshot dan dasar perhitungan tidak dapat diedit oleh sales.
- Semua perubahan persentase sales dicatat melalui timestamp; audit log rinci dapat menjadi fase berikutnya.
- Endpoint tidak menerima `sales_profile_id` dari browser untuk menentukan data sales; identitas selalu berasal dari user login.
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
2. Kedua sales dapat login dan hanya melihat data referral masing-masing.
3. Customer dapat registrasi tanpa kode referral.
4. Customer dapat registrasi dengan kode referral valid melalui formulir maupun Google.
5. Kode referral invalid/inactive ditolak dengan pesan yang jelas.
6. Semua label wajib pada registrasi mempunyai `*`; referral ditandai `(opsional)`.
7. Halaman registrasi menggunakan layout split yang sama dengan login.
8. Approval invoice membuat tepat satu komisi dengan persentase snapshot milik sales.
9. Perubahan persentase sales tidak mengubah komisi historis.
10. Sales tidak dapat membuka route tenant, superadmin, atau data milik sales lain.
11. Tenant lama dan registrasi tanpa referral tidak menghasilkan komisi.
12. Perhitungan komisi mempunyai automated test untuk rate berbeda, duplikasi approval, dan isolasi data.

## Keputusan Bisnis yang Perlu Dikonfirmasi

1. Apakah komisi diberikan pada pembayaran pertama saja atau setiap perpanjangan subscription?
2. Apakah MVP perlu mencatat payout komisi (`belum dibayar`/`sudah dibayar`), atau cukup total komisi yang diperoleh?
3. Apakah akun sales login dengan username/password saja, atau juga boleh menggunakan Google?
4. Apakah superadmin boleh mengubah referral tenant setelah registrasi? Jika boleh, sampai kapan?
5. Jika invoice/pembayaran yang sudah disetujui kemudian dibatalkan, apakah komisi dikurangi dari saldo berikutnya atau cukup ditandai cancelled?

## Rekomendasi Default

- Komisi berlaku untuk setiap pembayaran subscription yang disetujui selama tenant masih teratribusi ke sales.
- MVP menyertakan status accrued/paid dan payout manual agar total yang sudah dibayar tidak tercampur dengan saldo terutang.
- Sales login menggunakan username/password terlebih dahulu; Google dapat ditambahkan kemudian.
- Referral dapat dikoreksi superadmin hanya sebelum pembayaran subscription pertama disetujui.
- Pembatalan pembayaran membuat komisi berstatus cancelled dan mengurangi saldo komisi yang belum dibayar.
