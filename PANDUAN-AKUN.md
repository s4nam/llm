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
7. Ulangi langkah yang sama untuk file (urut — jangan lompat-lompat):
   - `002_ai_engine.sql`
   - `003_learning_flow.sql`
   - `004_monetization.sql`
   - `005_admin_monitoring.sql`
   - `006_admin_setup.sql`
   - `006_email_change.sql`
   - `007_fix_lessons_rls.sql`
   - `008_admin_lesson_rpc.sql`
   - `009_placement_fix.sql`
8. Setiap kali klik Run, harus muncul pesan hijau **"Success"**.

> ⚠️ Ada dua file `006_*` dan satu `007_*` — **semuanya wajib dijalankan**,
> urut sesuai daftar di atas. Jangan lompat-lompat.

### 1.5. Menjadikan Diri Anda Admin

> ⚠️ **PENTING — urutannya begini:**
> Anda harus **mendaftar dan login dulu** di aplikasi, karena tabel `profiles`
> baru berisi baris akun Anda setelah terdaftar. Ada DUA cara — pilih yang
> paling mudah (Cara A lebih disarankan, tanpa perlu menulis SQL).

**Urutan yang benar (untuk keduanya):**
1. Jalankan aplikasi: `npm run dev` → buka `http://localhost:3000`.
2. Buka halaman **Daftar** (`/daftar`) → isi email, nama, password →
   centang persetujuan → **Daftar**.
3. **Verifikasi email** (klik tautan dari Supabase di inbox — cek spam jika
   tidak muncul; berlaku 24 jam).
4. **Login** di aplikasi (`/masuk`).

**Cara A — Klaim Admin via aplikasi (disarankan):**
1. Jalankan migration `006_admin_setup.sql` di SQL Editor Supabase.
2. Buka `http://localhost:3000/admin/setup`.
3. Masukkan **kode admin** yang ada di file `.env.local`
   (variabel `ADMIN_SETUP_CODE`).
4. Klik **"Jadikan Saya Admin"** → selesai, langsung jadi admin.

**Cara B — Via SQL Editor (cara lama):**
1. Di dashboard Supabase, buka menu **"SQL Editor"** → query baru.
2. Jalankan (ganti `EMAIL_ANDA` dengan email Anda):
   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'EMAIL_ANDA';
   ```
3. Klik **"Run"** → muncul "Success".
4. Verifikasi: `select email, role from public.profiles where email = 'EMAIL_ANDA';`
   → harus tampil `role = 'admin'`.

> Jika hasil query verifikasi **kosong (tidak ada baris)**, artinya akun
> belum terdaftar. Ulangi langkah 1–4 (daftar + verifikasi email), lalu
> jalankan kembali perintah admin.

### 1.6. (Opsional) Mengaktifkan Login Google

1. Di dashboard Supabase, menu **"Authentication"** → **"Providers"** → **"Google"**.
2. Aktifkan toggle **"Enable Sign in with Google"**.
   - **"Skip nonce checks"** → biarkan OFF
   - **"Allow users without an email"** → biarkan OFF
3. Di menu **"Authentication" → "URL Configuration"**:
   - **Site URL**: `http://localhost:3000` (untuk tes lokal) — nanti ganti ke
     `https://englishmudah.id` setelah go-live.
   - **Redirect URLs**: tambahkan `http://localhost:3000/auth/callback` dan
     `https://englishmudah.id/auth/callback`.

#### Buat Client ID & Secret di Google Cloud Console
1. Buka **https://console.cloud.google.com** → login dengan akun Google Anda.
2. Buat **New Project** (nama: `englishmudah`) → klik project tersebut.
3. Menu **☰ → APIs & Services → OAuth consent screen** → pilih **External** →
   isi App name + support email → Save.
4. Menu **☰ → APIs & Services → Credentials** → **+ CREATE CREDENTIALS →
   OAuth client ID** → **Application type: Web application**.
5. Isi **Authorized JavaScript origins**: `http://localhost:3000`.
6. Isi **Authorized redirect URIs** (WAJIB ADA SEMUA — yang ketiga paling
   sering terlewat):
   ```
   http://localhost:3000/auth/callback
   https://englishmudah.id/auth/callback
   https://fbsjklwndftcazdkkzee.supabase.co/auth/v1/callback
   ```
   > 🔑 **Penting:** URL ketiga (`...supabase.co/auth/v1/callback`) adalah
   > callback milik Supabase. Google mewajibkannya. Ganti `fbsjklwndftcazdkkzee`
   > dengan `ref` project Anda (lihat bagian kiri URL Supabase dashboard).
