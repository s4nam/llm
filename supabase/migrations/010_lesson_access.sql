-- ============================================================
-- englishmudah.id — Migration 010: Akses Pelajaran (Paywall)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Menutup celah paywall:
-- 1. Helper is_member_active() — member aktif ATAU trial aktif.
-- 2. Policy SELECT lessons diperketat: published AND (is_free OR member aktif).
--    → non-member tidak bisa membaca pelajaran berbayar dari DB.
-- 3. RPC get_lesson_meta(slug, level) — meta saja (tanpa konten),
--    dipakai agar non-member melihat gate berjudul (bukan 404).
-- ============================================================

-- ---------- 1. HELPER STATUS AKSES ----------
create or replace function public.is_member_active()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        -- member aktif (belum lewat member_expires_at)
        (is_member = true and member_expires_at is not null and member_expires_at > now())
        -- atau trial aktif
        or (trial_expires_at is not null and trial_expires_at > now())
      )
  );
$$;

-- ---------- 2. PERKETAT POLICY SELECT lessons ----------
drop policy if exists "Published lessons are viewable" on public.lessons;

create policy "Lessons viewable only if free or member" on public.lessons
  for select using (
    status = 'published'
    and (is_free or public.is_member_active())
  );

-- ---------- 3. RPC META PELAJARAN (tanpa konten) ----------
-- Mengembalikan meta pelajaran published untuk gate halaman.
-- Tidak pernah mengembalikan intro/sections/quiz.
create or replace function public.get_lesson_meta(
  p_slug text,
  p_level text
)
returns table (
  id uuid,
  level_code text,
  category text,
  title text,
  slug text,
  is_free boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select l.id, l.level_code, l.category, l.title, l.slug, l.is_free
    from public.lessons l
    where l.slug = p_slug
      and l.level_code = upper(p_level)
      and l.status = 'published'
    limit 1;
end;
$$;