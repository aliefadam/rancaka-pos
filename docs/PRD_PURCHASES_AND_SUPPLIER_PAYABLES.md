# PRD — Sistem Pembelian dan Hutang Supplier

## Status Dokumen

- Status: Keputusan bisnis MVP lengkap, siap diimplementasikan
- Tanggal: 22 Agustus 2026
- Cakupan: supplier, pembelian produk dan bahan baku, stok masuk, moving average cost, diskon/biaya tambahan, pembayaran lunas/tempo/cicilan, jadwal termin fleksibel, hutang supplier, bukti pembayaran, dan pelaporan

## Ringkasan

Rancaka POS perlu menyediakan alur pembelian barang dari supplier. Pengguna memilih supplier dan barang yang dibeli, mengisi jumlah serta harga beli, kemudian menentukan syarat pembayaran:

- **Lunas** — seluruh nilai pembelian langsung dibayar.
- **Tempo** — belum ada pembayaran saat pembelian dan seluruh nilai menjadi hutang supplier.
- **Cicilan** — sebagian nilai dibayar saat pembelian dan sisanya menjadi hutang supplier.

Barang langsung menambah stok ketika pembelian disimpan. Untuk pembelian tempo atau cicilan, sistem membuat saldo hutang atas supplier dan pembelian tersebut. Setiap pembayaran berikutnya dicatat dengan tanggal, nominal, metode, catatan, dan bukti pembayaran hingga hutang lunas.

## Tujuan

- Mencatat asal stok masuk dari pembelian yang jelas dan dapat diaudit.
- Menyediakan master supplier terpisah untuk setiap tenant.
- Mendukung pembelian lunas, tempo, dan cicilan.
- Menghasilkan saldo hutang supplier secara otomatis.
- Mencatat pembayaran hutang beserta bukti pembayaran.
- Menampilkan hutang jatuh tempo dan riwayat pembayaran.
- Memasukkan pembayaran supplier sebagai arus kas keluar tanpa mencatat pengeluaran dua kali.

## Istilah

- **Supplier**: pihak yang menyediakan barang kepada tenant.
- **Pembelian**: dokumen transaksi penerimaan satu atau lebih barang dari satu supplier.
- **Syarat pembayaran**: cara pelunasan pembelian, yaitu lunas, tempo, atau cicilan.
- **Metode pembayaran**: media yang dipakai ketika uang dibayarkan, seperti cash, transfer bank, QRIS, atau lainnya.
- **Hutang supplier**: sisa pembelian yang belum dibayar kepada supplier.
- **Pembayaran awal**: pembayaran yang dicatat bersamaan ketika pembelian dibuat.
- **Pembayaran hutang**: pembayaran setelah pembelian dibuat untuk mengurangi sisa hutang.
- **Bukti pembelian**: foto atau PDF nota/faktur dari supplier.
- **Bukti pembayaran**: foto atau PDF yang membuktikan pembayaran kepada supplier.
- **Termin cicilan**: rencana nominal dan tanggal pembayaran yang ditentukan pengguna. Termin adalah jadwal, sedangkan saldo hutang tetap mengikuti pembayaran aktual.
- **Moving average cost/HPP rata-rata bergerak**: HPP per unit yang dihitung ulang setiap kali stok masuk dengan biaya baru berdasarkan nilai persediaan lama dan nilai penerimaan baru.
- **Snapshot HPP**: salinan HPP rata-rata pada saat stok keluar agar transaksi historis tidak berubah ketika pembelian berikutnya mengubah HPP.

## Prinsip Utama

1. Satu pembelian hanya mempunyai satu supplier.
2. Satu pembelian dapat berisi banyak barang.
3. Stok bertambah ketika pembelian berhasil diposting, bukan ketika hutang dilunasi.
4. Hutang dihitung per pembelian dan dapat diringkas per supplier.
5. Setiap pembayaran hanya dialokasikan ke satu pembelian pada MVP.
6. Pembayaran tidak boleh melebihi sisa hutang.
7. Saldo hutang tidak boleh diedit manual; saldo selalu berasal dari total pembelian dikurangi pembayaran valid.
8. Dokumen yang sudah diposting tidak dihapus permanen. Koreksi dilakukan melalui pembatalan dengan audit.
9. Semua data supplier, pembelian, hutang, pembayaran, dan bukti terisolasi per tenant.

## Ruang Lingkup MVP

### 1. Master Supplier

Owner atau pengguna berwenang dapat:

- Menambahkan supplier.
- Mengubah informasi supplier.
- Mengaktifkan atau menonaktifkan supplier.
- Melihat total hutang supplier.
- Melihat daftar pembelian dan pembayaran supplier.

Data minimal supplier:

- Nama supplier — wajib.
- Nomor telepon/WhatsApp — opsional.
- Email — opsional.
- Alamat — opsional.
- Nama kontak — opsional.
- Catatan — opsional.
- Status aktif/nonaktif.

Aturan supplier:

