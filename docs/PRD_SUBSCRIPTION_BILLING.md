# PRD — Registrasi Tenant & Billing Manual

## Tujuan
Tenant dapat mendaftar mandiri, mencoba aplikasi selama 14 hari, membayar paket bulanan dengan unggah bukti, dan mendapat perpanjangan akses setelah diverifikasi superadmin.

## Alur utama
1. Pengunjung mendaftar sebagai tenant dan owner.
2. Sistem memberi trial 14 hari dan membuat invoice bulan pertama.
3. Owner mengunggah bukti pembayaran dari halaman Billing.
4. Superadmin menyetujui atau menolak pembayaran.
5. Persetujuan mengaktifkan langganan satu bulan setelah trial/periode aktif terakhir.
6. Tenant kedaluwarsa hanya dapat membuka Billing dan logout.

## Aturan
- Satu paket bulanan; harga dan rekening berasal dari konfigurasi lingkungan.
- Bukti: JPG, PNG, WebP, atau PDF, maksimum 2 MB.
- Satu invoice hanya dapat memiliki satu pembayaran pending.
- Tenant lama ditandai grandfathered agar tidak terkunci.
- Tenant `inactive` tetap diblokir oleh superadmin.

## Di luar cakupan tahap ini
- Payment gateway/webhook, kupon, prorata, pajak invoice, dan paket bertingkat.
