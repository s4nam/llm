# 🎓 REQUIREMENTS — Modul "Latihan Akademik" (gaya TOEFL)

> Dokumen ini adalah ringkasan requirement final untuk modul latihan akademik bergaya TOEFL.
> Disusun bersama pemilik, diverifikasi ke kode yang ada, dan akan dieksekusi berfase.
> **Nama netral:** "Latihan Akademik" (route `/academic`) — bukan "TOEFL" (merek dagang ETS).

## 1. Keputusan Kunci

| Keputusan | Nilai |
|---|---|
| Nama modul | **Latihan Akademik** (netral, aman hak cipta) |
| Route publik | `/academic` |
| Deskripsi aman | *"Latihan tes bahasa Inggris akademik bergaya TOEFL"* |
| Sertifikat | *"Sertifikat Penyelesaian Latihan Akademik"* (tanpa logo ETS) |
| Konten | AI-generated ORISINIL — dilarang menyalin/mengutip materi ETS |
| Disclaimer | "Konten dibuat otomatis oleh AI, bukan materi resmi ETS. englishmudah.id tidak berafiliasi dengan ETS." (di landing, hasil, footer) |
| Target pengakuan | **Ditunda** — bangun latihan dulu, siapkan pondasi untuk sertifikasi nanti |

## 2. Peta Fase

| Fase | Isi | Status |
|---|---|---|
| **0a** | Keamanan: brute-force, 2FA enforce, rate limit, security headers | ✅ Selesai |
| **0** | Paywall: gate konten, RLS lessons, API 403 | ✅ Selesai |
| **1** | Infrastruktur: timer, audio, rubrik, storage, skema DB, kuota, seed | ✅ Selesai |
| **2** | Latihan Reading + Listening | ✅ Selesai |
| **3** | Latihan Writing + Speaking | ✅ Selesai |
| **4** | Simulasi penuh + skor 0–120 + laporan + mapping CEFR | ✅ Selesai |

---

## 3. Fase 0a — KEAMANAN

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| **S1** | Anti brute-force login: 5× gagal/IP+email → kunci 15 menit (DB `login_attempts` + RPC) + Upstash Ratelimit | 6× login salah → ditolak; pesan jelas |
| **S2** | Enforce 2FA admin di login: password benar → wajib kode TOTP sebelum sesi aktif; rate-limit input kode (5×→kunci); dukung kode recovery | Admin TOTP tidak bisa login tanpa kode || **S3** | Upstash Ratelimit di semua API sensitif (writing, lesson, placement, generate AI, certificate, profile); batas ketat untuk generate (cegah biaya AI terbakar) | Request melebihi batas → 429 |
| **S4** | Fix `change_email_unverified`: wajib cek `auth.uid()` (pemilik akun) | Attacker tidak bisa ganti email korban |
| **S5** | `SESSION_SECRET` wajib terisi (hapus fallback dev) | Build gagal jika kosong |
| **S6** | Security headers: CSP, HSTS, X-Frame-Options DENY, Referrer-Policy, X-Content-Type-Options, Permissions-Policy | Header terpasang di response |
| **S7** | Cookie sesi: httpOnly, sameSite lax, secure (produksi) | Cookie aman |
| **S8** | Cron fail-closed: tanpa `CRON_SECRET` → 403 | Cron tidak bisa dipanggil publik |
| **S9** | Validasi input + body size limit (≤64 KB) | Payload besar ditolak |

**Teknologi:** Next.js 16 · Supabase RLS · Upstash Ratelimit · `node:crypto` (AES-256-GCM, TOTP RFC 6238).

---

## 4. Fase 0 — PAYWALL

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| **R0.1** | Gate server-side `level/[code]/[slug]`: non-member → tampil gate (judul+kategori+CTA), TANPA intro/sections/quiz/answerIndex | HTML/network tanpa konten |
| **R0.2** | RLS `lessons`: `published AND (is_free OR is_member_active())` + helper `is_member_active()` (termasuk trial) | Non-member tidak bisa baca berbayar dari DB |
| **R0.3** | RPC `get_lesson_meta(slug, level)` — meta saja tanpa konten | Meta tampil utk gate, tanpa kebocoran |
| **R0.4** | API `submit-quiz` cek akses → 403; `api/writing` cek akses → 403 | Non-member dipanggil API → 403 |
| **R0.5** | Sertifikat wajib member (tutup celah klaim dari subset gratis) | Non-member tidak bisa klaim sertifikat |
| **R0.6** | `generate-level` pindah ke RPC `admin_create_lesson` | Konsisten, tahan RLS ketat |
| **R0.7** | Regresi: admin, free lessons, placement, member — tetap jalan | Semua alur utama lulus |