- Nama supplier harus unik secara case-insensitive dalam satu tenant.
- Supplier nonaktif tidak dapat dipilih untuk pembelian baru.
- Supplier yang sudah memiliki transaksi tidak boleh dihapus permanen.
- Menonaktifkan supplier tidak mengubah pembelian atau hutang yang sudah ada.

### 2. Membuat Pembelian

Alur pembelian:

1. Pengguna membuka halaman **Pembelian**.
2. Pengguna memilih supplier.
3. Pengguna mengisi tanggal pembelian.
4. Pengguna dapat mengisi nomor faktur supplier.
5. Pengguna memilih satu atau lebih barang.
6. Untuk setiap barang, pengguna mengisi kuantitas dan harga beli satuan.
7. Sistem menghitung subtotal setiap item dan total pembelian.
8. Pengguna memilih syarat pembayaran: lunas, tempo, atau cicilan.
9. Jika terdapat pembayaran awal, pengguna mengisi metode pembayaran dan bukti sesuai aturan.
10. Pengguna dapat mengunggah nota/faktur supplier.
11. Sistem menampilkan halaman konfirmasi.
12. Setelah dikonfirmasi, pembelian diposting, stok bertambah, pembayaran awal dicatat, dan sisa hutang dihitung secara atomik.

Data header pembelian:

- Nomor pembelian otomatis dan unik, misalnya `PUR-20260822-0001`.
- Tenant.
- Supplier.
- Tanggal pembelian.
- Nomor faktur supplier — opsional.
- Syarat pembayaran.
- Tanggal jatuh tempo untuk tempo/cicilan.
- Subtotal barang sebelum penyesuaian.
- Diskon pembelian.
- Biaya tambahan beserta keterangannya.
- Total akhir pembelian.
- Total sudah dibayar.
- Sisa hutang.
- Status dokumen.
- Status pembayaran.
- Catatan.
- Bukti pembelian.
- Pengguna pembuat.
- Waktu pembuatan.

### 3. Barang yang Dapat Dibeli

MVP mendukung:

- Produk yang memakai stok.
- Bahan baku.

Satu pembelian boleh berisi produk dan bahan baku sekaligus selama berasal dari supplier yang sama.

Data setiap item:

- Referensi produk atau bahan baku.
- Snapshot nama barang.
- Snapshot satuan.
- Kuantitas.
- Harga beli satuan.
- Subtotal.
- Alokasi diskon dan biaya tambahan.
- Biaya persediaan bersih yang dipakai dalam perhitungan moving average.

Rumus:

```text
subtotal_item = quantity × unit_cost
subtotal_barang = jumlah seluruh subtotal_item
total_pembelian = subtotal_barang - diskon + biaya_tambahan
sisa_hutang = total_pembelian - total_pembayaran_valid
```

Diskon dan biaya tambahan dialokasikan secara proporsional ke setiap item berdasarkan kontribusi subtotalnya. Selisih pembulatan diberikan ke item terakhir sehingga jumlah biaya persediaan seluruh item selalu sama dengan total pembelian.

Validasi:

- Minimal terdapat satu item.
- Kuantitas harus lebih dari nol.
- Produk menggunakan kuantitas bilangan bulat mengikuti aturan stok produk saat ini.
- Bahan baku dapat menggunakan kuantitas desimal sesuai aturan stok bahan baku.
- Harga beli tidak boleh negatif.
- Diskon tidak boleh melebihi subtotal barang.
- Biaya tambahan tidak boleh negatif.
- Barang harus aktif dan berasal dari tenant yang sama.
- Barang yang sama hanya boleh muncul satu kali dalam satu pembelian.
- Total header harus sama dengan jumlah subtotal item.

### 4. Syarat Pembayaran

Syarat pembayaran menentukan pembentukan hutang, bukan media pembayaran.

| Syarat | Pembayaran awal | Hutang yang terbentuk | Jatuh tempo |
|---|---:|---:|---|
| Lunas | Sama dengan total pembelian | Rp0 | Tidak wajib |
| Tempo | Rp0 | Seluruh total pembelian | Satu jatuh tempo wajib |
| Cicilan | Lebih dari Rp0 dan kurang dari total | Sisa setelah pembayaran awal | Dipilih pengguna |

Aturan:

- Syarat **lunas** wajib menghasilkan pembayaran awal sebesar total pembelian.
- Syarat **tempo** tidak menerima pembayaran awal.
- Syarat **cicilan** wajib mempunyai pembayaran awal lebih dari nol dan lebih kecil dari total pembelian.
- Untuk tempo, pengguna memilih satu tanggal jatuh tempo.
- Untuk cicilan, pengguna bebas memilih satu tanggal jatuh tempo akhir atau membuat beberapa termin manual.
- Pembelian tempo atau cicilan langsung muncul pada daftar hutang supplier.

#### Jadwal Cicilan Fleksibel

Pada pembelian cicilan, pengguna memilih salah satu mode:

