-- ============================================================
-- englishmudah.id — 009: Perbaikan akses placement test
-- Jalankan di: Supabase Dashboard > SQL Editor > New query
--
-- Catatan: versi awal file ini bernomor 007 dan mungkin sudah pernah
-- dijalankan. File ini memakai CREATE OR REPLACE FUNCTION sehingga
-- menjalankannya sekali lagi aman dan otomatis mengganti yang lama.
-- Menyediakan akses ke tabel `placement_tests` (yang RLS-nya
-- memblokir semua pembacaan) lewat RPC security definer,
-- sekaligus menjaga jawaban (answerIndex) agar tidak bocor ke client.
-- ============================================================

-- 1. AMBIL SOAL TANPA JAWABAN (aman untuk client)
create or replace function public.get_placement_questions()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_questions jsonb;
begin
  select questions into v_questions from public.placement_tests where id = 1;
  if v_questions is null or jsonb_array_length(v_questions) = 0 then
    return '[]'::jsonb;
  end if;

  -- buang answerIndex & explanation agar tidak bocor
  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question', q ->> 'question',
        'options', q -> 'options'
      )
    ), '[]'::jsonb)
    from jsonb_array_elements(v_questions) q
  );
end;
$$;

-- 2. SUBMIT JAWABAN: nilai + simpan hasil (hanya jika user login)
create or replace function public.submit_placement(
  p_user_id uuid,
  p_answers int[]
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_questions jsonb;
  v_question jsonb;
  v_answer_idx int;
  v_correct_idx int;
  v_score int := 0;
  v_total int := 0;
  v_level text;
  v_levels text[] := array['A1','A1','A1','A2','A2','B1','B1','B2','B2','C1','C2','C2'];
begin
  select questions into v_questions from public.placement_tests where id = 1;
  -- tabel kosong → aplikasi memakai soal cadangan (fallback seed)
  if v_questions is null or jsonb_array_length(v_questions) = 0 then
    return null;
  end if;

  v_total := jsonb_array_length(v_questions);
  if p_answers is null
     or array_length(p_answers, 1) is null
     or array_length(p_answers, 1) <> v_total then
    raise exception 'Jumlah jawaban tidak sesuai';
  end if;

  for i in 0 .. v_total - 1 loop
    v_question := v_questions -> i;
    v_answer_idx := p_answers[i + 1];
    v_correct_idx := (v_question ->> 'answerIndex')::int;
    if v_answer_idx = v_correct_idx then
      v_score := v_score + 1;
    end if;
  end loop;

  -- Pemetaan skor → level (12 soal). Clamp agar tidak pernah NULL
  -- walau jumlah soal menyimpang dari 12.
  if v_score >= v_total then
    v_level := 'C2';
  else
    v_level := v_levels[least(greatest(v_score + 1, 1), array_length(v_levels, 1))];
  end if;

  if p_user_id is not null then
    insert into public.placement_results (user_id, score, total, recommended_level)
    values (p_user_id, v_score, v_total, v_level);
  end if;

  return jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'recommended_level', v_level,
    'saved', p_user_id is not null
  );
end;
$$;

-- 3. SIMPAN SOAL (dipakai admin saat generate via AI)
create or replace function public.save_placement_questions(p_questions jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.placement_tests (id, questions, generated_at)
  values (1, p_questions, now())
  on conflict (id) do update set
    questions = excluded.questions,
    generated_at = now();
end;
$$;
