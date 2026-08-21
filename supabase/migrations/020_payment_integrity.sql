-- ============================================================
-- englishmudah.id — Migration 020: Integritas nominal pembayaran
-- Jalankan setelah 018_campaign_report.sql
--
-- Prinsip (gaya e-commerce): member HANYA diaktifkan jika nominal yang
-- dikonfirmasi Midtrans (gross_amount) persis sama dengan nominal order.
-- Kurang/lebih bayar → status 'mismatch', member TIDAK aktif, TANPA
-- refund otomatis. Admin yang memutuskan.
-- ============================================================

-- 1. Tambah nilai 'mismatch' pada status pembayaran
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'paid', 'expired', 'failed', 'refunded', 'mismatch'));

-- 2. Tandai pembayaran nominal tidak sesuai (fail-closed, audit via membership_log)
create or replace function public.mark_payment_mismatch(
  p_order_id text,
  p_expected int,
  p_actual numeric,
  p_reason text default 'Nominal tidak sesuai'
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.payments where midtrans_order_id = p_order_id;

  update public.payments
  set status = 'mismatch', updated_at = now()
  where midtrans_order_id = p_order_id;

  insert into public.membership_log (user_id, action, detail)
  values (
    v_user_id,
    'payment_mismatch',
    p_reason || ' — diharapkan ' || p_expected || ', aktual ' || p_actual
      || ' (order ' || p_order_id || ')'
  );
end;
$$;
