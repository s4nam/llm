-- ============================================================
-- englishmudah.id — Migration 027: Study Sets (Vocabulary Coach)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. study_sets — daftar kata pribadi/publik.
-- 2. study_set_items — item kata dalam set.
-- RLS:
--  - Set publik hanya bisa dibaca user LOGIN (auth.role()='authenticated').
--  - Item: akses mengikuti kepemilikan/publikasi SET (subquery),
--    bukan kolom user di item (item tidak punya user_id).
-- ============================================================

-- ---------- 1. SET ----------
create table if not exists public.study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_sets_user_idx on public.study_sets(user_id);

alter table public.study_sets enable row level security;

-- Select: pemilik ATAU set publik (login-only)
create policy "study_sets viewable" on public.study_sets
  for select using (
    user_id = auth.uid()
    or (is_public = true and auth.role() = 'authenticated')
  );

-- Tulis: hanya pemilik
create policy "study_sets owner insert" on public.study_sets
  for insert with check (user_id = auth.uid());
create policy "study_sets owner update" on public.study_sets
  for update using (user_id = auth.uid());
create policy "study_sets owner delete" on public.study_sets
  for delete using (user_id = auth.uid());

-- ---------- 2. ITEM ----------
create table if not exists public.study_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.study_sets(id) on delete cascade,
  word text not null,
  translation text not null,
  source_lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists study_set_items_set_idx on public.study_set_items(set_id);

alter table public.study_set_items enable row level security;

-- Select: item hanya terlihat bila SET-nya bisa dilihat (pemilik atau publik login)
create policy "study_set_items viewable" on public.study_set_items
  for select using (
    exists (
      select 1 from public.study_sets s
      where s.id = set_id
        and (
          s.user_id = auth.uid()
          or (s.is_public = true and auth.role() = 'authenticated')
        )
    )
  );

-- Tulis: hanya bila SET milik auth.uid()
create policy "study_set_items owner insert" on public.study_set_items
  for insert with check (
    exists (
      select 1 from public.study_sets s
      where s.id = set_id and s.user_id = auth.uid()
    )
  );
create policy "study_set_items owner update" on public.study_set_items
  for update using (
    exists (
      select 1 from public.study_sets s
      where s.id = set_id and s.user_id = auth.uid()
    )
  );
create policy "study_set_items owner delete" on public.study_set_items
  for delete using (
    exists (
      select 1 from public.study_sets s
      where s.id = set_id and s.user_id = auth.uid()
    )
  );