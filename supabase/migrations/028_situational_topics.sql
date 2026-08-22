-- ============================================================
-- englishmudah.id — Migration 028: Perluas Topik Situasional
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Menambah 7 topik baru ke CHECK constraint tabel situational_sets:
--   interview, phone, bank, office, school, social, customer_service
-- (Migration 024 hanya mengizinkan 5 topik awal).
--
-- CATATAN: constraint lama dibuat otomatis oleh Postgres saat tabel
-- dibuat (024) dengan nama default `situational_sets_topic_check`.
-- Kita drop lalu buat ulang dengan daftar nilai yang lengkap.
-- ============================================================

alter table public.situational_sets
  drop constraint if exists situational_sets_topic_check;

alter table public.situational_sets
  add constraint situational_sets_topic_check
  check (
    topic in (
      'hotel','restaurant','travel','shopping','health',
      'interview','phone','bank','office','school','social','customer_service'
    )
  );