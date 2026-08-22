-- ============================================================
-- englishmudah.id — Migration 029: Dedupe Materi (Hapus Duplikat)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- MENGHAPUS DULU LANGKAH 1 (lihat dulu), LALU LANGKAH 2 (hapus).
--
-- Strategi pemilihan pelajaran yang DIPERTAHANKAN per grup duplikat
-- (level_code + category + judul, case-insensitive):
--   1) status 'published'  (lebih dipilih daripada draft)
--   2) paling banyak diakses user (lesson_opens)
--   3) dibuat paling awal (created_at)
--
-- SEBELUM menghapus, skrip MEMINDAHKAN dulu data user dari pelajaran
-- duplikat ke pelajaran yang dipertahankan:
--   - user_progress  → dipindah (unik per user; jika user sudah punya
--     progress di yang dipertahankan, baris lama dihapus — tidak dobel)
--   - lesson_opens   → dipindah semua
-- Dengan begitu progress belajar user TIDAK hilang.
-- ============================================================

-- ---------- LANGKAH 1: LIHAT SEMUA DULU (termasuk draft & published) ----------
with opens_counts as (
  select lesson_id, count(*) as cnt
  from public.lesson_opens
  group by lesson_id
),
progress_counts as (
  select lesson_id, count(*) as cnt
  from public.user_progress
  group by lesson_id
),
ranked as (
  select l.id,
         l.level_code,
         l.category,
         l.title,
         l.status,
         l.created_at,
         coalesce(o.cnt, 0) as opens,
         coalesce(p.cnt, 0) as progress,
         row_number() over (
           partition by l.level_code, l.category, lower(l.title)
           order by
             (l.status = 'published') desc,
             coalesce(o.cnt, 0) desc,
             coalesce(p.cnt, 0) desc,
             l.created_at asc
         ) as rn
  from public.lessons l
  left join opens_counts o on o.lesson_id = l.id
  left join progress_counts p on p.lesson_id = l.id
)
select level_code, category, title, status, created_at, opens, progress, rn, id
from ranked
where rn > 1
order by level_code, category, title, rn;

-- ---------- LANGKAH 2: HAPUS DULU (jalankan SETELAH langkah 1) ----------
-- Jalankan DUA statement terpisah:
--
-- 2a) Pindahkan data user (progress & opens) ke pelajaran yang dipertahankan.
-- with opens_counts as (
--   select lesson_id, count(*) as cnt from public.lesson_opens group by lesson_id
-- ),
-- progress_counts as (
--   select lesson_id, count(*) as cnt from public.user_progress group by lesson_id
-- ),
-- ranked as (
--   select l.id, l.level_code, l.category, lower(l.title) as title_key,
--          row_number() over (
--            partition by l.level_code, l.category, lower(l.title)
--            order by (l.status = 'published') desc,
--                     coalesce(o.cnt, 0) desc,
--                     coalesce(p.cnt, 0) desc,
--                     l.created_at asc
--          ) as rn
--   from public.lessons l
--   left join opens_counts o on o.lesson_id = l.id
--   left join progress_counts p on p.lesson_id = l.id
-- ),
-- keep as (select id, level_code, category, title_key from ranked where rn = 1),
-- dup as (select id, level_code, category, title_key from ranked where rn > 1),
-- moved_progress as (
--   update public.user_progress up
--   set lesson_id = k.id
--   from dup d
--   join keep k on k.level_code = d.level_code and k.category = d.category and k.title_key = d.title_key
--   where up.lesson_id = d.id
--     and not exists (select 1 from public.user_progress up2
--                     where up2.user_id = up.user_id and up2.lesson_id = k.id)
-- )
-- update public.lesson_opens lo
-- set lesson_id = k.id
-- from dup d
-- join keep k on k.level_code = d.level_code and k.category = d.category and k.title_key = d.title_key
-- where lo.lesson_id = d.id;
--
-- 2b) Hapus pelajaran duplikat (statement TERPISAH — buat ulang CTE sendiri).
-- with opens_counts as (
--   select lesson_id, count(*) as cnt from public.lesson_opens group by lesson_id
-- ),
-- progress_counts as (
--   select lesson_id, count(*) as cnt from public.user_progress group by lesson_id
-- ),
-- ranked as (
--   select l.id,
--          row_number() over (
--            partition by l.level_code, l.category, lower(l.title)
--            order by (l.status = 'published') desc,
--                     coalesce(o.cnt, 0) desc,
--                     coalesce(p.cnt, 0) desc,
--                     l.created_at asc
--          ) as rn
--   from public.lessons l
--   left join opens_counts o on o.lesson_id = l.id
--   left join progress_counts p on p.lesson_id = l.id
-- )
-- delete from public.lessons l
-- using ranked r
-- where l.id = r.id and r.rn > 1;