1. **Tanpa rincian termin** — hanya menentukan satu tanggal jatuh tempo akhir.
2. **Dengan jadwal termin** — menentukan sendiri jumlah termin, tanggal, dan nominal setiap termin.

Aturan jadwal termin:

- Minimal satu termin jika mode jadwal dipilih.
- Jumlah nominal seluruh termin harus sama dengan sisa hutang setelah pembayaran awal.
- Tanggal dan nominal setiap termin bebas ditentukan pengguna.
- Termin tidak harus mingguan atau bulanan.
- Jadwal termin tidak menciptakan pembayaran otomatis.
- Pembayaran aktual tetap harus dicatat beserta metode dan bukti.
- Satu pembayaran dapat melunasi satu termin, beberapa termin, atau hanya sebagian termin.
- Sistem mengalokasikan pembayaran aktual ke termin paling awal yang belum lunas, kecuali pengguna memilih termin tertentu.
- Termin berstatus `scheduled`, `partial`, `paid`, atau `overdue`.
- Perubahan jadwal diperbolehkan selama tidak mengubah nominal yang sudah dibayar dan seluruh sisa termin tetap sama dengan sisa hutang.

### 5. Metode Pembayaran

Setiap pembayaran, termasuk pembayaran awal, mempunyai metode:

- Cash/tunai.
- Transfer bank.
- QRIS.
- Lainnya.

Aturan bukti:

- Pembayaran cash: bukti pembayaran opsional.
- Transfer bank, QRIS, atau metode lainnya: bukti pembayaran wajib.
- Format bukti mengikuti standar upload aplikasi: JPG, PNG, WebP, atau PDF.
- Bukti disimpan privat per tenant dan hanya dapat dibuka oleh pengguna berwenang.
- Nota/faktur supplier dan bukti pembayaran disimpan sebagai dokumen berbeda.

### 6. Hutang Supplier

Sistem menyediakan halaman **Hutang Supplier** dengan ringkasan:

- Total hutang seluruh supplier.
- Total hutang yang belum jatuh tempo.
- Total hutang jatuh tempo hari ini.
- Total hutang terlambat.
- Pembayaran supplier bulan berjalan.

Daftar hutang minimal menampilkan:

- Nomor pembelian.
- Supplier.
- Tanggal pembelian.
- Tanggal jatuh tempo.
- Total pembelian.
- Total dibayar.
- Sisa hutang.
- Status pembayaran.
- Jumlah hari menuju atau melewati jatuh tempo.
- Aksi detail dan catat pembayaran.

Filter:

- Pencarian nomor pembelian atau supplier.
- Supplier.
- Status pembayaran.
- Sudah/belum jatuh tempo.
- Rentang tanggal pembelian.
- Rentang tanggal jatuh tempo.

### 7. Pencatatan Pembayaran Hutang

Alur pembayaran:

1. Pengguna membuka detail pembelian atau hutang supplier.
2. Sistem menampilkan total, pembayaran sebelumnya, dan sisa hutang.
3. Pengguna mengisi tanggal pembayaran.
4. Pengguna mengisi nominal pembayaran.
5. Pengguna memilih metode pembayaran.
6. Pengguna mengunggah bukti jika diwajibkan.
7. Pengguna dapat menambahkan catatan atau nomor referensi.
8. Sistem memvalidasi nominal terhadap sisa hutang.
9. Pembayaran disimpan dan saldo hutang dihitung ulang dalam satu transaksi database.
10. Jika sisa menjadi nol, status pembayaran berubah menjadi lunas.

Data pembayaran:

- Nomor pembayaran otomatis, misalnya `PAY-SUP-20260822-0001`.
- Tenant.
- Supplier.
- Pembelian.
- Tanggal pembayaran.
- Nominal.
- Metode pembayaran.
- Nomor referensi — opsional.
- Bukti pembayaran.
- Catatan.
- Pengguna pencatat.
- Status valid/dibatalkan.
- Informasi pembatalan jika ada.

Aturan pembayaran:

- Nominal minimal Rp1.
- Nominal tidak boleh melebihi sisa hutang.
- Pembelian lunas atau dibatalkan tidak menerima pembayaran baru.
- Supplier pada pembayaran wajib sama dengan supplier pembelian.
- Pembayaran awal menggunakan struktur data yang sama dengan pembayaran berikutnya.
- Setiap pembayaran menghasilkan bukti pembayaran internal yang dapat dilihat atau dicetak.
- Pembayaran tidak dihapus permanen.

### 8. Status

Status dokumen pembelian:

- `posted` — pembelian valid dan stok sudah masuk.
- `void` — pembelian dibatalkan dengan audit dan stok dikembalikan.

Status pembayaran:

- `unpaid` — belum ada pembayaran.
- `partial` — sudah dibayar sebagian.
- `paid` — sudah lunas.
- `overdue` — masih mempunyai saldo setelah tanggal jatuh tempo.

`overdue` dapat dihitung secara dinamis dari sisa hutang dan jatuh tempo, sehingga tidak memerlukan perubahan manual setiap hari.

