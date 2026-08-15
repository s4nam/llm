import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Verifikasi user adalah admin. Redirect ke /masuk jika belum login,
 * atau ke /dashboard jika bukan admin.
 */
export async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    redirect("/dashboard");
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
