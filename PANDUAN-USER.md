# PANDUAN PENGGUNA — englishmudah.id (Aplikasi LLM Kursus Bahasa Inggris)

> Dokumen ini menjelaskan **apa saja yang bisa dilakukan user** di aplikasi `englishmudah.id` — dari pengunjung tanpa akun sampai member berbayar. Dibuat berdasarkan implementasi aktual di `src/app` dan `src/lib`.

- **Nama produk:** englishmudah.id
- **Jenis:** Web app kursus Bahasa Inggris berbasis AI (SaaS)
- **Level:** CEFR A1–C2 (Pemula → Lancar)
- **URL lokal default:** `http://localhost:3005` (`npm run dev`) atau `http://localhost:3000`
- **Teknologi:** Next.js 16 + Supabase + Tailwind + Midtrans + PWA

---

## 1. Ringkasan Peran User

| Peran | Syarat | Akses |
|-------|--------|-------|
| **Visitor** (belum login) | Buka situs tanpa daftar | 3 pelajaran gratis, lihat daftar level & meta pelajaran, placement test (tanpa simpan), cek sertifikat, FAQ/kebijakan |
| **Free User** (sudah daftar, belum trial/member) | `auth.getUser()` ada, `hasAccess=false` | Semua visitor + dashboard, simpan placement, study-sets, prestasi, profil, halaman langganan, tapi **materi berbayar tetap terkunci** |
| **Trial User** | `trial_expires_at > now` → `hasAccess=true` (72 jam, 1× seumur hidup) | **Akses penuh identik member** selama trial |
| **Member** | `is_member=true` & `member_expires_at > now` → `hasAccess=true` | Akses penuh sampai expiry; perpanjang manual |

Logika `hasAccess` terpusat di `src/lib/access.ts` (`isMember || trialActive`) dan ditegakkan di `src/lib/require-access.ts:requireAccess()` + RLS Supabase di tabel `lessons`/`toefl_sets`/`situational_sets`.

---

## 2. Fitur Detail per Menu

### 2.1 Halaman Utama & Navigasi Publik (`src/app/page.tsx:1`)

Tanpa login user bisa:
- Melihat hero, CTA **Coba Gratis Sekarang** → `/pelajaran-gratis`
- Melihat grid **Level A1–C2** → `/level/[code]`
- Klik **Ikuti Tes Penempatan** → `/placement-test`
- Klik **Daftar / Masuk** → `/daftar`, `/masuk`
- Akses footer: FAQ, Syarat & Ketentuan, Kebijakan Privasi, Kontak

Header otomatis menampilkan menu sesuai status login.

---

### 2.2 Pelajaran Gratis — Tanpa Login (`src/app/pelajaran-gratis/`)

> Satu-satunya materi yang **100% gratis selamanya**, bahkan tanpa akun.

- **Lokasi:** `/pelajaran-gratis` (daftar) & `/pelajaran-gratis/[id]` (belajar)
- **Isi (dari `src/lib/free-lessons.ts`):** 3 pelajaran A1 hardcoded (bukan AI):
  1. `a1-vocab-greetings` — Vocabulary (sapaan)
  2. `a1-grammar-be` — Grammar (to be)
  3. `a1-reading-my-family` — Reading (keluarga)
- **Struktur tiap pelajaran:** Intro + 3 section + 5 soal quiz + 2 game (`listen_choose`, `unscramble`)
- **Fitur di dalam pelajaran:**
  - TTS browser (ikon 🔊 per kata, `speechSynthesis` en-US 0.9x)
  - Transkrip listening
  - Quiz pilihan ganda / dropdown — opsi diacak tiap load (Fisher-Yates)
  - Penilaian instan **client-side** untuk visitor, **server-side** untuk login (`POST /api/lesson`)
  - Progress disimpan di `localStorage` key `em_free_progress` (`{slug, bestScore, completed}`) jika belum login
- **CTA setelah selesai:** “Daftar Gratis untuk simpan progress”

---

### 2.3 Kurikulum Utama — Level A1 sampai C2 (`src/app/level/[code]/`)

