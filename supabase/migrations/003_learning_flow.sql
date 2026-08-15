-- ============================================================
-- englishmudah.id — Migration 003: Learning Flow (Fase 3)
-- Jalankan setelah 002_ai_engine.sql
-- ============================================================

-- ---------- 1. SERTIFIKAT ----------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level_code text not null references public.levels(code),
  code text not null unique,               -- kode verifikasi publik (mis. ABC123)
  issued_at timestamptz not null default now(),
  unique (user_id, level_code)
);

create index if not exists certificates_code_idx on public.certificates(code);

alter table public.certificates enable row level security;
create policy "Users can view own certificates" on public.certificates
  for select using (auth.uid() = user_id);

-- Verifikasi publik (tanpa login) — hanya data minimal yang boleh dilihat
create or replace function public.get_certificate(p_code text)
returns table (
  code text,
  full_name text,
  level_code text,
  issued_at timestamptz
)
language sql
security definer set search_path = public
as $$
  select c.code, p.full_name, c.level_code, c.issued_at
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  where c.code = p_code;
$$;

-- RPC: buat sertifikat (internal, dipanggil saat level selesai)
create or replace function public.create_certificate(
  p_user_id uuid,
  p_level_code text
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_retry int := 0;
begin
  -- jika sudah ada, kembalikan kode yang lama (idempoten)
  select code into v_code
  from public.certificates
  where user_id = p_user_id and level_code = p_level_code;

  if v_code is not null then
    return v_code;
  end if;

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into public.certificates (user_id, level_code, code)
      values (p_user_id, p_level_code, v_code);
      exit;
    exception when unique_violation then
      v_retry := v_retry + 1;
      if v_retry > 5 then
        raise exception 'Gagal membuat kode sertifikat';
      end if;
    end;
  end loop;

  return v_code;
end;
$$;

-- ---------- 2. LATIHAN WRITING + FEEDBACK AI ----------
create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete set null,
  prompt text not null,                    -- tugas menulis
  user_text text not null,
  feedback text not null default '',
  score int,                               -- 0-100
  created_at timestamptz not null default now()
);

create index if not exists writing_sub_user_idx on public.writing_submissions(user_id);

alter table public.writing_submissions enable row level security;
create policy "Users can view own writing" on public.writing_submissions
  for select using (auth.uid() = user_id);
create policy "Users can insert own writing" on public.writing_submissions
  for insert with check (auth.uid() = user_id);

-- Kuota writing: hitung kiriman dalam 30 hari
create or replace function public.get_writing_quota_used(p_user_id uuid)
returns int
language sql
security definer set search_path = public
as $$
  select count(*)::int
  from public.writing_submissions
  where user_id = p_user_id
    and created_at >= now() - interval '30 days';
$$;

-- ---------- 3. LOG AKSES PELAJARAN (analitik belajar) ----------
create table if not exists public.lesson_opens (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  opened_at timestamptz not null default now()
);

create index if not exists lesson_opens_lesson_idx on public.lesson_opens(lesson_id);
create index if not exists lesson_opens_user_idx on public.lesson_opens(user_id);

alter table public.lesson_opens enable row level security;
create policy "Users can insert own opens" on public.lesson_opens
  for insert with check (auth.uid() = user_id);

