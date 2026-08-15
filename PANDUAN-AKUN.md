# Panduan Membuat Akun Supabase & Midtrans

Panduan langkah demi langkah untuk pemula. Tidak perlu pengalaman teknis —
cukup ikuti setiap langkah dari atas ke bawah.

---

## Bagian 1: Supabase (Database + Login)

Supabase menyimpan data pengguna, materi pelajaran, progress, dan pembayaran.
Ada **paket gratis selamanya** yang cukup untuk memulai.

### 1.1. Daftar Akun Supabase

1. Buka **https://supabase.com** di browser (sebaiknya Chrome).
2. Klik tombol **"Start your project"** (kanan atas).
3. Pilih cara masuk:
   - **GitHub** (paling mudah — klik "Sign in with GitHub"), atau
   - **Email** (isi email + password, lalu klik "Sign up").
4. Setelah masuk, Anda akan diminta mengisi nama organisasi/project.
5. Klik **"Create new project"**.

> 💡 Jika pakai email: buka email Anda, klik tautan verifikasi yang dikirim
> Supabase sebelum melanjutkan.

### 1.2. Membuat Project Baru

1. Isi **Name** (nama project) — contoh: `englishmudah`.
2. **Database Password** — buat password kuat, contoh:
   `Em2026!GantiPakeYangSulit`. **Simpan password ini di catatan pribadi**
   (dipakai jika ingin akses database langsung).
3. Pilih **Region**: `Southeast Asia (Singapore)` — paling dekat dengan
   Indonesia, jadi aplikasi lebih cepat.
4. Klik **"Create new project"**.
5. Tunggu ±2 menit sampai project siap. Halaman akan pindah ke dashboard
   project Anda.

### 1.3. Mengambil Kunci (Key) Supabase

Kunci ini wajib diisi ke file `.env.local` aplikasi Anda.

1. Di dashboard Supabase, buka menu **Settings** (ikon ⚙️) di kiri bawah.
2. Pilih **"API"**.
3. Salin dua nilai ini:
   - **Project URL** — bentuknya seperti `https://abcdefgh.supabase.co`
   - **anon public key** — teks panjang yang diawali `eyJhbGciOi...`
4. Buka project aplikasi Anda, buka file **`.env.local`**, lalu isi:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tempel_Project_URL_disini
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tempel_anon_key_disini
   ```
5. Simpan file.

### 1.4. Menjalankan Skema Database (wajib, sekali saja)

Membuat tabel-tabel aplikasi (profil, pelajaran, pembayaran, dll).

1. Buka file `supabase/migrations/` di project aplikasi.
2. Buka file **`001_init.sql`**, pilih semua teks (Ctrl+A), salin (Ctrl+C).
3. Di dashboard Supabase, klik menu **"SQL Editor"** (kiri atas).
4. Klik **"New query"** (jika belum ada kolom kosong).
5. Tempel (Ctrl+V) isi file `001_init.sql` ke kolom editor.
6. Klik tombol **"Run"** di kanan bawah.
7. Ulangi langkah yang sama untuk file:
   - `002_ai_engine.sql`
   - `003_learning_flow.sql`
   - `004_monetization.sql`
   - `005_admin_monitoring.sql`
8. Setiap kali klik Run, harus muncul pesan hijau **"Success"**.

> ⚠️ Jalankan urut dari 001 sampai 005. Jangan lompat-lompat.

### 1.5. Menjadikan Diri Anda Admin

> ⚠️ **PENTING — urutannya begini:**
> Perintah admin baru berhasil **setelah Anda mendaftar** di aplikasi.
> Tabel `profiles` berisi data akun yang terdaftar — baris Anda baru dibuat
> otomatis saat mendaftar di aplikasi. Jadi jangan lompat ke langkah ini.

**Urutan yang benar:**
1. Jalankan aplikasi: `npm run dev` → buka `http://localhost:3000`.
2. Buka halaman **Daftar** (`/daftar`) → isi email, nama, password →
   centang persetujuan → **Daftar**.
3. **Verifikasi email** (klik tautan dari Supabase di inbox — cek spam jika
   tidak muncul; berlaku 24 jam).
4. **Login** di aplikasi (`/masuk`).
5. Setelah login berhasil, lakukan langkah di bawah ini.

**Langkah admin:**
1. Di dashboard Supabase, klik menu **"SQL Editor"**.
2. Buat query baru.
3. Tempel perintah ini (ganti `EMAIL_ANDA` dengan email yang Anda pakai
   mendaftar):
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'EMAIL_ANDA';
   ```
4. Klik **"Run"**. Muncul pesan "Success" (boleh "No rows returned").
5. Verifikasi berhasil dengan:
   ```sql
   select email, role from public.profiles where email = 'EMAIL_ANDA';
   ```
   Harus tampil `role = 'admin'`.
6. Buka aplikasi lagi (atau logout lalu login) → menu Admin sudah muncul.

> Jika hasil query verifikasi **kosong (tidak ada baris)**, artinya akun
> belum terdaftar. Ulangi langkah 1–4 di atas (daftar + verifikasi email),
> lalu jalankan perintah admin lagi.

### 1.6. (Opsional) Mengaktifkan Login Google

1. Di dashboard Supabase, menu **"Authentication"** → **"Providers"** → **"Google"**.
2. Aktifkan toggle **"Enable Sign in with Google"**.
3. Ikuti petunjuk di sana untuk membuat Client ID & Client Secret di
   Google Cloud Console (gratis, ±15 menit).
4. Di menu **"Authentication" → "URL Configuration"**:
   - **Site URL**: `http://localhost:3000` (untuk tes lokal) — nanti ganti ke
     `https://englishmudah.id` setelah go-live.
   - **Redirect URLs**: tambahkan `http://localhost:3000/auth/callback` dan
     `https://englishmudah.id/auth/callback`.

