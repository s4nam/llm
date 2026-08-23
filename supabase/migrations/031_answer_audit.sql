-- ============================================================
-- englishmudah.id — Migration 031: Audit Kunci Jawaban
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Menambah RPC admin untuk membaca soal placement test BESERTA
-- kunci jawaban (answerIndex) agar alat "Audit Kunci Jawaban"
-- bisa memverifikasi kebenaran jawaban soal placement.
--
-- get_placement_questions() yang lama sengaja MENGHILANGKAN
-- answerIndex (anti bocor ke client). RPC ini hanya untuk admin
-- (guard is_admin) dan dipakai oleh halaman audit.
-- ============================================================

create or replace function public.get_placement_questions_admin()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return (
    select coalesce(questions, '[]'::jsonb)
    from public.placement_tests
    where id = 1
  );
end;
$$;