# 📋 REQUIREMENTS FINAL — englishmudah.id

> Dokumen ini adalah requirements resmi dan final aplikasi englishmudah.id.
> Disusun dan dikunci bersama pemilik, kemudian diimplementasikan dalam 6 fase.

## 1. Identitas Produk
- **Nama:** englishmudah.id | **Jenis:** Web app kursus Bahasa Inggris berbasis AI (SaaS)
- **UI:** Bahasa Indonesia | **Desain:** simple-elegan, mobile-first, ramah orang awam (tombol besar, ikon+label, step berurutan)
- **Model bisnis:** 3 pelajaran gratis → trial 3 hari → langganan bulanan/tahunan
- **Pemasaran:** Facebook Ads + landing page

## 2. Kurikulum & Belajar
- **Level CEFR A1–C2**, bebas pilih level; level kosong menampilkan "Segera hadir"
- **5 kategori:** Vocabulary, Grammar, Reading, Listening, Writing (tanpa speaking)
- **Konten:** 20 pelajaran/level (4/kategori), tiap pelajaran = intro + 3 section + 5 soal
- **Bilingual pemula:** A1–A2 disertai terjemahan Indonesia; B1–C2 murni English
- **Format soal:** vocab = pilihan ganda; grammar = drop-down isian; reading/listening = pilihan ganda; writing = menulis bebas + feedback AI
- **Pelafalan kata** 🔊 (TTS browser) + **transkrip listening** + fallback jika perangkat tanpa suara
- **Definisi "pelajaran selesai":** baca materi + kirim 5 soal (skor berapa pun); sertifikat butuh **min skor 60**
- **Retake kuis** (skor terbaik disimpan)
- **Sertifikat per level:** bilingual ID+EN, **link verifikasi online permanen**
- **Placement test:** 12 soal (di-cache sekali), bisa dilewati/diulang, tabel skor → rekomendasi level

## 3. Alur Pengguna
1. Kunjungi situs → **3 pelajaran gratis (tanpa login)**, progress disimpan di browser
2. Daftar email/Google → **verifikasi email 24 jam** (kirim ulang) → centang T&C + **izin orang tua (<17)**
3. Placement test (skip opsional) → dashboard
4. Klik **"Mulai Trial"** → 72 jam akses penuh, **1×/orang**, tenggang 48 jam setelah habis
5. Bayar via **Midtrans** (QRIS/VA/e-wallet) → member mulai saat bayar (trial hangus)
6. Paket **bulanan/tahunan**, harga & kupon diatur admin
7. Perpanjangan manual + pengingat email; progress tersimpan saat expired, lanjut saat renew
8. **Gabung progress gratis** (browser) → akun (ditawarkan "lanjutkan?")

## 4. Mesin AI
- **Multi-provider:** OpenAI + Gemini + Claude; **UI admin** ganti token/model + Test Koneksi
- **Fallback otomatis** antar provider; API key **terenkripsi AES** di database
- **Template prompt baku** → format materi seragam; materi di-**cache** (sekali generate)
- **Approval admin** sebelum publikasi + tombol **Pratinjau** + Regenerate
- **Konfirmasi + estimasi biaya** sebelum generate massal
- **Monitoring token + alarm budget**; estimasi biaya per pemanggilan (≈Rp 10–500/pelajaran)
- **Kuota writing feedback AI:** 10/bulan per member

## 5. Pembayaran & Membership
- **Midtrans Snap** (QRIS, VA semua bank, GoPay/OVO/DANA/ShopeePay)
- **Verifikasi signature webhook** (sha512) + idempotensi
- **Cek status otomatis tiap 6 jam** (cron) + transaksi kadaluarsa (2 jam)
- **Pembayaran ganda** → refund otomatis (atau tiket refund manual jika channel tak mendukung)
- **SOP dispute/fraud challenge** → member dinonaktifkan sementara
- **Admin set status member manual** (+30 hari/+1 tahun/reset trial) dengan riwayat
- **Kupon diskon** (% / nominal, maks 1×/akun, ada masa berlaku)

## 6. Email (4 template via Resend, SPF/DKIM)
1. Selamat datang | 2. **H-1 trial hampir habis** | 3. **H-3 & H-1 perpanjangan** | 4. **Invoice** setelah bayar

## 7. Akun & Privasi (UU PDP)
- Lupa password, ganti password, **ganti email** (verifikasi), ganti nama
- **Unduh Data Saya** (JSON lengkap) | **Hapus akun** (ketik HAPUS + email konfirmasi)
- Persetujuan T&C wajib saat daftar; **banner cookie** (pixel hanya jika diizinkan)
- Sesi 30 hari + "ingat saya"; anti-brute-force (5× gagal → kunci 15 menit)

## 8. Keamanan & Teknis
- **RLS (Row Level Security)** di seluruh tabel; semua RPC admin via `security definer` + cek role
- **2FA admin (TOTP)** + 10 kode recovery sekali pakai
- **Semua kunci rahasia di environment variable** (Supabase, Midtrans, Resend, AI, cron)
- Next.js 16 + Supabase (PostgreSQL) + Vercel + Tailwind
- **PWA** (tambah ke layar utama) | SEO (sitemap, robots, meta) | SSL
- Backup harian (retensi 30 hari) + tes restore bulanan | log aktivitas admin (audit)

## 9. Admin & Operasional
- **Dashboard:** total pengguna, member aktif, pengguna baru, pendapatan 30 hari, konversi trial, pelajaran terpopuler
- **Kelola materi** (generate/approve/regenerate) | **Monetisasi** (harga/kupon/member) | **Laporan masalah** | **Panduan admin bergambar** | **Monitoring token**
- WhatsApp dukungan (manual) | SOP backup bulanan + monitoring mingguan

## 10. Eksekusi (6 Fase — SELESAI)
F1 Fondasi → F2 Mesin AI → F3 Learning Flow → F4 Monetisasi → F5 Admin & Pantauan → F6 Launch
Semua fase selesai; tiap fase diakhiri pengujian bersama.

---

### Status Implementasi

| Fase | Isi | Status |
|---|---|---|
| F1 | Fondasi: landing, auth, 3 pelajaran gratis | ✅ Selesai |
| F2 | Mesin AI: multi-provider, generate materi, placement test | ✅ Selesai |
| F3 | Learning Flow: belajar, kuis, writing, sertifikat | ✅ Selesai |
| F4 | Monetisasi: trial, Midtrans, email | ✅ Selesai |
| F5 | Admin & Pantauan: dashboard, 2FA, laporan | ✅ Selesai |
| F6 | Launch: konten A1, Facebook Pixel, FAQ | ✅ Selesai |
