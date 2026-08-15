-- ============================================================
-- englishmudah.id — Migration 007: Perbaiki RLS tabel lessons
-- Jalankan setelah 006_admin_setup.sql
--
-- Sebelumnya tabel lessons hanya punya policy SELECT, sehingga
-- aplikasi (pakai anon key + sesi admin) TIDAK bisa INSERT materi
-- baru hasil generate AI (error: "new row violates RLS policy").
-- Di sini kita tambahkan policy INSERT/UPDATE untuk admin.
-- ============================================================

-- Admin boleh membuat pelajaran baru (draft) lewat aplikasi
create policy "Admins can insert lessons" on public.lessons
  for insert
  with check (public.is_admin());

-- Admin boleh mengubah pelajaran (regenerate, dll) via aplikasi
create policy "Admins can update lessons" on public.lessons
  for update
  using (public.is_admin());

-- (DELETE ditangani RPC delete_lesson yang security definer, sudah ada.)