- **Lokasi:** `/level/A1` ... `/level/C2`
- **Kurikulum (`src/lib/curriculum.ts`):** 20 pelajaran/level, 4 per kategori:
  - Vocabulary, Grammar, Reading, Listening, Writing
- **Bilingual:** A1–A2 disertai terjemahan Indonesia, B1–C2 full English
- **Daftar pelajaran:**
  - Visitor/Free non-member: melihat **meta saja** via `getPublicLessonList()` — judul, slug, kategori, badge `Gratis` / `🔒`
  - Member/Trial: melihat semua + progress (`user_progress.best_score`) + progress bar `done/count` + `pct%`
- **Detail pelajaran (`/level/[code]/[slug]`):**
  - Jika `is_free=true` → terbuka untuk semua
  - Jika `is_free=false && !hasAccess` → **gate**: hanya judul + `🔒 Pelajaran ini untuk member` + tombol `Langganan / Coba Gratis / Masuk`. Konten **tidak dikirim** ke browser (RLS).
  - Jika `hasAccess=true` → full `LessonPlayer` (`src/app/level/[code]/[slug]/lesson-player.tsx`)

#### Lesson Player (saat akses terbuka)
1. **Materi:** Intro + 3 section (teks, contoh, audio)
2. **Pelafalan:** klik 🔊 per kata
3. **Quiz:** 5 soal, wajib jawab semua, retake unlimited
   - `completed = score >= 60%` (`Math.round(score/quiz.length*100)`)
   - Skor terbaik disimpan (`user_progress.best_score`), streak di-update (`user_streaks`)
   - `POST /api/lesson {action:'open'|'submit-quiz'}` + `lesson_opens` log
4. **Games:** listen & unscramble (opsional)
5. **Writing (di dalam pelajaran writing):**
   - Free/Trial tidak bisa? Visitor/Free: tombol `Langganan untuk menggunakannya`
   - Member/Trial: `POST /api/writing` → feedback AI (lihat 2.5)
6. **Laporkan Masalah:** tombol `ReportProblem` per pelajaran

---

### 2.4 Placement Test — Tes Penempatan (`src/app/placement-test/`)

- **Lokasi:** `/placement-test`
- **Soal:** 12 soal (`GET /api/placement` → `get_placement_questions` + seed `src/lib/placement-seed.ts`), jawaban di-strip di client
- **Pengerjaan:** tanpa login bisa, **tapi hasil tidak disimpan** (`saved:false`)
- **Setelah login:** hasil disimpan ke `placement_results` (`saved:true`), bisa dilihat di dashboard
- **Penilaian:** `POST /api/placement` → `score/total/recommendedLevel` (A1–C2), server-side
- **Retake:** unlimited, rate limit `20/60s`
- **Bisa di-skip** — dashboard tetap menampilkan CTA

---

### 2.5 Writing Feedback AI (`src/app/api/writing/`)

> Menulis bebas + dinilai AI dengan rubrik tetap (Bahasa Indonesia).

- **Kategori:** Writing di pelajaran kursus utama
- **Kuota:** **10 per bulan per member/trial** (`get_writing_quota_used`, tabel `writing_submissions`). Jika habis → `429 Kuota writing bulan ini sudah habis (10). Lanjut bulan depan`.
- **Syarat:** minimal 5 karakter, login + `hasAccess`
- **Penilaian:** 0–100, 4 kriteria (Grammar&Accuracy, Vocabulary, Coherence&Organization, TaskResponse) + 2 strengths + corrections
- **Provider:** multi-provider OpenAI/Gemini/Claude dengan fallback otomatis (`src/lib/ai/`)
- **Non-member:** `403 Fitur menulis tersedia untuk member` (kuota tidak terpakai)

---

### 2.6 Speech / Pronunciation Score (`src/app/api/speech-score/`)

- **Kegunaan:** Latihan pengucapan — ucapkan `target` (≤200 char), rekam audio, dapat skor
- **Lokasi:** dipakai di Study Sets & komponen ucapkan
- **Input:** `FormData {audio: webm/mp4/ogg/wav/mpeg ≤5MB, target, durationSeconds≤30}`
- **Alur:** STT `gpt-4o-mini-transcribe` → AI nilai 0–100 + `highlights[3]` + `tips[2]` (Bahasa Indonesia)
- **Kuota:** **10/bulan** (`toefl_quota section='speaking'`), `429` jika habis
- **Akses:** member/trial saja