### 9. Dampak terhadap Stok

Ketika pembelian diposting:

- Setiap item menambah stok barang terkait.
- Sistem membuat satu mutasi stok masuk untuk setiap item.
- Mutasi menyimpan referensi pembelian dan item pembelian.
- Status pembayaran tidak memengaruhi jumlah stok.

Contoh:

```text
Stok awal Aqua                 20 pcs
Pembelian dari Supplier A      50 pcs
------------------------------------
Stok setelah pembelian         70 pcs
```

Pembelian tempo tetap membuat stok menjadi 70 pcs meskipun belum dibayar.

Harga beli pada item menjadi snapshot historis dan memperbarui HPP rata-rata bergerak untuk produk maupun bahan baku.

#### Aturan Moving Average Cost

Setiap stok masuk dengan biaya baru menghitung ulang HPP:

```text
nilai_stok_lama = stok_lama × HPP_rata_rata_lama
nilai_stok_masuk = jumlah_masuk × biaya_bersih_per_unit

HPP_rata_rata_baru =
    (nilai_stok_lama + nilai_stok_masuk)
    ÷ (stok_lama + jumlah_masuk)
```

Biaya bersih per unit sudah memperhitungkan alokasi diskon dan biaya tambahan pembelian.

Aturan:

- Perhitungan dilakukan sebelum stok pembelian ditambahkan dan disimpan dalam satu transaksi database.
- Jika stok lama nol, HPP baru sama dengan biaya bersih per unit pembelian.
- Pembelian berikutnya menghitung ulang rata-rata; pembelian lama tidak berubah.
- Stok keluar tidak menghitung ulang HPP rata-rata.
- Penjualan produk menyimpan snapshot HPP rata-rata produk saat transaksi.
- Pemakaian bahan baku melalui resep menyimpan snapshot HPP rata-rata bahan baku saat pemakaian.
- Penyesuaian stok keluar memakai HPP rata-rata saat penyesuaian.
- Penyesuaian stok masuk wajib mempunyai biaya per unit dan ikut menghitung ulang moving average.
- Retur atau pembatalan penjualan menambah stok kembali menggunakan snapshot HPP dari transaksi asal dan menghitung ulang moving average.
- Harga jual produk tidak berubah otomatis.
- Margin produk dihitung dari harga jual dan HPP rata-rata terbaru.
- Laba historis memakai snapshot HPP saat transaksi, sehingga tidak berubah akibat pembelian berikutnya.

Contoh:

```text
Stok lama: 10 Aqua × HPP Rp3.000 = Rp30.000
Stok masuk: 20 Aqua × biaya Rp3.600 = Rp72.000

Stok baru = 30 Aqua
Nilai persediaan = Rp102.000
HPP rata-rata baru = Rp102.000 ÷ 30 = Rp3.400

Jika terjual 15 Aqua:
HPP transaksi = 15 × Rp3.400 = Rp51.000
Sisa stok = 15 Aqua
HPP rata-rata tetap Rp3.400
```

#### Stok Lama Saat Aktivasi Moving Average

- Produk lama memakai jumlah stok dan HPP produk yang sudah tersimpan sebagai saldo serta biaya pembuka.
- Bahan baku lama belum mempunyai HPP pada sistem saat ini. Owner wajib mengisi HPP pembuka untuk bahan baku dengan stok positif melalui layar setup satu kali.
- Tenant baru menggunakan moving average langsung sejak pembelian pertama.
- Untuk tenant lama, pelaporan HPP bahan baku baru aktif setelah seluruh bahan baku dengan stok positif mempunyai HPP pembuka.
- Setup menyimpan pelaku dan waktu serta tidak mengubah jumlah stok fisik.

### 10. Pembatalan dan Koreksi

Karena pembelian memengaruhi stok dan hutang, item pembelian yang sudah diposting tidak dapat diedit langsung.

Koreksi dilakukan dengan aturan:

- Pembayaran dapat dibatalkan oleh owner dengan konfirmasi password dan alasan.
- Pembatalan pembayaran menambah kembali sisa hutang dan menyimpan pelaku, waktu, serta alasan.
- Pembelian hanya dapat dibatalkan setelah seluruh pembayaran validnya dibatalkan.
- Pembelian hanya dapat dibatalkan otomatis jika belum ada mutasi stok lain untuk barang terkait setelah pembelian tersebut diposting.
- Pembatalan pembelian membuat mutasi stok pembalik untuk setiap item.
- Jika sudah ada penjualan, pemakaian, atau stok masuk berikutnya, pembatalan ditolak agar HPP rata-rata dan transaksi historis tidak dihitung ulang secara retroaktif. Koreksi dilakukan melalui retur pembelian pada fase berikutnya atau penyesuaian stok dengan otorisasi owner.
- Nomor dokumen, item, bukti, dan histori tidak dihapus.

