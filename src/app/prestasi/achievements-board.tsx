"use client";

interface AchievementRow {
  code: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface LeaderboardRow {
  user_id: string;
  full_name: string;
  completed_count: number;
  current_streak: number;
  score: number;
}

export default function AchievementsBoard({
  achievements,
  leaderboard,
  currentUserId,
}: {
  achievements: AchievementRow[];
  leaderboard: LeaderboardRow[];
  currentUserId: string;
}) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Achievements */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Badge Pencapaian</h2>
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
            {unlockedCount}/{achievements.length} terkunci
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => (
            <div
              key={a.code}
              className={`flex flex-col items-center gap-1 rounded-xl border p-4 text-center ${
                a.unlocked
                  ? "border-brand/40 bg-brand-light/20"
                  : "border-slate-200 bg-surface opacity-60 grayscale"
              }`}
            >
              <span className="text-2xl">{a.unlocked ? a.icon : "🔒"}</span>
              <p className="text-sm font-semibold text-slate-900">{a.label}</p>
              <p className="text-xs text-slate-500">{a.description}</p>
              {a.unlocked_at && (
                <p className="text-[10px] text-slate-400">
                  {new Date(a.unlocked_at).toLocaleDateString("id-ID")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Papan Peringkat</h2>
        <p className="mt-1 text-sm text-slate-500">
          Berdasarkan jumlah pelajaran selesai (×10) + streak (×5).
        </p>
        {leaderboard.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada peringkat. Selesaikan pelajaran pertamamu!
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {leaderboard.map((row, i) => {
              const isMe = row.user_id === currentUserId;
              return (
                <div
                  key={row.user_id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
                    isMe ? "border-brand bg-brand-light/20" : "border-slate-200"
                  }`}
                >
                  <span className="w-6 text-center font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {row.full_name}
                      {isMe && <span className="ml-1 text-xs text-brand">(kamu)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.completed_count} pelajaran • streak {row.current_streak}
                    </p>
                  </div>
                  <span className="rounded-full bg-brand-light px-3 py-1 text-sm font-bold text-brand">
                    {row.score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}