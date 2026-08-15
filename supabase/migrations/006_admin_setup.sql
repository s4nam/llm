-- ============================================================
-- englishmudah.id — Migration 006: Admin Setup (Klaim Admin)
-- Jalankan setelah 005_admin_monitoring.sql
--
-- RPC ini memungkinkan admin PERTAMA diklaim lewat aplikasi
-- (bukan SQL manual). Hanya berfungsi jika belum ada admin sama sekali.
-- ============================================================

create or replace function public.promote_first_admin()
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_has_admin boolean;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return false;
  end if;

  -- Cek apakah sudah ada admin lain
  select exists(
    select 1 from public.profiles where role = 'admin'
  ) into v_has_admin;

  if v_has_admin then
    return false;
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where id = v_user_id;

  return found;
end;
$$;