MVP tidak mendukung edit kuantitas atau harga pada pembelian yang sudah diposting. Pengguna membatalkan dokumen yang salah lalu membuat pembelian baru.

### 11. Arus Kas dan Laporan

MVP menggunakan pendekatan arus kas sederhana:

- Pembelian tempo tanpa pembayaran awal belum menjadi arus kas keluar.
- Pembayaran awal menjadi arus kas keluar pada tanggal pembayaran.
- Setiap cicilan berikutnya menjadi arus kas keluar pada tanggal pembayaran.
- Nilai arus kas keluar berasal dari pembayaran supplier, bukan dari total pembelian.
- Pembayaran supplier tidak otomatis membuat baris baru pada tabel pengeluaran manual.
- Laporan keuangan menggabungkan pengeluaran manual dan pembayaran supplier sebagai dua sumber berbeda untuk mencegah pencatatan ganda.

Laporan pembelian minimal:

- Total pembelian per periode.
- Total pembayaran supplier per periode.
- Total hutang berjalan.
- Pembelian per supplier.
- Pembelian per barang.
- Riwayat harga beli barang.
- Nilai persediaan berdasarkan stok berjalan dikali HPP rata-rata terbaru.
- HPP aktual per transaksi berdasarkan snapshot moving average saat stok keluar.
- Daftar hutang dan umur hutang.

Ringkasan umur hutang:

- Belum jatuh tempo.
- Terlambat 1–7 hari.
- Terlambat 8–30 hari.
- Terlambat lebih dari 30 hari.

### 12. Tampilan Detail Pembelian

Halaman detail menampilkan:

- Nomor dan tanggal pembelian.
- Supplier dan nomor faktur supplier.
- Status dokumen dan pembayaran.
- Daftar barang, kuantitas, harga beli, alokasi diskon/biaya, biaya bersih, serta dampak pada HPP rata-rata.
- Subtotal barang, diskon, biaya tambahan, total akhir, total dibayar, dan sisa hutang.
- Jatuh tempo akhir atau jadwal termin.
- Nota/faktur supplier.
- Timeline pembayaran.
- Bukti setiap pembayaran.
- Tombol catat pembayaran jika masih ada saldo.
- Audit pembatalan jika dokumen atau pembayaran dibatalkan.

## Hak Akses

Hak akses baru yang disarankan:

- `suppliers.view`
- `suppliers.create`
- `suppliers.edit`
- `purchases.view`
- `purchases.create`
- `purchases.pay`
- `purchases.void`
- `supplier-payables.view`

Aturan default:

- Owner mempunyai seluruh hak akses.
- Employee hanya memperoleh akses yang diberikan melalui role.
- Kasir terbatas tidak mempunyai akses pembelian atau hutang supplier.
- Pembatalan pembelian dan pembayaran hanya dapat dilakukan owner pada MVP.

## Notifikasi Dalam Aplikasi

MVP menyediakan notifikasi:

- Hutang akan jatuh tempo dalam 3 hari.
- Hutang jatuh tempo hari ini.
- Hutang sudah terlambat.
- Pembayaran hutang berhasil dicatat.
- Hutang pembelian sudah lunas.

Notifikasi jatuh tempo tidak dikirim berulang lebih dari satu kali per hari untuk hutang yang sama.

## Model Data yang Diusulkan

### `suppliers`

- `id`
- `tenant_id`
- `name`
- `phone`, `email`, `address`, `contact_name`
- `note`
- `is_active`
- timestamps
- unique case-insensitive `tenant_id + name`

### `purchases`

- `id`
- `tenant_id`
- `supplier_id`
- `number`
- `supplier_invoice_number` — nullable
- `purchase_date`
- `payment_term` — paid/credit/installment
- `due_date` — nullable
- `items_subtotal`
- `discount_amount`
- `additional_cost_amount`
- `additional_cost_note` — nullable
- `total_amount`
- `paid_amount`
- `balance_amount`
- `document_status` — posted/void
- `payment_status` — unpaid/partial/paid
- `supplier_invoice_path` — nullable
- `note`
- `created_by`
- `voided_by`, `voided_at`, `void_reason` — nullable
- timestamps

### `purchase_items`

- `id`
- `purchase_id`
- `tenant_id`
- `purchasable_type` — product/raw_material
- `purchasable_id`
- `item_name` — snapshot
- `unit_name` — snapshot
- `quantity`
- `unit_cost`
- `subtotal`
- `allocated_discount`
- `allocated_additional_cost`
- `inventory_cost_total`
- `inventory_unit_cost`
- timestamps

### `purchase_installments`

- `id`
- `tenant_id`
- `purchase_id`
- `sequence`
- `due_date`
- `planned_amount`
- `paid_amount`
- `status` — scheduled/partial/paid
- `note` — nullable
- timestamps

### `supplier_payments`

- `id`
- `tenant_id`
- `supplier_id`
- `purchase_id`
- `number`
- `payment_date`
- `amount`
- `payment_method` — cash/bank_transfer/qris/other
- `reference_number` — nullable
- `proof_path` — nullable sesuai aturan metode
- `note`
- `created_by`
- `status` — valid/void
- `voided_by`, `voided_at`, `void_reason` — nullable
- timestamps

