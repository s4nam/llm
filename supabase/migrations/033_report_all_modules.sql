-- ============================================================
-- englishmudah.id — Migration 033: Laporan Masalah untuk Semua Modul
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Fitur "Laporkan masalah" sebelumnya hanya ada di pelajaran utama
-- (tabel lesson_reports hanya berisi lesson_id). Migration ini memperluas
-- agar user bisa melaporkan masalah di SEMUA konten yang diujikan:
--   - lesson        (pelajaran utama & pelajaran gratis)
--   - toefl         (latihan akademik reading/listening)
--   - situational   (percakapan situasional)
--   - placement     (tes penempatan)
--
-- 1. Tambah kolom `module` + `ref_id` (generik) pada lesson_reports.
--    `ref_id` = id konten sesuai module; untuk placement gunakan 'placement'.
-- 2. Backfill baris lama: module='lesson', ref_id = lesson_id.
-- 3. get_reports_admin diperbarui (drop + recreate, return type berubah)
--    agar menampilkan judul dari tabel yang sesuai per module.
-- ============================================================

-- ---------- 1. PERLUAS TABEL ----------
alter table public.lesson_reports
  add column if not exists module text not null default 'lesson'
    check (module in ('lesson','toefl','situational','placement'));

alter table public.lesson_reports
  add column if not exists ref_id text;

-- Backfill baris lama (lesson): ref_id = lesson_id
update public.lesson_reports
set ref_id = lesson_id::text
where module = 'lesson' and ref_id is null and lesson_id is not null;

-- ---------- 2. GET REPORTS ADMIN (drop + recreate, return type berubah) ----------
drop function if exists public.get_reports_admin();

create function public.get_reports_admin()
returns table (
  id uuid,
  user_email text,
  user_name text,
  module text,
  ref_id text,
  title text,
  detail text,
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
           r.module,
           r.ref_id,
           case r.module
             when 'lesson' then l.title
             when 'toefl' then t.title
             when 'situational' then s.title
             when 'placement' then 'Tes Penempatan'
             else null
           end as title,
           case r.module
             when 'lesson' then l.level_code
             when 'toefl' then t.section
             when 'situational' then s.topic
             else null
           end as detail,
           r.note,
           r.status,
           r.created_at
    from public.lesson_reports r
    left join public.profiles p on p.id = r.user_id
    left join public.lessons l on l.id = r.lesson_id
    left join public.toefl_sets t on t.id = r.ref_id::uuid
    left join public.situational_sets s on s.id = r.ref_id::uuid
    order by r.created_at desc;
end;
$$;