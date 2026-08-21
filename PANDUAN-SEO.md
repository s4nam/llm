# PANDUAN-SEO.md — SEO & Analitik

Panduan langkah-demi-langkah agar englishmudah.id ter-index di Google dan terlihat saat orang mencari "kursus bahasa inggris online". Semua langkah di sini **di luar kode** (kode SEO on-page sudah diterapkan di aplikasi).

## Status kode yang sudah aktif

- `sitemap.xml` → `/sitemap.xml` (berisi halaman utama, level A1–C2, dan pelajaran).
- `robots.txt` → `/robots.txt` (memblokir dashboard/profil/api, mengizinkan halaman publik).
- Halaman level & pelajaran kini bisa dibuka **tanpa login** → dapat di-index Google.
- Metadata + OpenGraph per halaman (`title`, `description`) sudah terpasang.
- Facebook Pixel sudah terpasang (hanya jika cookie diizinkan).

> **Syarat penting:** aplikasi harus sudah di-deploy ke Vercel dengan domain final
> `https://englishmudah.id`, dan `.env` produksi berisi
> `NEXT_PUBLIC_APP_URL=https://englishmudah.id` (dipakai sitemap/robots/metadata).

---

## 0. Deploy ke Vercel (langkah pertama, wajib)

Vercel = platform hosting untuk aplikasi Next.js. Aplikasi harus **live** dulu di
domain final sebelum SEO bisa bekerja. Alur: `edit kode → push GitHub → Vercel build otomatis → live di https://englishmudah.id`.

1. Daftar di https://vercel.com (login pakai akun GitHub).
2. Klik **Add New → Project** → pilih repository aplikasi ini.
3. Isi **Environment Variables** produksi (salin dari `.env.local`, dan tambahkan/sesuaikan):
   - `NEXT_PUBLIC_APP_URL=https://englishmudah.id` ← **wajib** (dipakai sitemap, robots, metadata)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_SETUP_CODE`
   - `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
4. Klik **Deploy** → dapat URL sementara (`xxx.vercel.app`).
5. Di **Settings → Domains**, tambahkan `englishmudah.id` → ikuti petunjuk arahkan **DNS** di registrar domain (nameserver Vercel).
6. Setelah domain aktif, pastikan di Supabase **Authentication → URL Configuration**:
   - Site URL = `https://englishmudah.id`
   - Redirect URLs = tambahkan `https://englishmudah.id/auth/callback`
7. Uji: buka `https://englishmudah.id/sitemap.xml` dan `/robots.txt` — pastikan tidak lagi menunjuk ke `localhost`.

> Catatan: tiap push ke GitHub, Vercel otomatis build ulang (auto-deploy).
> Proses build butuh akses Supabase untuk `sitemap.xml` — pastikan env terisi
> sebelum deploy.

---

## 1. Google Search Console

1. Buka https://search.google.com/search-console → **Mulai sekarang**.
2. Login akun Google → pilih **jenis properti**:
   - **Domain** (disarankan): masukkan `englishmudah.id` → verifikasi via **DNS (TXT record)** di panel domain Anda.
   - Atau **Awalan URL**: masukkan `https://englishmudah.id` → verifikasi via meta tag / HTML.
3. Ikuti petunjuk verifikasi di panel (DNS di registrar domain, atau upload file / meta tag).
4. Setelah terverifikasi, masuk ke dashboard properti.

### Submit sitemap

1. Di dashboard Search Console → menu **Sitemaps** (kiri bawah).
2. Masukkan: `sitemap.xml` → **Kirim**.
3. Tunggu status "Berhasil". Baris URL terdeteksi akan muncul dalam beberapa jam–hari.

### Request Indexing (percepatan)

1. Menu kiri atas → kotak **"Inspect any URL"**.
2. Masukkan URL halaman penting (mis. `https://englishmudah.id/level/a1`).
3. Klik **Minta Indexing** (Request Indexing) jika status "URL is not on Google".
   - Batas permintaan ~10–20 URL/hari untuk domain baru.

### Cek performa

- Menu **Performance** → lihat klik, tayangan (impression), posisi rata-rata, CTR.
- Menu **Indexing → Pages** → pantau halaman yang berhasil vs gagal di-index.

---

## 2. Bing Webmaster Tools (bonus, gratis)

1. Buka https://www.bing.com/webmasters → daftar/login.
2. Pilih import dari Google Search Console (paling cepat) atau tambah situs manual.
3. Submit `sitemap.xml` juga di sana.

---

## 3. Google Analytics 4 (belum terpasang di kode)

Kode aplikasi **belum** punya Google Analytics. Langkahnya:

1. Buka https://analytics.google.com → buat properti GA4.
2. Dapatkan **Measurement ID** (format `G-XXXXXXXXXX`).
3. Beri tahu developer untuk memasangnya di aplikasi (disarankan via `@next/third-parties`, dimuat hanya saat cookie diizinkan — patuhi UU PDP), dengan env `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
4. Setelah terpasang & di-deploy, cek data realtime di GA4.

> Catatan: Google Analytics **tidak memengaruhi ranking**. Fungsinya untuk data
> trafik & perilaku pengguna.

---

## 4. Konten & strategi keyword (paling berpengaruh untuk ranking)

Kode teknis saja tidak cukup untuk "urutan pertama". Ini yang paling menentukan:

1. **Long-tail keyword** dulu (persaingan "kursus bahasa inggris online" sangat ketat):
   - "belajar bahasa inggris pemula dari nol"
   - "cara cepat belajar grammar bahasa inggris"
   - "tes level bahasa inggris online gratis"
   - "materi bahasa inggris kelas 10" / "kelas 11"
2. **Buat halaman konten (blog/artikel)** berisi jawaban lengkap atas pertanyaan tersebut — inilah sumber traffic SEO terbesar.
3. **Backlink**: minta link dari situs pendidikan/review, forum, atau media lokal.
4. **Konsistensi**: Google butuh waktu (biasanya 3–6+ bulan) untuk situs baru. Pantau di Search Console, bukan di penampilan harian.

---

## 5. Checklist rutin (bulanan)

- [ ] Search Console: cek Performance & halaman yang gagal di-index.
- [ ] Cek tidak ada error di `/sitemap.xml` dan `/robots.txt`.
- [ ] Tambah minimal 2–4 artikel konten baru.
- [ ] Pantau posisi kata kunci target.