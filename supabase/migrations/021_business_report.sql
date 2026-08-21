-- ============================================================
-- englishmudah.id — Migration 021: Laporan bisnis (dashboard admin)
-- Jalankan setelah 020_payment_integrity.sql
--
-- Satu RPC yang mengembalikan semua metrik bisnis untuk dashboard admin:
-- uang masuk, pendaftar, member baru, trial, risiko churn, ringkasan
-- transaksi, serta seri harian untuk grafik.
-- Semua perhitungan "hari ini" memakai zona waktu Asia/Jakarta (WIB).
-- ============================================================

create or replace function public.get_business_report()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_day_start timestamptz := (now() AT TIME ZONE 'Asia/Jakarta')::date AT TIME ZONE 'Asia/Jakarta';
  v_week_start timestamptz := date_trunc('week', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
  v_month_start timestamptz := date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta';
  v_30d timestamptz := now() - interval '30 days';

  v_revenue_today numeric;
  v_revenue_week numeric;
  v_revenue_month numeric;
  v_revenue_30d numeric;
  v_revenue_total numeric;
  v_revenue_monthly numeric;
  v_revenue_yearly numeric;
  v_avg_transaction numeric;
  v_paid_orders bigint;
  v_pending_orders bigint;
  v_failed_orders bigint;

  v_reg_today bigint;
  v_reg_week bigint;
  v_reg_month bigint;

  v_new_members_today bigint;
  v_new_members_week bigint;
  v_trial_today bigint;
  v_expiring_7d bigint;
  v_churned bigint;

  v_revenue_series jsonb;
  v_reg_series jsonb;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select coalesce(sum(amount), 0) into v_revenue_today
  from public.payments where status = 'paid' and paid_at >= v_day_start;
  select coalesce(sum(amount), 0) into v_revenue_week
  from public.payments where status = 'paid' and paid_at >= v_week_start;
  select coalesce(sum(amount), 0) into v_revenue_month
  from public.payments where status = 'paid' and paid_at >= v_month_start;
  select coalesce(sum(amount), 0) into v_revenue_30d
  from public.payments where status = 'paid' and paid_at >= v_30d;
  select coalesce(sum(amount), 0) into v_revenue_total
  from public.payments where status = 'paid';
  select coalesce(sum(amount) filter (where plan = 'monthly'), 0) into v_revenue_monthly
  from public.payments where status = 'paid';
  select coalesce(sum(amount) filter (where plan = 'yearly'), 0) into v_revenue_yearly
  from public.payments where status = 'paid';
  select coalesce(avg(amount), 0) into v_avg_transaction
  from public.payments where status = 'paid';
  select count(*) into v_paid_orders from public.payments where status = 'paid';
  select count(*) into v_pending_orders from public.payments where status = 'pending';
  select count(*) into v_failed_orders from public.payments where status in ('failed', 'expired');

  select count(*) into v_reg_today from public.profiles where created_at >= v_day_start;
  select count(*) into v_reg_week from public.profiles where created_at >= v_week_start;
  select count(*) into v_reg_month from public.profiles where created_at >= v_month_start;

  select count(*) into v_new_members_today
  from public.payments where status = 'paid' and paid_at >= v_day_start;
  select count(*) into v_new_members_week
  from public.payments where status = 'paid' and paid_at >= v_week_start;
  select count(*) into v_trial_today
  from public.profiles where trial_started_at is not null and trial_started_at >= v_day_start;

  select count(*) into v_expiring_7d
  from public.profiles
  where is_member = true
    and member_expires_at is not null
    and member_expires_at > now()
    and member_expires_at <= now() + interval '7 days';

  select count(*) into v_churned
  from public.profiles
  where is_member = true
    and member_expires_at is not null
    and member_expires_at < now();

  select coalesce(jsonb_agg(row_to_json(t) order by t.day), '[]'::jsonb) into v_revenue_series
  from (
    select (date_trunc('day', paid_at)::date)::text as day, sum(amount) as amount
    from public.payments
    where status = 'paid' and paid_at >= v_30d
    group by 1
  ) t;

  select coalesce(jsonb_agg(row_to_json(t) order by t.day), '[]'::jsonb) into v_reg_series
  from (
    select (date_trunc('day', created_at)::date)::text as day, count(*) as count
    from public.profiles
    where created_at >= v_30d
    group by 1
  ) t;

  return jsonb_build_object(
    'revenue_today', v_revenue_today,
    'revenue_week', v_revenue_week,
    'revenue_month', v_revenue_month,
    'revenue_30d', v_revenue_30d,
    'revenue_total', v_revenue_total,
    'revenue_monthly', v_revenue_monthly,
    'revenue_yearly', v_revenue_yearly,
    'avg_transaction', v_avg_transaction,
    'paid_orders', v_paid_orders,
    'pending_orders', v_pending_orders,
    'failed_orders', v_failed_orders,
    'reg_today', v_reg_today,
    'reg_week', v_reg_week,
    'reg_month', v_reg_month,
    'new_members_today', v_new_members_today,
    'new_members_week', v_new_members_week,
    'trial_today', v_trial_today,
    'expiring_7d', v_expiring_7d,
    'churned', v_churned,
    'revenue_series', v_revenue_series,
    'reg_series', v_reg_series
  );
end;
$$;
