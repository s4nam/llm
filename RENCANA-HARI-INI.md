# RENCANA HARI INI — EnglishMudah

**Tanggal:** 2026-08-22
**Proyek:** `D:\Produk Kuantum\llm` (englishmudah.id)

Daftar rencana fitur terinspirasi riset ELSA Speak yang akan diimplementasikan berurutan.
Semua keputusan telah diaudit bebas celah (keamanan, hak cipta, biaya AI).

---

## STATUS EKSEKUSI

| Rencana | Fitur | Status |
|---|---|---|
| **1** | Game Type per Level CEFR + Shuffle | 🔄 **SEDANG DIKERJAKAN** |
| 2 | Percakapan Situasional (5 topik) | ⏳ Belum |
| 3 | TTS Jernih (generate-once) | ⏳ Belum |
| 4 | Tier 1: Progress Bar, Achievements, Daily Reminder | ⏳ Belum |
| 5 | Tier 2: Vocabulary Coach + Study Sets | ⏳ Belum |

---

## RENCANA 1 — GAME TYPE PER LEVEL CEFR + SHUFFLE (sedang berjalan)

### Game yang ditambahkan
| Game | Level | Interaksi |
|---|---|---|
| Listening Game | A1–A2 | TTS baca kata → pilih dari 4 opsi |
| Unscramble Sentence | A1–B1 | Susun kata acak → kalimat benar |
| Word Stress | A2+ | Tandai suku kata yang ditekankan |
| Role-play Dialogue | A2+ | Dialog 2 pihak via TTS + model answer |

Semua game **opsional** — kelulusan pelajaran tetap via kuis inti (≥60%).

### Fitur Shuffle (Opsi B)
- Opsi kuis & Listening, kata Unscramble, tombol Word Stress diacak **client-side** di `useEffect` post-mount (hindari hydration mismatch).
- Submit kuis member tetap mengirim **index asli** ke `/api/lesson`.

### Checklist implementasi
- [x] Migration `023_lesson_games.sql` (kolom `games` + 4 RPC dgn duplicate guard)
- [x] `types.ts` — tipe `LessonGame` + `games` di `LessonDetail` & `FreeLesson`
- [x] `prompts.ts` — instruksi generate games per level; `maxTokens` 4000→6000 (3 route)
- [x] `validate.ts` — validasi games **opsional**
- [x] 3 route admin (generate-lesson, generate-level, lesson-actions) teruskan `draft.games`
- [x] `free-lessons.ts` — games manual (Listening + Unscramble) 3 pelajaran A1
- [ ] `level/[code]/[slug]/lesson-player.tsx` — render 4 game + shuffle
- [ ] `pelajaran-gratis/[id]/lesson-player.tsx` — render game + shuffle + **TTS** (baru)
- [ ] `lesson-detail-view.tsx` — preview games admin
- [ ] Verifikasi `tsc --noEmit` + tes manual

---

## RENCANA 2 — PERCAKAPAN SITUASIONAL (belum)

Jalur ketiga selain Kursus Utama & Latihan Akademik — **5 kartu topik**:

- 🏨 Hotel → `/percakapan-situasional/hotel`
- 🍽️ Restoran → `/percakapan-situasional/restaurant`
- ✈️ Bandara & Perjalanan → `/percakapan-situasional/travel`
- 🛍️ Belanja → `/percakapan-situasional/shopping`
- 🏥 Kesehatan → `/percakapan-situasional/health`

### Komponen
- Migration `024_situational.sql` — `situational_sets` (pola `toefl_sets`) + RPC admin
- AI pipeline: `prompts-situational.ts`, `validate-situational.ts`, `generate-situational.ts`
- Route admin: `generate-situational` + `situational-actions` (approve/reject/regenerate)
- `situational-seed.ts` — fallback 1 set/topik (`is_free=true`)
- Halaman siswa: landing kartu → topik → set player (gate `requireAccess`)
- Admin: `/admin/situasional` list + detail + manager; nav AdminHeader 2 blok
- Header & footer: link "Percakapan Situasional"

**Keputusan:** gate semua utk non-member (pola akademik).

---

## RENCANA 3 — TTS JERNIH (GENERATE-ONCE) (belum)

- Migration `025_tts_audio.sql` — bucket `lesson-audio` + tabel `lesson_audio`
- `callOpenAITTS()` terpisah (endpoint `/v1/audio/speech`, MP3)
- Route `/api/tts` — **hanya admin/pre-generate** (bukan client)
- `audio.ts` — prioritas `audioUrl`, fallback browser TTS
- Logging `log_ai_usage` berbasis karakter (`purpose='tts'`)
- **Hard rule:** Generate sekali → simpan → putar → **0 biaya AI per akses pelanggan**
- Hard-stop budget: **DIHAPUS** (kuota + rate limit + model hemat + alarm notifikasi cukup)

---

## RENCANA 4 — TIER 1: PROGRESS BAR + ACHIEVEMENTS + DAILY REMINDER (belum)

- **4A CEFR Progress Bar** — bar per level A1–C2 di dashboard (data sudah ada)
- **4B Achievements + Leaderboard** — migration `026_gamification.sql` + RPC unlock/list + halaman profil/prestasi
- **4C Daily Reminder** — template email #5 + cron; **2 RPC security definer** (`get_users_for_reminder`, `mark_reminded`) karena cron bukan admin & RLS blokir anon

---

## RENCANA 5 — TIER 2: VOCABULARY COACH + STUDY SETS (belum)

- Migration `027_study_sets.sql` — `study_sets` + `study_set_items`
- **RLS item via subquery** ke kepemilikan set (anti akses silang)
- Set publik **login-only** (`auth.role() = 'authenticated'`)
- `/study-sets` landing + `/study-sets/[id]` practice (flashcard + kuis acak)
- Tombol "Simpan ke Study Set" di lesson-player
- Practice = auto-score tanpa AI

---

## KEPUTUSAN TERKUNCI

- Games opsional; kelulusan via kuis 60% · shuffle client-side tanpa biaya AI
- Situasional: kartu per topik, tanpa level, gate member
- TTS: generate-once + cache permanen · biaya AI = 0 saat pelanggan mengakses
- **Tanpa hard-stop biaya** — kuota (10/10/5 per bln) + rate limit + model hemat + alarm notifikasi (biaya AI per user ≈ Rp 200/bln maks)
- Semua konten orisinal (guard `ORIGINALITY_RULE`) — aman dari hak cipta ELSA
- Migration berurutan: `023` → `024` → `025` → `026` → `027`

---

## KONTAK / CATATAN

- Proyek salah pilih sebelumnya: `D:\Produk Kuantum\kst-e_invoice` (E-Invoice) — **BUKAN** target hari ini.
- Dokumen ini berada di proyek yang benar: `D:\Produk Kuantum\llm`.