---

### 2.7 Dashboard (`src/app/dashboard/page.tsx:20`)

> Wajib login (`auth.getUser()`), jika Supabase belum config → tampil pesan setup.

- **Greeting:** `TimeGreeting` + nama (`user_metadata.full_name` atau email)
- **Panduan onboarding (jika `completedLessonIds.size===0`):** 4 langkah (pilih level → baca materi → nilai ≥60 → klaim sertifikat)
- **Stat mini (3 kartu):**
  - Pelajaran selesai (`user_progress.completed`)
  - Streak hari ini (`user_streaks.current_streak` 🔥)
  - Sertifikat diraih (`certificates` count)
- **Status langganan:**
  - Member: `✓ Member aktif Berlaku sampai DD MMMM YYYY` + tombol `Kelola → /langganan` (hijau)
  - Trial: `⏳ Masa trial aktif` + `Perpanjang`
  - Free: `Akses terbatas → Langganan` (brand)
- **Placement CTA:** `Ikuti Tes Penempatan` (brand)
- **Merge Progress Prompt:** jika ada `localStorage em_free_progress` → tawarkan `Gabung progress browser → akun` via `POST /api/lesson {action:'merge'}`
- **Kursus Utama — Grid A1–C2:**
  - Badge level (`A1 Pemula` ... `C2 Lancar` — `LEVEL_NAMES` di `dashboard/page.tsx:11`)
  - `done/count pelajaran selesai`, progress bar `pct%`, `🏅` jika sudah sertifikat
  - `ready=false` (count 0) → `Segera hadir` (dashed)
  - Tombol `Buka → /level/[code]`
- **MemberMenu (8 menu):** Latihan Akademik, Percakapan Situasional, Study Sets, Prestasi, Profil, Langganan, dll.

---

### 2.8 Langganan & Pembayaran (`src/app/langganan/page.tsx:9`)

- **Lokasi:** `/langganan` (wajib login)
- **Harga:** `get_pricing()` — default `monthly 49.000`, `yearly 490.000` (diatur admin di `Admin → Monetisasi`)
- **Status box (salah satu):**
  - Member aktif → expiry date + `Anda member aktif`
  - Trial aktif → `Anda sedang dalam masa trial Berakhir DD MMMM YYYY`
  - Trial sudah dipakai → `Trial sudah berakhir`
  - Belum pernah trial → `🎁 Coba dulu: trial 3 hari tanpa kartu, 1×/orang`
- **Kupon:** daftar kupon aktif (`list_active_coupons`) — % atau nominal, ditampilkan di `SubscriptionManager`
- **Aksi:**
  - `Mulai Trial` → `POST /api/trial` → `RPC start_trial` (rate `5/60s`, cek `trial_used`)
  - `Bayar` → `POST /api/payments/create` → Midtrans Snap (QRIS, VA semua bank, GoPay/OVO/DANA/ShopeePay)
  - Polling status `GET /api/payments/status` tiap 5s, webhook `POST /api/payments/webhook` (verifikasi sha512 + idempotensi)
  - `GET /langganan/status` untuk cek hasil
- **Sifat:** perpanjangan **manual** (tanpa auto-debit), progress tetap tersimpan saat expired, lanjut saat renew
- **Expired handling:** cron `/api/cron` tiap 6 jam → nonaktifkan member expired, cek ulang pending, invoice email via `src/lib/email.ts` (Resend)

---

### 2.9 Latihan Akademik — Bergaya TOEFL (`src/app/academic/`)

> Konten orisinal AI, **bukan materi ETS**, ada disclaimer “tidak berafiliasi dengan ETS”. Semua butuh `hasAccess`.

