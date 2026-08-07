# Rancaka Print Bridge

Android bridge untuk mencetak struk Rancaka POS ke thermal printer Bluetooth.

## Fitur

- Pilih printer Bluetooth yang sudah di-pair dari Android.
- Simpan printer default.
- Test print.
- Terima deep link dari web:

```text
rancaka-print://print?receipt_url=...
```

- Ambil JSON struk dari Laravel signed URL.
- Cetak struk ESC/POS ke printer 58mm atau 80mm.

## Cara Build APK

1. Buka folder ini di Android Studio:

```text
print-bridge-android
```

2. Tunggu Gradle sync selesai.
3. Build APK:

```text
Build > Build App Bundle(s) / APK(s) > Build APK(s)
```

4. Install APK ke HP/tablet Android kasir.

APK hasil build yang siap dipasang juga tersedia di:

```text
print-bridge-android/printer-rancaka.apk
```

## Cara Pakai

1. Pair printer thermal dari Settings Bluetooth Android.
2. Buka aplikasi `Rancaka Print`.
3. Pilih printer.
4. Tekan `Simpan printer default`.
5. Tekan `Test print`.
6. Dari Rancaka POS, proses transaksi lalu tekan `Cetak via Rancaka Print`.

## Catatan

- Aplikasi ini memakai Bluetooth SPP/RFCOMM klasik, cocok untuk banyak printer thermal murah ESC/POS.
- Signed URL struk dari Laravel berlaku 30 menit setelah transaksi.
- Kalau klik cetak dari POS tapi APK belum terinstall, browser akan membuka fallback struk browser.
