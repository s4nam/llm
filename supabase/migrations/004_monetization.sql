-- ============================================================
-- englishmudah.id — Migration 004: Monetisasi (Fase 4)
-- Jalankan setelah 003_learning_flow.sql
-- ============================================================

-- ---------- 1. KONFIGURASI PAKET & HARGA ----------
-- Harga diatur admin. Paket: monthly & yearly.
create table if not exists public.pricing_config (
  id int primary key default 1 check (id = 1),
  monthly_price int not null default 49000,
  yearly_price int not null default 490000,
  trial_hours int not null default 72,
  trial_grace_hours int not null default 48,
  updated_at timestamptz not null default now()
);

insert into public.pricing_config (id) values (1)
on conflict (id) do nothing;

alter table public.pricing_config enable row level security;
create policy "pricing public read" on public.pricing_config
  for select using (true);

-- ---------- 2. RIWAYAT PERUBAHAN MEMBERSHIP (manual/admin & otomatis) ----------
create table if not exists public.membership_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,        -- 'trial_start' | 'payment' | 'manual_set' | 'expired' | 'renew' | 'refund'
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists membership_log_user_idx on public.membership_log(user_id);

alter table public.membership_log enable row level security;
create policy "Users can view own membership log" on public.membership_log
  for select using (auth.uid() = user_id);

-- ---------- 3. LOG WEBHOOK (debug & audit) ----------
create table if not exists public.payment_webhook_log (
  id bigint generated always as identity primary key,
  order_id text,
  event_type text,
  payload jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payment_webhook_log enable row level security;
create policy "webhook log server only" on public.payment_webhook_log
  for select using (false);
create policy "webhook log insert" on public.payment_webhook_log
  for insert with check (true);

-- ---------- 4. STATUS REFUND / DISPUTE ----------
-- Tambah kolom status pada payments (sudah ada). Buat tabel dispute log.
create table if not exists public.dispute_log (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','resolved')),
  detail text,
  created_at timestamptz not null default now()
);

alter table public.dispute_log enable row level security;
create policy "dispute log server only" on public.dispute_log
  for select using (false);

-- ---------- 5. RPC: AKTIVASI TRIAL ----------
-- Trial 72 jam, hanya 1x per orang. Saat aktif, member_expires tidak dipakai.
create or replace function public.start_trial(p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_trial_used boolean;
  v_trial_hours int;
  v_profile public.profiles%rowtype;
  v_start timestamptz;
  v_expire timestamptz;
begin
  select trial_used into v_trial_used
  from public.profiles where id = p_user_id;
  if v_trial_used then
    return jsonb_build_object('ok', false, 'error', 'Trial sudah pernah digunakan.');
  end if;

  select trial_hours into v_trial_hours
  from public.pricing_config where id = 1;

  v_start := now();
  v_expire := v_start + (coalesce(v_trial_hours, 72) || ' hours')::interval;

  update public.profiles
  set trial_used = true,
      trial_started_at = v_start,
      trial_expires_at = v_expire,
      updated_at = now()
  where id = p_user_id
  returning * into v_profile;

  insert into public.membership_log (user_id, action, detail)
  values (p_user_id, 'trial_start', 'Trial dimulai 72 jam.');

  return jsonb_build_object(
    'ok', true,
    'trial_started_at', v_profile.trial_started_at,
    'trial_expires_at', v_profile.trial_expires_at
  );
end;
$$;

-- ---------- 6. RPC: SET MEMBER (otomatis saat bayar / manual admin) ----------
create or replace function public.set_member(
  p_user_id uuid,
  p_days int,
  p_action text default 'payment',
  p_detail text default ''
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_expire timestamptz;
  v_old timestamptz;
begin
  -- Member dimulai dari waktu sekarang (perpanjangan dihitung dari sekarang,
  -- sesuai keputusan: member mulai saat bayar, trial hangus).
  v_old := (select member_expires_at from public.profiles where id = p_user_id);
  if v_old is not null and v_old > now() then
    v_expire := v_old + (p_days || ' days')::interval;
  else
    v_expire := now() + (p_days || ' days')::interval;
  end if;

  update public.profiles
  set is_member = true,
      member_expires_at = v_expire,
      trial_expires_at = null,   -- trial hangus jika ada
      updated_at = now()
  where id = p_user_id;

  insert into public.membership_log (user_id, action, detail)
  values (p_user_id, p_action, coalesce(p_detail, ''));
end;
$$;

-- ---------- 7. RPC: STATUS MEMBER (dipanggil berkala untuk menonaktifkan expired) ----------
create or replace function public.expire_members()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set is_member = false, updated_at = now()
  where is_member = true
    and member_expires_at is not null
    and member_expires_at < now();
end;
$$;

-- ---------- 8. RPC: ADMIN KELOLA MEMBER (manual override + riwayat) ----------
create or replace function public.admin_set_member(
  p_user_id uuid,
  p_days int,
  p_note text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  perform public.set_member(p_user_id, p_days, 'manual_set', p_note);
end;
$$;

-- RPC: admin set trial reset (beri trial lagi mis. kompensasi)
create or replace function public.admin_reset_trial(
  p_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.profiles
  set trial_used = false, trial_started_at = null, trial_expires_at = null,
      updated_at = now()
  where id = p_user_id;
end;
$$;

-- ---------- 9. RPC: BACA KONFIGURASI HARGA ----------
create or replace function public.get_pricing()
returns table (
  monthly_price int,
  yearly_price int,
  trial_hours int,
  trial_grace_hours int
)
language sql
security definer set search_path = public
as $$
  select monthly_price, yearly_price, trial_hours, trial_grace_hours
  from public.pricing_config where id = 1;
$$;

-- ---------- 10. RPC: SIMPAN KONFIGURASI HARGA (admin) ----------
create or replace function public.save_pricing(
  p_monthly int,
  p_yearly int,
  p_trial_hours int,
  p_trial_grace_hours int
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.pricing_config
  set monthly_price = p_monthly,
      yearly_price = p_yearly,
      trial_hours = p_trial_hours,
      trial_grace_hours = p_trial_grace_hours,
      updated_at = now()
  where id = 1;
end;
$$;

-- ---------- 11. RPC: MARK PAYMENT (dipanggil aplikasi saat webhook) ----------
create or replace function public.mark_payment_paid(
  p_order_id text,
  p_amount int,
  p_plan text,
  p_user_id uuid,
  p_raw jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_days int;
begin
  insert into public.payments (user_id, midtrans_order_id, amount, plan, status, raw, paid_at)
  values (p_user_id, p_order_id, p_amount, p_plan, 'paid', p_raw, now())
  on conflict (midtrans_order_id) do update set
    status = 'paid', paid_at = now(), raw = excluded.raw;

  v_days := case when p_plan = 'yearly' then 365 else 30 end;
  perform public.set_member(p_user_id, v_days, 'payment', 'Pembayaran ' || p_order_id);
end;
$$;

-- RPC: tandai transaksi kadaluarsa
create or replace function public.mark_payment_expired(p_order_id text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.payments
  set status = 'expired', updated_at = now()
  where midtrans_order_id = p_order_id and status = 'pending';
end;
$$;

-- ---------- 12. RPC ADMIN: DAFTAR MEMBER + RIWAYAT ----------
create or replace function public.get_members_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  is_member boolean,
  member_expires_at timestamptz,
  trial_used boolean,
  trial_expires_at timestamptz,
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
    select p.id, p.email, p.full_name, p.is_member, p.member_expires_at,
           p.trial_used, p.trial_expires_at, p.created_at
    from public.profiles p
    order by p.created_at desc;
end;
$$;
