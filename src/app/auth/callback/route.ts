import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { set2faPending } from "@/lib/security";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/masuk", url.origin));
    }
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Alur lupa password → langsung ke halaman atur ulang kata sandi.
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", url.origin));
      }

      // 2FA: jika user adalah admin dengan TOTP aktif → wajib verifikasi kode
      // sebelum sesi dipakai penuh (sama seperti login password).
      try {
        const { data: isAdmin } = await supabase.rpc("is_admin");
        if (isAdmin) {
          const { data: sec } = await supabase.rpc("get_admin_security", {
            p_user_id: data.user.id,
          });
          const row = Array.isArray(sec) ? sec[0] : sec;
          if (row?.totp_enabled) {
            await set2faPending();
            return NextResponse.redirect(new URL("/masuk/2fa", url.origin));
          }
        }
      } catch {
        // RPC 2FA belum tersedia → lanjut normal
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/masuk", url.origin));
}