| Sub-menu | Path | Apa yang bisa user lakukan |
|----------|------|----------------------------|
| **Landing** | `/academic` (`academic/page.tsx:49`) | Lihat 4 section + Simulasi + Riwayat. Non-member lihat gate `🔒 Latihan ini untuk member → Langganan` |
| **Reading** | `/academic/reading` | Baca passage akademik + soal (detail/inference) + timer + auto-submit. Skor 0–30 server-side |
| **Listening** | `/academic/listening` | Dengar audio dulu → soal setelahnya **tanpa transkrip** saat mengerjakan; transkrip muncul setelah submit. Skor 0–30 |
| **Writing** | `/academic/writing` | Tulis esai integrated/independent, dinilai AI rubrik 0–30. Kuota **10/bulan** (`get_toefl_quota_used section='writing'`) |
| **Speaking** | `/academic/speaking` | Rekam jawaban lisan per task (MediaRecorder, batas waktu), simpan ke bucket private `academic-audio` (signed URL 1 jam), putar ulang. Kuota speaking 10/bulan |
| **Simulasi** | `/academic/simulasi` | Kerjakan 4 section sekaligus dalam satu sesi timer total; Writing dinilai AI (kuota simulasi-writing **5/bulan**, jika habis → 0), Speaking = partisipasi `round(recorded/total*30)`. Skor total **0–120** + perkiraan level CEFR (`mapSectionsToCefr`) |
| **Riwayat** | `/academic/hasil` | Tabel semua `toefl_results` (per section & simulasi) + badge CEFR |

- **Penyimpanan:** `toefl_sets` (konten), `toefl_results` (skor), `toefl_quota` (kuota bulanan `period_start` awal bulan)
- **Rate limit:** `30/60s` untuk submit reading/listening
- **Non-member:** halaman detail tetap gate + `POST /api/academic/*` → `403`

---

### 2.10 Percakapan Situasional (`src/app/percakapan-situasional/`)

- **Landing:** `/percakapan-situasional` (`percakapan-situasional/page.tsx:15`) — 5 topik: Hotel, Restoran, Bandara, Belanja, Kesehatan (`SITUATIONAL_TOPICS` di `src/lib/types-situational.ts`)
- **Gate:** non-member → `Untuk Member` disabled; member/trial → `Buka Topik → /percakapan-situasional/[topic]`
- **Detail topik:** `/percakapan-situasional/[topic]` — daftar set published per topik (count dari `situational_sets`)
- **Player set:** `/percakapan-situasional/[topic]/[slug]` (`situational-player.tsx`) — Dialog 2 pihak + TTS, kosakata penting, kuis pemahaman, role-play. Fallback `SITUATIONAL_SEED` jika belum ada AI.
- **Akses:** RLS `situational_sets`, `requireAccess()` check

---

### 2.11 Study Sets — Kosakata Pribadi (`src/app/study-sets/page.tsx:10`)

> **Bisa dipakai Free User (hanya butuh login, tanpa member/trial)** — satu-satunya fitur member-like yang gratis.

- **Lokasi:** `/study-sets` & `/study-sets/[id]`
- **Daftar:** `mySets` (milik sendiri) + `publicSets` (milik orang lain yang `is_public=true`), diurut `updated_at` desc
- **Aksi (`src/app/api/study-sets/route.ts`):**
  - `POST create` — buat set baru (title 1–60 char)
  - `add-item` — tambah kata (`word` + `translation` auto-translate via AI `generateWithFallback` max 60 char, duplikat `ilike word` → 409)
  - `toggle-public` — jadikan publik/privat
  - `PATCH rename` — ganti judul
  - `DELETE` — hapus set
- **Latihan:** `StudySetPractice` di detail — kartu bolak-balik tanpa AI
- **Speech:** bisa pakai `POST /api/speech-score` untuk latihan ucap (kuota tetap berlaku, butuh member untuk speech-score — Free bisa buat set tapi speech tetap butuh member)

---

### 2.12 Prestasi & Peringkat (`src/app/prestasi/page.tsx:11`)

> Bisa untuk **semua login user** (tanpa paywall).

- **Lokasi:** `/prestasi`
- **Prestasi:** `unlock_achievements` (best-effort) + `list_user_achievements` — badge otomatis (misal streak, pelajaran selesai, sertifikat)
- **Leaderboard:** `get_leaderboard(20)` — top 20 user
- **Tampilan:** `AchievementsBoard` — badge yang diraih + posisi di peringkat

---

### 2.13 Sertifikat (`src/app/cek-sertifikat/` + `src/app/api/certificate/`)

