-- ============================================================
-- englishmudah.id — 006: Ubah email akun yang BELUM terverifikasi
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Mengizinkan user memperbaiki email yang salah ketik saat daftar.
-- Hanya berlaku untuk akun yang BELUM diverifikasi (email_confirmed_at is null),
-- sehingga aman dari pembajakan akun yang sudah aktif.
-- ============================================================

create or replace function public.change_email_unverified(
  p_old_email text,
  p_new_email text
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
begin
  -- Validasi format dasar email baru
  if v_new_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$' then
    return 'INVALID';
  end if;

  -- Cari akun dari email lama
  select id, email_confirmed_at
    into v_user_id, v_old_confirmed
    from auth.users
   where email = v_old_email;

  if v_user_id is null then
    return 'NOT_FOUND';
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
