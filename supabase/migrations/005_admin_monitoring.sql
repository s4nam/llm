-- ============================================================
-- englishmudah.id — Migration 005: Admin & Pantauan (Fase 5)
-- Jalankan setelah 004_monetization.sql
-- ============================================================

-- ---------- 1. RPC: STATISTIK DASHBOARD ADMIN ----------
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_total_users bigint;
  v_active_members bigint;
  v_new_users_7d bigint;
  v_trial_used bigint;
  v_trial_converted bigint;
  v_revenue_30d numeric;
  v_total_revenue numeric;
  v_pending_reports bigint;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select count(*) into v_total_users from public.profiles;
  select count(*) into v_active_members
  from public.profiles
  where is_member = true and member_expires_at > now();
  select count(*) into v_new_users_7d
  from public.profiles where created_at >= now() - interval '7 days';
  select count(*) into v_trial_used from public.profiles where trial_used = true;
  -- konversi: dari yang pernah trial, berapa yang menjadi member
  select count(*) into v_trial_converted
  from public.profiles
  where trial_used = true and is_member = true;

  select coalesce(sum(amount), 0) into v_revenue_30d
  from public.payments
  where status = 'paid' and paid_at >= now() - interval '30 days';
  select coalesce(sum(amount), 0) into v_total_revenue
  from public.payments where status = 'paid';

  select count(*) into v_pending_reports
  from public.lesson_reports where status = 'open';

  return jsonb_build_object(
    'total_users', v_total_users,
    'active_members', v_active_members,
    'new_users_7d', v_new_users_7d,
    'trial_used', v_trial_used,
    'trial_converted', v_trial_converted,
    'revenue_30d', v_revenue_30d,
    'total_revenue', v_total_revenue,
    'pending_reports', v_pending_reports
  );
end;
$$;

-- ---------- 2. RPC: PENDAPATAN PER HARI (grafik 30 hari) ----------
create or replace function public.get_revenue_daily()
returns table (day date, amount bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select date_trunc('day', paid_at)::date as day,
           sum(amount) as amount
    from public.payments
    where status = 'paid' and paid_at >= now() - interval '30 days'
    group by 1
    order by 1;
end;
$$;

-- ---------- 3. RPC: DAFTAR LAPORAN MASALAH (admin) ----------
create or replace function public.get_reports_admin()
returns table (
  id uuid,
  user_email text,
  user_name text,
  lesson_title text,
  level_code text,
  note text,
  status text,
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
    select r.id,
           p.email as user_email,
           p.full_name as user_name,
           l.title as lesson_title,
           l.level_code,
           r.note,
           r.status,
           r.created_at
    from public.lesson_reports r
    left join public.profiles p on p.id = r.user_id
    left join public.lessons l on l.id = r.lesson_id
    order by r.created_at desc;
end;
$$;

-- RPC: tandai laporan selesai (admin)
create or replace function public.resolve_report(p_report_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.lesson_reports set status = 'done'
  where id = p_report_id;
end;
$$;

-- RPC: regenerate pelajaran dari laporan (admin) — memakai generate_lesson biasa
-- (dipanggil dari aplikasi; tidak perlu RPC khusus)

-- ---------- 4. TABEL KEAMANAN ADMIN (2FA) ----------
create table if not exists public.admin_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  totp_secret_encrypted text,          -- secret TOTP terenkripsi (AES)
  totp_enabled boolean not null default false,
  recovery_codes_encrypted text,       -- 10 kode recovery terenkripsi (JSON array)
  updated_at timestamptz not null default now()
);

alter table public.admin_security enable row level security;
create policy "admin_security server only" on public.admin_security
  for select using (false);
create policy "admin_security no direct write" on public.admin_security
  for all using (false) with check (false);

-- RPC: simpan/ambil data 2FA (admin)
create or replace function public.get_admin_security(p_user_id uuid)
returns table (totp_secret_encrypted text, totp_enabled boolean, recovery_codes_encrypted text)
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select s.totp_secret_encrypted, s.totp_enabled, s.recovery_codes_encrypted
    from public.admin_security s where s.user_id = p_user_id;
end;
$$;

create or replace function public.save_admin_security(
  p_user_id uuid,
  p_secret_encrypted text,
  p_enabled boolean,
  p_recovery_encrypted text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  insert into public.admin_security (user_id, totp_secret_encrypted, totp_enabled, recovery_codes_encrypted, updated_at)
  values (p_user_id, p_secret_encrypted, p_enabled, p_recovery_encrypted, now())
  on conflict (user_id) do update set
    totp_secret_encrypted = excluded.totp_secret_encrypted,
    totp_enabled = excluded.totp_enabled,
    recovery_codes_encrypted = excluded.recovery_codes_encrypted,
    updated_at = now();
end;
$$;

-- ---------- 5. LOG AKTIVITAS ADMIN (audit) ----------
create table if not exists public.admin_activity_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log enable row level security;
create policy "admin_activity server only" on public.admin_activity_log
  for select using (false);
create policy "admin_activity insert" on public.admin_activity_log
  for insert with check (true);

create or replace function public.log_admin_activity(p_action text, p_detail text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  insert into public.admin_activity_log (admin_id, action, detail)
  values (auth.uid(), p_action, p_detail);
end;
$$;