- **Syarat klaim (`POST /api/certificate`):**
  1. `hasAccess=true` (member/trial)
  2. Selesaikan **semua** pelajaran `published` di satu level (`lessonIds.every(best_score>=60)`)
  3. Klik tombol **Klaim Sertifikat** (tidak auto) — komponen `claim-certificate.tsx` di `/level/[code]`
- **Hasil:** `create_certificate(p_user_id,p_level_code)` idempoten → return `code`
- **Tampilan:** `/cek-sertifikat/[code]` **publik tanpa login** via `get_certificate(p_code)` → nama, level, tanggal, kode. `notFound` jika salah.
- **Profil:** daftar sertifikat di `/profil` + di dashboard badge `🏅`
- **Bilingual:** sertifikat ID+EN, link verifikasi permanen

---

### 2.14 Profil & Privasi (`src/app/profil/page.tsx:9`)

> Wajib login. Semua aksi di `ProfileManager` + `NotificationSettings` + `MyReports`.

| Fitur | Detail |
|-------|--------|
| **Ganti Nama** | `PATCH /api/profile` — update `full_name` |
| **Ganti Email** | Kirim verifikasi ke email baru (Supabase), butuh password saat verifikasi kepemilikan (`change_email_unverified` + `pgcrypto`) |
| **Ganti Password** | Verifikasi password lama dulu |
| **Provider** | Deteksi `email` vs `google` OAuth |
| **Unduh Data Saya (UU PDP)** | `export_user_data` → JSON lengkap (profil, progress, skor, sertifikat, payment) — tombol `Unduh Data Saya` |
| **Hapus Akun (UU PDP)** | Ketik `HAPUS` → `delete_account` → hapus progress/skor/sertifikat permanen, logout. Konfirmasi email |
| **Notifikasi Push** | `NotificationSettings` (`src/components/notification-settings.tsx`) — toggle push via `web-push` + `src/lib/push.ts` (VAPID), simpan subscription |
| **Laporan Saya** | `MyReports` — daftar `lesson_reports` milik user (`module, note, question_indices, status, admin_reply, created_at, resolved_at`) |
| **Daftar Sertifikat** | List `certificates` dengan `Lihat & Verifikasi → /cek-sertifikat/[code]` |

---

### 2.15 Lupa Password & Auth Lain

- **Masuk:** `/masuk` — email/password + Google OAuth (`/auth/google` → `/auth/callback`) + anti brute-force (5× gagal → kunci 15 menit via `login_attempts` + `is_login_locked` di `012_security.sql`)
- **Daftar:** `/daftar` — wajib isi nama, centang T&C + **izin orang tua jika <17 tahun** (UU PDP), verifikasi email 24 jam (kirim ulang)
- **Lupa Password:** `/lupa-password` — kirim link reset via email Supabase
- **2FA (khusus admin):** tidak untuk user biasa — di `/admin/keamanan` (TOTP Google Authenticator + 10 kode recovery)
- **Sesi:** 30 hari + “ingat saya”, refresh via `src/proxy.ts` (Next 16 proxy)

---

### 2.16 Lapor Masalah (`src/app/api/report/` + `src/app/api/lesson {report}`)

- **Bisa dilakukan semua login user** (Free/Member)
- **Lokasi tombol:** di dalam `LessonPlayer` + halaman `academic` + `situational` + `placement`
- **Payload:** `module: lesson|toefl|situational|placement`, `note` atau `question_indices` (1-based), rate `20/60s`
- **Ditampilkan kembali:** di `/profil` → `MyReports` (status: pending/selesai + `admin_reply`)

---

### 2.17 Halaman Informasi & Legal (Publik)

| Halaman | Path | Isi |
|---------|------|-----|
| **FAQ** | `/faq` (`faq/page.tsx:10`) | 10 item: gratis, trial 3d, Midtrans, no-refund, lupa password, CEFR, AI materi, sertifikat 60%, WhatsApp |
| **Syarat & Ketentuan** | `/syarat-ketentuan` | Kontrak, no jaminan AI, refund final, trial sekali |
| **Kebijakan Privasi** | `/kebijakan-privasi` | UU PDP, <17 perlu wali, export JSON, cookie opsional (pixel hanya jika diizinkan) |
| **Kontak** | `/kontak` | WhatsApp dukungan (manual), email |
| **Offline** | `/offline` | PWA fallback saat tanpa internet |
| **Cek Sertifikat** | `/cek-sertifikat/[code]` | Verifikasi publik |

