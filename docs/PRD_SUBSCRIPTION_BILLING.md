# PRD — Registrasi Tenant, Google OAuth & Billing Manual

## Tujuan

Tenant dapat mendaftar mandiri, mencoba aplikasi selama 14 hari, membayar paket bulanan dengan unggah bukti, dan mendapat perpanjangan akses setelah diverifikasi superadmin.

## Alur utama

1. Pengunjung mendaftar sebagai tenant dan owner melalui formulir atau Google.
2. Pengguna Google baru mendapatkan username unik otomatis dan wajib menyelesaikan onboarding toko.
3. Sistem memberi trial 14 hari dan membuat invoice bulan pertama.
4. Owner membayar melalui transfer bank atau QRIS statis, lalu mengunggah bukti pembayaran.
5. Superadmin menyetujui atau menolak pembayaran.
6. Persetujuan mengaktifkan langganan satu bulan setelah trial/periode aktif terakhir.
7. Tenant kedaluwarsa hanya dapat membuka Billing dan logout.

## Aturan

- Satu paket bulanan; harga dan rekening berasal dari konfigurasi environment.
- Bukti pembayaran: JPG, PNG, WebP, atau PDF, maksimum 2 MB.
- Satu invoice hanya dapat memiliki satu pembayaran pending.
- Tenant lama ditandai grandfathered agar tidak terkunci.
- Tenant `inactive` tetap diblokir oleh superadmin.
- Username Google dibuat dari bagian awal email, diberi suffix jika sudah digunakan, dan dapat diubah melalui menu Akun Saya.
- Akun Google tanpa tenant tidak dapat membuka kasir atau fitur operasional sebelum nama toko dilengkapi.

## Konfigurasi Google OAuth

### Google Cloud Console

1. Buat atau pilih project di Google Cloud Console.
2. Konfigurasikan OAuth consent screen dan isi nama aplikasi, email bantuan, serta domain aplikasi.
3. Buat credential **OAuth Client ID** dengan tipe **Web application**.
4. Tambahkan origin aplikasi, misalnya `https://app.domain.com`, pada **Authorized JavaScript origins**.
5. Tambahkan callback berikut pada **Authorized redirect URIs**:
   - Lokal: `http://rancaka-pos.prog/auth/google/callback`
   - Produksi: `https://app.domain.com/auth/google/callback`
6. Salin Client ID dan Client Secret ke environment aplikasi.

### Environment aplikasi

```env
APP_URL=https://app.domain.com

GOOGLE_CLIENT_ID=client-id-dari-google
GOOGLE_CLIENT_SECRET=client-secret-dari-google
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

Setelah mengubah environment, jalankan:

```bash
php artisan config:clear
php artisan cache:clear
```

Client Secret tidak boleh disimpan di Git, dokumentasi publik, atau dikirim ke frontend. Tombol Google otomatis disembunyikan jika Client ID atau Client Secret belum tersedia.

### Checklist pengujian Google

- Tombol Google muncul pada halaman login dan registrasi.
- Callback Google kembali ke `/auth/google/callback` tanpa error redirect mismatch.
- Akun baru diarahkan ke `/onboarding/store`.
- Username default unik telah dibuat.
- Kasir tidak dapat dibuka sebelum onboarding selesai.
- Setelah toko dibuat, trial dan invoice pertama tersedia.
- Login Google berikutnya masuk ke tenant yang sama, bukan membuat akun baru.
- Owner tenant lama dengan email tenant yang sama berhasil ditautkan ke Google.
- Username dapat diubah melalui menu Akun Saya.

## Konfigurasi Billing

```env
BILLING_PLAN_NAME="Rancaka POS Bulanan"
BILLING_MONTHLY_PRICE=149000
BILLING_TRIAL_DAYS=14
BILLING_BANK_NAME="Nama Bank"
BILLING_BANK_ACCOUNT="Nomor Rekening"
BILLING_BANK_HOLDER="Nama Pemilik Rekening"
```

Gambar QRIS tidak diatur melalui `.env`. Superadmin mengunggah dan mengaktifkannya melalui menu **Billing Tenant**. Format yang diterima adalah JPG, PNG, atau WebP dengan ukuran maksimum 2 MB.

## Persiapan Produksi

- Gunakan HTTPS untuk aplikasi dan callback Google.
- Pastikan `APP_URL` sama dengan domain yang didaftarkan di Google Cloud.
- Jalankan `php artisan storage:link` agar gambar QRIS dan bukti pembayaran dapat ditampilkan.
- Jalankan seluruh migrasi dengan `php artisan migrate --force` saat deployment.
- Periksa rekening, harga paket, lama trial, QRIS, dan redirect URI sebelum membuka registrasi publik.

## Di luar cakupan tahap ini

- Google One Tap, payment gateway/webhook, QRIS dinamis, kupon, prorata, pajak invoice, dan paket bertingkat.
