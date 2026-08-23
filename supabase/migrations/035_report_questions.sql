-- ============================================================
-- englishmudah.id — Migration 035: Laporan per Soal (multi-pilih)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Menambah kolom `question_indices` (int[]) pada lesson_reports.
-- User kini bisa memilih lebih dari 1 soal yang bermasalah dalam satu
-- laporan. Index mengikuti nomor urut soal di konten (1-based di UI,
-- disimpan 1-based agar mudah dibaca).
--
-- get_reports_admin diperbarui mengembalikan question_indices
-- (return type berubah → wajib DROP dulu sebelum recreate).
-- ============================================================

-- ---------- 1. KOLOM BARU ----------
alter table public.lesson_reports
  add column if not exists question_indices int[];

-- ---------- 2. GET REPORTS ADMIN (drop + recreate) ----------
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
  question_indices int[],
  status text,
  admin_reply text,
  created_at timestamptz,
  resolved_at timestamptz
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
           r.question_indices,
           r.status,
           r.admin_reply,
           r.created_at,
           r.resolved_at
    from public.lesson_reports r
    left join public.profiles p on p.id = r.user_id
    left join public.lessons l on l.id = r.lesson_id
    left join public.toefl_sets t on t.id = r.ref_id::uuid
    left join public.situational_sets s on s.id = r.ref_id::uuid
    order by r.created_at desc;
end;
$$;