---

### 2.18 Fitur Sistem (yang user rasakan tidak langsung)

- **PWA:** `manifest.ts` → “Tambah ke layar utama”, `offline/page.tsx`
- **SEO:** `sitemap.ts`, `robots.ts`, meta per halaman
- **Streak:** `user_streaks` — `current_streak`/`best_streak`, naik tiap `POST /api/lesson {open}` + `bump_streak` RPC
- **Countdown:** `src/lib/use-countdown.ts` (`secondsLeft/totalSeconds/running/pause/resume/reset`, `formatSeconds MM:SS`) untuk timer akademik/simulasi
- **Rate Limit:** Upstash Redis (`UPSTASH_REDIS_REST_URL/TOKEN`) atau fallback in-memory — `429 Terlalu banyak permintaan`
- **Keamanan:** RLS seluruh tabel, RPC `security definer` + cek role, `SESSION_SECRET` untuk enkripsi API key, `CRON_SECRET` untuk `/api/cron`

---

## 3. Matriks Kuota & Batasan

| Fitur | Kuota / Syarat | Reset | File |
|-------|----------------|-------|------|
| Quiz retake | Unlimited, wajib jawab semua 5 soal, `≥60%` = selesai, opsi diacak | — | `lesson-player.tsx`, `api/lesson/route.ts` |
| Writing (kursus) | **10/bulan** (`get_writing_quota_used`), min 5 char, skor 0–100 | Awal bulan (`period_start`) | `api/writing/route.ts` |
| Writing (akademik) | **10/bulan** (`get_toefl_quota_used writing`), min 10 char, skor 0–30 | Awal bulan | `api/academic/writing/route.ts` |
| Speaking (speech-score) | **10/bulan** (`speaking`), ≤5MB, skor 0–100 | Awal bulan | `api/speech-score/route.ts` |
| Simulasi writing | **5/bulan** (shared `writing`), jika habis → nilai 0 + note | Awal bulan | `api/academic/simulation/route.ts` |
| Sertifikat | Semua published di level + `best_score≥60` + `hasAccess` + klik Klaim | — | `api/certificate/route.ts` |
| Trial | **72 jam**, 1×/orang (`trial_used`) | Sekali seumur hidup | `api/trial/route.ts`, `lib/access.ts` |
| Placement retake | Unlimited, tidak simpan jika anon | — | `api/placement/route.ts` |
| Lapor masalah | Wajib `note` atau `questionIndices`, rate `20/60s` | — | `api/report/route.ts` |
| Pembayaran | Midtrans QRIS/VA/e-wallet, no-refund, integrity check `gross_amount` harus pas | — | `api/payments/*`, `lib/midtrans.ts` |

---

## 4. Alur User End-to-End (Contoh)

### 4.1 Visitor → Free → Trial → Member
1. Buka `/` → `Coba Gratis` → kerjakan 3 pelajaran gratis (progress di browser)
2. Daftar di `/daftar` (centang T&C + izin wali jika <17) → verifikasi email 24 jam
3. Login → `/dashboard` → tawarkan `Gabung progress browser?` → klik Ya
4. Kerjakan `/placement-test` → dapat rekomendasi `B1` → klik `Mulai Belajar B1`
5. Lihat `/level/B1` → pelajaran berbayar terkunci → buka `/langganan` → klik `Mulai Trial 3 hari` → `hasAccess=true`
6. Buka `/level/B1/[slug]` → baca materi → quiz → `≥60` → streak +1
7. Coba `/academic/reading` → timer → submit → skor 24/30
8. Coba `/percakapan-situasional/hotel` → dialog + role-play
9. Buat Study Set di `/study-sets` → tambah kata → latih kartu
10. Selesaikan 20 pelajaran di B1 → tombol `Klaim Sertifikat` muncul → klaim → dapat `code` → cek di `/cek-sertifikat/[code]`
11. Sebelum trial habis → `/langganan` → bayar via QRIS → member aktif → invoice email

