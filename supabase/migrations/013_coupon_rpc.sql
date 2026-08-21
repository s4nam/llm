-- ============================================================
-- englishmudah.id — Migration 013: Kupon RPC (admin)
-- Jalankan setelah 012_security.sql
--
-- Tabel coupons memakai RLS ketat (select using false, tanpa
-- policy insert). Semua akses admin harus lewat RPC security
-- definer dengan cek is_admin(), mengikuti pola tabel lain.
-- ============================================================

-- RPC: tambah kupon (admin)
create or replace function public.add_coupon(
  p_code text,
  p_type text,
  p_value int,
  p_max_uses int
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_type not in ('percent', 'nominal') then
    raise exception 'Jenis diskon tidak valid.';
  end if;

  insert into public.coupons (code, discount_type, discount_value, max_uses, active)
  values (upper(trim(p_code)), p_type, p_value, coalesce(p_max_uses, 1), true);
end;
$$;

-- RPC: daftar kupon (admin)
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
    order by c.created_at desc;
end;
$$;