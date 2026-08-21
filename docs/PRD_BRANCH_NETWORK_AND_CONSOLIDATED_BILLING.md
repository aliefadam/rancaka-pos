# PRD — Jaringan Pusat, Cabang & Billing Gabungan

## Status Dokumen

- Status: Keputusan bisnis lengkap, siap diturunkan menjadi rencana implementasi
- Tanggal: 21 Agustus 2026
- Cakupan: relasi tenant pusat–cabang, kode jaringan, persetujuan cabang, trial 7 hari, invoice gabungan, dashboard cabang, impersonation, pelepasan cabang, dan migrasi tenant mandiri menjadi cabang

## Latar Belakang

Rancaka POS perlu mendukung usaha yang mempunyai satu tenant pusat dan beberapa tenant cabang. Setiap cabang tetap menjadi tenant mandiri dengan data kasir, stok, pengguna, dan operasional yang terisolasi. Cabang terhubung ke tenant pusat melalui kode jaringan khusus dan biaya subscription cabang dibebankan ke invoice pusat sebesar Rp20.000 per cabang per bulan.

Kode jaringan cabang berbeda dari kode referral sales. Cabang tidak menghasilkan komisi sales dan tidak dapat memasukkan kode referral sales.

## Tujuan

- Owner pusat dapat membentuk jaringan cabang menggunakan kode unik.
- Tenant baru maupun tenant mandiri yang sudah ada dapat mengajukan diri sebagai cabang.
- Owner pusat dan superadmin mengendalikan persetujuan hubungan cabang.
- Setiap cabang tetap mempunyai data operasional dan akun sendiri.
- Billing pusat menggabungkan harga paket pusat dan biaya seluruh cabang yang billable.
- Owner pusat dapat melihat ringkasan performa cabang dan melakukan impersonation dengan audit log.
- Kegagalan pembayaran invoice pusat mengunci pusat dan seluruh cabangnya.
- Semua tenant baru memperoleh trial 7 hari.

## Istilah

- **Tenant pusat**: tenant induk yang memiliki kode jaringan dan bertanggung jawab atas invoice gabungan.
- **Tenant cabang**: tenant mandiri yang terhubung langsung ke satu tenant pusat.
- **Kode jaringan**: kode unik milik tenant pusat untuk menerima pengajuan cabang.
- **Billable branch**: cabang aktif yang masa trial-nya sudah selesai dan sudah memasuki periode billing pusat yang memenuhi syarat.
- **Invoice gabungan**: invoice milik tenant pusat yang memuat paket pusat dan item biaya setiap cabang.

## Aturan Hierarki

- Relasi hanya satu tingkat: pusat → cabang.
- Satu cabang hanya dapat terhubung ke satu pusat pada satu waktu.
- Tenant cabang tidak dapat mempunyai cabang sendiri.
- Tenant pusat dapat mempunyai cabang tanpa batas pada MVP.
- Data antar cabang tetap terisolasi.
- Cabang tidak dapat melihat data pusat atau cabang lain.
- Histori hubungan tidak dihapus ketika cabang ditolak atau dilepas.

## Kode Jaringan Cabang

- Setiap tenant pusat mempunyai satu kode jaringan unik.
- Kode unik secara case-insensitive dan disimpan dalam huruf kapital.
- Format yang diperbolehkan: huruf, angka, dash, dan underscore.
- Panjang: 4–30 karakter.
- Kode dapat dibuat otomatis dan diubah owner pusat atau superadmin.
- Perubahan kode tidak memutus cabang yang sudah terhubung.
- Kode jaringan bukan kode referral sales dan bukan kredensial login.
- Endpoint validasi kode harus diberi rate limit.

## Alur Tenant Baru Menjadi Cabang

1. Calon cabang membuka registrasi tenant.
2. Pengguna memilih opsi **Daftar sebagai cabang**.
3. Pengguna memasukkan kode jaringan pusat.
4. Sistem memvalidasi kode dan membuat tenant cabang dalam status `pending_parent_approval`.
5. Owner pusat menerima notifikasi pengajuan cabang.
6. Owner pusat menerima atau menolak pengajuan.
7. Setelah diterima pusat, superadmin melakukan persetujuan akhir.
8. Trial 7 hari dimulai ketika persetujuan akhir superadmin diberikan.
9. Cabang dapat beroperasi dan biaya pertamanya dijadwalkan ke invoice pusat yang memenuhi aturan billing berikutnya.

