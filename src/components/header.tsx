import Link from "next/link";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
        E
      </span>
      <span
        className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
      >
        english<span className="text-brand">mudah</span>
      </span>
    </Link>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/pelajaran-gratis"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
          >
            Coba Gratis
          </Link>
          <Link
            href="/daftar"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Daftar
          </Link>
          <Link
            href="/masuk"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Masuk
          </Link>
        </nav>
      </div>
    </header>
  );
}