---

## Bagian 2: Midtrans (Pembayaran QRIS/VA/E-Wallet)

Midtrans adalah jembatan pembayaran — aplikasi Anda memakai Midtrans agar
siswa bisa membayar paket dengan QRIS, transfer bank, GoPay, OVO, DANA, dll.

### 2.1. Daftar Akun Midtrans

1. Buka **https://midtrans.com**.
2. Klik tombol **"Get Started"** atau **"Daftar"** (kanan atas).
3. Pilih **"Sign Up"**.
4. Isi data yang diminta:
   - **Nama lengkap** (sesuai KTP)
   - **Email** yang aktif
   - **Nomor HP**
   - **Password**
5. Centang persetujuan, lalu klik **"Sign Up"**.
6. Buka email Anda → klik **tautan verifikasi** yang dikirim Midtrans.

### 2.2. Verifikasi Data Bisnis

1. Login ke **dashboard Midtrans** (https://dashboard.sandbox.midtrans.com
   untuk mode uji coba).
2. Lengkapi profil bisnis:
   - **Nama usaha**: `englishmudah.id`
   - **Jenis usaha**: Jasa / Pendidikan
   - **Alamat**: alamat Anda
   - **No. HP & email** sudah terisi.
3. Masukkan data pribadi: **No. KTP**.
4. Tambahkan **rekening bank** atas nama Anda (untuk penarikan dana).
   - Bisa rekening pribadi (BCA/BRI/Mandiri/BNI/dll).
   - Isi nomor rekening + nama pemilik (harus sama dengan KTP).

> Mulai dari **mode Sandbox** dulu (halaman dashboard.sandbox.midtrans.com).
> Sandbox memungkinkan Anda mencoba pembayaran **tanpa uang sungguhan**.

### 2.3. Mengambil Kunci (Key) Midtrans

1. Di dashboard Sandbox, buka menu **"Settings"** → **"Access Keys"**.
2. Salin dua nilai:
   - **Server Key** — dimulai `SB-Mid-server-...`
   - **Client Key** — dimulai `SB-Mid-client-...`
3. Buka file `.env.local` aplikasi dan isi:
   ```
   MIDTRANS_SERVER_KEY=tempel_server_key
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=tempel_client_key
   MIDTRANS_IS_PRODUCTION=false
   ```
4. Simpan.

### 2.4. Mengatur URL Notifikasi (Webhook)

Webhook = alamat yang dipanggil Midtrans saat pembayaran selesai, agar
aplikasi otomatis mengaktifkan member.

1. Di dashboard Sandbox, buka menu **"Settings"** → **"Configuration"**.
2. Cari bagian **"Payment Notification URL"**.
3. Isi: `https://englishmudah.id/api/payments/webhook`
   (ganti `englishmudah.id` dengan domain asli Anda setelah deploy; untuk
   tes lokal pakai URL ngrok, atau cukup deploy ke Vercel dulu).
4. Klik **"Update"**.

### 2.5. Mencoba Pembayaran (Sandbox)

1. Pastikan aplikasi sudah jalan dan halaman `/langganan` terbuka.
2. Klik paket → pilih metode bayar (QRIS/VA/e-wallet).
3. Di sandbox, pembayaran diuji dengan **kartu uji coba** (bukan uang asli).
4. Setelah "membayar", cek apakah status member aktif di aplikasi.

---

## Bagian 3: Berpindah ke Mode Produksi (Setelah Siap Go-Live)

Sandbox hanya untuk uji coba. Untuk menerima **uang sungguhan**, lakukan ini:

1. Di dashboard Midtrans, hubungi tim Midtrans (WA/email) untuk **aktivasi
   produksi** — biasanya butuh:
   - KTP
   - Rekening bank aktif
   - (Opsional) NPWP / dokumen usaha
2. Setelah disetujui, buka dashboard **produksi**
   (dashboard.midtrans.com, bukan sandbox).
3. Ambil **Server Key** & **Client Key** produksi (dimulai `Mid-server-...`
   tanpa awalan `SB-`).
4. Update `.env.local`:
   ```
   MIDTRANS_SERVER_KEY=Mid-server-isi_server_key_produksi
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-isi_client_key_produksi
   MIDTRANS_IS_PRODUCTION=true
   ```
5. Pastikan **Payment Notification URL** di dashboard produksi juga diisi
   dengan URL domain asli.
6. Uji sekali bayar kecil (Rp 1 dengan QRIS) untuk memastikan lancar.

---

## Cek Cepat — Sudah Siap?

- [ ] Supabase: project dibuat + region Singapore
- [ ] `.env.local` berisi URL & anon key Supabase
- [ ] Migration 001–005 sukses dijalankan
- [ ] Akun Anda sudah jadi admin
- [ ] Midtrans: akun dibuat + Server/Client key terisi
- [ ] Webhook URL sudah diisi
- [ ] (Opsional) Google login aktif

Jika semua tercentang, aplikasi siap dipakai. Kalau ada langkah yang kurang
jelas atau error, kirim tangkapan layar pesan errornya — saya bantu
selesaikan.
