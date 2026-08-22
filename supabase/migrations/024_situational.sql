-- ============================================================
-- englishmudah.id — Migration 024: Percakapan Situasional
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Jalur belajar ketiga: topik kehidupan nyata (Hotel, Restoran,
-- Bandara/Perjalanan, Belanja, Kesehatan). Mengikuti pola toefl_sets:
--  1. situational_sets — konten set per topik (dialog+vocab+quiz+roleplay).
--  2. RPC admin (create/update/approve/delete/list/get/meta).
-- Paywall via RLS: is_free ATAU member/trial aktif.
-- ============================================================

-- ---------- 1. KONTEN SET (draft/published) ----------
create table if not exists public.situational_sets (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('hotel','restaurant','travel','shopping','health')),
  title text not null,
  slug text not null unique,
  -- Struktur konten (JSONB):
  -- { dialogues: [{ speaker: 'ai'|'user', text }],
  --   vocab: [{ word, meaning }],
  --   quiz: [{ question, options[4], answerIndex, explanation }],
  --   roleplay: { scenario, lines: [{ speaker, text }], keyPhrases[] } }
  content jsonb not null default '{}'::jsonb,
  source text not null default 'ai' check (source in ('ai','seed')),
  status text not null default 'draft' check (status in ('draft','published')),
  is_free boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists situational_sets_topic_idx on public.situational_sets(topic);
create index if not exists situational_sets_status_idx on public.situational_sets(status);

alter table public.situational_sets enable row level security;

-- Konten gratis untuk semua; berbayar hanya member/trial aktif
create policy "situational_sets viewable if free or member" on public.situational_sets
  for select using (
    status = 'published'
    and (is_free or public.is_member_active())
  );

-- Admin boleh menambah/mengubah set (via aplikasi)
create policy "Admins can insert situational_sets" on public.situational_sets
  for insert with check (public.is_admin());
create policy "Admins can update situational_sets" on public.situational_sets
  for update using (public.is_admin());

-- ---------- 2. RPC ADMIN: KELOLA SET ----------
create or replace function public.admin_create_situational_set(
  p_topic text,
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
  insert into public.situational_sets (topic, title, slug, content, source, status, is_free, created_at, updated_at)
  values (p_topic, p_title, p_slug, p_content, 'ai', 'draft', coalesce(p_is_free, false), now(), now())
  returning id into v_id;
  return v_id;
end;
$$;

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
  set content = p_content, status = 'draft', updated_at = now()
  where id = p_set_id;
end;
$$;

create or replace function public.approve_situational_set(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.situational_sets
  set status = 'published', published_at = now(), updated_at = now()
  where id = p_set_id;
end;
$$;

create or replace function public.delete_situational_set(p_set_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  delete from public.situational_sets where id = p_set_id;
end;
$$;

create or replace function public.list_situational_sets_admin()
returns table (
  id uuid,
  topic text,
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
    select s.id, s.topic, s.title, s.slug, s.is_free, s.status, s.published_at, s.updated_at
    from public.situational_sets s
    order by s.topic, s.title;
end;
$$;

create or replace function public.get_situational_set_admin(p_set_id uuid)
returns table (
  id uuid,
  topic text,
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
    select s.id, s.topic, s.title, s.slug, s.content, s.is_free, s.status, s.published_at
    from public.situational_sets s
    where s.id = p_set_id;
end;
$$;

-- ---------- 3. RPC META SET (untuk landing/gate, tanpa konten) ----------
create or replace function public.get_situational_set_meta(p_slug text)
returns table (
  id uuid,
  topic text,
  title text,
  slug text,
  is_free boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select s.id, s.topic, s.title, s.slug, s.is_free
    from public.situational_sets s
    where s.slug = p_slug and s.status = 'published'
    limit 1;
end;
$$;