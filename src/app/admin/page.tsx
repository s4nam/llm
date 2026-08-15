import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "./admin-header";

export default async function AdminPage() {
  await requireAdmin();

  const cards = [
    {
      title: "Kelola Materi",
      desc: "Generate pelajaran baru dengan AI, pratinjau, setujui, atau perbaiki materi.",
      href: "/admin/materi",
    },
    {
      title: "Pengaturan AI",
      desc: "Atur API key OpenAI, Gemini, Claude, pilih model default, dan alarm budget.",
      href: "/admin/pengaturan-ai",
    },
    {
      title: "Monitoring",
      desc: "Lihat pemakaian token, estimasi biaya, dan log permintaan AI.",
      href: "/admin/monitoring",
    },
    {
      title: "Monetisasi",
      desc: "Atur harga paket, buat kupon, dan kelola status member.",
      href: "/admin/monetisasi",
    },
  ];

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="mt-1 text-slate-600">
          Kelola aplikasi englishmudah.id Anda dari sini.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.desc}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