7. Klik **CREATE** → salin **Client ID** & **Client Secret**.
8. Kembali ke Supabase → tempel Client ID & Client Secret → **Save**.

> ⚠️ Jika error `redirect_uri_mismatch` muncul saat login Google, berarti URL
> callback Supabase (`...supabase.co/auth/v1/callback`) belum didaftarkan di
> langkah 6. Tambahkan, lalu coba lagi.

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

#### 2.5.1. Bisa Diuji di Localhost — Termasuk QRIS

Ya, pembayaran (termasuk **QRIS**) bisa diuji penuh di localhost dengan key
sandbox — tanpa uang asli:

1. Isi `.env.local` dengan **key sandbox** (lihat 2.3):
   ```
   MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
   MIDTRANS_IS_PRODUCTION=false
   ```
2. Restart `npm run dev` → login → `/langganan` → pilih paket → **QRIS**.
3. **Simulasikan pembayaran** lewat **Sandbox Simulator** Midtrans
   (`https://simulator.sandbox.midtrans.com/` atau dari menu dashboard
   sandbox) — ini uji coba, bukan uang sungguhan.
4. Kembali ke halaman status (atau refresh) → member aktif → **invoice email**
   terkirim (lewat Resend, keluar dari local, jadi jalan).

> ⚠️ **Satu hal yang TIDAK jalan di localhost: webhook.** Midtrans tidak bisa
> memanggil `http://localhost`. Untungnya aplikasi punya **fallback polling**:
> halaman status mengecek status langsung ke Midtrans tiap 5 detik, jadi member
> tetap aktif walau webhook tidak sampai. Untuk menguji **alur webhook penuh**
> (aktivasi lewat notifikasi Midtrans), gunakan **ngrok** untuk membuka
> localhost ke internet, atau deploy ke Vercel lalu isi Payment Notification
> URL dengan domain asli (2.4).

---

## Bagian 3: Resend (Email: Invoice & Pengingat)

Resend adalah layanan pengiriman email yang dipakai aplikasi untuk mengirim
**invoice pembayaran**, **pengingat trial habis**, dan **pengingat perpanjangan
member**. Tanpa ini, semua email tersebut **diam-diam tidak terkirim** (lihat
peringatan di 3.6).

> ℹ️ Email **verifikasi pendaftaran** TIDAK lewat Resend — itu dikirim langsung
> oleh Supabase Auth. Jadi pendaftaran tetap bisa diverifikasi meski Resend belum
> diisi. Kalau verifikasi tidak tiba, tombol "Kirim ulang email verifikasi"
> memakai Supabase lagi, BUKAN Resend (lihat 3.7 untuk membuat pengirimnya
> branded).

### 3.1. Daftar Akun Resend

1. Buka **https://resend.com** → klik **"Sign Up"**.
2. Bisa daftar dengan **Google/GitHub** atau **email + password**.
3. Konfirmasi email yang dikirim Resend (cek inbox).

#### 💰 Paket gratis — cukup untuk mulai (modal minim)

Resend punya **paket gratis** yang cocok untuk tahap awal:

- **3.000 email/bulan** — cukup untuk puluhan member (invoice + pengingat hanya
  beberapa email per user per bulan).
- **100 email/hari**.
- **1 domain** pengirim.
- **Tanpa kartu kredit** saat daftar.

> ℹ️ Email verifikasi pendaftaran tidak memakai kuota ini (itu dari Supabase),
> jadi kuota gratis hanya terpakai untuk invoice & pengingat. Untuk go-live
> dengan member banyak, barulah perlu upgrade ke paket berbayar.

### 3.2. Membuat API Key

1. Login ke dashboard Resend.
2. Menu **"API Keys"** (sidebar kiri).
3. Klik **"Create API Key"**:
   - **Name**: `englishmudah-app` (bebas)
   - **Permission**: pilih **"Full access"** (untuk pengiriman email)
4. Klik **Create** → salin key yang muncul (format: `re_xxxxxxxx...`).
   > ⚠️ Key hanya tampil **sekali**. Kalau terlewat, buat ulang yang baru.
5. Buka file **`.env.local`** aplikasi dan isi `RESEND_API_KEY`:
   ```
   RESEND_API_KEY=re_xxxx (tempel key Anda)
   ```
6. Simpan file.

### 3.3. Menambahkan & Memverifikasi Domain Pengirim

`RESEND_FROM_EMAIL` harus berasal dari domain yang Anda miliki. Untuk go-live
dengan brand Anda (`admin@englishmudah.id`):

