# PRD — Stock Opname Terpadu

## 1. Ringkasan

Stock Opname Terpadu memungkinkan satu tenant/outlet menghitung stok fisik seluruh produk dan bahan baku dalam satu dokumen, membandingkannya dengan stok sistem, meminta persetujuan owner, lalu memposting selisih sebagai mutasi stok yang dapat diaudit.

Dokumen ini mengikuti proses rilis pada `docs/PRD_SYSTEM_UPDATES_AND_RELEASE_NOTES.md` dan diklasifikasikan sebagai perubahan `MINOR` karena menambahkan modul bisnis baru.

## 2. Tujuan

- Membuat sesi opname per tanggal dan tenant/outlet.
- Menyimpan snapshot stok dan HPP ketika sesi dibuat.
- Memungkinkan petugas mengisi stok fisik tanpa menghitung selisih manual.
- Memperhitungkan transaksi yang terjadi ketika sesi masih berjalan.
- Menggabungkan produk dan bahan baku dalam satu dokumen.
- Menyediakan alur `Draft → Sedang dihitung → Menunggu persetujuan → Diposting`.
- Membatasi posting kepada owner.
- Membuat mutasi stok dan laporan nilai selisih berdasarkan HPP.

## 3. Aktor dan Permission

- Pengguna dengan `stock-opnames.view` dapat melihat sesi dan laporan.
- Pengguna dengan `stock-opnames.create` dapat membuat serta memulai sesi.
- Pengguna dengan `stock-opnames.count` dapat mengisi dan mengirim hasil hitung.
- Hanya owner yang dapat memposting atau membatalkan sesi.
- Semua akses dibatasi pada `tenant_id` pengguna.

## 4. Status

| Status | Makna | Aksi |
| --- | --- | --- |
| `draft` | Snapshot sudah dibuat tetapi hitung belum dimulai | Mulai atau batalkan |
| `counting` | Petugas sedang mengisi stok fisik | Simpan parsial atau kirim |
| `submitted` | Menunggu pemeriksaan owner | Owner posting atau kembalikan ke counting |
| `posted` | Selisih sudah menjadi mutasi stok | Hanya lihat laporan |
| `cancelled` | Sesi dibatalkan tanpa mengubah stok | Hanya lihat audit |

## 5. Aturan Snapshot dan Transaksi Berjalan

Saat sesi dibuat, sistem mengunci daftar persediaan aktif, menyimpan stok sistem, HPP, waktu snapshot, dan ID mutasi terakhir. Hanya satu sesi nonfinal yang diperbolehkan per tenant.

Ketika petugas menyimpan jumlah fisik, server menyimpan waktu hitung. Stok sistem pembanding pada waktu hitung dihitung sebagai:

```text
stok_pembanding = stok_snapshot + seluruh_mutasi_setelah_snapshot_sampai_waktu_hitung
selisih = stok_fisik - stok_pembanding
nilai_selisih = selisih × HPP_pada_waktu_hitung
```

Mutasi sah setelah waktu hitung tidak mengubah besar selisih. Saat posting, selisih tersebut diterapkan ke stok terkini sehingga penjualan, pembelian, retur, atau penyesuaian yang terjadi selama opname tetap dipertahankan.

Jika posting akan membuat stok terkini negatif, posting ditolak dan sesi harus dikembalikan untuk dihitung ulang.

## 6. Ruang Lingkup Item

- Produk aktif yang menggunakan pelacakan stok.
- Bahan baku aktif.
- Nama, jenis, satuan, stok snapshot, dan HPP snapshot disimpan agar dokumen historis tidak berubah jika master data berubah.
- Item yang ditambahkan setelah snapshot masuk ke sesi opname berikutnya.

## 7. Alur Utama

