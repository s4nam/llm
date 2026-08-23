-- ============================================================
-- englishmudah.id — Migration 034: Feedback Laporan Masalah
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Setelah admin menindaklanjuti laporan user, user perlu tahu hasilnya.
-- Migration ini menambah:
-- 1. Kolom feedback pada lesson_reports:
--      admin_reply  text   — tanggapan admin (bisa dari pilihan saran)
--      resolved_at  timestamptz — kapan ditandai selesai
--      updated_at   timestamptz — kapan terakhir diubah
-- 2. Policy RLS "Users can view own reports" — user bisa melihat
--    laporannya sendiri (sebelumnya hanya bisa insert).
-- 3. resolve_report menerima p_reply (tanggapan admin).
-- 4. get_reports_admin mengembalikan admin_reply & resolved_at
--    (return type berubah → wajib DROP dulu sebelum recreate).
-- ============================================================

-- ---------- 1. KOLOM FEEDBACK ----------
alter table public.lesson_reports
  add column if not exists admin_reply text;

alter table public.lesson_reports
  add column if not exists resolved_at timestamptz;

alter table public.lesson_reports
  add column if not exists updated_at timestamptz not null default now();

-- ---------- 2. RLS: USER BISA MELIHAT LAPORANNYA SENDIRI ----------
drop policy if exists "Users can view own reports" on public.lesson_reports;

create policy "Users can view own reports"
  on public.lesson_reports
  for select using (auth.uid() = user_id);

-- ---------- 3. RESOLVE REPORT (terima tanggapan admin) ----------
create or replace function public.resolve_report(
  p_report_id uuid,
  p_reply text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  update public.lesson_reports
  set status = 'done',
      admin_reply = coalesce(p_reply, admin_reply),
      resolved_at = now(),
      updated_at = now()
  where id = p_report_id;
end;
$$;

-- ---------- 4. GET REPORTS ADMIN (drop + recreate, return type berubah) ----------
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