### 4.2 Free User yang tidak ambil trial
- Tetap bisa: `Study Sets`, `Prestasi`, `Profil`, `Placement`, `3 gratis`
- Tidak bisa: buka materi berbayar, writing/speaking AI, sertifikat, akademik/situasional (gate)

---

## 5. Daftar Halaman Lengkap untuk User

| Path | Login? | Member? | Deskripsi |
|------|--------|---------|-----------|
| `/` | Tidak | Tidak | Landing |
| `/pelajaran-gratis` | Tidak | Tidak | Daftar 3 gratis |
| `/pelajaran-gratis/[id]` | Tidak | Tidak | Player gratis |
| `/level/[code]` | Tidak | Tidak* | Daftar pelajaran (meta untuk visitor, full untuk member) |
| `/level/[code]/[slug]` | Ya* | Ya (jika berbayar) | Player kursus |
| `/placement-test` | Tidak* | Tidak | Tes 12 soal |
| `/dashboard` | Ya | Tidak | Dashboard + streak + member menu |
| `/langganan` | Ya | Tidak | Harga + trial + bayar + kupon |
| `/langganan/status` | Ya | Tidak | Polling status bayar |
| `/academic` | Tidak* | Tidak* | Landing akademik (gate info) |
| `/academic/reading` | Ya | Ya | Reading akademik |
| `/academic/listening` | Ya | Ya | Listening akademik |
| `/academic/writing` | Ya | Ya | Writing akademik AI |
| `/academic/speaking` | Ya | Ya | Speaking rekam |
| `/academic/simulasi` | Ya | Ya | Simulasi 0–120 |
| `/academic/hasil` | Ya | Ya | Riwayat skor + CEFR |
| `/percakapan-situasional` | Tidak* | Tidak* | Landing 5 topik |
| `/percakapan-situasional/[topic]` | Ya | Ya | Daftar set per topik |
| `/percakapan-situasional/[topic]/[slug]` | Ya | Ya | Player dialog |
| `/study-sets` | Ya | Tidak | Study Sets pribadi & publik |
| `/study-sets/[id]` | Ya | Tidak | Latihan kartu |
| `/prestasi` | Ya | Tidak | Badge + leaderboard 20 |
| `/profil` | Ya | Tidak | Kelola akun + export + hapus + notifikasi + laporan + sertifikat |
| `/cek-sertifikat/[code]` | Tidak | Tidak | Verifikasi publik |
| `/faq` | Tidak | Tidak | FAQ 10 item |
| `/syarat-ketentuan` | Tidak | Tidak | Syarat |
| `/kebijakan-privasi` | Tidak | Tidak | Privasi UU PDP |
| `/kontak` | Tidak | Tidak | Kontak WA |
| `/masuk` | Tidak | Tidak | Login (+ 2FA jika admin) |
| `/daftar` | Tidak | Tidak | Register |
| `/lupa-password` | Tidak | Tidak | Reset |
| `/offline` | Tidak | Tidak | PWA offline |

`*` = bisa dibuka tanpa syarat tapi konten/action dibatasi gate.

---

## 6. Catatan Penting untuk User

- **Progress tidak hilang:** saat trial/member expired, progress, skor, dan sertifikat tetap tersimpan; lanjut otomatis saat perpanjang.
- **Trial hanya sekali:** tidak bisa diulang, nilai trial mulai saat klik.
- **Harga:** diatur admin (`monthly`/`yearly`), bisa pakai kupon diskon (%/nominal, 1×/akun).
- **Materi AI:** dibuat AI lalu di-approve admin; jika menemukan kesalahan, gunakan `Laporkan masalah`.
- **Privasi:** sesuai UU PDP — data bisa diunduh JSON, akun bisa dihapus permanen (`HAPUS`), cookie/pixel hanya jika diizinkan.

---

*Dokumen ini digenerate dari codebase `D:\Produk Kuantum\llm` per 8 Sep 2026. Untuk panduan teknis admin, lihat `README.md`, `REQUIREMENTS.md`, dan `PANDUAN-AKUN.md`.*