1. Di dashboard Resend, menu **"Domains"** → **"Add Domain"**.
2. Ketik nama domain Anda, mis. `englishmudah.id` → **Add**.
3. Resend menampilkan beberapa **catatan DNS** (TXT/CNAME/MX). Salin semuanya.
4. Buka pengaturan **DNS domain** Anda (di penyedia domain tempat Anda beli
   domain, mis. Niagahoster / idCloudHost / Cloudflare).
5. Tambahkan catatan TXT/CNAME/MX tersebut satu per satu → simpan.
6. Kembali ke Resend → klik **"Verify"** (atau tunggu ±1–24 jam sampai status
   menjadi **"Verified"**).
7. Setelah verified, isi di `.env.local`:
   ```
   RESEND_FROM_EMAIL=admin@englishmudah.id
   RESEND_FROM_NAME=englishmudah.id
   ```

> **Belum punya domain / mau tes cepat?** Lihat bagian 3.4 di bawah — pakai
> domain default `@resend.dev` tanpa verifikasi DNS.

### 3.4. Tes Cepat di Local (Tanpa Domain Sendiri)

Masih di local (`http://localhost:3000`) dan belum punya domain? Tidak masalah —
Resend menyediakan domain default **`resend.dev`** yang langsung bisa dipakai
**tanpa verifikasi DNS**.

1. Pastikan sudah punya **API Key** (langkah 3.2).
2. Isi `.env.local` seperti ini:
   ```
   RESEND_API_KEY=re_xxxx (tempel key Anda)
   RESEND_FROM_EMAIL=onboarding@resend.dev
   RESEND_FROM_NAME=englishmudah.id
   ```
   > `onboarding@resend.dev` adalah alamat default Resend. Nama (`englishmudah.id`)
   > bebas — hanya nama tampilan, bukan domain.
3. Simpan file → **hentikan** dan **jalankan ulang** `npm run dev`.
4. Tes: masuk → `/langganan` → bayar paket di sandbox → cek inbox: email
   **"Invoice Pembayaran #..."** dengan tombol **"Lihat Detail Pesanan"** harus tiba.

Kekurangan mode ini: email terkirim dari `onboarding@resend.dev`, bukan dari
brand Anda. **Wajib ganti ke domain sendiri sebelum go-live** (lihat 3.3).

### 3.5. Memulai Ulang & Menguji

1. Setelah mengubah `.env.local`, **hentikan** lalu **jalankan ulang**
   aplikasi: `npm run dev` (atau deploy ulang ke Vercel).
2. Tes paling mudah — **invoice**:
   - Masuk → buka `/langganan` → pilih paket → bayar di sandbox.
   - Cek inbox: harus ada email **"Invoice Pembayaran #..."** dengan tombol
     **"Lihat Detail Pesanan"**.
3. Tes pengingat: email trial/perpanjangan hanya terkirim otomatis oleh cron
   (tiap 6 jam) — cukup pastikan tidak ada error di log Vercel.

### 3.6. ⚠️ Peringatan Penting — Email "Diam-diam" Tidak Terkirim

Jika `RESEND_API_KEY` **atau** `RESEND_FROM_EMAIL` tidak diisi, semua email
aplikasi **tidak akan terkirim TANPA muncul error apa pun** (istilah teknis:
*no-op*). Aplikasi tetap berjalan normal, tampak sukses, tapi tidak ada yang
tiba di inbox customer. Dampaknya:

- User membayar paket → halaman bilang "Cek email untuk invoice" → **tidak ada
  email tiba**.
- Trial hampir habis → **pengingat tidak terkirim** → user lupa lanjut langganan.
- Member hampir habis → **pengingat perpanjangan tidak terkirim**.

Karena tidak ada error di log, Anda bisa mengira semuanya normal selama
berminggu-minggu padahal tidak ada satu email pun terkirim. Cara tercepat
mengecek: buka halaman `/langganan/status` pada tes pembayaran lalu lihat inbox.

**Cek 3 baris ini selalu terisi sebelum go-live:**
```
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=admin@englishmudah.id
RESEND_FROM_NAME=englishmudah.id
```

### 3.7. Email Verifikasi (Supabase) — dan Opsi SMTP Branded

Email **verifikasi pendaftaran**, **lupa password**, dan **ubah email** dikirim
oleh **Supabase Auth** — TIDAK lewat Resend. Secara bawaan, Supabase mengirimnya
dari alamat milik Supabase (mis. `noreply@<projectref>.supabase.co`).

**Kalau verifikasi tidak tiba di inbox:**
1. Cek folder **spam**.
2. Di halaman daftar, klik **"Kirim ulang email verifikasi"** — tetap dikirim
   oleh Supabase (bukan Resend).
