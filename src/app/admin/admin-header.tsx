"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/login";

interface NavItem {
  label: string;
  href: string;
  exact?: boolean;
  icon: React.ReactNode;
}

const ICON = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  materi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  academic: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    </svg>
  ),
  situasional: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  audit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  ai: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 1 3 3c0 .5-.1 1-.3 1.4l2.9 5A4 4 0 1 1 13 17v-1" />
      <circle cx="12" cy="17" r="2" />
      <path d="M9 8a3 3 0 0 0 3-3" />
      <path d="M9.5 5.5l.01 0" />
    </svg>
  ),
  monitoring: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-6" />
    </svg>
  ),
  monetisasi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12" />
      <path d="M16 8.5c0-1-1.8-1.8-4-1.8s-4 .8-4 1.8 1.5 1.7 4 2 4 1 4 2-1.8 1.8-4 1.8-4-.8-4-1.8" />
    </svg>
  ),
  kampanye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11l18-7-7 18-2-8-9-3z" />
    </svg>
  ),
  laporan: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  ),
  keamanan: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  panduan: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Konten",
    items: [
      { label: "Materi", href: "/admin/materi", icon: ICON.materi },
      { label: "Latihan Akademik", href: "/admin/academic", icon: ICON.academic },
      { label: "Situasional", href: "/admin/situasional", icon: ICON.situasional },
      { label: "Audit Jawaban", href: "/admin/audit-jawaban", icon: ICON.audit },
    ],
  },
  {
    label: "Bisnis",
    items: [
      { label: "Monitoring", href: "/admin/monitoring", icon: ICON.monitoring },
      { label: "Monetisasi", href: "/admin/monetisasi", icon: ICON.monetisasi },
      { label: "Kampanye", href: "/admin/kampanye", icon: ICON.kampanye },
      { label: "Laporan", href: "/admin/laporan", icon: ICON.laporan },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Pengaturan AI", href: "/admin/pengaturan-ai", icon: ICON.ai },
      { label: "Keamanan", href: "/admin/keamanan", icon: ICON.keamanan },
      { label: "Panduan", href: "/admin/panduan", icon: ICON.panduan },
    ],
  },
];

function isActive(href: string, exact: boolean | undefined, pathname: string): boolean {
  if (exact) return pathname === href;
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 text-white lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            englishmudah<span className="text-sky-400">.admin</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-5">
            <div>
              <Link
                href="/admin"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === "/admin"
                    ? "bg-sky-500/20 text-sky-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-slate-400">{ICON.dashboard}</span>
                Dashboard
              </Link>
            </div>

            {SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href, item.exact, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? "bg-sky-500/20 font-medium text-sky-300"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className={active ? "text-sky-400" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-800 p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-lg font-bold tracking-tight">
            englishmudah<span className="text-sky-400">.admin</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            >
              Keluar
            </button>
          </form>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-3 pb-3 text-sm">
          <Link
            href="/admin"
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${
              pathname === "/admin"
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Dashboard
          </Link>
          {SECTIONS.flatMap((s) => s.items).map((item) => {
            const active = isActive(item.href, item.exact, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition ${
                  active
                    ? "bg-sky-500/20 text-sky-300"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}