### `supplier_payment_allocations`

- `id`
- `supplier_payment_id`
- `purchase_installment_id`
- `amount`
- timestamps

Tabel ini mencatat pembagian satu pembayaran aktual ke satu atau beberapa termin. Jumlah alokasi harus sama dengan nominal pembayaran yang dialokasikan ke jadwal.

### Perubahan pada `products`

- Kolom `cost` dipakai sebagai HPP moving average terbaru.
- Presisi internal diubah agar mendukung pecahan hasil rata-rata.
- Harga jual tetap disimpan terpisah dan tidak berubah otomatis.

### Penambahan pada `raw_materials`

- `average_cost` — HPP moving average terbaru.
- `opening_cost_confirmed_at` — nullable, untuk setup stok lama.
- `opening_cost_confirmed_by` — nullable.

### Penambahan pada `transaction_items`

- `cost_snapshot` — HPP rata-rata per unit ketika transaksi selesai.
- `total_cost_snapshot` — quantity dikali cost snapshot.

Snapshot membuat laba transaksi lama tidak berubah setelah HPP rata-rata diperbarui.

### Penambahan pada `stock_movements`

- `reference_type` — nullable
- `reference_id` — nullable
- `stock_before`
- `stock_after`
- `average_cost_before`
- `average_cost_after`
- `unit_cost_snapshot`
- `total_cost_snapshot`

Referensi menghubungkan mutasi stok dengan pembelian, penjualan, pemakaian bahan baku, retur, atau penyesuaian. Nilai sebelum dan sesudah membuat perhitungan moving average dapat diaudit tanpa membuat tabel lapisan biaya.

Nilai biaya rata-rata disimpan dengan presisi desimal internal, misalnya empat angka di belakang koma. Tampilan Rupiah dan total laporan dibulatkan menggunakan aturan pembulatan yang konsisten; nilai internal tidak dipotong pada setiap langkah perhitungan.

## Konsistensi dan Transaksi Database

Operasi berikut wajib menggunakan transaksi database dan row locking:

- Posting pembelian dan penambahan stok.
- Pembuatan pembayaran awal.
- Pencatatan cicilan.
- Perhitungan ulang `paid_amount` dan `balance_amount`.
- Pembatalan pembayaran.
- Pembatalan pembelian dan pengembalian stok.

Header pembelian harus selalu memenuhi:

```text
items_subtotal = jumlah subtotal item
total_amount = items_subtotal - discount_amount + additional_cost_amount
total_amount = jumlah inventory_cost_total seluruh item
paid_amount = jumlah supplier_payments berstatus valid
balance_amount = total_amount - paid_amount
balance_amount >= 0
```

Untuk jadwal cicilan:

```text
jumlah planned_amount termin aktif = balance setelah pembayaran awal
jumlah supplier_payment_allocations <= jumlah supplier_payments valid
paid_amount termin <= planned_amount termin
```

Untuk moving average:

```text
nilai_stok_sebelum = stock_before × average_cost_before
nilai_stok_masuk = quantity_in × unit_cost_snapshot
average_cost_after = (nilai_stok_sebelum + nilai_stok_masuk) ÷ stock_after
total_cost_snapshot stok keluar = quantity_out × average_cost_before
```

Nilai header boleh disimpan untuk performa, tetapi setiap perubahan wajib dihitung ulang dari detail di dalam transaksi database.

## Isolasi Tenant dan Keamanan Dokumen

- Supplier hanya dapat dipakai tenant pemiliknya.
- Barang pada pembelian harus milik tenant yang sama.
- Pembelian dan pembayaran hanya dapat dibuka tenant pemiliknya.
- ID dari tenant lain ditolak walaupun dikirim langsung melalui request.
- Bukti tidak menggunakan URL publik tanpa otorisasi.
- Endpoint unduh bukti memeriksa tenant dan hak akses pengguna.
- File diberi nama internal acak; nama unggahan asli tidak digunakan sebagai path.

## Di Luar Ruang Lingkup MVP

- Purchase order sebelum barang diterima.
- Penerimaan barang sebagian.
- Retur pembelian ke supplier.
- Perhitungan pajak pembelian terperinci per tarif atau per item.
- Pembayaran satu nominal yang dialokasikan ke beberapa pembelian sekaligus.
- Pembuatan jadwal cicilan otomatis berulang mingguan atau bulanan.
- Supplier statement import.
- Rekonsiliasi otomatis dengan rekening bank.
- Multi-currency.
- Jurnal akuntansi double-entry.
- Valuasi persediaan FIFO atau LIFO.
- Hutang supplier lintas tenant atau lintas cabang.
- Persetujuan purchase order bertingkat.

## Fase Implementasi

### Fase 1 — Supplier dan Fondasi Pembelian

