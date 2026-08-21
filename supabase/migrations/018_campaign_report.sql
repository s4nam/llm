-- ============================================================
-- englishmudah.id — Migration 018: Laporan kampanye + soft-delete kupon
-- Jalankan setelah 017_coupon_enhancement.sql
--
-- 1. Soft-delete kupon (deleted_at) — kupon yang dihapus tetap muncul
--    di laporan kampanye (riwayat tidak hilang).
-- 2. Kolom base_price & discount_amount di payments — dulu jumlah diskon
--    disimpan di raw yang ditimpa payload Midtrans saat bayar; kolom baru
--    ini tidak pernah ditimpa → laporan diskon akurat.
-- 3. RPC laporan kampanye: ringkasan per kupon + detail transaksi.
-- ============================================================

-- 1. Soft-delete kupon
alter table public.coupons add column if not exists deleted_at timestamptz;

-- 2. Kolom nominal di payments
alter table public.payments add column if not exists base_price int;
alter table public.payments add column if not exists discount_amount int;

-- 3. Hapus kupon (soft-delete): hanya jika tidak aktif (tolak jika aktif)
create or replace function public.delete_coupon(p_code text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_active boolean;
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  select active into v_active from public.coupons where code = upper(trim(p_code));
  if v_active then
    raise exception 'Nonaktifkan dulu sebelum menghapus kupon.';
  end if;
  update public.coupons
  set active = false, deleted_at = now()
  where code = upper(trim(p_code));
end;
$$;

-- 4. list_coupons_admin: sembunyikan kupon yang dihapus
create or replace function public.list_coupons_admin()
returns table (
  code text,
  discount_type text,
  discount_value int,
  max_uses int,
  active boolean,
  expires_at timestamptz,
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
    select c.code, c.discount_type, c.discount_value, c.max_uses,
           c.active, c.expires_at, c.created_at
    from public.coupons c
    where c.deleted_at is null
    order by c.created_at desc;
end;
$$;

-- 5. Laporan kampanye: ringkasan per kupon (termasuk yang dihapus)
create or replace function public.get_campaign_report()
returns table (
  code text,
  discount_type text,
  discount_value int,
  max_uses int,
  active boolean,
  expires_at timestamptz,
  created_at timestamptz,
  deleted_at timestamptz,
  paid_orders bigint,
  pending_orders bigint,
  revenue numeric,
  discount_given numeric,
  paid_users bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select c.code, c.discount_type, c.discount_value, c.max_uses, c.active,
           c.expires_at, c.created_at, c.deleted_at,
           count(p.id) filter (where p.status = 'paid') as paid_orders,
           count(p.id) filter (where p.status = 'pending') as pending_orders,
           coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as revenue,
           coalesce(sum(p.discount_amount) filter (where p.status = 'paid'), 0) as discount_given,
           count(distinct p.user_id) filter (where p.status = 'paid') as paid_users
    from public.coupons c
    left join public.payments p on p.coupon_code = c.code
    group by c.code, c.discount_type, c.discount_value, c.max_uses, c.active,
             c.expires_at, c.created_at, c.deleted_at
    order by c.created_at desc;
end;
$$;

-- 6. Detail transaksi per kupon (admin)
create or replace function public.get_campaign_detail(p_code text)
returns table (
  id uuid,
  user_email text,
  user_name text,
  amount int,
  discount_amount int,
  plan text,
  status text,
  paid_at timestamptz,
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
    select p.id, pr.email as user_email, pr.full_name as user_name,
           p.amount, p.discount_amount, p.plan, p.status, p.paid_at, p.created_at
    from public.payments p
    left join public.profiles pr on pr.id = p.user_id
    where p.coupon_code = upper(trim(p_code))
    order by p.created_at desc;
end;
$$;

-- 7. Baca satu kupon untuk validasi checkout.
--    RLS coupons menggunakan using(false), jadi pembacaan langsung oleh user
--    selalu kosong. RPC security definer ini hanya mengembalikan kupon sesuai
--    kode (tanpa admin check — dipakai saat checkout user biasa).
create or replace function public.get_coupon(p_code text)
returns table (
  code text,
  discount_type text,
  discount_value int,
  max_uses int,
  active boolean,
  expires_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select c.code, c.discount_type, c.discount_value, c.max_uses, c.active, c.expires_at
    from public.coupons c
    where c.code = upper(trim(p_code))
      and c.deleted_at is null
    limit 1;
end;
$$;

-- 8. Daftar kupon aktif untuk tampilan halaman langganan.
create or replace function public.list_active_coupons()
returns table (
  code text,
  discount_type text,
  discount_value int
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select c.code, c.discount_type, c.discount_value
    from public.coupons c
    where c.active = true
      and c.deleted_at is null
      and (c.expires_at is null or c.expires_at > now())
    order by c.created_at desc;
end;
$$;
