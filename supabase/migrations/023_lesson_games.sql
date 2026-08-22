-- ============================================================
-- englishmudah.id — Migration 023: Games per Pelajaran
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. Tambah kolom `games` (JSONB) pada lessons — variasi latihan
--    (Listening/Unscramble/Word Stress/Role-play) per level CEFR.
--    Kosong ('[]') = tidak ada game tambahan (pelajaran lama aman).
-- 2. Perbarui RPC admin agar menerima/mengembalikan `games`,
--    sambil MEMPERTAHANKAN duplicate guard dari migration 022.
-- ============================================================

-- ---------- 1. KOLOM GAMES ----------
alter table public.lessons
  add column if not exists games jsonb not null default '[]'::jsonb;

-- ---------- 2. RPC SIMPAN PELAJARAN (tambah p_games, pertahankan guard) ----------
create or replace function public.admin_create_lesson(
  p_level_code text,
  p_category text,
  p_title text,
  p_slug text,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb,
  p_games jsonb,
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
    level_code, category, title, slug, intro, sections, quiz, games,
    is_free, status, created_at, updated_at
  ) values (
    p_level_code, p_category, p_title, p_slug, p_intro, p_sections, p_quiz,
    coalesce(p_games, '[]'::jsonb),
    coalesce(p_is_free, false), 'draft', now(), now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- 3. RPC UPDATE PELAJARAN (tambah p_games, pertahankan guard) ----------
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
      status = 'draft', updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- ---------- 4. RPC REGENERATE PELAJARAN (tambah p_games, pertahankan guard) ----------
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
      status = 'draft', updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- ---------- 5. RPC BACA PELAJARAN ADMIN (return games) ----------
-- PERHATIAN: CREATE OR REPLACE TIDAK BISA mengubah tipe return (kolom games
-- menambah OUT parameter). Wajib DROP dulu sebelum recreate.
drop function if exists public.get_lesson_admin(uuid);

create function public.get_lesson_admin(p_lesson_id uuid)
returns table (
  id uuid,
  level_code text,
  category text,
  title text,
  slug text,
  intro text,
  sections jsonb,
  quiz jsonb,
  games jsonb,
  is_free boolean,
  status text,
  published_at timestamptz
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
           l.intro, l.sections, l.quiz, l.games, l.is_free, l.status, l.published_at
    from public.lessons l
    where l.id = p_lesson_id;
end;
$$;