- Master supplier dengan isolasi tenant.
- Model pembelian dan item pembelian.
- Nomor dokumen otomatis.
- Pemilihan produk dan bahan baku.
- Perhitungan subtotal dan total.
- Diskon serta biaya tambahan tingkat pembelian.
- Upload nota/faktur supplier.

Kriteria kelulusan:

- Supplier tenant lain tidak dapat diakses.
- Satu pembelian dapat berisi beberapa barang.
- Total pembelian sama dengan jumlah seluruh item.
- Snapshot nama, satuan, dan harga beli tersimpan.
- Diskon serta biaya tambahan teralokasi ke item tanpa selisih total.

### Fase 2 — Stok Masuk

- Posting pembelian menambah stok.
- Mutasi stok menyimpan referensi pembelian.
- Moving average cost untuk produk dan bahan baku.
- Setup HPP pembuka bahan baku tenant lama.
- Snapshot HPP pada penjualan, pemakaian bahan baku, retur, dan penyesuaian stok.
- Pencegahan double-posting.

Kriteria kelulusan:

- Setiap item hanya menambah stok satu kali.
- Pembelian tunai maupun tempo menghasilkan stok yang sama.
- Retry request tidak menggandakan stok.
- Stok masuk menghitung HPP rata-rata tertimbang secara atomik.
- Stok keluar tidak mengubah HPP rata-rata dan menyimpan snapshot biaya transaksi.
- Tenant lama mengisi HPP pembuka bahan baku tanpa mengubah stok fisik.

### Fase 3 — Hutang dan Pembayaran

- Syarat lunas, tempo, dan cicilan.
- Pembayaran awal.
- Daftar hutang supplier.
- Pilihan satu jatuh tempo atau jadwal termin fleksibel.
- Pencatatan pembayaran berikutnya.
- Upload dan akses bukti.
- Status unpaid/partial/paid/overdue.

Kriteria kelulusan:

- Pembelian tempo membentuk hutang penuh.
- Pembelian cicilan membentuk hutang sebesar sisa.
- Pembayaran mengurangi saldo tepat satu kali.
- Pembayaran berlebih ditolak.
- Pelunasan mengubah status menjadi paid.
- Jumlah rencana termin selalu sama dengan sisa hutang setelah pembayaran awal.
- Pembayaran aktual dapat dialokasikan ke satu atau beberapa termin tanpa melebihi sisa hutang.

### Fase 4 — Laporan, Notifikasi, dan Pembatalan

- Arus kas keluar dari pembayaran supplier.
- Ringkasan umur hutang.
- Notifikasi jatuh tempo.
- Pembatalan pembayaran.
- Pembatalan pembelian dan mutasi stok pembalik.
- Audit pelaku dan alasan.

Kriteria kelulusan:

- Pembelian tempo tidak langsung mengurangi arus kas.
- Setiap pembayaran masuk ke arus kas keluar pada tanggal yang benar.
- Pengeluaran tidak tercatat dua kali.
- Pembatalan mengembalikan saldo dan stok secara konsisten.

### Fase 5 — Verifikasi E2E

- Test authorization dan isolasi tenant.
- Test pembelian lunas, tempo, dan cicilan.
- Test produk serta bahan baku.
- Test moving average dari beberapa pembelian dengan harga berbeda.
- Test snapshot HPP pada stok keluar serta retur.
- Test alokasi diskon serta biaya tambahan ke biaya bersih moving average.
- Test pembayaran awal dan pembayaran lanjutan.
- Test satu jatuh tempo dan jadwal termin fleksibel.
- Test bukti pembayaran.
- Test jatuh tempo.
- Test pembatalan pembayaran dan pembelian.
- Test integrasi laporan keuangan.
- Build frontend production.

## Kriteria Penerimaan

1. Pengguna dapat membuat supplier dan memilihnya pada pembelian.
2. Pengguna dapat memilih beberapa barang dengan kuantitas dan harga beli berbeda.
3. Pembelian yang diposting menambah stok tepat satu kali.
4. Pembelian lunas menghasilkan saldo hutang nol.
5. Pembelian tempo menghasilkan hutang sebesar total pembelian.
6. Pembelian cicilan menghasilkan hutang sebesar total dikurangi pembayaran awal.
7. Jatuh tempo wajib untuk tempo dan cicilan.
8. Pengguna dapat mencatat beberapa pembayaran sampai hutang lunas.
9. Pembayaran tidak dapat melebihi sisa hutang.
10. Transfer, QRIS, dan metode lainnya mewajibkan bukti pembayaran.
11. Bukti pembayaran hanya dapat dilihat pengguna tenant yang berwenang.
12. Detail pembelian menampilkan seluruh riwayat pembayaran dan saldo setelah pembayaran.
13. Hutang terlambat ditandai secara otomatis.
14. Pembayaran supplier tercatat sebagai arus kas keluar tanpa membuat pengeluaran ganda.
15. Pembatalan pembayaran dan pembelian menyimpan audit lengkap.
16. Data supplier, pembelian, pembayaran, dan stok terisolasi antar tenant.
17. Automated test mencakup nominal, stok, hutang, pembayaran, bukti, pembatalan, dan isolasi tenant.
18. Pembelian produk dan bahan baku menghitung ulang HPP rata-rata masing-masing menggunakan kuantitas serta nilai persediaan sebelum pembelian.
19. Stok keluar tidak mengubah HPP rata-rata dan menyimpan snapshot HPP pada saat transaksi.
20. Pembelian berikutnya tidak mengubah HPP atau laba transaksi yang sudah selesai.
21. Diskon dan biaya tambahan dialokasikan ke item, dan jumlah biaya persediaan sama dengan total akhir pembelian.
22. Pengguna pembelian cicilan dapat memilih satu jatuh tempo akhir atau beberapa termin manual.
23. Jumlah seluruh termin sama dengan sisa hutang setelah pembayaran awal.
24. Pembayaran aktual memperbarui saldo pembelian dan status termin tanpa membuat pembayaran otomatis.
25. Produk lama memakai HPP tersimpan dan bahan baku lama mempunyai proses pengisian HPP pembuka.

