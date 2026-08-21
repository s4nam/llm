import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { is2faPending } from "@/lib/security";

/**
 * Verifikasi user adalah admin. Redirect ke /masuk jika belum login,
 * atau ke /dashboard jika bukan admin.
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
  }

  // Jika admin baru login dan belum melewati verifikasi 2FA → arahkan ke 2FA
  if (await is2faPending()) {
    redirect("/masuk/2fa");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/masuk");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  try {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) redirect("/dashboard");
  } catch {
    // Jika RPC belum tersedia (migration 002 belum dijalankan),
    // arahkan ke dashboard dengan aman.
    redirect("/dashboard");
  }

  return supabase;
}
