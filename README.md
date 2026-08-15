# englishmudah.id

Aplikasi kursus Bahasa Inggris online berbasis AI (SaaS). Belajar dari level A1 (pemula) sampai C2 (lancar) — materi digenerate AI, trial 3 hari, langganan bulanan/tahunan.

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
| F3 — Learning Flow (dashboard, kuis, sertifikat) | ⏳ |
| F4 — Monetisasi (trial, Midtrans, email) | ⏳ |
| F5 — Admin & Pantauan | ⏳ |
| F6 — Launch | ⏳ |

## Panduan Admin (Fase 2)

### Menjadi Admin pertama
1. Daftar/login akun Anda di aplikasi (seperti biasa).
2. Di Supabase Dashboard → **SQL Editor**, jalankan:
   ```sql
   update public.profiles set role = 'admin' where email = 'EMAIL_ANDA';
   ```
3. Logout lalu login kembali. Menu Admin muncul di aplikasi.

### Menjalankan migration Fase 2
Jalankan `supabase/migrations/002_ai_engine.sql` di **SQL Editor** Supabase (setelah 001). Ini membuat tabel pengaturan AI, log pemakaian, placement test, dan RPC admin.

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
