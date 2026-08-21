-- ============================================================
-- englishmudah.id — Migration 022: Pengaman soal duplikat (AI)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Mencegah soal yang sama tersimpan berkali-kali saat konten
-- di-generate AI (materi lama vs baru, maupun di dalam satu set).
-- Pengaman 2 lapis:
--   1. Exact match  — teks pertanyaan identik (case-insensitive, trim).
--   2. Fuzzy (pg_trgm) — teks sangat mirip (similarity >= 0.9) yang
--      biasanya hanya beda rephrasing kecil.
-- Cakupan LINTAS-MODUL: soal pelajaran biasa dicek juga terhadap
-- soal latihan akademik (toefl_sets), dan sebaliknya — sehingga satu
-- pertanyaan tidak bisa muncul di dua modul berbeda.
-- Berlaku untuk: lessons (create/update/regenerate), toefl_sets
-- (create/update), dan placement (di dalam set).
-- ============================================================

create extension if not exists pg_trgm;

-- Helper: daftar pertanyaan yang duplikat DI DALAM satu kumpulan soal.
-- (duplikat persis saja; fuzzy hanya dipakai untuk perbandingan lintas materi)
create or replace function public.inner_question_duplicates(p_questions jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(d.q), '{}'::text[])
  from (
    select lower(btrim(e ->> 'question')) as q
    from jsonb_array_elements(p_questions) e
    where e ->> 'question' is not null
    group by 1
    having count(*) > 1
  ) d;
$$;

-- Helper: ekstrak semua teks pertanyaan dari konten set akademik
-- (reading: content.passages[].questions[], listening: content.scripts[].questions[]).
-- Sudah dinormalisasi (lowercase + trim).
create or replace function public.toefl_content_questions(p_content jsonb)
returns setof text
language sql
immutable
as $$
  select lower(btrim(e ->> 'question'))
  from jsonb_array_elements(
    coalesce(p_content -> 'passages', p_content -> 'scripts', '[]'::jsonb)
  ) s
  cross join lateral jsonb_array_elements(coalesce(s -> 'questions', '[]'::jsonb)) e
  where e ->> 'question' is not null
$$;

-- Cek duplikat soal pelajaran terhadap materi lain yang tersimpan.
-- p_exclude_id: id pelajaran yang sedang di-update (dikecualikan).
create or replace function public.lesson_duplicates(
  p_quiz jsonb,
  p_exclude_id uuid default null
)
returns text[]
language plpgsql
security definer set search_path = public
as $$
declare
  v_dups text[];
begin
  v_dups := public.inner_question_duplicates(coalesce(p_quiz, '[]'::jsonb));
  if v_dups <> '{}'::text[] then
    return v_dups;
  end if;

  -- vs materi pelajaran lain
  select coalesce(array_agg(distinct n.q), '{}'::text[]) into v_dups
  from (
    select lower(btrim(e ->> 'question')) as q
    from jsonb_array_elements(p_quiz) e
    where e ->> 'question' is not null
  ) n
  where exists (
    select 1
    from public.lessons l
    cross join lateral jsonb_array_elements(l.quiz) o
    where (p_exclude_id is null or l.id <> p_exclude_id)
      and (
        lower(btrim(o ->> 'question')) = n.q
        or similarity(lower(btrim(o ->> 'question')), n.q) >= 0.9
      )
  );

  -- vs set akademik (toefl_sets)
  if v_dups = '{}'::text[] then
    select coalesce(array_agg(distinct n.q), '{}'::text[]) into v_dups
    from (
      select lower(btrim(e ->> 'question')) as q
      from jsonb_array_elements(p_quiz) e
      where e ->> 'question' is not null
    ) n
    where exists (
      select 1
      from public.toefl_sets t
      cross join lateral public.toefl_content_questions(t.content) o
      where o = n.q or similarity(o, n.q) >= 0.9
    );
  end if;

  return v_dups;
end;
$$;

-- Cek duplikat soal set akademik (reading/listening) terhadap set lain.
create or replace function public.toefl_duplicates(
  p_content jsonb,
  p_exclude_id uuid default null
)
returns text[]
language plpgsql
security definer set search_path = public
as $$
declare
  v_dups text[];
  v_questions jsonb;
