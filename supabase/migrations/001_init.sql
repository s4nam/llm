-- ============================================================
-- englishmudah.id — Skema Database + Row Level Security (RLS)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- 1. PROFIL USER ----------
-- Menyimpan data tambahan user (nama) dan status membership.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'student' check (role in ('student', 'admin')),
  -- Status membership
  is_member boolean not null default false,
  member_expires_at timestamptz,
  -- Trial
  trial_started_at timestamptz,
  trial_expires_at timestamptz,
  trial_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger: buat profil otomatis saat user baru mendaftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;

-- User hanya bisa melihat/mengubah profilnya sendiri
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------- 3. TINGKAT (LEVEL) & KATEGORI ----------
create table if not exists public.levels (
  code text primary key,           -- 'A1'..'C2'
  name text not null,
  sort_order int not null default 0
);

insert into public.levels (code, name, sort_order) values
  ('A1', 'Pemula', 1),
  ('A2', 'Elementer', 2),
  ('B1', 'Menengah', 3),
  ('B2', 'Menengah Atas', 4),
  ('C1', 'Mahir', 5),
  ('C2', 'Lancar', 6)
on conflict (code) do nothing;

alter table public.levels enable row level security;
create policy "Levels are public" on public.levels for select using (true);

-- ---------- 4. PELAJARAN (materi yang disetujui) ----------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  level_code text not null references public.levels(code),
  category text not null check (category in ('vocabulary','grammar','reading','listening','writing')),
  title text not null,
  slug text not null unique,
  intro text,
  sections jsonb not null default '[]'::jsonb,  -- [{heading, body}]
  quiz jsonb not null default '[]'::jsonb,      -- [{question, options[], answerIndex, explanation}]
  is_free boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_level_idx on public.lessons(level_code);
create index if not exists lessons_status_idx on public.lessons(status);

alter table public.lessons enable row level security;

-- Materi yang sudah dipublikasikan bisa dilihat semua orang (untuk pelajaran gratis)
-- Pelajaran berbayar akan dikontrol oleh logika membership di Fase 3/4.
create policy "Published lessons are viewable" on public.lessons
  for select using (status = 'published' or is_free);

-- ---------- 5. PROGRESS BELAJAR USER ----------
create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  best_score int not null default 0,        -- persen (0-100)
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists user_progress_user_idx on public.user_progress(user_id);

alter table public.user_progress enable row level security;

-- User hanya bisa melihat & mengubah progress-nya sendiri
create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own progress" on public.user_progress
  for update using (auth.uid() = user_id);

-- ---------- 6. TRANSAKSI PEMBAYARAN (Fase 4) ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  midtrans_order_id text not null unique,
  amount int not null,                       -- dalam Rupiah
  plan text not null check (plan in ('monthly','yearly')),
  status text not null default 'pending' check (status in ('pending','paid','expired','failed','refunded')),
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;
create policy "Users can view own payments" on public.payments
  for select using (auth.uid() = user_id);

-- ---------- 7. KUPON (Fase 4) ----------
create table if not exists public.coupons (
  code text primary key,
  discount_type text not null check (discount_type in ('percent','nominal')),
  discount_value int not null,
  max_uses int default 1,                   -- kupon 1x per akun
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
create policy "Coupons are read by app server only" on public.coupons
  for select using (false);
