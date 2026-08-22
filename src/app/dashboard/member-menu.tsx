import Link from "next/link";

const MENU_ITEMS = [
  {
    href: "/placement-test",
    icon: "🎯",
    title: "Tes Penempatan",
    desc: "Ketahui level yang paling cocok",
  },
  {
    href: "/pelajaran-gratis",
    icon: "🆓",
    title: "Pelajaran Gratis",
    desc: "Coba materi tanpa biaya",
  },
  {
    href: "/academic",
    icon: "🎓",
    title: "Latihan Akademik",
    desc: "Simulasi tes bergaya TOEFL",
  },
  {
    href: "/percakapan-situasional",
    icon: "💬",
    title: "Percakapan Situasional",
    desc: "Praktik dialog untuk kehidupan nyata",
  },
  {
    href: "/study-sets",
    icon: "📝",
    title: "Study Sets",
    desc: "Simpan kosakata & frasa penting",
  },
  {
    href: "/prestasi",
    icon: "🏆",
    title: "Prestasi",
    desc: "Badge & papan peringkat",
  },
  {
    href: "/profil",
    icon: "📄",
    title: "Profil & Sertifikat",
    desc: "Data akun & sertifikat kamu",
  },
  {
    href: "/langganan",
    icon: "💳",
    title: "Langganan",
    desc: "Kelola paket & pembayaran",
  },
];

export default function MemberMenu() {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Menu</h2>
      <p className="text-sm text-slate-500">
        Semua yang bisa kamu akses sebagai member.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light/60 text-lg transition group-hover:bg-brand-light">
              {item.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                {item.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}