3. Jika email yang didaftarkan salah, gunakan **"Ubah email"** (fitur aplikasi).

**Ingin verifikasi juga terkirim dari brand Anda?** Supabase mendukung **custom
SMTP**, dan Resend juga menyediakan **SMTP**. Dengan ini, SEMUA email (verifikasi
Supabase + invoice/pengingat Resend) tampil dari `admin@englishmudah.id`:

1. Pastikan domain terverifikasi di Resend (lihat 3.3).
2. Dashboard Supabase → **Authentication → SMTP Settings** → aktifkan **"Enable
   Custom SMTP"**.
3. Isi (nilai SMTP dari dashboard Resend → menu **"SMTP"**):
   ```
   Host       : smtp.resend.com
   Port       : 587
   User       : resend   (atau tempel RESEND_API_KEY Anda)
   Password   : <RESEND_API_KEY>
   Sender email : admin@englishmudah.id
   Sender name  : englishmudah.id
   ```
4. Klik **Save** → kirim email uji ("Send test email") → cek inbox.
   > ⚠️ Di paket gratis Supabase, custom SMTP hanya aktif di **mode production**
   > (bukan di localhost). Untuk tes lokal, verifikasi tetap dari alamat
   > Supabase — itu normal, jangan dianggap error.
5. Setelah go-live, verifikasi pendaftaran otomatis terkirim dari brand Anda.

> Opsi ini **tidak wajib** — tanpa SMTP, verifikasi tetap berfungsi, hanya
> tampil dari alamat Supabase. Atur hanya jika ingin satu identitas pengirim
> untuk semua email.

---

## Bagian 4: Berpindah ke Mode Produksi (Setelah Siap Go-Live)

Sandbox hanya untuk uji coba. Bagian ini merangkum **semua yang perlu diubah
saat go-live** — Midtrans, Resend, Supabase, dan env aplikasi. Kerjakan urut.

### 4.1. Siapkan Domain (wajib, dikerjakan sekali)

Anda butuh domain (mis. `englishmudah.id`) dari penyedia domain
(Niagahoster/idCloudHost/Cloudflare/dll). Domain ini dipakai untuk: webhook
Midtrans, domain pengirim email Resend, dan URL aplikasi.

1. Beli/daftarkan domain → arahkan DNS ke penyedia hosting/deploy Anda
   (biasanya Vercel: tambahkan catatan `A`/`CNAME` sesuai petunjuk Vercel).
