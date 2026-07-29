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