Cabang tidak dapat memasukkan kode referral sales. Dealing sales dan komisi tetap berada pada tenant pusat.

## Tenant Mandiri Bergabung Menjadi Cabang

- Tenant mandiri dapat mengajukan bergabung melalui kode jaringan pusat.
- Owner pusat harus menyetujui pengajuan.
- Superadmin memberikan persetujuan akhir.
- Tenant tidak boleh mempunyai pembayaran pending atau tunggakan ketika perpindahan disetujui.
- Sampai tanggal efektif, tenant tetap memakai subscription mandiri.
- Tanggal efektif billing cabang adalah awal periode pusat pertama yang tidak mendahului akhir periode subscription mandiri yang sudah dibayar.
- Tidak ada refund atau prorata untuk periode mandiri yang sudah dibayar.
- Status sebelum tanggal efektif: `approved_pending_billing`.
- Setelah tanggal efektif, invoice berikutnya menjadi tanggung jawab pusat.

## Status Hubungan Cabang

- `pending_parent_approval` — menunggu keputusan owner pusat.
- `pending_admin_approval` — sudah diterima pusat, menunggu superadmin.
- `approved_pending_billing` — disetujui tetapi belum memasuki tanggal efektif billing gabungan.
- `active` — aktif sebagai cabang dan berada di bawah subscription pusat.
- `rejected` — pengajuan ditolak.
- `exit_requested` — owner cabang meminta keluar.
- `detached_pending` — pelepasan disetujui dan menunggu akhir periode.
- `detached` — hubungan sudah berakhir.

Setiap perubahan status menyimpan pelaku, waktu, alasan atau catatan, dan status sebelumnya.

## Trial 7 Hari

- Semua tenant baru, baik tenant reguler maupun cabang, mendapat trial 7 hari.
- Trial cabang dimulai setelah persetujuan akhir superadmin, bukan saat pengajuan dibuat.
- Trial yang sudah berjalan sebelum perubahan tetap mempertahankan tanggal berakhir lamanya.
- Konfigurasi default `BILLING_TRIAL_DAYS` berubah dari `14` menjadi `7` saat implementasi.
- Setelah trial cabang selesai, cabang tetap berada di bawah perlindungan subscription pusat pada sisa periode berjalan.
- Karena tidak ada prorata, biaya cabang baru ditagihkan pada invoice pusat berikutnya yang periode barunya dimulai setelah trial selesai.

## Harga dan Billing Gabungan

### Harga

- Harga paket pusat mengikuti konfigurasi paket reguler.
- Harga cabang: Rp20.000 per cabang per bulan.
- Harga berlaku sama untuk setiap cabang baru tanpa tier jumlah cabang.
- Harga cabang disimpan melalui konfigurasi, misalnya `BILLING_BRANCH_MONTHLY_PRICE=20000`.
- Setiap invoice item menyimpan snapshot nama, jenis, tenant cabang, kuantitas, dan harga.

### Rumus Invoice

```text
invoice_total = central_plan_price + (billable_branch_count × branch_monthly_price)
```

Contoh:

```text
Paket pusat                         Rp149.000
Cabang A                             Rp20.000
Cabang B                             Rp20.000
Cabang C                             Rp20.000
────────────────────────────────────────────
Total invoice                       Rp209.000
```

### Aturan Periode

- Tidak ada prorata pada MVP.
- Cabang yang bergabung di tengah periode tidak membuat invoice tambahan.
- Biaya cabang masuk ke invoice pusat berikutnya yang periode barunya dimulai setelah trial atau tanggal efektif cabang.
- Sisa periode sebelum invoice berikutnya tidak ditagihkan.
- Cabang yang dilepas tetap tercakup sampai akhir periode pusat yang sudah dibayar.
- Invoice yang sudah diterbitkan tidak dihitung ulang karena cabang dilepas.
- Invoice harus mempunyai line items agar rincian setiap cabang dapat diaudit.
- Approval pembayaran pusat memperpanjang masa aktif pusat dan seluruh cabang yang tercakup pada invoice.

## Dampak Kegagalan Pembayaran

- Hanya tenant pusat yang mengirim bukti pembayaran invoice gabungan.
- Cabang tidak mempunyai invoice atau pembayaran terpisah selama relasi aktif.
- Jika invoice pusat belum dibayar setelah masa akses berakhir, pusat dan semua cabang terkunci.
- Dalam keadaan terkunci, owner pusat hanya dapat membuka Billing dan logout.
- Owner cabang melihat pemberitahuan bahwa subscription jaringan belum dibayar dan hanya dapat logout.
- Persetujuan pembayaran pusat membuka kembali pusat dan semua cabang yang masih aktif.
- Status tenant `inactive` oleh superadmin tetap mengalahkan status subscription jaringan.

