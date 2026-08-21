-- ============================================================
-- englishmudah.id — Migration 011: Skema Modul Latihan Akademik (gaya TOEFL)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Tabel:
--  1. toefl_sets  — konten latihan per section (Reading/Listening/Writing/Speaking).
--     Satu "set" = sekumpulan passage/task + soal untuk satu topik.
--     Konten disimpan sebagai JSONB (struktur berbeda per section).
--  2. toefl_results — hasil latihan user (skor per section + total 0-120).
--  3. toefl_quota  — kuota pemakaian AI per user per section per bulan.
-- Plus RPC admin (pola admin_create_lesson) untuk generate/approve/kelola.
-- ============================================================

-- ---------- 1. KONTEN SET (draft/published, dipakai siswa) ----------
create table if not exists public.toefl_sets (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('reading','listening','writing','speaking')),
  title text not null,
  slug text not null unique,
  -- Struktur konten (JSONB, beda per section):
  -- reading:   { passages: [{ title, text, questions: [{question, options[], answerIndex, explanation, type}] }] }
  -- listening: { scripts: [{ title, script, questions: [...] }] }  (audio pakai TTS dari script)
  -- writing:   { tasks: [{ taskType: 'integrated'|'independent', prompt, context, rubric }] }
  -- speaking:  { tasks: [{ prompt, prepSeconds, speakSeconds }] }
  content jsonb not null default '{}'::jsonb,
  source text not null default 'ai' check (source in ('ai','seed')),
  status text not null default 'draft' check (status in ('draft','published')),
  is_free boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toefl_sets_section_idx on public.toefl_sets(section);
create index if not exists toefl_sets_status_idx on public.toefl_sets(status);

alter table public.toefl_sets enable row level security;

-- Pelajaran gratis untuk semua; konten berbayar hanya untuk member/trial aktif
create policy "toefl_sets viewable if free or member" on public.toefl_sets
  for select using (
    status = 'published'
    and (is_free or public.is_member_active())
  );

-- Admin boleh menambah/mengubah set (via aplikasi)
create policy "Admins can insert toefl_sets" on public.toefl_sets
  for insert with check (public.is_admin());
create policy "Admins can update toefl_sets" on public.toefl_sets
  for update using (public.is_admin());

-- ---------- 2. HASIL LATIHAN USER ----------
create table if not exists public.toefl_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('reading','listening','writing','speaking','full')),
  set_id uuid references public.toefl_sets(id) on delete set null,
  score int not null,                 -- skor section (0-30) atau total (0-120)
  max_score int not null default 30,
  detail jsonb,                       -- rincian jawaban/pembahasan per soal
  created_at timestamptz not null default now()
);

create index if not exists toefl_results_user_idx on public.toefl_results(user_id);
create index if not exists toefl_results_set_idx on public.toefl_results(set_id);

alter table public.toefl_results enable row level security;
create policy "Users can view own toefl results" on public.toefl_results
  for select using (auth.uid() = user_id);
create policy "Users can insert own toefl results" on public.toefl_results
  for insert with check (auth.uid() = user_id);

-- ---------- 3. KUOTA AI PER SECTION (per bulan) ----------
create table if not exists public.toefl_quota (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section text not null check (section in ('reading','listening','writing','speaking')),
  used int not null default 0,
  -- Awal bulan (mis. '2026-08-01') — kuota dihitung per bulan, bukan per hari.
  period_start date not null default date_trunc('month', current_date)::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, section, period_start)
);

alter table public.toefl_quota enable row level security;
create policy "Users can view own toefl quota" on public.toefl_quota
  for select using (auth.uid() = user_id);

-- ---------- 4. RPC ADMIN: KELOLA SET (pola admin_create_lesson) ----------
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
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
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
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.toefl_sets
  set content = p_content, status = 'draft', updated_at = now()
  where id = p_set_id;
end;
$$;

create or replace function public.approve_toefl_set(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.toefl_sets
  set status = 'published', published_at = now(), updated_at = now()
  where id = p_set_id;
end;
$$;

create or replace function public.delete_toefl_set(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  delete from public.toefl_sets where id = p_set_id;
end;
$$;

create or replace function public.list_toefl_sets_admin()
returns table (
  id uuid,
  section text,
  title text,
  slug text,
  is_free boolean,
  status text,
  published_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select s.id, s.section, s.title, s.slug, s.is_free, s.status, s.published_at, s.updated_at
    from public.toefl_sets s
    order by s.section, s.title;
end;
$$;

create or replace function public.get_toefl_set_admin(p_set_id uuid)
returns table (
  id uuid,
  section text,
  title text,
  slug text,
  content jsonb,
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
    select s.id, s.section, s.title, s.slug, s.content, s.is_free, s.status, s.published_at
    from public.toefl_sets s
    where s.id = p_set_id;
end;
$$;

-- ---------- 5. RPC KUOTA (mirip get_writing_quota_used) ----------
-- Ambil pemakaian kuota section bulan ini (default 0).
create or replace function public.get_toefl_quota_used(
  p_user_id uuid,
  p_section text
)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_used int;
begin
  select used into v_used
  from public.toefl_quota
  where user_id = p_user_id
    and section = p_section
    and period_start = date_trunc('month', current_date)::date;
  return coalesce(v_used, 0);
end;
$$;

-- Tambah 1 pemakaian kuota section bulan ini (upsert).
create or replace function public.bump_toefl_quota(
  p_user_id uuid,
  p_section text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.toefl_quota (user_id, section, used, period_start, updated_at)
  values (p_user_id, p_section, 1, date_trunc('month', current_date)::date, now())
  on conflict (user_id, section, period_start) do update set
    used = toefl_quota.used + 1,
    updated_at = now();
end;
$$;

-- ---------- 6. RPC META SET (untuk landing/gate, tanpa konten) ----------
create or replace function public.get_toefl_set_meta(p_slug text)
returns table (
  id uuid,
  section text,
  title text,
  slug text,
  is_free boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select s.id, s.section, s.title, s.slug, s.is_free
    from public.toefl_sets s
    where s.slug = p_slug and s.status = 'published'
    limit 1;
end;
$$;

-- ---------- 7. STORAGE: BUCKET AUDIO REKAMAN (private) ----------
-- Bucket private untuk rekaman speaking. Akses hanya via signed URL
-- (dibuat server-side setelah cek akses) — audio tidak pernah publik.
insert into storage.buckets (id, name, public)
values ('academic-audio', 'academic-audio', false)
on conflict (id) do nothing;

-- Upload: hanya user login yang bisa (auth.role() = 'authenticated').
create policy "authenticated upload academic-audio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'academic-audio');

-- Baca (signed URL): hanya pemilik file yang bisa.
create policy "owner read academic-audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'academic-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);