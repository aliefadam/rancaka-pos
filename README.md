# Rancaka

Rancaka adalah aplikasi kasir dan pengelolaan toko berbasis Laravel, Inertia.js, dan React.

## Fitur

- Dashboard superadmin, pemilik, dan karyawan
- Pengelolaan tenant, kategori, produk, serta bahan baku
- Transaksi kasir, penahanan transaksi, dan metode pembayaran
- Pembukaan dan penutupan shift
- Pergerakan serta penyesuaian stok
- Laporan transaksi dan riwayat shift

## Menjalankan aplikasi

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
php artisan serve
```

Untuk pengembangan frontend, jalankan `npm run dev`.

## Versioning aplikasi

Versi aplikasi disimpan di file `VERSION` dengan format Semantic Versioning
`MAJOR.MINOR.PATCH` dan ditampilkan di bagian bawah sidebar.

```bash
php artisan app:version          # melihat versi saat ini
php artisan app:version major    # 1.4.3 menjadi 2.0.0
php artisan app:version minor    # 2.0.1 menjadi 2.1.0
php artisan app:version patch    # 2.0.0 menjadi 2.0.1
php artisan app:version --set=3.0.0
```

- `major`: perubahan besar atau perubahan yang tidak kompatibel.
- `minor`: fitur baru atau peningkatan yang tetap kompatibel.
- `patch`: perbaikan bug tanpa fitur baru.