begin
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_questions
  from (
    select e
    from jsonb_array_elements(
      coalesce(p_content -> 'passages', p_content -> 'scripts', '[]'::jsonb)
    ) s
    cross join lateral jsonb_array_elements(coalesce(s -> 'questions', '[]'::jsonb)) e
    where e ->> 'question' is not null
  ) x;

  v_dups := public.inner_question_duplicates(v_questions);
  if v_dups <> '{}'::text[] then
    return v_dups;
  end if;

  -- vs set akademik lain
  select coalesce(array_agg(distinct n.q), '{}'::text[]) into v_dups
  from (
    select lower(btrim(e ->> 'question')) as q
    from jsonb_array_elements(v_questions) e
  ) n
  where exists (
    select 1
    from public.toefl_sets t
    cross join lateral public.toefl_content_questions(t.content) o
    where (p_exclude_id is null or t.id <> p_exclude_id)
      and (o = n.q or similarity(o, n.q) >= 0.9)
  );

  -- vs materi pelajaran (lessons)
  if v_dups = '{}'::text[] then
    select coalesce(array_agg(distinct n.q), '{}'::text[]) into v_dups
    from (
      select lower(btrim(e ->> 'question')) as q
      from jsonb_array_elements(v_questions) e
    ) n
    where exists (
      select 1
      from public.lessons l
      cross join lateral jsonb_array_elements(l.quiz) o
      where lower(btrim(o ->> 'question')) = n.q
        or similarity(lower(btrim(o ->> 'question')), n.q) >= 0.9
    );
  end if;

  return v_dups;
end;
$$;

-- ---------- Pasang pengaman di RPC simpan pelajaran ----------
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
  v_dups text[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  v_dups := public.lesson_duplicates(coalesce(p_quiz, '[]'::jsonb), null);
  if v_dups <> '{}'::text[] then
    raise exception 'Soal duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  insert into public.lessons (
    level_code, category, title, slug, intro, sections, quiz,
    is_free, status, created_at, updated_at
  ) values (
    p_level_code, p_category, p_title, p_slug, p_intro, p_sections, p_quiz,
    coalesce(p_is_free, false), 'draft', now(), now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

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
      status = 'draft', updated_at = now()
  where id = p_lesson_id;
end;
$$;

create or replace function public.regenerate_lesson(
  p_lesson_id uuid,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb
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
      status = 'draft', updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- ---------- Pasang pengaman di RPC simpan set akademik ----------
create or replace function public.admin_create_toefl_set(
  p_section text,
  p_title text,
  p_slug text,
  p_content jsonb,
  p_is_free boolean
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_id uuid;
  v_dups text[];
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  v_dups := public.toefl_duplicates(coalesce(p_content, '{}'::jsonb), null);
  if v_dups <> '{}'::text[] then
    raise exception 'Soal duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  insert into public.toefl_sets (section, title, slug, content, source, status, is_free, created_at, updated_at)
  values (p_section, p_title, p_slug, p_content, 'ai', 'draft', coalesce(p_is_free, false), now(), now())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_update_toefl_set(
  p_set_id uuid,
  p_content jsonb
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

  v_dups := public.toefl_duplicates(coalesce(p_content, '{}'::jsonb), p_set_id);
  if v_dups <> '{}'::text[] then
    raise exception 'Soal duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  update public.toefl_sets
  set content = p_content, status = 'draft', updated_at = now()
  where id = p_set_id;
end;
$$;

-- ---------- Pasang pengaman di RPC simpan placement ----------
create or replace function public.save_placement_questions(p_questions jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_dups text[];
begin
  v_dups := public.inner_question_duplicates(coalesce(p_questions, '[]'::jsonb));
  if v_dups <> '{}'::text[] then
    raise exception 'Soal placement duplikat ditemukan: %', array_to_string(v_dups, ' | ');
  end if;

  insert into public.placement_tests (id, questions, generated_at)
  values (1, p_questions, now())
  on conflict (id) do update set
    questions = excluded.questions,
    generated_at = now();
end;
$$;