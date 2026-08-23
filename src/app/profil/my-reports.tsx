interface ReportRow {
  id: string;
  module: string;
  note: string;
  question_indices: number[] | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  lesson: "Materi",
  toefl: "Akademik",
  situational: "Situasional",
  placement: "Placement",
};

export default function MyReports({ reports }: { reports: ReportRow[] }) {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Laporan Saya</h2>
      {reports.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Belum ada laporan. Jika menemukan kesalahan di materi, gunakan tombol
          &ldquo;Laporkan masalah&rdquo; di dalam pelajaran.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === "open"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {r.status === "open" ? "Menunggu ditinjau" : "Selesai ditindaklanjuti"}
                </span>
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                  {MODULE_LABELS[r.module] ?? r.module}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{r.note}</p>
              {r.question_indices && r.question_indices.length > 0 && (
                <p className="mt-1 text-xs text-brand">
                  Soal dilaporkan:{" "}
                  {[...r.question_indices]
                    .sort((a, b) => a - b)
                    .map((n) => `#${n}`)
                    .join(", ")}
                </p>
              )}
              {r.status === "done" && (
                <div className="mt-3 rounded-lg bg-success/5 p-3">
                  <p className="text-xs font-semibold text-success">
                    Tanggapan tim
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {r.admin_reply || "Terima kasih atas laporannya. Masalah ini sudah kami tindak lanjuti."}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}