# englishmudah.id

Aplikasi kursus Bahasa Inggris online berbasis AI (SaaS). Belajar dari level A1 (pemula) sampai C2 (lancar) — materi digenerate AI, trial 3 hari, langganan bulanan/tahunan.

> 📘 **Panduan akun langkah demi langkah:** baca **[PANDUAN-AKUN.md](./PANDUAN-AKUN.md)** untuk membuat akun Supabase & Midtrans (dibuat untuk pemula tanpa pengalaman teknis).

## Teknologi

- **Next.js 16** (React, App Router, TypeScript)
- **Tailwind CSS** (desain simple & elegan, mobile-first)
- **Supabase** (database PostgreSQL + autentikasi + Row Level Security)
- **Midtrans** (pembayaran QRIS/VA/e-wallet — Fase 4)
- **AI**: OpenAI / Gemini / Claude (Fase 2)

## Cara Menjalankan di Komputer Anda

1. Install [Node.js](https://nodejs.org) versi 20+ dan [Git](https://git-scm.com).
2. Buka folder project di terminal, lalu:
   ```bash
   npm install
   npm run dev
   ```
3. Buka http://localhost:3000 di browser.

## Persiapan Akun (wajib sebelum fitur akun aktif)

Aplikasi berjalan tanpa Supabase (halaman publik tetap bisa dilihat), tapi **registrasi/login butuh Supabase**. Ikuti langkah ini:

### 1. Buat akun Supabase (gratis)
1. Kunjungi https://supabase.com → Sign Up (bisa pakai GitHub/email).
2. Buat project baru: pilih nama (misal `englishmudah`), password database, region **ap-southeast-1 (Singapore)**.
3. Tunggu sampai project siap (±2 menit).

### 2. Isi kunci Supabase
1. Di dashboard Supabase: **Project Settings → API**.
2. Salin **Project URL** dan **anon public key**.
3. Buka file `.env.local` di project ini dan isi:
   ```
   NEXT_PUBLIC_SUPABASE_URL=isi_Project_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=isi_anon_key
   ```

### 3. Jalankan skema database (sekali saja)
1. Di dashboard Supabase: **SQL Editor → New query**.
2. Buka file `supabase/migrations/001_init.sql`, salin seluruh isinya.
3. Tempel ke editor lalu klik **Run**.
4. Harus muncul pesan "Success". (Ini membuat tabel profil, level, pelajaran, progress, dll + RLS.)

### 4. (Opsional) Aktifkan login Google
1. Di dashboard Supabase: **Authentication → Providers → Google → Enable**.
2. Ikuti petunjuk untuk membuat Client ID & Secret di Google Cloud Console (gratis), lalu simpan.
3. Di **Authentication → URL Configuration**, isi Site URL = `http://localhost:3000` dan tambahkan Redirect URL `http://localhost:3000/auth/callback`.

### 5. (Opsional) Email verifikasi
- Secara default Supabase mengirim email verifikasi otomatis. Untuk pengiriman yang andal ke pengguna, nanti di Fase 4 kita pasang Resend + SPF/DKIM.

## Cara Deploy ke Vercel (gratis)

1. Buat akun di https://vercel.com (masuk pakai GitHub).
2. Buka https://vercel.com/new → import project ini dari GitHub.
3. Di pengaturan project, tambahkan environment variable yang sama seperti `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dll).
4. Klik **Deploy**. Setelah selesai, situs live di URL yang diberikan.
5. **Domain sendiri**: di dashboard Vercel → project → **Settings → Domains** → tambahkan `englishmudah.id` dan ikuti petunjuk mengarahkan DNS di tempat Anda membeli domain.

## Status Pengembangan

| Fase | Status |
|---|---|
| F1 — Fondasi (landing, auth, 3 pelajaran gratis) | ✅ Selesai |
| F2 — Mesin AI (multi-provider, generate materi) | ✅ Selesai |
| F3 — Learning Flow (belajar, kuis, writing, sertifikat) | ✅ Selesai |
| F4 — Monetisasi (trial, Midtrans, email) | ✅ Selesai |
| F5 — Admin & Pantauan | ✅ Selesai |
| F6 — Launch | ✅ Selesai |

## Panduan Admin (Fase 2)

### Menjadi Admin pertama
1. Daftar/login akun Anda di aplikasi (seperti biasa).
2. Jalankan migration `006_admin_setup.sql` di SQL Editor Supabase (sekali saja).
3. Buka `http://localhost:3000/admin/setup`.
4. Masukkan **kode admin** dari `.env.local` (variabel `ADMIN_SETUP_CODE`).
5. Klik "Jadikan Saya Admin" → otomatis jadi admin (tanpa SQL manual).

> **PENTING:** jalankan juga migration `007_fix_lessons_rls.sql` — ini
> memperbaiki kebijakan RLS tabel `lessons` agar admin bisa menyimpan materi
> yang digenerate AI. Tanpa migration ini, generate materi akan gagal dengan
> error "new row violates row-level security policy".

> Cara lama (opsional, jika kode tidak mau): di Supabase SQL Editor jalankan
> `update public.profiles set role = 'admin' where email = 'EMAIL_ANDA';`
> hanya setelah akun Anda terdaftar & login.

### Menjalankan migration Fase 2
Jalankan `supabase/migrations/002_ai_engine.sql` di **SQL Editor** Supabase (setelah 001). Ini membuat tabel pengaturan AI, log pemakaian, placement test, dan RPC admin.

### Menjalankan migration Fase 3
Jalankan `supabase/migrations/003_learning_flow.sql` di **SQL Editor** Supabase (setelah 002). Ini membuat tabel sertifikat, writing submission, log akses pelajaran, streak, dan RPC (export data, hapus akun, klaim sertifikat).

### Menjalankan migration Fase 4
Jalankan `supabase/migrations/004_monetization.sql` di **SQL Editor** Supabase (setelah 003). Ini membuat konfigurasi harga, riwayat membership, log webhook, dispute, dan RPC pembayaran (trial, set member, expire, admin).

### Menjalankan migration Paywall (Fase 0)
Jalankan `supabase/migrations/010_lesson_access.sql` di **SQL Editor** Supabase. Ini menutup celah paywall:
- Helper `is_member_active()` (member aktif ATAU trial aktif).
- Policy RLS `lessons` diperketat: published **hanya** untuk pelajaran `is_free` atau member/trial aktif → non-member tidak bisa membaca materi berbayar dari database.
- RPC `get_lesson_meta(slug, level)` — meta saja tanpa konten, untuk menampilkan gate berjudul.

### Menjalankan migration Keamanan (Fase 0a)
Jalankan `supabase/migrations/012_security.sql` di **SQL Editor** Supabase. Ini menambah:
- Tabel `login_attempts` + RPC `record_login_attempt` / `is_login_locked` (anti brute-force: 5× gagal → kunci 15 menit).
- Perbaikan `change_email_unverified`: verifikasi kepemilikan lewat **password** (pgcrypto `crypt`) — menutup celah account takeover TETAPI tetap mengizinkan user yang salah ketik email memperbaiki emailnya (butuh `pgcrypto` extension, dibuat otomatis).
- RPC `purge_login_attempts` (pembersihan log, dipanggil cron).

### Menjalankan migration Modul Latihan Akademik (Fase 1)
Jalankan `supabase/migrations/011_toefl_schema.sql` di **SQL Editor** Supabase. Ini menambah:
- Tabel `toefl_sets` (konten latihan Reading/Listening/Writing/Speaking, status draft/published).
- Tabel `toefl_results` (hasil latihan user) + `toefl_quota` (kuota AI per section **per bulan** — `period_start` = awal bulan).
- RPC admin (generate/approve/update/delete/list) + RPC kuota + RPC meta set.
- Bucket storage **`academic-audio`** (private) untuk rekaman speaking — akses hanya via signed URL, audio tidak pernah publik.

> Catatan: jika `011` sudah pernah dijalankan sebelum versi kuota bulanan, cukup jalankan ulang file ini — RPC-nya memakai `create or replace`, sehingga versi terbaru menimpa yang lama.

### Menjalankan migration Kupon (Fase 4)
Jalankan `supabase/migrations/013_coupon_rpc.sql` di **SQL Editor** Supabase (setelah 012). Ini menambah RPC admin untuk kupon diskon:
- `add_coupon(p_code, p_type, p_value, p_max_uses)` — buat kupon baru (cek `is_admin()`, RLS tidak melindungi `coupons` karena tabel hanya bisa dibaca via RPC).
- `list_coupons_admin()` — daftar kupon terbaru dulu.
- **Tanpa migration ini**, tombol "Buat" kupon di `/admin/monetisasi` gagal dengan pesan `Could not find the function public.add_coupon(...)`.

### Menjalankan migration Pembersihan Data (Fase 0b)
Jalankan `supabase/migrations/015_data_cleanup.sql` di **SQL Editor** Supabase (setelah 014). Ini menambah:
- RPC `purge_lesson_opens(p_days)` — hapus log buka pelajaran lebih tua dari 30 hari (dipanggil cron, hemat storage).
- RPC `purge_ai_usage_log(p_days)` — hapus log pemakaian AI lebih tua dari 90 hari (dipanggil cron, tetap bisa memantau pemakaian bulan berjalan).
- Keduanya sudah dipanggil otomatis oleh `/api/cron` (tiap 6 jam). Data agregat (streak, progress, statistik) tidak terpengaruh.

### Menjalankan migration Nonaktifkan Member (Fase 4b)
Jalankan `supabase/migrations/016_deactivate_member.sql` di **SQL Editor** Supabase (setelah 015). Ini menambah:
- RPC `admin_deactivate_member(p_user_id)` — tombol **Nonaktifkan** di Admin → Monetisasi → Kelola Member (membatalkan member yang ter-klik tak sengaja tanpa SQL manual; hanya admin, lewat cek `is_admin()`).

### Menjalankan migration Kupon (Penyempurnaan)
Jalankan `supabase/migrations/017_coupon_enhancement.sql` di **SQL Editor** Supabase (setelah 016). Ini memperbaiki pengelolaan kupon:
- Kupon kini bisa diberi **tanggal kedaluwarsa** (kolom tanggal di form Admin → Monetisasi → Kupon).
- Kupon bisa **dinonaktifkan/aktifkan kembali** (tombol di daftar kupon).
- **`max_uses` diterapkan sungguhan** — dihitung dari pesanan berstatus lunas (`get_coupon_usage`), jadi kupon tidak bisa dipakai melebihi batas total.
- Kolom `coupon_code` di `payments` menggantikan tracking lama di `raw` (yang ditimpa payload Midtrans saat bayar).
- **Kupon lama yang tidak punya batas waktu otomatis diberi kadaluarsa = tanggal migration dijalankan** (langsung tidak valid). Kupon baru yang ingin tanpa batas cukup biarkan kolom kedaluwarsa kosong.

### Menjalankan migration Laporan Kampanye (Fase 4c)
Jalankan `supabase/migrations/018_campaign_report.sql` di **SQL Editor** Supabase (setelah 017). Ini menambah:
- Kolom `deleted_at` di `coupons` (soft-delete) — kupon nonaktif bisa dihapus dari Admin → Monetisasi; kupon yang dihapus tetap muncul di laporan (riwayat tidak hilang).
- Kolom `base_price` & `discount_amount` di `payments` — menyimpan nominal sebelum/diskonto yang tidak tertimpa payload Midtrans, sehingga laporan diskon akurat.
- RPC `delete_coupon` (tolak jika masih aktif), `get_campaign_report` / `get_campaign_detail` (laporan kampanye), `get_coupon` / `list_active_coupons` (validasi & tampilan kupon — RLS `coupons` memblokir pembacaan langsung oleh user).
- Halaman **Admin → Kampanye**: hasil kampanye per kupon (order lunas, pendapatan, diskon diberikan, jumlah user) + tombol Detail per kupon.

### Menjalankan migration Integritas Pembayaran (Fase 4d)
Jalankan `supabase/migrations/020_payment_integrity.sql` di **SQL Editor** Supabase (setelah 018). Prinsip gaya e-commerce:
- Member **hanya diaktifkan jika nominal yang dikonfirmasi Midtrans (gross_amount) persis sama** dengan nominal order.
- Kurang/lebih bayar → status `mismatch`, member **tidak aktif**, **tanpa refund otomatis** (admin yang putuskan di dashboard Midtrans). Ditandai juga di `membership_log`.
- Logika auto-refund "pembayaran ganda" lama **dihapus**.

### Menjalankan migration Laporan Bisnis (Fase 5a)
Jalankan `supabase/migrations/021_business_report.sql` di **SQL Editor** Supabase (setelah 020). Ini menambah RPC `get_business_report()` yang mengisi Dashboard Admin dengan:
- Uang masuk: hari ini / minggu / bulan / 30 hari / total; rincian paket bulanan vs tahunan; rata-rata transaksi.
- Pendaftar hari ini / minggu / bulan + grafik 30 hari.
- Member baru hari ini / minggu, trial baru hari ini, peringatan member kedaluwarsa 7 hari.
- Semua angka "hari ini" memakai zona waktu **Asia/Jakarta**.

## Checklist Aktivasi Paywall & Keamanan (Fase 0 & 0a)

Setelah menjalankan migration di atas, lakukan langkah berikut agar fitur aktif penuh:

1. **Jalankan migration di Supabase SQL Editor** (urutan):
   - `supabase/migrations/010_lesson_access.sql` — paywall (RLS lessons diperketat).
   - `supabase/migrations/011_toefl_schema.sql` — skema modul Latihan Akademik + bucket audio.
   - `supabase/migrations/012_security.sql` — keamanan (anti brute-force + fix account takeover).
   - `supabase/migrations/013_coupon_rpc.sql` — RPC kupon admin (wajib agar kupon bisa dibuat).
   - `supabase/migrations/015_data_cleanup.sql` — pembersihan otomatis log lesson_opens & ai_usage_log (dipanggil cron).
   - `supabase/migrations/016_deactivate_member.sql` — tombol Nonaktifkan member di Admin → Monetisasi.
   - `supabase/migrations/017_coupon_enhancement.sql` — pengelolaan kupon (kedaluwarsa, nonaktif/aktif, max_uses diterapkan).
   - `supabase/migrations/018_campaign_report.sql` — soft-delete kupon + laporan kampanye + RPC baca kupon.
   - `supabase/migrations/020_payment_integrity.sql` — penjagaan nominal pembayaran (mismatch, tanpa refund otomatis).
   - `supabase/migrations/021_business_report.sql` — laporan bisnis dashboard (uang masuk, pendaftar, member, churn).
   - Pastikan migration sebelumnya 001–017 juga sudah dijalankan.

2. **Isi `SESSION_SECRET` di `.env.local`** (wajib, min. 32 karakter acak):
   - Dipakai untuk enkripsi API key AI & kunci 2FA.
   - Jika kosong, aplikasi **gagal** saat menyimpan pengaturan AI / mengaktifkan 2FA (fail-fast).
   - Ganti nilai lama `englishmudah-dev-secret` yang sudah tidak dipakai lagi.

3. **(Opsional, disarankan) Rate limit penuh dengan Upstash**:
   - Tanpa Upstash, aplikasi memakai fallback in-memory (cukup untuk pengembangan, tapi tidak bertahan antar-instance di produksi).
   - Untuk produksi, buat project Upstash Redis gratis lalu isi `.env.local`:
     ```
     UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
     UPSTASH_REDIS_REST_TOKEN=XXXXX
     ```

4. **`CRON_SECRET` wajib diisi di `.env.local`** (fail-closed):
   - Endpoint `/api/cron` hanya bisa dipanggil dengan header `x-cron-secret` yang cocok.
   - Jika kosong, cron tidak akan berjalan (403).

5. **Uji anti brute-force**: coba login salah 6× berturut-turut → muncul pesan "Terlalu banyak percobaan" dan akun terkunci 15 menit.

6. **Uji 2FA admin**:
   - **Admin → Keamanan** → Aktifkan 2FA (pindai QR / masukkan secret di Google Authenticator).
   - Setelah itu, **logout → login ulang** → password benar → otomatis diarahkan ke halaman verifikasi kode 6 digit → baru bisa masuk dashboard admin.
   - **Login via Google** untuk akun admin dengan 2FA aktif juga diarahkan ke verifikasi kode (2FA diterapkan di semua jalur login).

7. **Uji paywall**:
   - Login sebagai user **bukan member** → buka pelajaran berbayar → hanya muncul judul + tombol "Langganan" (konten & kunci jawaban tidak terkirim ke browser).
   - Buka halaman level → pelajaran berbayar tidak tampil untuk non-member.
   - Member/trial → semua pelajaran terbuka normal.

8. **Uji rate limit API**: minta berulang ke `/api/writing` atau `/api/placement` → setelah melewati batas muncul HTTP 429 "Terlalu banyak permintaan".

## Panduan Modul Latihan Akademik (Fase 2)

Modul **Latihan Akademik** (halaman `/academic`) adalah latihan tes bahasa Inggris akademik **bergaya TOEFL** — konten dibuat AI, **orisinal (bukan materi ETS)**, dan halaman memuat disclaimer "tidak berafiliasi dengan ETS".

### Menjalankan migration
Jalankan `supabase/migrations/011_toefl_schema.sql` di **SQL Editor** Supabase (jika belum):
- Tabel `toefl_sets` (konten per section), `toefl_results` (hasil user), `toefl_quota` (kuota AI).
- Bucket storage private `academic-audio` untuk rekaman speaking.

### Membuat set latihan (admin)
1. **Admin → Latihan Akademik** → pilih section (Reading/Listening/Writing/Speaking) → isi topik → **Generate Set (AI)**.
2. Set muncul sebagai **draft** di **Admin → Latihan Akademik → Daftar Set (draft)**.
3. Buka draft → **Pratinjau Konten** → **Setujui & Tampilkan** (atau Regenerate / Tolak).

### Halaman siswa
- **`/academic`** — landing publik (info + CTA + disclaimer), non-member melihat info lalu diminta langganan.
- **`/academic/reading`** — bacaan akademik + soal (detail, inference, dll.) dengan timer & auto-submit.
- **`/academic/listening`** — audio dulu → soal setelah (tanpa transkrip saat mengerjakan; transkrip muncul setelah submit).
- **`/academic/writing`** — menulis esai (integrated & independent), dinilai AI dengan rubrik tetap 0–30; kuota 10/bulan per section.
- **`/academic/speaking`** — rekam jawaban lisan (MediaRecorder, batas waktu per task), tersimpan di bucket private `academic-audio`, putar ulang via signed URL.
- **`/academic/simulasi`** — simulasi 4 section (Reading, Listening, Writing dinilai AI, Speaking rekaman) dalam satu sesi dengan timer total; skor **0–120** + perkiraan level CEFR.
- **`/academic/hasil`** — riwayat semua skor latihan & simulasi + pemetaan perkiraan level CEFR.
- Skor dihitung **server-side** dan disimpan ke `toefl_results` (skor 0–30 per section, 0–120 simulasi).

### Catatan konten & hak cipta
- Prompt AI melarang menyalin materi ETS/buku berhak cipta; admin tetap menyetujui sebelum publikasi.
- Gunakan nama "Latihan Akademik", bukan "TOEFL", di branding — TOEFL adalah merek dagang ETS.

## Panduan Monetisasi (Fase 4)

### Setup Midtrans
1. Daftar di https://midtrans.com (pakai KTP + rekening bank untuk verifikasi).
2. Ambil **Server Key** & **Client Key** dari dashboard Midtrans (mulai dari Sandbox).
3. Isi `.env.local`:
   ```
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
   MIDTRANS_IS_PRODUCTION=false
   ```
4. **Webhook URL**: di dashboard Midtrans, set Payment Notification URL ke `https://ANDA.vercel.app/api/payments/webhook`.
5. Saat siap go-live: set `MIDTRANS_IS_PRODUCTION=true` + ganti ke production key (butuh persetujuan Midtrans).

### Setup Email (Resend)
1. Daftar di https://resend.com (gratis, ada kuota bulanan).
2. Tambahkan domain Anda → ikuti setup SPF/DKIM agar email tidak masuk spam.
3. Isi `.env.local`:
   ```
   RESEND_API_KEY=re_xxxx
   RESEND_FROM_EMAIL=admin@englishmudah.id
   RESEND_FROM_NAME=englishmudah.id
   ```

### Setup Cron (Vercel)
- File `vercel.json` sudah berisi jadwal tiap 6 jam. Cron menangani: nonaktifkan member expired, cek ulang pembayaran pending, kirim email pengingat trial H-1 & perpanjangan H-3/H-1.
- Tambahkan environment variable `CRON_SECRET` (string acak) dan sertakan header `x-cron-secret` saat memanggil `/api/cron` (Vercel Cron mengizinkan header).

### Atur harga & kupon
- Login admin → **Admin → Monetisasi** → set harga bulanan/tahunan, durasi trial, buat kupon (% / nominal), dan kelola member (perpanjang manual / reset trial).
- **Durasi trial (jam)**: pengaturan ini **berlaku langsung** untuk trial baru (dihitung sejak aktivasi). Disarankan **168 jam (7 hari)** — 3 hari terlalu pendek untuk produk pembelajaran; praktik industri umumnya 7–14 hari.
- **Tenggang trial**: kolom ini dihapus dari form (tidak dipakai logika apa pun). Standar industri saat trial habis = turun ke paket gratis (3 pelajaran + placement test tetap bisa dipakai) + email pengingat H-1, bukan akses lanjutan terpisah.

## Panduan Admin & Pantauan (Fase 5)

### Menjalankan migration Fase 5
Jalankan `supabase/migrations/005_admin_monitoring.sql` di **SQL Editor** Supabase (setelah 004). Ini menambah statistik admin, daftar laporan, dan tabel keamanan 2FA.

### Dashboard admin
- **Admin → Dashboard**: total pengguna, member aktif, pengguna baru, pendapatan 30 hari, konversi trial, dan pelajaran terpopuler.
- **Admin → Laporan**: tangani laporan masalah dari siswa; tandai selesai setelah materi diperbaiki.
- **Admin → Keamanan**: aktifkan **2FA (Google Authenticator)** + 10 kode cadangan.

### Aktifkan 2FA admin
1. **Admin → Keamanan → Aktifkan 2FA**.
2. Pindai QR dengan aplikasi Google Authenticator.
3. Masukkan kode 6 digit → simpan 10 kode cadangan di tempat aman.
4. Kode cadangan hanya muncul sekali dan dipakai sekali (sekali pakai).

### SOP Backup (lakukan bulanan)
1. **Supabase Dashboard → Database → Backups**: Supabase otomatis mencadangkan database.
2. Uji pemulihan: buat project Supabase baru sementara → Restore backup → pastikan data muncul (dokumen, pengguna, progress).
3. Simpan catatan hasil uji di mana pun Anda biasa menyimpan catatan (misal Google Drive).

### Monitoring mingguan (10 menit)
1. Buka aplikasi dari HP → login → buka beberapa halaman (pastikan normal).
2. Cek **Admin → Monitoring** untuk biaya AI tidak normal.
3. Cek **Admin → Laporan** untuk keluhan baru.
4. Periksa email inbox untuk notifikasi pembayaran/webhook bermasalah.

## Checklist Launch (Fase 6)

### Sebelum go-live (wajib)
- [ ] Jalankan seluruh migration SQL 001–008 di Supabase.
- [ ] Konfigurasi AI (min. 1 provider) + test koneksi.
- [ ] **Generate Level A1 lengkap** via Admin → Kelola Materi → "Generate Level A1" → setujui 20 pelajaran satu per satu.
- [ ] Generate soal placement test.
- [ ] Konfigurasi Midtrans (sandbox dulu) + set webhook URL.
- [ ] Konfigurasi Resend (domain + SPF/DKIM).
- [ ] Konfigurasi Vercel Cron (`/api/cron` tiap 6 jam) + `CRON_SECRET`.
- [ ] Aktifkan 2FA admin + simpan kode cadangan.
- [ ] Isi `NEXT_PUBLIC_WHATSAPP_NUMBER` & `NEXT_PUBLIC_FB_PIXEL_ID`.
- [ ] Pasang domain `englishmudah.id` di Vercel + SSL.

### Uji dari pandangan orang awam (daftar periksa)
- [ ] Buka beranda → CTA "Coba Gratis" terlihat jelas.
- [ ] 3 pelajaran gratis terbuka tanpa login; kuis berfungsi; progress tersimpan.
- [ ] Daftar (nama wajib, centang T&C & izin orang tua) → verifikasi email → login.
- [ ] Placement test: kerjakan, dapat rekomendasi level, bisa skip.
- [ ] Trial 3 hari: klik aktifkan → akses penuh.
- [ ] Halaman langganan menampilkan harga & kupon.
- [ ] Bayar via Midtrans (sandbox) → member aktif → invoice email.
- [ ] Belajar penuh → kuis → klaim sertifikat → verifikasi online.
- [ ] Profil: ganti nama, unduh data JSON, lupa password.
- [ ] Admin: dashboard, generate materi, monetisasi, laporan, panduan.
- [ ] Situs cepat di HP (periksa dengan HP Anda sendiri).

### Setelah go-live
- [ ] Ganti Midtrans ke mode produksi (`MIDTRANS_IS_PRODUCTION=true` + production keys).
- [ ] Pasang Facebook Pixel → buat kampanye trial 3 hari + retargeting.
- [ ] Mulai produksi konten level A2–C2 (on-demand lewat admin).
- [ ] Catatan usaha: saat pendapatan mulai masuk, pertimbangkan mendaftarkan usaha (UMKM/PT) dan kepatuhan PPN sesuai aturan yang berlaku.

### Menyiapkan API AI
1. Buka aplikasi → **Admin → Pengaturan AI**.
2. Isi minimal 1 API key (OpenAI/Gemini/Claude). Gemini memiliki free tier.
3. Pilih provider & model default → **Test Koneksi** → **Simpan Pengaturan**.
4. Pastikan `SESSION_SECRET` terisi di `.env.local` (dipakai untuk mengenkripsi API key).

### Membuat materi
1. **Admin → Kelola Materi** → pilih level + kategori + topik → **Generate Materi (AI)**.
2. Materi muncul sebagai **draft** di **Daftar Materi**.
3. Buka draft → **Pratinjau** → jika bagus klik **Setujui & Tampilkan**, jika kurang klik **Regenerate** atau **Tolak**.
4. Materi yang disetujui langsung tampil di dashboard siswa sesuai levelnya.

### Tes penempatan
1. **Admin → Kelola Materi** → generate soal placement (via API /dashboard admin nanti), atau jalankan RPC.
2. Siswa mengerjakannya di `/placement-test` → dapat rekomendasi level.

## Struktur Folder Penting

- `src/app/` — halaman-halaman aplikasi
- `src/components/` — komponen UI bersama
- `src/lib/ai/` — mesin AI (provider, prompt, enkripsi key, estimasi biaya)
- `src/lib/` — logika & data (brand, tipe, pelajaran gratis, Supabase)
- `src/proxy.ts` — refresh sesi (pengganti middleware di Next.js 16)
- `supabase/migrations/` — skema database
- `.env.example` — contoh seluruh variabel lingkungan
