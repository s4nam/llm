-- ============================================================
-- englishmudah.id — Migration 030: Media Penjelasan Dinamis
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. Tambah kolom explanation_media (jsonb) pada lessons:
--    { "type": "classic"|"youtube"|"image", "youtube_url": string|null, "image_url": string|null, "image_path": string|null }
--    Default "classic" agar materi lama tetap tampil teks (intro+sections).
-- 2. Bucket lesson-images (public) untuk upload 1 gambar per materi.
-- 3. Update RPC admin agar menyimpan/mengembalikan media.
-- ============================================================

-- ---------- 1. KOLOM explanation_media ----------
alter table public.lessons
  add column if not exists explanation_media jsonb not null default '{"type":"classic"}'::jsonb;

-- Pastikan baris lama terisi classic jika masih null/default lama
update public.lessons set explanation_media = '{"type":"classic"}'::jsonb where explanation_media is null;

-- ---------- 2. STORAGE BUCKET lesson-images ----------
insert into storage.buckets (id, name, public)
values ('lesson-images', 'lesson-images', true)
on conflict (id) do nothing;

-- Policy: admin bisa upload/update/delete, publik bisa read
do $$
begin
  -- upload
  if not exists (select 1 from pg_policies where policyname = 'Admin can upload lesson-images' and tablename = 'objects') then
    create policy "Admin can upload lesson-images"
      on storage.objects for insert
      with check (bucket_id = 'lesson-images' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin can update lesson-images' and tablename = 'objects') then
    create policy "Admin can update lesson-images"
      on storage.objects for update
      using (bucket_id = 'lesson-images' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin can delete lesson-images' and tablename = 'objects') then
    create policy "Admin can delete lesson-images"
      on storage.objects for delete
      using (bucket_id = 'lesson-images' and public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public can read lesson-images' and tablename = 'objects') then
    create policy "Public can read lesson-images"
      on storage.objects for select
      using (bucket_id = 'lesson-images');
  end if;
end $$;

-- ---------- 3. RPC: set media per lesson (admin) ----------
create or replace function public.admin_set_lesson_media(
  p_lesson_id uuid,
  p_media jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  -- validasi type
  if coalesce(p_media->>'type','') not in ('classic','youtube','image') then
    raise exception 'media type tidak valid (classic|youtube|image)';
  end if;
  update public.lessons
    set explanation_media = p_media,
        updated_at = now()
    where id = p_lesson_id;
end;
$$;

-- ---------- 4. UPDATE admin_create_lesson: tambah p_media ----------
create or replace function public.admin_create_lesson(
  p_level_code text,
  p_category text,
  p_title text,
  p_slug text,
  p_intro text,
  p_sections jsonb,
  p_quiz jsonb,
  p_games jsonb,
  p_is_free boolean,
  p_media jsonb default '{"type":"classic"}'::jsonb
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
    is_free, status, explanation_media, created_at, updated_at
  ) values (
    p_level_code, p_category, p_title, p_slug, p_intro, p_sections, p_quiz,
    coalesce(p_games, '[]'::jsonb),
    coalesce(p_is_free, false), 'draft',
    coalesce(p_media, '{"type":"classic"}'::jsonb),
    now(), now()
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- 5. RPC get_lesson_admin: return explanation_media ----------
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
  explanation_media jsonb,
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
           l.intro, l.sections, l.quiz, l.games, l.explanation_media, l.is_free, l.status, l.published_at
    from public.lessons l
    where l.id = p_lesson_id;
end;
$$;
