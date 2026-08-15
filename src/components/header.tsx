import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { logout } from "@/app/actions/login";
import { Logo } from "@/components/logo";

export default async function Header() {
  let user = null;
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    if (supabase) {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u ?? null;
      if (user) {
        try {
          const { data } = await supabase.rpc("is_admin");
          isAdmin = Boolean(data);
        } catch {
          isAdmin = false;
        }
      }
    }
  }

  const name =
    (user?.user_metadata?.full_name as string) ||
    user?.email?.split("@")[0] ||
    "";

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

          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
              >
                {name}
              </Link>
              <Link
                href="/profil"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:hidden"
              >
                Profil
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
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
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