## Dashboard Owner Pusat

### Ringkasan

- Total cabang.
- Cabang pending, trial, aktif, akan dilepas, dan terkunci.
- Total omzet hari ini dan bulan berjalan seluruh cabang.
- Total transaksi hari ini dan bulan berjalan.
- Total biaya cabang pada invoice berikutnya.
- Status dan jatuh tempo invoice gabungan.

### Tabel Cabang

- Nama cabang.
- Owner cabang.
- Tanggal bergabung.
- Status hubungan.
- Status trial/subscription.
- Masa aktif berakhir.
- Omzet hari ini/bulan ini.
- Jumlah transaksi.
- Status billing pada invoice pusat.
- Aksi lihat detail dan impersonate.

### Batas Data

- Owner pusat dapat melihat ringkasan performa dan billing cabang.
- Detail produk, stok, transaksi, pengeluaran, dan laporan cabang hanya terbuka ketika owner pusat melakukan impersonation.
- Karyawan pusat tidak dapat melihat dashboard jaringan atau melakukan impersonation pada MVP.

## Impersonation Cabang

- Hanya owner pusat terkait dan superadmin yang dapat melakukan impersonation.
- Impersonation selalu menggunakan akun owner cabang sebagai konteks akses.
- Banner yang jelas harus tampil selama impersonation.
- Pengguna dapat kembali ke akun pusat tanpa login ulang.
- Audit log wajib menyimpan pelaku, pusat, cabang, waktu mulai, waktu selesai, IP address, dan user agent.
- Semua perubahan data yang dilakukan selama impersonation tetap mencatat pelaku asli.
- Owner pusat tidak dapat impersonate cabang yang sudah `detached` atau tenant berstatus `inactive`.

## Permintaan Keluar dan Pelepasan Cabang

- Owner cabang dapat mengajukan keluar dari jaringan dan memberikan alasan.
- Owner pusat atau superadmin dapat menyetujui atau menolak permintaan.
- Owner pusat juga dapat memulai pelepasan cabang.
- Pelepasan efektif pada akhir periode pusat yang sudah dibayar.
- Status sebelum efektif: `detached_pending`.
- Setelah efektif, cabang menjadi tenant reguler dan bertanggung jawab atas billing sendiri dengan harga paket reguler.
- Sistem membuat invoice reguler cabang untuk periode setelah tanggal efektif.
- Tidak ada refund, kredit, atau perubahan pada invoice pusat yang sudah terbit.
- Histori relasi, pembayaran, dan audit impersonation tetap tersedia.

## Referral Sales dan Komisi

- Kode jaringan cabang dan kode referral sales adalah fitur berbeda.
- Cabang tidak dapat menggunakan kode referral sales.
- Cabang tidak menghasilkan komisi sales dari biaya Rp20.000.
- Atribusi sales dan komisi hanya berlaku pada pembayaran subscription pertama tenant pusat.
- Cabang dari tenant mandiri yang sebelumnya mempunyai histori referral tidak menghasilkan komisi baru ketika bergabung.

## Model Data yang Diusulkan

### Penambahan pada `tenants`

- `branch_network_code` — nullable, unique untuk tenant pusat
- `tenant_type` — standalone/central/branch

### `tenant_branch_relationships`

- `id`
- `parent_tenant_id`
- `branch_tenant_id`
- `network_code_used` — snapshot
- `status`
- `requested_at`
- `parent_approved_at`, `parent_approved_by`
- `admin_approved_at`, `admin_approved_by`
- `trial_starts_at`, `trial_ends_at`
- `billing_effective_at`
- `detach_effective_at`
- `requested_exit_at`
- `reason`, `note`
- timestamps

Satu cabang hanya boleh mempunyai satu relasi yang belum selesai. Database menggunakan constraint dan validasi transaksi untuk mencegah relasi aktif ganda.

### `tenant_branch_status_histories`

- `id`
- `tenant_branch_relationship_id`
- `from_status`, `to_status`
- `changed_by`
- `reason`
- timestamps

### `billing_invoice_items`

- `id`
- `billing_invoice_id`
- `type` — central_plan/branch_addon
- `branch_tenant_id` — nullable
- `description`
- `quantity`
- `unit_amount`
- `total_amount`
- timestamps

