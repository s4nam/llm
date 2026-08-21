import Link from "next/link";
import { logout } from "@/app/actions/login";

export default function AdminHeader() {
  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-lg font-bold">
            englishmudah<span className="text-sky-400">.admin</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/admin/materi" className="hover:text-sky-300">
              Materi
            </Link>
            <Link href="/admin/academic" className="hover:text-sky-300">
              Latihan Akademik
            </Link>
            <Link href="/admin/pengaturan-ai" className="hover:text-sky-300">
              Pengaturan AI
            </Link>
            <Link href="/admin/monitoring" className="hover:text-sky-300">
              Monitoring
            </Link>
            <Link href="/admin/monetisasi" className="hover:text-sky-300">
              Monetisasi
            </Link>
            <Link href="/admin/kampanye" className="hover:text-sky-300">
              Kampanye
            </Link>
            <Link href="/admin/laporan" className="hover:text-sky-300">
              Laporan
            </Link>
            <Link href="/admin/keamanan" className="hover:text-sky-300">
              Keamanan
            </Link>
            <Link href="/admin/panduan" className="hover:text-sky-300">
              Panduan
            </Link>
          </nav>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Keluar
          </button>
        </form>
      </div>
      <nav className="mx-auto flex max-w-6xl items-center gap-4 overflow-x-auto px-4 pb-3 text-sm sm:hidden">
        <Link href="/admin/materi" className="shrink-0 text-sky-300">
          Materi
        </Link>
        <Link href="/admin/academic" className="shrink-0 text-sky-300">
          Latihan Akademik
        </Link>
        <Link href="/admin/pengaturan-ai" className="shrink-0 text-sky-300">
          Pengaturan AI
        </Link>
        <Link href="/admin/monitoring" className="shrink-0 text-sky-300">
          Monitoring
        </Link>
        <Link href="/admin/monetisasi" className="shrink-0 text-sky-300">
          Monetisasi
        </Link>
        <Link href="/admin/kampanye" className="shrink-0 text-sky-300">
          Kampanye
        </Link>
        <Link href="/admin/laporan" className="shrink-0 text-sky-300">
          Laporan
        </Link>
        <Link href="/admin/keamanan" className="shrink-0 text-sky-300">
          Keamanan
        </Link>
        <Link href="/admin/panduan" className="shrink-0 text-sky-300">
          Panduan
        </Link>
      </nav>
    </header>
  );
}
