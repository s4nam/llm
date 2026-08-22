-- ============================================================
-- englishmudah.id — Migration 026: Gamifikasi + Daily Reminder
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- 1. last_reminded_at di profiles (kunci anti-spam Daily Reminder).
-- 2. Tabel achievements + user_achievements.
-- 3. RPC unlock/list achievements + leaderboard.
-- 4. RPC Daily Reminder (get_users_for_reminder, mark_reminded) —
--    security definer TANPA cek admin (dipanggil cron, bukan admin).
-- ============================================================

-- ---------- 1. KOLOM REMINDER ----------
alter table public.profiles
  add column if not exists last_reminded_at timestamptz;

-- ---------- 2. DAFTAR ACHIEVEMENT ----------
create table if not exists public.achievements (
  code text primary key,
  label text not null,
  description text not null,
  icon text not null default '🏅'
);

insert into public.achievements (code, label, description, icon) values
  ('first_lesson',     'Langkah Pertama',   'Menyelesaikan 1 pelajaran pertama.',            '🚀'),
  ('lessons_10',       'Rajin Belajar',     'Menyelesaikan 10 pelajaran.',                    '📚'),
  ('lessons_50',       'Semangat 45',       'Menyelesaikan 50 pelajaran.',                    '🔥'),
  ('streak_3',         'Konsisten 3 Hari',  'Belajar 3 hari berturut-turut.',                 '📅'),
  ('streak_7',         'Pekan Penuh',       'Belajar 7 hari berturut-turut.',                 '🎯'),
  ('streak_30',        'Sebulan Konsisten', 'Belajar 30 hari berturut-turut.',                '🏆'),
  ('level_a1',         'Penakluk A1',       'Menyelesaikan semua pelajaran level A1.',        '🥇'),
  ('level_a2',         'Penakluk A2',       'Menyelesaikan semua pelajaran level A2.',        '🥈'),
  ('level_b1',         'Penakluk B1',       'Menyelesaikan semua pelajaran level B1.',        '🥉'),
  ('level_b2',         'Penakluk B2',       'Menyelesaikan semua pelajaran level B2.',        '🏅'),
  ('level_c1',         'Penakluk C1',       'Menyelesaikan semua pelajaran level C1.',        '🏅'),
  ('level_c2',         'Penakluk C2',       'Menyelesaikan semua pelajaran level C2.',        '👑'),
  ('first_certificate','Pemilik Sertifikat','Memperoleh sertifikat pertama.',                 '📜')
on conflict (code) do nothing;

alter table public.achievements enable row level security;
create policy "achievements public" on public.achievements
  for select using (true);

-- ---------- 3. PENCAPAIAN USER ----------
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null references public.achievements(code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_code)
);

create index if not exists user_achievements_user_idx on public.user_achievements(user_id);

alter table public.user_achievements enable row level security;
create policy "Users can view own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

-- ---------- 4. RPC UNLOCK ACHIEVEMENT (deterministik dari data, tanpa AI) ----------
create or replace function public.unlock_achievements(p_user_id uuid)
returns text[]
language plpgsql
security definer set search_path = public
as $$
declare
  v_completed int;
  v_streak int;
  v_certs int;
  v_earned text[] := '{}'::text[];
  v_level text;
begin
  -- Hitung kondisi dari data yang sudah ada
  select count(*)::int into v_completed
  from public.user_progress where user_id = p_user_id and completed = true;

  select current_streak into v_streak
  from public.user_streaks where user_id = p_user_id;

  select count(*)::int into v_certs
  from public.certificates where user_id = p_user_id;

  -- Lessons
  if v_completed >= 1 then v_earned := v_earned || 'first_lesson'; end if;
  if v_completed >= 10 then v_earned := v_earned || 'lessons_10'; end if;
  if v_completed >= 50 then v_earned := v_earned || 'lessons_50'; end if;

  -- Streak
  if v_streak >= 3 then v_earned := v_earned || 'streak_3'; end if;
  if v_streak >= 7 then v_earned := v_earned || 'streak_7'; end if;
  if v_streak >= 30 then v_earned := v_earned || 'streak_30'; end if;

  -- Sertifikat
  if v_certs >= 1 then v_earned := v_earned || 'first_certificate'; end if;

  -- Level selesai (semua pelajaran published di level tsb dikerjakan)
  for v_level in select code from public.levels order by sort_order loop
    if (
      select count(*)::int > 0
      and (select count(*)::int from public.lessons l
            where l.level_code = v_level and l.status = 'published')
        = (select count(*)::int from public.lessons l
            join public.user_progress up on up.lesson_id = l.id
            where l.level_code = v_level and l.status = 'published'
              and up.user_id = p_user_id and up.completed = true)
    ) then
      v_earned := v_earned || ('level_' || lower(v_level));
    end if;
  end loop;

  -- Simpan yang baru (skip yang sudah ada)
  for i in 1 .. array_length(v_earned, 1) loop
    insert into public.user_achievements (user_id, achievement_code)
    values (p_user_id, v_earned[i])
    on conflict (user_id, achievement_code) do nothing;
  end loop;

  return v_earned;
end;
$$;

-- ---------- 5. RPC LIST ACHIEVEMENT USER ----------
create or replace function public.list_user_achievements(p_user_id uuid)
returns table (
  code text,
  label text,
  description text,
  icon text,
  unlocked boolean,
  unlocked_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select a.code, a.label, a.description, a.icon,
           (ua.id is not null) as unlocked,
           ua.unlocked_at
    from public.achievements a
    left join public.user_achievements ua
      on ua.achievement_code = a.code and ua.user_id = p_user_id
    order by a.code;
end;
$$;

-- ---------- 6. RPC LEADERBOARD ----------
-- Ranking user berdasar jumlah pelajaran selesai + streak (skor sederhana).
-- Hanya menampilkan 3 field identitas minimal + skor.
create or replace function public.get_leaderboard(p_limit int default 20)
returns table (
  user_id uuid,
  full_name text,
  completed_count bigint,
  current_streak int,
  score bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select p.id as user_id,
           coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)) as full_name,
           up.count as completed_count,
           coalesce(us.current_streak, 0) as current_streak,
           (up.count * 10 + coalesce(us.current_streak, 0) * 5) as score
    from public.profiles p
    left join (
      select user_id, count(*)::bigint as count
      from public.user_progress where completed = true
      group by user_id
    ) up on up.user_id = p.id
    left join public.user_streaks us on us.user_id = p.id
    where up.count is not null and up.count > 0
    order by score desc
    limit p_limit;
end;
$$;

-- ---------- 7. RPC DAILY REMINDER (cron, TANPA cek admin) ----------
-- User yang: aktif 7 hari terakhir, BELUM belajar hari ini, dan belum diingatkan hari ini.
create or replace function public.get_users_for_reminder()
returns table (id uuid, email text, full_name text)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
    select distinct p.id, p.email, p.full_name
    from public.profiles p
    where exists (
      select 1 from public.lesson_opens o
      where o.user_id = p.id and o.opened_at >= now() - interval '7 days'
    )
    and not exists (
      select 1 from public.lesson_opens o
      where o.user_id = p.id and o.opened_at::date = current_date
    )
    and (p.last_reminded_at is null or p.last_reminded_at < date_trunc('day', now()));
end;
$$;

-- Tandai user sudah diingatkan hari ini.
create or replace function public.mark_reminded(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set last_reminded_at = now()
  where id = p_user_id;
end;
$$;