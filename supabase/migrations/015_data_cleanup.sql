-- ============================================================
-- englishmudah.id — Migration 015: Pembersihan data (hemat storage)
-- Jalankan setelah 014_public_lessons_rpc.sql
--
-- Tabel log yang tumbuh cepat dibersihkan otomatis oleh cron:
--  - lesson_opens : 1 baris per buka pelajaran → simpan 30 hari.
--  - ai_usage_log : 1 baris per panggilan AI   → simpan 90 hari.
-- Data agregat (streak, progress, pemakaian bulan berjalan) sudah
-- tersimpan di tabel lain, jadi pembersihan tidak kehilangan info penting.
-- ============================================================

-- Bersihkan log akses pelajaran lebih tua dari N hari (dipanggil cron).
create or replace function public.purge_lesson_opens(p_days int default 30)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.lesson_opens
  where opened_at < now() - (p_days || ' days')::interval;
end;
$$;

-- Bersihkan log pemakaian AI lebih tua dari N hari (dipanggil cron).
create or replace function public.purge_ai_usage_log(p_days int default 90)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.ai_usage_log
  where created_at < now() - (p_days || ' days')::interval;
end;
$$;
