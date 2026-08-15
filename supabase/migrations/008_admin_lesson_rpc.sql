-- ============================================================
-- englishmudah.id — Migration 008: Fungsi simpan pelajaran (bypass RLS)
-- Jalankan setelah 007_fix_lessons_rls.sql
--
-- INSERT langsung lewat Supabase client (anon key) bisa gagal RLS.
-- Solusi andal: fungsi security definer yang berjalan sebagai pemilik
-- tabel sehingga tidak terhalang RLS, TETAPI tetap memeriksa is_admin().
-- ============================================================

create or replace function public.admin_create_lesson(
  p_level_code text,
  p_category text,
  p_title text,
  p_slug text,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb,
  p_is_free boolean
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  insert into public.lessons (
    level_code, category, title, slug, intro, sections, quiz,
    is_free, status, created_at, updated_at
  ) values (
    p_level_code, p_category, p_title, p_slug, p_intro, p_sections, p_quiz,
    p_is_free, 'draft', now(), now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Fungsi update materi (regenerate) — bypass RLS, tetap cek admin
create or replace function public.admin_update_lesson(
  p_lesson_id uuid,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.lessons
  set intro = p_intro, sections = p_sections, quiz = p_quiz,
      status = 'draft', updated_at = now()
  where id = p_lesson_id;
end;
$$;
