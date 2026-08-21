-- ============================================================
-- englishmudah.id — Migration 017: Pengelolaan kupon yang benar
-- Jalankan setelah 016_deactivate_member.sql
--
-- Perbaikan:
--  1. Kupon bisa diberi tanggal kedaluwarsa (p_expires_at di add_coupon).
--  2. Kupon bisa dinonaktifkan/aktifkan kembali (set_coupon_active).
--  3. max_uses DITERAPKAN sungguhan via get_coupon_usage (hitung pemakaian
--     berstatus paid).
--  4. Kolom coupon_code di payments: dulu info kupon disimpan di kolom raw
--     yang DITIMPA payload notifikasi Midtrans saat bayar → tracking bocor.
--     Kolom baru ini tidak pernah ditimpa.
--  5. Kupon lama (expires_at null) diberi expires_at = sekarang
--     → langsung tidak valid.
-- ============================================================

-- Tracking pemakaian kupon yang andal (tidak tertimpa oleh raw)
alter table public.payments add column if not exists coupon_code text;
create index if not exists payments_coupon_idx on public.payments(coupon_code);

-- Ganti add_coupon agar mendukung tanggal kedaluwarsa
drop function if exists public.add_coupon(text, text, int, int);
create or replace function public.add_coupon(
  p_code text,
  p_type text,
  p_value int,
  p_max_uses int,
  p_expires_at timestamptz default null
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

  insert into public.coupons (code, discount_type, discount_value, max_uses, active, expires_at)
  values (upper(trim(p_code)), p_type, p_value, coalesce(p_max_uses, 1), true, p_expires_at);
end;
$$;

-- Nonaktifkan/aktifkan kupon (admin)
create or replace function public.set_coupon_active(p_code text, p_active boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.coupons
  set active = coalesce(p_active, true)
  where code = upper(trim(p_code));
end;
$$;

-- Jumlah pemakaian kupon yang lunas (untuk batas max_uses).
-- security definer (baca semua user), TANPA cek admin karena dipanggil
-- saat checkout user biasa. Hanya mengembalikan angka, bukan data user.
create or replace function public.get_coupon_usage(p_code text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  select count(*)::int into v_count
  from public.payments
  where coupon_code = upper(trim(p_code))
    and status = 'paid';
  return v_count;
end;
$$;

-- Kupon lama (aktif tanpa batas waktu) → kadaluarsa hari ini.
update public.coupons
set expires_at = now()
where expires_at is null;
