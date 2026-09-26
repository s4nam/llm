-- ============================================================
-- englishmudah.id — Migration 036: Flag Jumlah Soal per Materi
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Tujuan: agar /admin/materi/list bisa tampil flag "15 Soal"/"25 Soal"
-- dengan background merah (<20) / hijau (>=20) seperti referensi
-- "D:\Produk Kuantum\referensi llm\soal\di bawah 20.png" & "diatas 20.png".
--
-- 1. Extend list_lessons_admin() dengan kolom question_count = jsonb_array_length(quiz)
--    Wajib DROP dulu karena return type berubah (pola sama 023, 030, 032).
-- ============================================================

drop function if exists public.list_lessons_admin();

create function public.list_lessons_admin()
returns table (
  id uuid,
  level_code text,
  category text,
  title text,
  slug text,
  is_free boolean,
  status text,
  published_at timestamptz,
  updated_at timestamptz,
  answers_verified_at timestamptz,
  question_count int
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select l.id, l.level_code, l.category, l.title, l.slug,
           l.is_free, l.status, l.published_at, l.updated_at,
           l.answers_verified_at,
           jsonb_array_length(coalesce(l.quiz, '[]'::jsonb))::int as question_count
    from public.lessons l
    order by l.level_code, l.category, l.title;
end;
$$;