Jumlah header invoice harus sama dengan total seluruh invoice items.

### `tenant_impersonation_logs`

- `id`
- `actor_user_id`
- `parent_tenant_id`
- `branch_tenant_id`
- `impersonated_user_id`
- `started_at`, `ended_at`
- `ip_address`, `user_agent`
- timestamps

## Panel Superadmin

- Melihat seluruh jaringan pusat–cabang.
- Memfilter berdasarkan pusat, cabang, status, dan tanggal.
- Memberi persetujuan akhir atau menolak cabang.
- Mengubah kode jaringan pusat.
- Membantu pelepasan cabang.
- Melihat histori status dan audit impersonation.
- Melihat rincian invoice gabungan dan cabang yang ditagihkan.
- Tidak boleh menghapus histori hubungan yang pernah aktif.

## Notifikasi

- Owner pusat menerima notifikasi pengajuan cabang baru.
- Owner cabang menerima notifikasi penerimaan, penolakan, dan tanggal efektif.
- Superadmin menerima notifikasi setelah pusat menyetujui cabang.
- Pusat dan cabang menerima peringatan sebelum masa aktif jaringan berakhir.
- Owner cabang menerima pemberitahuan jika jaringan terkunci karena invoice pusat belum dibayar.

Notifikasi dalam aplikasi termasuk MVP. Email/WhatsApp dapat menjadi fase berikutnya.

## Migrasi dan Kompatibilitas

- Tenant lama tetap bertipe `standalone`.
- Tidak ada tenant lama yang otomatis menjadi pusat atau cabang.
- Trial yang sudah berjalan tidak dipersingkat otomatis.
- Trial baru setelah rilis menggunakan 7 hari.
- Invoice lama tetap menggunakan struktur dan nominal lama; line items dapat dibuat sebagai satu item legacy saat diperlukan.
- Tenant grandfathered tidak otomatis menjadi pusat atau cabang.
- Harga reguler yang sudah ada tidak berubah karena fitur cabang.

## Fase Implementasi

Fitur dikerjakan sebagai satu target MVP end-to-end, tetapi implementasinya dibagi menjadi enam fase teknis. Seluruh fungsi jaringan cabang berada di balik feature flag dan belum dapat digunakan pengguna production sampai semua fase wajib selesai serta pengujian E2E lulus.

### Fase 1 — Fondasi Jaringan Cabang

#### Cakupan

- Mengubah konfigurasi trial tenant baru dari 14 menjadi 7 hari.
- Menambahkan tipe tenant: standalone, central, dan branch.
- Menambahkan kode jaringan pusat yang unik.
- Menambahkan model relasi dan histori status pusat–cabang.
- Menambahkan pengajuan cabang baru melalui registrasi.
- Menambahkan pengajuan tenant mandiri menjadi cabang.
- Menambahkan persetujuan owner pusat dan persetujuan akhir superadmin.
- Menambahkan validasi satu tingkat dan satu relasi aktif per cabang.
- Menambahkan feature flag jaringan cabang.

#### Kriteria Kelulusan

- Tenant reguler baru memperoleh trial tepat 7 hari.
- Kode jaringan valid dapat digunakan dan kode invalid ditolak.
- Cabang tidak aktif sebelum dua tahap persetujuan selesai.
- Cabang tidak dapat terhubung ke dua pusat atau menjadi pusat bagi cabang lain.
- Semua perubahan status mempunyai histori audit.
- Fitur belum terlihat jika feature flag nonaktif.

### Fase 2 — Billing Gabungan

#### Dependency

Fase 1 harus selesai.

#### Cakupan

- Menambahkan invoice line items.
- Menambahkan konfigurasi harga cabang Rp20.000.
- Menentukan tanggal efektif dan cabang billable.
- Membuat item paket pusat dan satu item untuk setiap cabang billable.
- Menangani cabang yang bergabung di tengah periode tanpa prorata.
- Mengalihkan tanggung jawab pembayaran cabang ke pusat.
- Memperpanjang akses pusat dan cabang dalam satu transaksi approval pembayaran.
- Mengunci seluruh jaringan jika periode berakhir tanpa pembayaran.
- Membuka kembali jaringan setelah pembayaran pusat disetujui.

#### Kriteria Kelulusan