-- RPC admin: pelajaran terpopuler
create or replace function public.get_popular_lessons(p_limit int default 10)
returns table (
  lesson_id uuid,
  title text,
  level_code text,
  category text,
  opens bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query
    select l.id, l.title, l.level_code, l.category, count(o.id) as opens
    from public.lesson_opens o
    join public.lessons l on l.id = o.lesson_id
    group by l.id, l.title, l.level_code, l.category
    order by opens desc
    limit p_limit;
end;
$$;

-- ---------- 4. STREAK BELAJAR ----------
-- Streak = jumlah hari berurutan user membuka/menyelesaikan pelajaran.
-- Log akses harian sudah cukup; streak dihitung dari lesson_opens di aplikasi.
-- Tabel ini menyimpan ringkasan harian untuk keperluan dashboard.
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks enable row level security;
create policy "Users can view own streak" on public.user_streaks
  for select using (auth.uid() = user_id);

-- RPC: perbarui streak harian (dipanggil saat membuka pelajaran)
create or replace function public.bump_streak(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_last date;
  v_current int;
begin
  select last_active_date, current_streak into v_last, v_current
  from public.user_streaks
  where user_id = p_user_id;

  if v_last is null then
    insert into public.user_streaks (user_id, current_streak, best_streak, last_active_date, updated_at)
    values (p_user_id, 1, 1, current_date, now());
  elsif v_last = current_date then
    -- sudah aktif hari ini, tidak menambah
    return;
  elsif v_last = current_date - 1 then
    update public.user_streaks
    set current_streak = v_current + 1,
        best_streak = greatest(best_streak, v_current + 1),
        last_active_date = current_date,
        updated_at = now()
    where user_id = p_user_id;
  else
    -- terputus, mulai dari 1
    update public.user_streaks
    set current_streak = 1,
        last_active_date = current_date,
        updated_at = now()
    where user_id = p_user_id;
  end if;
end;
$$;

-- RPC admin: ringkasan pengguna (untuk dashboard admin)
create or replace function public.get_users_admin()
returns table (
  id uuid,
  email text,
  full_name text,
  is_member boolean,
  member_expires_at timestamptz,
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
    select p.id, p.email, p.full_name, p.is_member,
           p.member_expires_at, p.created_at
    from public.profiles p
    order by p.created_at desc;
end;
$$;

-- ---------- 5. GABUNG PROGRESS (browser → akun) ----------
-- Saat user mendaftar dan menyetujui gabung, progress lokal dipindah.
-- Data dikirim sebagai JSON ke RPC berikut (dengan format map lessonSlug -> score).
create or replace function public.merge_progress(
  p_user_id uuid,
  p_progress jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  v_lesson_id uuid;
  v_score int;
begin
  for item in select * from jsonb_array_elements(p_progress)
  loop
    -- cari lesson by slug
    select id into v_lesson_id
    from public.lessons
    where slug = item ->> 'slug';
    if v_lesson_id is null then
      continue;
    end if;
    v_score := (item ->> 'bestScore')::int;

    insert into public.user_progress (user_id, lesson_id, completed, best_score, completed_at)
    values (p_user_id, v_lesson_id, true, v_score, now())
    on conflict (user_id, lesson_id) do update set
      best_score = greatest(user_progress.best_score, excluded.best_score),
      completed = true,
      completed_at = coalesce(user_progress.completed_at, now());
  end loop;
end;
$$;

-- ---------- 6. LAPORAN MASALAH (bisa anonim / login) ----------
-- Tabel lesson_reports sudah dibuat di migration 002.
-- Tambah policy agar laporan dari pengguna tercatat.

-- ---------- 7. DATA EXPORT (UU PDP) ----------
create or replace function public.export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_profiles jsonb;
  v_progress jsonb;
  v_placements jsonb;
  v_writing jsonb;
  v_payments jsonb;
  v_certificates jsonb;
begin
  -- Hanya pemilik data (atau admin) yang boleh mengambil
  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Forbidden';
  end if;

  select to_jsonb(p) into v_profiles
  from public.profiles p where p.id = p_user_id;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_progress
  from (select lesson_id, completed, best_score, last_opened_at, completed_at
        from public.user_progress where user_id = p_user_id) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_placements
  from (select score, total, recommended_level, created_at
        from public.placement_results where user_id = p_user_id) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_writing
  from (select lesson_id, prompt, user_text, feedback, score, created_at
        from public.writing_submissions where user_id = p_user_id) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_payments
  from (select midtrans_order_id, amount, plan, status, created_at
        from public.payments where user_id = p_user_id) x;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_certificates
  from (select level_code, code, issued_at
        from public.certificates where user_id = p_user_id) x;

  return jsonb_build_object(
    'profile', v_profiles,
    'progress', v_progress,
    'placements', v_placements,
    'writing', v_writing,
    'payments', v_payments,
    'certificates', v_certificates,
    'exported_at', now()
  );
end;
$$;

-- RPC: hapus akun beserta data (hanya pemilik)
create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  delete from public.user_streaks where user_id = p_user_id;
  delete from public.certificates where user_id = p_user_id;
  delete from public.writing_submissions where user_id = p_user_id;
  delete from public.placement_results where user_id = p_user_id;
  delete from public.user_progress where user_id = p_user_id;
  delete from public.lesson_opens where user_id = p_user_id;
  delete from public.payments where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
  -- Hapus dari auth.users (menghapus semua data auth terkait)
  delete from auth.users where id = p_user_id;
end;
$$;
