# PRD — Pilihan Harga Produk dengan Satu Sumber Stok

## Status Dokumen

- Status: Implementasi utama selesai; perubahan pilihan harga dari keranjang masih berjalan
- Audit implementasi terakhir: 27 Agustus 2026

## Ringkasan

Satu produk fisik dapat dijual dengan harga berbeda berdasarkan cara penjualan atau layanan yang dipilih. Seluruh pilihan harga tetap menggunakan stok produk utama yang sama dan tidak memiliki stok sendiri.

Contoh:

| Produk | Pilihan harga | Harga jual | Sumber stok |
|---|---|---:|---|
| Aqua | Beli langsung | Rp20.000 | Aqua |
| Aqua | Diantar | Rp22.000 | Aqua |
| Aqua | Diantar jauh | Rp23.000 | Aqua |

Jika stok Aqua adalah 200 pcs, ketiga pilihan harga tersebut tetap merepresentasikan total stok 200 pcs, bukan 600 pcs.

## Tujuan

- Memungkinkan satu produk mempunyai lebih dari satu pilihan harga jual.
- Menjaga satu sumber stok pada produk utama.
- Memudahkan kasir memilih harga yang sesuai ketika memasukkan produk ke keranjang.
- Menyediakan laporan penjualan yang dapat membedakan pilihan harga yang digunakan.
- Mencegah duplikasi dan penggelembungan jumlah stok akibat pembuatan produk terpisah.

## Istilah

- **Produk utama**: barang fisik yang menyimpan identitas produk, satuan, harga modal, dan stok.
- **Pilihan harga**: pilihan cara penjualan atau layanan beserta harga jualnya. Pilihan harga bukan produk dan tidak memiliki stok.
- **Harga default**: pilihan harga yang otomatis dipilih atau digunakan sebagai harga utama produk.

Istilah **pilihan harga** digunakan pada antarmuka, bukan **produk turunan**, karena barang fisik dan sumber stoknya tetap sama.

## Ruang Lingkup

### Pengelolaan produk

Pemilik atau pengguna yang berwenang dapat:

- Menambahkan lebih dari satu pilihan harga pada produk.
- Memberikan nama pilihan, harga jual, dan status aktif/nonaktif.
- Menentukan satu pilihan sebagai harga default.
- Mengubah urutan pilihan harga yang ditampilkan di kasir.
- Mengubah harga tanpa mengubah stok produk utama.

Contoh konfigurasi:

```text
Produk: Aqua
Stok: 200 pcs

Pilihan harga:
1. Beli langsung — Rp20.000 (default)
2. Diantar — Rp22.000
3. Diantar jauh — Rp23.000
```

### Alur kasir

1. Kasir memilih produk.
2. Jika produk hanya mempunyai satu pilihan harga aktif, produk langsung masuk ke keranjang dengan harga tersebut.
3. Jika produk mempunyai lebih dari satu pilihan harga aktif, sistem menampilkan dialog pilihan harga.
4. Kasir memilih salah satu pilihan harga.
5. Produk masuk ke keranjang dengan nama produk, pilihan harga, kuantitas, dan harga yang dipilih.
6. Stok produk utama baru dikurangi sesuai mekanisme penyelesaian transaksi yang berlaku.

Contoh dialog:

```text
Aqua

( ) Beli langsung       Rp20.000
( ) Diantar             Rp22.000
( ) Diantar jauh        Rp23.000
```

### Tampilan keranjang dan struk

- Nama produk utama tetap ditampilkan sebagai nama barang.
- Nama pilihan harga ditampilkan sebagai keterangan agar kasir dan pelanggan mengetahui harga yang dipilih.
- Harga satuan yang dicatat adalah harga pilihan saat produk dimasukkan ke transaksi.
- Pilihan harga dapat diganti dari keranjang sebelum transaksi diselesaikan, selama pengguna mempunyai izin yang sesuai.

Contoh:

```text
Aqua
Diantar jauh
2 x Rp23.000 = Rp46.000
```

## Aturan Bisnis

1. Stok hanya dimiliki dan dikelola oleh produk utama.
2. Pilihan harga tidak mempunyai kolom, saldo, atau penyesuaian stok sendiri.
3. Penjualan melalui pilihan harga mana pun mengurangi stok produk utama sesuai jumlah yang terjual.
4. Pembatalan atau retur yang mengembalikan barang menambah kembali stok produk utama.
5. Transaksi yang ditahan belum boleh menyebabkan pengurangan stok permanen, mengikuti aturan stok transaksi yang berlaku di aplikasi.
6. Sistem harus menolak penyelesaian transaksi jika jumlah yang dijual melebihi stok produk utama, kecuali pengaturan aplikasi secara eksplisit mengizinkan stok negatif.
7. Setiap produk yang dapat dijual harus mempunyai sedikitnya satu pilihan harga aktif.
8. Dalam satu produk hanya boleh ada satu pilihan harga default.
9. Pilihan harga yang pernah digunakan dalam transaksi tidak dihapus secara permanen; pilihan tersebut dinonaktifkan agar riwayat tetap dapat ditelusuri.
10. Perubahan nama atau harga pilihan tidak mengubah transaksi yang sudah selesai.
11. Detail transaksi menyimpan salinan nama pilihan dan harga jual pada saat transaksi dilakukan.
12. Satu produk yang sama boleh muncul lebih dari sekali di keranjang apabila pilihan harganya berbeda. Item dengan produk dan pilihan harga yang sama dapat digabungkan kuantitasnya.

## Perhitungan Stok

Contoh:

