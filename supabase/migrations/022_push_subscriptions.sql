-- 022_push_subscriptions.sql — untuk Push Notification (Fase PWA 2)
-- Jalankan di Supabase SQL Editor setelah 021

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- User hanya bisa lihat/kelola miliknya sendiri
create policy "push_subscriptions_user_all"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index untuk broadcast
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
create index if not exists idx_push_subscriptions_endpoint on public.push_subscriptions(endpoint);

-- Helper untuk admin kirim push (dipakai /api/push/send)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

comment on table public.push_subscriptions is 'Web Push subscriptions untuk PWA — endpoint + keys per device';
