-- ============================================================
-- englishmudah.id — Migration 016: Nonaktifkan member (admin)
-- Jalankan setelah 015_data_cleanup.sql
--
-- Tombol "Nonaktifkan member" di Admin → Monetisasi memanggil RPC ini.
-- RLS profiles hanya mengizinkan user mengubah profilnya sendiri,
-- jadi perlu fungsi security definer dengan cek is_admin() (pola sama
-- seperti admin_set_member).
-- ============================================================

create or replace function public.admin_deactivate_member(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.profiles
  set is_member = false,
      member_expires_at = null,
      updated_at = now()
  where id = p_user_id;

  insert into public.membership_log (user_id, action, detail)
  values (p_user_id, 'manual_deactivate', 'Member dinonaktifkan oleh admin.');
end;
$$;
