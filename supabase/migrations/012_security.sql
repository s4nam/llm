-- ============================================================
-- englishmudah.id — Migration 012: Keamanan (Fase 0a)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. Anti brute-force login: tabel login_attempts + RPC cek/lock.
-- 2. Perbaiki change_email_unverified (tutup celah account takeover):
--    verifikasi kepemilikan lewat PASSWORD (bukan sesi), agar user yang
--    salah ketik email (belum diverifikasi → belum bisa login) tetap bisa
--    memperbaiki emailnya tanpa membuka celah bagi attacker.
-- ============================================================

-- pgcrypto dibutuhkan untuk crypt()/bcrypt password verification.
create extension if not exists pgcrypto;

-- ---------- 1. LOG PERCOBAAN LOGIN (anti brute-force) ----------
create table if not exists public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists login_attempts_email_idx on public.login_attempts(email, created_at desc);
create index if not exists login_attempts_ip_idx on public.login_attempts(ip, created_at desc);

alter table public.login_attempts enable row level security;
create policy "login_attempts server only" on public.login_attempts
  for select using (false);
create policy "login_attempts no direct write" on public.login_attempts
  for all using (false) with check (false);

-- Catat percobaan login (dipanggil aplikasi server-side).
create or replace function public.record_login_attempt(
  p_email text,
  p_ip text,
  p_success boolean
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.login_attempts (email, ip, success)
  values (lower(trim(p_email)), p_ip, coalesce(p_success, false));
end;
$$;

-- Cek apakah login terkunci.
-- Aturan: dalam 15 menit terakhir ada >= 5 percobaan GAGAL
-- dari kombinasi email+ip ATAU hanya ip yang sama.
create or replace function public.is_login_locked(
  p_email text,
  p_ip text
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_fail_email int;
  v_fail_ip int;
begin
  select count(*) into v_fail_email
  from public.login_attempts
  where email = lower(trim(p_email))
    and success = false
    and created_at > now() - interval '15 minutes';

  select count(*) into v_fail_ip
  from public.login_attempts
  where ip = p_ip
    and success = false
    and created_at > now() - interval '15 minutes';

  return (coalesce(v_fail_email, 0) >= 5 or coalesce(v_fail_ip, 0) >= 10);
end;
$$;

-- Bersihkan log lebih tua dari 24 jam (dipanggil cron, hemat storage).
create or replace function public.purge_login_attempts()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.login_attempts where created_at < now() - interval '24 hours';
end;
$$;

-- ---------- 2. PERBAIKI change_email_unverified (anti account takeover) ----------
-- Verifikasi kepemilikan akun lewat PASSWORD (pgcrypto crypt), bukan sesi.
-- Ini menutup celah account takeover TETAPI tetap membolehkan user yang
-- salah ketik email (akun belum diverifikasi → belum bisa login) memperbaiki
-- emailnya, asalkan ia mengetahui password akun tersebut.
create or replace function public.change_email_unverified(
  p_old_email text,
  p_new_email text,
  p_password text
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_old_email text := lower(trim(p_old_email));
  v_new_email text := lower(trim(p_new_email));
  v_user_id uuid;
  v_old_confirmed timestamptz;
  v_exists uuid;
  v_encrypted_password text;
begin
  -- Validasi format dasar email baru
  if v_new_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$' then
    return 'INVALID';
  end if;

  -- Cari akun dari email lama
  select id, email_confirmed_at, encrypted_password
    into v_user_id, v_old_confirmed, v_encrypted_password
    from auth.users
   where email = v_old_email;

  if v_user_id is null then
    return 'NOT_FOUND';
  end if;

  -- Bukti kepemilikan: password harus cocok dengan hash bcrypt akun.
  -- (tanpa sesi yang cocok, password adalah satu-satunya bukti aman;
  --  attacker yang hanya tahu email tidak bisa menebak password)
  if v_encrypted_password is null
     or v_encrypted_password = ''
     or p_password is null
     or p_password = ''
     or crypt(p_password, v_encrypted_password) <> v_encrypted_password then
    return 'WRONG_PASSWORD';
  end if;

  -- Hanya akun yang BELUM diverifikasi yang boleh diganti emailnya
  if v_old_confirmed is not null then
    return 'CONFIRMED';
  end if;

  -- Email baru tidak boleh dipakai akun lain
  select id into v_exists from auth.users where email = v_new_email;
  if v_exists is not null and v_exists <> v_user_id then
    return 'EMAIL_TAKEN';
  end if;

  -- Update email di auth.users + profiles
  update auth.users
     set email = v_new_email,
         email_change = null,
         email_change_token_current = null,
         email_change_token_new = null,
         email_change_sent_at = null,
         raw_app_meta_data = jsonb_set(
           coalesce(raw_app_meta_data, '{}'::jsonb),
           '{email}',
           to_jsonb(v_new_email)
         ),
         updated_at = now()
   where id = v_user_id;

  update public.profiles
     set email = v_new_email,
         updated_at = now()
   where id = v_user_id;

  return 'OK';
end;
$$;