2. Setelah aplikasi ter-deploy, verifikasi SSL aktif (https://) — Vercel
   menyediakannya otomatis.

### 4.2. Deploy Aplikasi ke Vercel

1. Push kode ke repository (GitHub/GitLab) → buat project baru di
   **vercel.com** → import repository.
2. Di **Settings → Environment Variables**, isi SEMUA variabel berikut
   (nilai produksi, bukan sandbox):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   MIDTRANS_SERVER_KEY=Mid-server-...        (produksi)
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-...
   MIDTRANS_IS_PRODUCTION=true
   RESEND_API_KEY=re_...                      (produksi)
   RESEND_FROM_EMAIL=admin@englishmudah.id
   RESEND_FROM_NAME=englishmudah.id
   NEXT_PUBLIC_APP_URL=https://englishmudah.id
   SESSION_SECRET=<string acak panjang>
   CRON_SECRET=<string acak panjang>
   ADMIN_SETUP_CODE=<kode rahasia>
   NEXT_PUBLIC_WHATSAPP_NUMBER=6281234567890
   ```
   > ⚠️ JANGAN salin `.env.local` ke Vercel — isi manual satu per satu di
   > dashboard. Vercel Cron (untuk pengingat email) aktif otomatis via
   > `vercel.json`.
3. Deploy → aplikasi bisa dibuka di `https://englishmudah.id`.

### 4.3. Supabase — Ubah URL Aplikasi

1. Dashboard Supabase → **Authentication → URL Configuration**.
2. **Site URL**: `https://englishmudah.id` (ganti dari localhost).
3. **Redirect URLs**: tambahkan `https://englishmudah.id/auth/callback`.
4. Jika login Google aktif, tambahkan URL baru di Google Cloud Console
   (Authorized JavaScript origins & redirect URIs), lihat bagian 1.6.

### 4.4. Midtrans — Aktifkan Produksi

1. Di dashboard Midtrans, hubungi tim untuk **aktivasi produksi** — butuh:
   - KTP
   - Rekening bank aktif
   - (Opsional) NPWP / dokumen usaha
2. Setelah disetujui, buka dashboard **produksi**
   (dashboard.midtrans.com, bukan sandbox).
3. Ambil **Server Key** & **Client Key** produksi (dimulai `Mid-server-...`
   tanpa awalan `SB-`).
4. Update di `.env.local` (local) **dan** di Vercel (produksi):
   ```
   MIDTRANS_SERVER_KEY=Mid-server-isi_server_key_produksi
   NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-isi_client_key_produksi
   MIDTRANS_IS_PRODUCTION=true
   ```
5. Pastikan **Payment Notification URL** di dashboard produksi juga diisi
   dengan URL domain asli:
   `https://englishmudah.id/api/payments/webhook`
6. Uji sekali bayar kecil (Rp 1 dengan QRIS) untuk memastikan lancar.

### 4.5. Resend — Verifikasi Domain & Ganti Pengirim

1. Ikuti langkah 3.3 (verifikasi domain `englishmudah.id` di Resend) hingga
   status **"Verified"**.
2. Pastikan `RESEND_FROM_EMAIL=admin@englishmudah.id` terisi di Vercel
   (bukan `onboarding@resend.dev` lagi).
3. Tes: lakukan 1 pembayaran produksi → invoice harus tiba dari
   `admin@englishmudah.id`.

### 4.6. Uji Menyeluruh Sebelum Mempublikasikan

- [ ] Pendaftaran + verifikasi email (dari Supabase) berjalan.
- [ ] Login (password & Google) berjalan.
- [ ] Pembayaran QRIS/VA berhasil → member aktif → invoice + "Lihat Detail
      Pesanan" tiba di email.
- [ ] `https://englishmudah.id/api/cron` tidak error (header `X-Cron-Secret`
      sesuai `CRON_SECRET`).
- [ ] Webhook Midtrans terisi URL produksi & berstatus sukses pada log.
- [ ] 3 baris Resend terisi (lihat 3.6).

---

## Ringkasan Strategi "Modal Minim" (Mulai Gratis Dulu)

Semua layanan yang dibutuhkan punya paket **gratis** yang cukup untuk memulai:

| Layanan | Paket gratis | Fungsi di aplikasi | Upgrade saat... |
|---------|--------------|--------------------|-----------------|
| **Supabase** | 500 MB DB, 50k user aktif/bulan, email Auth gratis | Database + login + verifikasi | User tumbuh / butuh backup besar |
| **Vercel** | 100 GB bandwidth, hosting otomatis | Deploy aplikasi | Traffic naik / butuh fitur tim |
| **Midtrans** | Sandbox gratis (tes tanpa uang) | Pembayaran QRIS/VA | **Go-live** (butuh aktivasi produksi) |
| **Resend** | 3.000 email/bulan | Invoice + pengingat | Member banyak (>±300/bulan) |
| **Domain** | ~Rp 100–200rb/tahun (tidak gratis) | Identitas brand + email pengirim | **Go-live** (wajib) |

> 💡 **Saran hemat:** jalankan semuanya di paket gratis + Midtrans sandbox.
> Satu-satunya pengeluaran nyata sebelum go-live hanya **domain**. Upgrade layanan
> baru dilakukan saat member sudah bertumbuh.

---

## Cek Cepat — Sudah Siap?

**Untuk pengembangan (local/sandbox):**
- [ ] Supabase: project dibuat + region Singapore
- [ ] `.env.local` berisi URL & anon key Supabase
- [ ] Semua migration (001–009) sukses dijalankan
- [ ] Migration `010`–`013` juga dijalankan (kupon admin wajib: `013_coupon_rpc.sql`)
- [ ] Akun Anda sudah jadi admin
- [ ] Midtrans: akun dibuat + Server/Client key sandbox terisi
- [ ] Webhook URL sandbox sudah diisi
- [ ] Resend: `RESEND_API_KEY` terisi (boleh pakai `onboarding@resend.dev`)

**Untuk go-live (tambahan, lihat Bagian 4):**
- [ ] Domain `englishmudah.id` aktif + SSL
- [ ] Aplikasi ter-deploy di Vercel dengan semua env produksi
- [ ] Supabase Site URL & Redirect URL sudah `https://englishmudah.id`
- [ ] Midtrans produksi aktif + key produksi + `MIDTRANS_IS_PRODUCTION=true`
- [ ] Webhook URL produksi terisi
- [ ] Resend domain terverifikasi + `RESEND_FROM_EMAIL=admin@englishmudah.id`
- [ ] `NEXT_PUBLIC_APP_URL=https://englishmudah.id`
- [ ] Uji menyeluruh (4.6) lulus

Jika semua tercentang, aplikasi siap dipakai. Kalau ada langkah yang kurang
jelas atau error, kirim tangkapan layar pesan errornya — saya bantu
selesaikan.