```text
Stok awal Aqua                200 pcs
Terjual — Beli langsung       10 pcs
Terjual — Diantar              5 pcs
Terjual — Diantar jauh         3 pcs
-------------------------------------
Stok akhir Aqua              182 pcs
```

Semua mutasi stok dicatat atas nama produk utama, dengan referensi ke detail transaksi dan pilihan harga yang digunakan.

## Pelaporan

Laporan penjualan minimal dapat menampilkan:

- Nama produk utama.
- Pilihan harga yang digunakan.
- Jumlah terjual per pilihan harga.
- Harga satuan saat transaksi.
- Omzet per pilihan harga.
- Total penjualan produk dari seluruh pilihan harga.

Laporan stok hanya menampilkan saldo produk utama dan tidak menggandakan stok berdasarkan jumlah pilihan harga.

## Hak Akses

- Pengelolaan pilihan harga mengikuti hak akses pengelolaan produk.
- Kasir hanya dapat memilih pilihan harga yang aktif.
- Perubahan harga secara manual di luar pilihan yang tersedia mengikuti aturan diskon atau otorisasi perubahan harga yang berlaku di aplikasi.

## Kondisi Khusus

- Produk tanpa pilihan harga aktif tidak dapat dijual sampai mempunyai minimal satu pilihan aktif.
- Jika pilihan default dinonaktifkan, pengguna wajib menentukan pilihan default baru.
- Pilihan yang dinonaktifkan tidak tampil untuk transaksi baru, tetapi tetap tampil pada riwayat dan laporan transaksi lama.
- Jika stok produk utama habis, seluruh pilihan harga produk tersebut ikut tidak dapat dijual.
- Menghapus atau menonaktifkan produk utama otomatis membuat seluruh pilihan harganya tidak dapat digunakan untuk transaksi baru.

## Di Luar Ruang Lingkup

- Stok terpisah untuk setiap pilihan harga.
- Perbedaan bahan baku atau komposisi berdasarkan pilihan harga.
- Pilihan ukuran, warna, atau kemasan yang benar-benar merupakan barang fisik dan SKU berbeda.
- Perhitungan ongkos kirim satu kali untuk keseluruhan pesanan. Ongkos kirim tingkat pesanan perlu dirancang sebagai fitur terpisah apabila satu pengantaran dapat berisi beberapa produk.

## Kriteria Penerimaan

- Produk dapat memiliki satu atau lebih pilihan harga.
- Produk dengan beberapa pilihan harga menampilkan dialog pilihan ketika dipilih di kasir.
- Produk dengan satu pilihan harga aktif dapat langsung dimasukkan ke keranjang.
- Harga yang masuk ke keranjang sesuai dengan pilihan kasir.
- Semua penjualan mengurangi stok produk utama, tanpa membuat stok pada pilihan harga.
- Penjualan melalui beberapa pilihan harga menghasilkan satu saldo stok produk yang benar.
- Retur atau pembatalan mengembalikan stok ke produk utama sesuai aturan transaksi.
- Struk dan detail transaksi menampilkan pilihan harga yang digunakan.
- Transaksi lama mempertahankan nama pilihan dan harga historis setelah konfigurasi harga diubah.
- Laporan dapat memisahkan penjualan berdasarkan pilihan harga dan menjumlahkannya sebagai total produk utama.

## Contoh Skenario Penerimaan

### Menjual dengan harga berbeda

**Diberikan** Aqua mempunyai stok 200 pcs serta pilihan Beli langsung Rp20.000 dan Diantar Rp22.000.  
**Ketika** kasir menjual 2 Aqua dengan pilihan Beli langsung dan 3 Aqua dengan pilihan Diantar.  
**Maka** stok Aqua menjadi 195 pcs dan tidak ada saldo stok tersendiri pada kedua pilihan harga.

### Perubahan harga tidak mengubah transaksi lama

**Diberikan** satu Aqua telah terjual menggunakan pilihan Diantar seharga Rp22.000.  
**Ketika** harga pilihan Diantar diubah menjadi Rp24.000.  
**Maka** transaksi lama tetap tercatat Rp22.000 dan transaksi baru menggunakan Rp24.000.

### Stok habis berlaku untuk seluruh pilihan

**Diberikan** stok Aqua adalah 0 pcs.  
**Ketika** kasir memilih Aqua.  
**Maka** seluruh pilihan harga Aqua tidak dapat diselesaikan sebagai penjualan, kecuali toko mengizinkan stok negatif.

## Status Implementasi dan Pekerjaan Tersisa

Master pilihan harga, satu sumber stok, pemilihan harga saat memasukkan produk, snapshot transaksi, struk, laporan, serta validasi pilihan aktif telah tersedia.

### Step 1 — Mengganti Pilihan Harga dari Keranjang

- [ ] Menambahkan aksi ganti pilihan harga pada item keranjang untuk pengguna yang berwenang.
- [ ] Memperbarui harga, nama pilihan, subtotal, diskon, dan key penggabungan item secara konsisten.
- [ ] Menggabungkan kuantitas ketika pilihan baru sudah ada di keranjang dan tetap memvalidasi stok gabungan produk utama.
- [ ] Menjaga catatan/diskon item sesuai keputusan UX ketika pilihan harga diganti.

### Step 2 — Verifikasi E2E

- [ ] Menambah test perubahan pilihan harga dari keranjang.
- [ ] Menambah test penggabungan item dan penolakan stok berlebih setelah pilihan diganti.
- [ ] Menjalankan regression test POS, struk, laporan, void/retur, dan production frontend build.
- [ ] Memperbarui status PRD menjadi selesai setelah seluruh kriteria penerimaan terverifikasi.
