-- ============================================================
-- englishmudah.id — Migration 014: Daftar pelajaran publik (SEO)
-- Jalankan setelah 013_coupon_rpc.sql
--
-- Halaman level & pelajaran dibuka untuk pengunjung anonim agar
-- Google dapat meng-index judul materi. RLS lessons tetap menutup
-- konten berbayar, jadi RPC ini hanya mengembalikan META (tanpa
-- intro/sections/quiz) — aman untuk gate & sitemap.
-- ============================================================

-- RPC: daftar pelajaran published per level (meta saja, untuk publik)
create or replace function public.list_lessons_public(p_level text)
returns table (
  id uuid,
  title text,
  slug text,
  category text,
  is_free boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select l.id, l.title, l.slug, l.category, l.is_free
    from public.lessons l
    where l.level_code = upper(p_level)
      and l.status = 'published'
    order by l.category, l.title;
end;
$$;