---

## 5. Fase 1 — INFRASTRUKTUR

| ID | Requirement |
|---|---|
| **P1.1** | Timer reusable (`useCountdown`) + auto-submit yang menyimpan jawaban |
| **P1.2** | Audio hybrid: TTS browser default + dukung file AI (bucket); mode "audio dulu → soal setelah" tanpa regresi listening kursus umum |
| **P1.3** | Rubrik writing terstruktur (JSON) ganti regex kasar; deterministik |
| **P1.4** | Rekaman speaking: MediaRecorder → bucket private `toefl-audio` + RLS storage + signed URL + limit ukuran/MIME |
| **P1.5** | Prompt & validator TOEFL (4 section), anti-duplikat, tipe soal, difficulty guard, instruksi orisinalitas |
| **P1.6** | Helper `requireAccess()` server-side (wrap `computeAccess`) |
| **P1.7** | Skema DB: migration `011` — `toefl_sets`, `toefl_results`, `toefl_quota` + RPC admin (pola `admin_create_lesson`) |
| **P1.8** | Kuota AI per section per bulan |
| **P1.9** | Seed/fallback konten (pola placement) |

---

## 6. Fase 2–4 — MODUL LATIHAN AKADEMIK

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| **P2.1** | Landing `/academic` publik (info+CTA+disclaimer) + 4 section gate member | Non-member lihat landing; konten terkunci |
| **P2.2** | Reading drill: 3–4 passage akademik AI, 5–6 soal/passage, tipe detail/vocab-in-context/inference/purpose/insertion/summary, auto-score, timer | Skor + pembahasan |
| **P2.3** | Listening drill: audio dulu → soal setelah (tanpa transkrip saat mengerjakan), tipe gist/detail/function/stance/organization/inference | Alur audio-soal benar |
| **P2.4** | Writing drill: integrated & independent; rubrik AI 0–30; kuota | Feedback rubrik; paywall aktif |
| **P2.5** | Speaking drill: rekam, timeout 45–60s, putar ulang, (ops.) skor AI | Rekaman tersimpan; alur benar |
| **P2.6** | Simulasi penuh: semua section (Reading+Listening+Writing+Speaking), timer total, skor 0–120 | Skor konsisten |
| **P2.7** | Laporan hasil: skor/section + total + mapping skor→CEFR (TOEFL 95+≈C1) | Hasil tersimpan & ditampilkan |
| **P2.8** | Admin kelola set: generate per section, list draft, pratinjau, setujui, regenerate, tolak (pola admin materi) | Menu TOEFL di nav admin |

---

## 7. KEPATUHAN HAK CIPTA

1. Prompt AI: *"buat konten orisinal, jangan menyalin/mengutip materi ETS, buku, artikel berbayar, atau karya berhak cipta; jangan meniru suara tokoh nyata."*
2. Disclaimer "tidak berafiliasi dengan ETS" di landing, hasil latihan, dan footer.
3. Nama netral "Latihan Akademik"; sertifikat tanpa logo ETS.
4. Review admin tetap jadi gerbang publikasi.
5. Aset: font Geist (OFL), ikon Next.js — sudah aman; tidak menambah aset berlisensi tanpa izin.

## 8. DESAIN (simple-elegan, user-friendly, mobile-first)

- Konsisten: brand `#2563eb`, kartu `rounded-2xl border-slate-200`, tombol besar solid brand, bahasa Indonesia, langkah berurutan.
- Mobile-first: kontainer `max-w` + `px-4`, stack di HP (`flex-col sm:flex-row`), grid bertingkat, tombol `w-full sm:w-auto`, tabel `overflow-x-auto`.
- Komponen baru mengikuti pola yang sudah ada (`lesson-player.tsx`, `dashboard/page.tsx`, admin materi).
- Timer pill, tombol rekam bulat, tombol 🔊 audio besar — elegan tanpa over-design.
