import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { computeAccess } from "@/lib/access";
import HeaderNav from "@/components/header-nav";

export default async function Header() {
  let user = null;
  let isAdmin = false;
  let isMember = false;

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_member, member_expires_at, trial_expires_at")
          .eq("id", user.id)
          .single();
        isMember = computeAccess(profile).isMember;
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
        <Logo href={user ? "/dashboard" : "/"} />
        {user ? (
          <HeaderNav name={name} isAdmin={isAdmin} isMember={isMember} />
        ) : (
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/pelajaran-gratis"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              Coba Gratis
            </Link>
            <Link
              href="/academic"
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              Latihan Akademik
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
        )}
      </div>
    </header>
  );
}
