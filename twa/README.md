# TWA — Android Wrapper untuk englishmudah.id

Folder ini untuk build Trusted Web Activity (TWA) → AAB untuk Play Store.

## Prasyarat (yang perlu kamu siapkan)
1. **Domain HTTPS live** — `NEXT_PUBLIC_APP_URL` harus `https://englishmudah.id` (atau `https://xxx.vercel.app` sementara)
2. **Google Play Developer** — daftar $25
3. **Icon maskable** — `public/icon-512.png` sudah, tapi pastikan ada safe area

## Cara Build (setelah PWA live)
### Opsi A — PWABuilder (paling mudah, tanpa install)
1. Buka https://www.pwabuilder.com → masukkan URL produksi → Analyze
2. Klik `Build My PWA` → pilih `Android` → Download → dapat `android/` project + `assetlinks.json` fingerprint
3. Masukkan fingerprint ke `.env.local`:
   ```
   TWA_PACKAGE_NAME=id.englishmudah.app
   TWA_SHA256_FINGERPRINT=AA:BB:CC:... (dari PWABuilder)
   ```
4. Deploy lagi ke Vercel agar `/.well-known/assetlinks.json` terisi

### Opsi B — Bubblewrap (CLI, untuk build AAB lokal)
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://englishmudah.id/manifest.webmanifest
bubblewrap build
# hasil: app-release-bundle.aab
```

### Keystore
- Jika pakai PWABuilder, keystore dibuat otomatis — SIMPAN file `.keystore` + password
- Jika pakai Play App Signing (disarankan), Google yang kelola signing — ambil SHA-256 dari Play Console > Setup > App integrity > App signing

## Verifikasi TWA
- Buka `https://englishmudah.id/.well-known/assetlinks.json` harus return JSON valid
- Test dengan https://play.google.com/store/apps/details?id=id.englishmudah.app (setelah publish internal testing)

## Checklist Play Store
- [ ] App name, short desc, full desc, icon 512, feature graphic 1024x500
- [ ] Screenshots HP (min 2, 1080x1920)
- [ ] Privacy policy URL: https://englishmudah.id/kebijakan-privasi
- [ ] Content rating (kuesioner)
- [ ] Data safety (declare: email, payment via Midtrans, no location)
- [ ] App signing + assetlinks verified