- Total header invoice selalu sama dengan jumlah line items.
- Cabang baru tidak membuat invoice tambahan atau biaya prorata.
- Cabang yang trial-nya belum selesai tidak ditagihkan.
- Satu cabang hanya muncul satu kali pada satu invoice.
- Cabang tidak dapat mengirim pembayaran terpisah selama relasi aktif.
- Approval pembayaran bersifat atomik dan memperpanjang seluruh jaringan terkait.
- Invoice kedaluwarsa mengunci pusat dan semua cabang aktif.

### Fase 3 — Dashboard Jaringan Pusat

#### Dependency

Fase 1 dan Fase 2 harus selesai.

#### Cakupan

- Menambahkan ringkasan jumlah dan status cabang.
- Menampilkan status trial, subscription, dan billing cabang.
- Menampilkan omzet serta transaksi hari ini dan bulan berjalan.
- Menampilkan estimasi biaya cabang pada invoice berikutnya.
- Menambahkan tabel, filter, pencarian, dan detail cabang.
- Membatasi akses dashboard jaringan hanya untuk owner pusat dan superadmin.

#### Kriteria Kelulusan

- Owner pusat hanya melihat cabang dari tenant pusatnya sendiri.
- Karyawan pusat tidak dapat membuka dashboard jaringan.
- Ringkasan omzet dan transaksi terisolasi per cabang.
- Estimasi biaya sesuai daftar cabang billable.
- Cabang tidak dapat melihat pusat atau cabang lain.

### Fase 4 — Impersonation dan Audit

#### Dependency

Fase 3 harus selesai.

#### Cakupan

- Menambahkan impersonation cabang oleh owner pusat.
- Mempertahankan impersonation superadmin yang sudah tersedia.
- Menambahkan banner dan aksi kembali ke akun asal.
- Menambahkan audit log mulai dan selesai impersonation.
- Menyimpan pelaku asli pada perubahan data selama impersonation.
- Memblokir impersonation cabang yang detached atau inactive.

#### Kriteria Kelulusan

- Hanya owner pusat terkait dan superadmin yang dapat impersonate cabang.
- Impersonation tidak dapat digunakan untuk tenant di luar jaringan.
- Setiap sesi mencatat pelaku, pusat, cabang, waktu, IP, dan user agent.
- Semua mutasi selama impersonation dapat ditelusuri ke pelaku asli.
- Pengguna dapat kembali ke akun pusat tanpa login ulang.

### Fase 5 — Bergabung dan Keluar Jaringan

#### Dependency

Fase 1 sampai Fase 4 harus selesai.

#### Cakupan

- Menyelesaikan alur tenant mandiri menjadi cabang.
- Menghitung tanggal efektif tanpa double charge.
- Memvalidasi tidak ada pembayaran pending atau tunggakan.
- Menambahkan permintaan keluar oleh owner cabang.
- Menambahkan persetujuan atau penolakan oleh pusat/superadmin.
- Menjadwalkan pelepasan pada akhir periode yang sudah dibayar.
- Menghasilkan invoice reguler setelah cabang menjadi standalone.
- Mempertahankan seluruh histori relasi, billing, dan audit.

#### Kriteria Kelulusan

- Tenant mandiri tidak membayar subscription mandiri dan cabang untuk periode yang sama.
- Pelepasan tidak mengubah invoice pusat yang sudah terbit.
- Cabang tetap dapat mengakses aplikasi sampai tanggal pelepasan efektif.
- Setelah dilepas, cabang tidak lagi muncul pada invoice pusat berikutnya.
- Cabang mendapat invoice reguler untuk periode berikutnya.

### Fase 6 — Verifikasi E2E dan Aktivasi

#### Dependency

Semua fase sebelumnya harus selesai.

#### Cakupan

- Menjalankan automated test unit, feature, authorization, dan integrasi billing.
- Menjalankan skenario E2E pusat dengan beberapa cabang.
- Menguji cabang baru, tenant mandiri, trial, invoice berikutnya, pembayaran, lock, recovery, impersonation, dan detach.
- Menguji migrasi pada salinan struktur/data production.
- Memverifikasi konfigurasi harga dan trial production.
- Menyusun deployment serta rollback checklist.
- Mengaktifkan feature flag setelah seluruh pemeriksaan lulus.

#### Kriteria Kelulusan

- Seluruh acceptance criteria PRD lulus.
- Tidak ada regresi pada registrasi, billing reguler, referral sales, subscription, atau impersonation superadmin.
- Tidak ada data tenant yang bocor antar jaringan.
- Nilai invoice dan periode akses konsisten dalam simulasi beberapa siklus.
- Prosedur rollback telah diuji dan tidak menghapus histori billing.
- Feature flag hanya diaktifkan setelah persetujuan final.

