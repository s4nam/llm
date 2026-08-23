-- ============================================================
-- englishmudah.id — Migration 032: Audit Kunci Jawaban (skip yang sudah diverifikasi)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Tujuan: mengurangi beban audit. Konten yang sudah pernah diverifikasi
-- (kunci jawabannya benar/diperbaiki) TIDAK perlu dicek ulang.
--
-- 1. Tambah kolom `answers_verified_at` di tabel konten (lessons, toefl_sets,
--    situational_sets, placement_tests). NULL = belum diverifikasi.
-- 2. RPC list admin diperbarui untuk mengembalikan kolom tsb (return type berubah,
--    jadi wajib DROP dulu sebelum recreate — pola sama seperti migration 023).
-- 3. RPC update/regenerate di-reset `answers_verified_at` → NULL, karena konten
--    berubah berarti kunci jawaban baru harus diverifikasi ulang.
-- 4. RPC baru `mark_*_answers_verified` untuk menandai konten sebagai sudah
--    diverifikasi (dipanggil oleh halaman Audit Jawaban setelah berhasil).
-- ============================================================

-- ---------- 1. KOLOM BARU ----------
alter table public.lessons
  add column if not exists answers_verified_at timestamptz;

alter table public.toefl_sets
  add column if not exists answers_verified_at timestamptz;

alter table public.situational_sets
  add column if not exists answers_verified_at timestamptz;

alter table public.placement_tests
  add column if not exists answers_verified_at timestamptz;

-- ---------- 2. LIST ADMIN DIPERBARUI (drop + recreate karena return type berubah) ----------

-- LESSONS
drop function if exists public.list_lessons_admin();
create function public.list_lessons_admin()
returns table (
  id uuid,
  level_code text,
  category text,
  title text,
  slug text,
  is_free boolean,
  status text,
  published_at timestamptz,
  updated_at timestamptz,
  answers_verified_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select l.id, l.level_code, l.category, l.title, l.slug,
           l.is_free, l.status, l.published_at, l.updated_at,
           l.answers_verified_at
    from public.lessons l
    order by l.level_code, l.category, l.title;
end;
$$;

-- TOEFL
drop function if exists public.list_toefl_sets_admin();
create function public.list_toefl_sets_admin()
returns table (
  id uuid,
  section text,
  title text,
  slug text,
  is_free boolean,
  status text,
  published_at timestamptz,
  updated_at timestamptz,
  answers_verified_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select s.id, s.section, s.title, s.slug, s.is_free, s.status, s.published_at,
           s.updated_at, s.answers_verified_at
    from public.toefl_sets s
    order by s.section, s.title;
end;
$$;

-- SITUASIONAL
drop function if exists public.list_situational_sets_admin();
create function public.list_situational_sets_admin()
returns table (
  id uuid,
  topic text,
  title text,
  slug text,
  is_free boolean,
  status text,
  published_at timestamptz,
  updated_at timestamptz,
  answers_verified_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select s.id, s.topic, s.title, s.slug, s.is_free, s.status, s.published_at,
           s.updated_at, s.answers_verified_at
    from public.situational_sets s
    order by s.topic, s.title;
end;
$$;

-- ---------- 3. RESET SAAT KONTEN DIUBAH ----------

-- LESSONS: admin_update_lesson & regenerate_lesson
create or replace function public.admin_update_lesson(
  p_lesson_id uuid,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb,
  p_games jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_dups text[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  v_dups := public.lesson_duplicates(coalesce(p_quiz, '[]'::jsonb), p_lesson_id);
  if v_dups <> '{}'::text[] then
    raise exception 'Soal duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  update public.lessons
  set intro = p_intro, sections = p_sections, quiz = p_quiz,
      games = coalesce(p_games, '[]'::jsonb),
      status = 'draft', answers_verified_at = null, updated_at = now()
  where id = p_lesson_id;
end;
$$;

create or replace function public.regenerate_lesson(
  p_lesson_id uuid,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb,
  p_games jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_dups text[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  v_dups := public.lesson_duplicates(coalesce(p_quiz, '[]'::jsonb), p_lesson_id);
  if v_dups <> '{}'::text[] then
    raise exception 'Soal duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  update public.lessons
  set intro = p_intro, sections = p_sections, quiz = p_quiz,
      games = coalesce(p_games, '[]'::jsonb),
      status = 'draft', answers_verified_at = null, updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- TOEFL
create or replace function public.admin_update_toefl_set(
  p_set_id uuid,
  p_content jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.toefl_sets
  set content = p_content, status = 'draft', answers_verified_at = null, updated_at = now()
  where id = p_set_id;
end;
$$;

-- SITUASIONAL
create or replace function public.admin_update_situational_set(
  p_set_id uuid,
  p_content jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.situational_sets
  set content = p_content, status = 'draft', answers_verified_at = null, updated_at = now()
  where id = p_set_id;
end;
$$;

-- PLACEMENT
create or replace function public.save_placement_questions(p_questions jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.placement_tests (id, questions, generated_at, answers_verified_at)
  values (1, p_questions, now(), null)
  on conflict (id) do update set
    questions = excluded.questions,
    generated_at = now(),
    answers_verified_at = null;
end;
$$;

-- ---------- 4. TANDAI SUDAH DIVERIFIKASI ----------

-- LESSONS
create or replace function public.mark_lesson_answers_verified(p_lesson_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.lessons
  set answers_verified_at = now(), updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- TOEFL
create or replace function public.mark_toefl_answers_verified(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.toefl_sets
  set answers_verified_at = now(), updated_at = now()
  where id = p_set_id;
end;
$$;

-- SITUASIONAL
create or replace function public.mark_situational_answers_verified(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.situational_sets
  set answers_verified_at = now(), updated_at = now()
  where id = p_set_id;
end;
$$;

-- PLACEMENT
create or replace function public.mark_placement_answers_verified()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.placement_tests
  set answers_verified_at = now()
  where id = 1;
end;
$$;

-- Baca status verified placement (tanpa bocor soal) — dipakai route audit.
create or replace function public.get_placement_verified_admin()
returns table (answers_verified_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select p.answers_verified_at
    from public.placement_tests p
    where p.id = 1;
end;
$$;