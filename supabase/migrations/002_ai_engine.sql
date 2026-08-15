-- ============================================================
-- englishmudah.id — Migration 002: Mesin AI (Fase 2)
-- Jalankan setelah 001_init.sql
-- ============================================================

-- ---------- 1. PENGATURAN AI ----------
-- Menyimpan konfigurasi provider AI, model default, alarm budget.
-- API key DISIMPAN TERENKRIPSI (AES) oleh aplikasi — lihat lib/ai/keys.ts.
create table if not exists public.ai_settings (
  id int primary key default 1 check (id = 1),  -- hanya satu baris
  -- Key terenkripsi per provider: {"openai":"...","gemini":"...","claude":"..."}
  encrypted_keys text not null default '{}'::text,
  default_provider text not null default 'openai' check (default_provider in ('openai','gemini','claude')),
  default_model text not null default 'gpt-4o-mini',
  -- Budget alarm (dalam Rupiah). 0 = nonaktif.
  budget_alarm_idr int not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.ai_settings (id) values (1)
on conflict (id) do nothing;

alter table public.ai_settings enable row level security;
-- Hanya aplikasi (via RPC security definer) yang boleh akses.
create policy "ai_settings server only" on public.ai_settings
  for select using (false);
create policy "ai_settings no direct write" on public.ai_settings
  for all using (false) with check (false);

-- Helper: cek apakah user adalah admin (profile role = 'admin')
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RPC: baca pengaturan AI (hanya admin)
create or replace function public.get_ai_settings()
returns table (
  encrypted_keys text,
  default_provider text,
  default_model text,
  budget_alarm_idr int
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select s.encrypted_keys, s.default_provider, s.default_model, s.budget_alarm_idr
    from public.ai_settings s
    where s.id = 1;
end;
$$;

-- RPC: simpan pengaturan AI (hanya admin)
create or replace function public.save_ai_settings(
  p_encrypted_keys text,
  p_default_provider text,
  p_default_model text,
  p_budget_alarm_idr int
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  insert into public.ai_settings (id, encrypted_keys, default_provider, default_model, budget_alarm_idr, updated_at)
  values (1, p_encrypted_keys, p_default_provider, p_default_model, p_budget_alarm_idr, now())
  on conflict (id) do update set
    encrypted_keys = excluded.encrypted_keys,
    default_provider = excluded.default_provider,
    default_model = excluded.default_model,
    budget_alarm_idr = excluded.budget_alarm_idr,
    updated_at = now();
end;
$$;

-- RPC: cek status budget (total estimasi biaya hari ini) — admin
create or replace function public.get_ai_usage_today()
returns table (total_cost_idr numeric, total_requests bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select coalesce(sum(estimated_cost_idr), 0) as total_cost_idr,
           count(*) as total_requests
    from public.ai_usage_log
    where created_at >= date_trunc('day', now());
end;
$$;

-- RPC: catat pemakaian AI (internal, security definer, hanya dipanggil aplikasi)
create or replace function public.log_ai_usage(
  p_provider text,
  p_model text,
  p_purpose text,
  p_prompt_tokens int,
  p_completion_tokens int,
  p_estimated_cost_idr numeric,
  p_lesson_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ai_usage_log (
    provider, model, purpose, prompt_tokens, completion_tokens,
    estimated_cost_idr, lesson_id
  ) values (
    p_provider, p_model, p_purpose, p_prompt_tokens, p_completion_tokens,
    p_estimated_cost_idr, p_lesson_id
  );
end;
$$;

-- RPC: ambil log pemakaian (admin)
create or replace function public.get_ai_usage_log(p_limit int default 100)
returns table (
  provider text,
  model text,
  purpose text,
  prompt_tokens int,
  completion_tokens int,
  estimated_cost_idr numeric,
  lesson_id uuid,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select l.provider, l.model, l.purpose, l.prompt_tokens,
           l.completion_tokens, l.estimated_cost_idr, l.lesson_id, l.created_at
    from public.ai_usage_log l
    order by l.created_at desc
    limit p_limit;
end;
$$;

-- ---------- RPC KELOLA PELAJARAN (admin) ----------

-- Daftar semua pelajaran (termasuk draft) — admin
create or replace function public.list_lessons_admin()
returns table (
  id uuid,
  level_code text,
  category text,
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
    select l.id, l.level_code, l.category, l.title, l.slug,
           l.is_free, l.status, l.published_at, l.updated_at
    from public.lessons l
    order by l.level_code, l.category, l.title;
end;
$$;

-- Baca satu pelajaran (termasuk draft) — admin
create or replace function public.get_lesson_admin(p_lesson_id uuid)
returns table (
  id uuid,
  level_code text,
  category text,
  title text,
  slug text,
  intro text,
  sections jsonb,
  quiz jsonb,
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
           l.intro, l.sections, l.quiz, l.is_free, l.status, l.published_at
    from public.lessons l
    where l.id = p_lesson_id;
end;
$$;

-- Setujui / publish pelajaran — admin
create or replace function public.approve_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.lessons
  set status = 'published', published_at = now(), updated_at = now()
  where id = p_lesson_id;
end;
$$;

-- Hapus pelajaran (draft yang ditolak) — admin
create or replace function public.delete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  delete from public.lessons where id = p_lesson_id;
end;
$$;

-- Regenerate isi pelajaran (tetap draft) — admin
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

-- Data kurikulum (level + jumlah pelajaran per kategori) — admin
create or replace function public.get_curriculum_admin()
returns table (
  level_code text,
  category text,
  total bigint,
  published bigint,
  draft bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select l.level_code, l.category,
           count(*) as total,
           count(*) filter (where l.status = 'published') as published,
           count(*) filter (where l.status = 'draft') as draft
    from public.lessons l
    group by l.level_code, l.category
    order by l.level_code, l.category;
end;
$$;

-- ---------- 2. LOG PEMAKAIAN TOKEN (monitoring biaya) ----------
create table if not exists public.ai_usage_log (
  id bigint generated always as identity primary key,
  provider text not null,
  model text not null,
  purpose text not null,             -- 'lesson' | 'placement' | 'quiz'
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  estimated_cost_idr numeric(12,2) not null default 0,
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_log_created_idx on public.ai_usage_log(created_at);

alter table public.ai_usage_log enable row level security;
create policy "ai_usage server only" on public.ai_usage_log
  for select using (false);

-- ---------- 3. SOAL PLACEMENT TEST ----------
-- Soal digenerate SATU KALI lalu di-cache (hemat token).
create table if not exists public.placement_tests (
  id int primary key default 1 check (id = 1),
  questions jsonb not null default '[]'::jsonb,   -- [{question, options[], answerIndex, explanation}]
  generated_at timestamptz not null default now()
);

alter table public.placement_tests enable row level security;
create policy "placement test server only" on public.placement_tests
  for select using (false);

-- ---------- 4. HASIL PLACEMENT TEST USER ----------
create table if not exists public.placement_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null,                 -- jumlah benar
  total int not null,
  recommended_level text not null,
  created_at timestamptz not null default now()
);

create index if not exists placement_results_user_idx on public.placement_results(user_id);

alter table public.placement_results enable row level security;
create policy "Users can view own placement" on public.placement_results
  for select using (auth.uid() = user_id);

create policy "Users can insert own placement" on public.placement_results
  for insert with check (auth.uid() = user_id);

-- ---------- 5. LAPORAN MASALAH DARI USER ----------
create table if not exists public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  note text,
  status text not null default 'open' check (status in ('open','done')),
  created_at timestamptz not null default now()
);

alter table public.lesson_reports enable row level security;
create policy "Users can insert own reports" on public.lesson_reports
  for insert with check (auth.uid() = user_id);