## Alur E2E Wajib

```text
Cabang mendaftar atau tenant mandiri mengajukan bergabung
→ owner pusat menyetujui
→ superadmin menyetujui
→ trial 7 hari dimulai
→ cabang aktif di bawah subscription pusat
→ biaya cabang masuk invoice pusat berikutnya
→ pusat mengirim pembayaran
→ superadmin menyetujui pembayaran
→ akses seluruh jaringan diperpanjang
→ pusat melihat ringkasan dan impersonate cabang
→ cabang mengajukan keluar
→ pusat atau superadmin menyetujui
→ cabang dilepas pada akhir periode
→ cabang kembali ke billing reguler
```

Fase teknis boleh dikerjakan dan diuji secara bertahap, tetapi Fase 1–5 tidak boleh dirilis sebagai fitur production yang dapat digunakan secara parsial. Aktivasi pengguna hanya dilakukan melalui Fase 6.

## Acceptance Criteria

1. Tenant pusat mempunyai kode jaringan unik yang berbeda dari kode referral sales.
2. Tenant baru dapat mendaftar sebagai cabang menggunakan kode jaringan valid.
3. Kode tidak valid ditolak dengan pesan yang jelas.
4. Cabang baru memerlukan persetujuan owner pusat dan superadmin.
5. Trial cabang dimulai setelah persetujuan akhir dan berlangsung 7 hari.
6. Semua tenant reguler baru juga memperoleh trial 7 hari.
7. Cabang yang masuk di tengah periode tidak menghasilkan prorata atau invoice tambahan.
8. Invoice pusat berikutnya mempunyai satu item paket pusat dan satu item Rp20.000 untuk setiap cabang billable.
9. Cabang tidak dapat mengirim pembayaran subscription terpisah selama relasi aktif.
10. Pembayaran invoice pusat memperpanjang akses seluruh jaringan yang tercakup.
11. Invoice pusat yang kedaluwarsa mengunci pusat dan semua cabang.
12. Owner pusat hanya melihat cabang miliknya.
13. Owner pusat dapat melihat ringkasan performa dan billing setiap cabang.
14. Owner pusat dapat impersonate cabangnya dengan audit log lengkap.
15. Karyawan pusat tidak dapat impersonate cabang.
16. Tenant mandiri dapat mengajukan menjadi cabang dan perubahan billing berlaku pada periode yang aman tanpa double charge.
17. Owner cabang dapat meminta keluar dan pelepasan memerlukan persetujuan pusat atau superadmin.
18. Cabang yang dilepas menjadi tenant reguler pada akhir periode dan mendapat invoice reguler berikutnya.
19. Cabang tidak dapat memasukkan referral sales dan biaya cabang tidak menghasilkan komisi.
20. Automated tests mencakup isolasi jaringan, approval ganda, trial, invoice items, tanpa prorata, lock seluruh jaringan, detach, impersonation, dan larangan komisi cabang.

## Di Luar Cakupan MVP

- Hierarki cabang bertingkat.
- Harga bertingkat berdasarkan jumlah cabang.
- Prorata biaya cabang.
- Invoice dan pembayaran terpisah oleh cabang.
- Pembagian pembayaran antar entitas.
- Refund otomatis.
- Transfer cabang langsung dari satu pusat ke pusat lain tanpa proses detach.
- Akses dashboard jaringan untuk karyawan pusat.
- Notifikasi WhatsApp atau email otomatis.

## Keputusan Bisnis Final

1. Invoice cabang digabung dan dibayar oleh tenant pusat.
2. Harga cabang tetap Rp20.000 per cabang per bulan tanpa batas jumlah pada MVP.
3. Cabang yang ditambahkan di tengah periode masuk ke invoice pusat berikutnya tanpa prorata.
4. Kegagalan pembayaran invoice pusat mengunci pusat dan seluruh cabangnya.
5. Owner pusat dapat melihat ringkasan cabang dan melakukan impersonation dengan audit log.
6. Trial seluruh tenant baru berubah menjadi 7 hari.
7. Tenant mandiri boleh mengajukan menjadi cabang dengan persetujuan pusat dan superadmin.
8. Owner cabang boleh meminta keluar; pelepasan dikonfirmasi pusat atau superadmin dan efektif akhir periode.
9. Cabang tidak menggunakan referral sales dan tidak menghasilkan komisi sales; dealing tetap berada di tenant pusat.