1. Pengguna membuat sesi dan mengisi tanggal serta catatan opsional.
2. Sistem membuat nomor unik dan snapshot seluruh item.
3. Pengguna memulai penghitungan.
4. Petugas mencari item dan mengisi jumlah fisik; data dapat disimpan sebagian.
5. Sistem menampilkan progres, stok pembanding, selisih kuantitas, serta nilai selisih.
6. Setelah semua item dihitung, petugas mengirim sesi untuk persetujuan.
7. Owner memeriksa ringkasan selisih dan item bermasalah.
8. Owner memposting atau mengembalikan sesi ke petugas disertai alasan.
9. Posting membuat mutasi `adjustment` untuk setiap item berselisih dan menyimpan referensi item opname.
10. Sesi menjadi read-only dan tersedia sebagai laporan historis.

## 8. Model Data

### `stock_opnames`

- Identitas: `tenant_id`, `number`, `opname_date`, `status`, `note`.
- Snapshot: `snapshot_at`, `snapshot_movement_id`.
- Audit: `created_by`, `started_by/at`, `submitted_by/at`, `posted_by/at`, `cancelled_by/at`, `cancel_reason`, `review_note`.

### `stock_opname_items`

- Identitas: `stock_opname_id`, `tenant_id`, polymorphic `stockable`.
- Snapshot: `item_name`, `item_type`, `unit_name`, `system_stock_snapshot`, `average_cost_snapshot`.
- Hitung: `physical_stock`, `counted_by`, `counted_at`.
- Rekonsiliasi: `expected_stock_at_count`, `average_cost_at_count`, `variance_quantity`, `variance_value`.
- Posting: `posted_stock_before`, `posted_stock_after`, `stock_movement_id`.

## 9. Persyaratan UI/UX

- Daftar sesi menampilkan nomor, tanggal, status, progres, jumlah selisih, dan nilai bersih.
- Form counting mengutamakan penggunaan mobile: pencarian cepat, input numerik besar, tombol simpan tetap mudah dijangkau, dan indikator tersimpan.
- Filter jenis item: semua, produk, atau bahan baku.
- Filter hitung: semua, belum dihitung, sesuai, atau selisih.
- Review menampilkan total lebih, total kurang, nilai bersih, dan rincian setiap item.
- Seluruh modal harus dapat di-scroll pada mobile sesuai standar modal global.
- Status dan selisih tidak hanya dibedakan dengan warna; selalu disertai teks/ikon.

## 10. Audit dan HPP

- Setiap mutasi posting menyimpan pengguna, stok sebelum/sesudah, HPP, kuantitas, dan referensi ke item opname.
- Selisih kurang menggunakan HPP moving average pada waktu hitung sebagai nilai laporan.
- Selisih lebih diperlakukan sebagai stok yang ditemukan pada HPP berjalan; HPP rata-rata tidak berubah.
- Item dengan HPP nol tetap dapat diposting tetapi nilai selisihnya nol dan ditandai pada laporan.
- Sesi posted/cancelled tidak dapat diedit atau dihapus.

## 11. Kriteria Penerimaan

- Hanya satu sesi aktif dapat dibuat per tenant.
- Snapshot mencakup seluruh produk tracked dan bahan baku aktif.
- Penyimpanan parsial dan progres penghitungan berfungsi.
- Submit ditolak sampai seluruh item dihitung.
- Pergerakan stok selama opname masuk ke stok pembanding berdasarkan waktu hitung.
- Owner dapat mengembalikan atau memposting sesi submitted.
- Posting atomik dan idempoten; request ganda tidak membuat mutasi ganda.
- Selisih menghasilkan mutasi dan tampil di riwayat stok.
- Posting yang membuat stok minus ditolak.
- Tenant lain tidak dapat melihat atau mengubah sesi.
- Laporan kuantitas dan nilai HPP sesuai hasil rekonsiliasi.
- Tampilan counting dapat digunakan pada viewport 320 × 568 px.

## 12. Pengujian

- Pembuatan snapshot dan pencegahan sesi aktif ganda.
- Penyimpanan hitung parsial dan submit lengkap.
- Rekonsiliasi mutasi yang terjadi setelah snapshot.
- Otorisasi petugas dan owner.
- Posting positif/negatif, idempotensi, dan rollback ketika stok tidak cukup.
- Isolasi tenant.
- Render daftar, counting, review, status kosong, mobile, dan build frontend.