## Contoh Skenario

### Pembelian Lunas

```text
Supplier: Supplier Sejahtera
Barang: Aqua 50 pcs × Rp3.000
Total: Rp150.000
Syarat: Lunas
Metode: Cash
Pembayaran awal: Rp150.000
```

Hasil:

- Stok Aqua bertambah 50 pcs.
- Total dibayar Rp150.000.
- Sisa hutang Rp0.
- Status pembayaran `paid`.
- Arus kas keluar bertambah Rp150.000.

### Pembelian Tempo

```text
Supplier: Supplier Sejahtera
Barang: Aqua 100 pcs × Rp3.000
Total: Rp300.000
Syarat: Tempo
Jatuh tempo: 30 September 2026
Pembayaran awal: Rp0
```

Hasil:

- Stok Aqua langsung bertambah 100 pcs.
- Total dibayar Rp0.
- Sisa hutang Rp300.000.
- Status pembayaran `unpaid`.
- Belum ada arus kas keluar.

### Pembelian Cicilan

```text
Total pembelian: Rp1.000.000
Pembayaran awal via transfer: Rp300.000
Sisa hutang: Rp700.000
Mode jadwal: Termin fleksibel
Termin 1: 10 September 2026 — Rp200.000
Termin 2: 20 September 2026 — Rp500.000
```

Pembayaran berikutnya:

```text
10 September — Cash      Rp200.000
20 September — Transfer  Rp500.000
```

Hasil akhir:

- Terdapat tiga riwayat pembayaran, termasuk pembayaran awal.
- Total dibayar Rp1.000.000.
- Sisa hutang Rp0.
- Status pembayaran `paid`.
- Setiap pembayaran non-cash mempunyai bukti masing-masing.

## Keputusan Bisnis Final MVP

1. Syarat pembayaran terdiri dari lunas, tempo, dan cicilan.
2. Metode pembayaran dipisahkan dari syarat pembayaran dan terdiri dari cash, transfer, QRIS, dan lainnya.
3. Pembelian tempo tidak mempunyai pembayaran awal.
4. Pembelian cicilan wajib mempunyai pembayaran awal sebagian.
5. Tempo dan cicilan wajib mempunyai tanggal jatuh tempo.
6. Stok bertambah saat pembelian diposting, tidak menunggu pelunasan.
7. Hutang dicatat per pembelian dan diringkas per supplier.
8. Satu pembayaran hanya untuk satu pembelian pada MVP.
9. Bukti opsional untuk cash dan wajib untuk pembayaran non-cash.
10. Pembayaran supplier menjadi arus kas keluar dan tidak membuat pengeluaran manual otomatis.
11. Pembelian serta pembayaran tidak dihapus permanen; koreksi memakai pembatalan dengan audit.
12. Produk dan bahan baku dapat dibeli dalam satu dokumen.
13. HPP produk dan bahan baku menggunakan moving average cost yang dihitung ulang setiap stok masuk berbiaya.
14. Penjualan, pemakaian bahan baku, dan stok keluar menyimpan snapshot HPP rata-rata saat transaksi.
15. Harga jual tidak berubah otomatis akibat pembelian atau perubahan HPP rata-rata.
16. Produk lama memakai HPP tersimpan; bahan baku dengan stok lama meminta HPP pembuka dari owner.
17. Pembelian mendukung diskon serta biaya tambahan yang dialokasikan proporsional ke biaya persediaan item.
18. Pajak pembelian terperinci belum termasuk MVP.
19. Pembelian cicilan menawarkan satu jatuh tempo akhir atau jadwal termin manual yang bebas ditentukan pengguna.
20. Jadwal termin tidak membayar otomatis dan tidak menggantikan saldo hutang aktual.
21. FIFO ditunda ke fase lanjutan dan tidak termasuk implementasi MVP ini.
