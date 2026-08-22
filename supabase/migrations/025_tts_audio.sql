-- ============================================================
-- englishmudah.id — Migration 025: TTS Jernih (generate-once)
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. Bucket lesson-audio — audio pelajaran DIBAGIKAN semua member
--    (BEDA dari academic-audio yang per-user). Akses via signed URL
--    yang dibuat server-side setelah cek member — bukan owner-only.
-- 2. Tabel lesson_audio — cache permanen hash-teks → path audio,
--    agar teks yang sama TIDAK pernah digenerate ulang (hemat biaya AI).
-- ============================================================

-- ---------- 1. STORAGE: BUCKET AUDIO PELAJARAN (private, shared) ----------
insert into storage.buckets (id, name, public)
values ('lesson-audio', 'lesson-audio', false)
on conflict (id) do nothing;

-- Upload: hanya aplikasi server (admin pre-generate) — via signed URL / service
-- role di sisi aplikasi. Policy upload: tidak diizinkan langsung dari client
-- publik (hanya lewat route /api/tts yang mengecek admin).
create policy "app only upload lesson-audio"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lesson-audio'
  and public.is_admin()
);

-- Read via signed URL: server-side membuat signed URL setelah cek akses member.
-- Karena dibuat server (security definer / service), tidak perlu policy read
-- publik. Policy select dibiarkan default (tidak ada akses langsung).
create policy "no direct read lesson-audio"
on storage.objects for select
to authenticated
using (bucket_id = 'lesson-audio' and false);

-- ---------- 2. CACHE AUDIO PER TEKS ----------
create table if not exists public.lesson_audio (
  id uuid primary key default gen_random_uuid(),
  text_hash text not null unique,        -- sha256 teks (kunci cache)
  text_preview text not null default '', -- potongan teks utk inspeksi admin
  path text not null,                    -- path di bucket lesson-audio, mis. {hash}.mp3
  provider text not null default 'openai',
  model text not null default 'gpt-4o-mini-tts',
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists lesson_audio_hash_idx on public.lesson_audio(text_hash);

alter table public.lesson_audio enable row level security;
-- Hanya aplikasi server (via RPC) yang boleh membaca/menulis cache ini.
create policy "lesson_audio server only" on public.lesson_audio
  for select using (false);
create policy "lesson_audio admin insert" on public.lesson_audio
  for insert with check (public.is_admin());
create policy "lesson_audio admin update" on public.lesson_audio
  for update using (public.is_admin());

-- ---------- 3. RPC CACHE AUDIO (security definer, dipakai route /api/tts) ----------
-- Cari audio yang sudah ada (untuk mencegah generate ulang).
create or replace function public.get_lesson_audio_by_hash(p_text_hash text)
returns table (
  id uuid,
  path text,
  provider text,
  model text,
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
    select a.id, a.path, a.provider, a.model, a.created_at
    from public.lesson_audio a
    where a.text_hash = p_text_hash
    limit 1;
end;
$$;

-- Simpan entri cache baru.
create or replace function public.save_lesson_audio(
  p_text_hash text,
  p_text_preview text,
  p_path text,
  p_provider text,
  p_model text,
  p_duration_ms int
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  insert into public.lesson_audio (text_hash, text_preview, path, provider, model, duration_ms)
  values (p_text_hash, p_text_preview, p_path, p_provider, p_model, p_duration_ms)
  on conflict (text_hash) do nothing;
end;
$$;