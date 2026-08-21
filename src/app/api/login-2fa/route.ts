import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { decryptKey } from "@/lib/ai/keys";
import { verifyTotp } from "@/lib/totp";
import { clear2faPending, is2faPending } from "@/lib/security";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

/**
 * Verifikasi kode 2FA saat login admin.
 * Body: { token: "123456" } atau { code: "KODE-RECOVERY" }.
 * Hanya berfungsi jika cookie em_2fa_pending aktif (sesi login baru).
 * Anti brute-force: maks 5 percobaan/menit per IP.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Anti brute-force kode 2FA: 5 percobaan per menit
  const limited = await rateLimit(`login-2fa:${clientIp(request)}`, { limit: 5, window: "60 s" });
  if (limited) return limited;

  if (!(await is2faPending())) {
    return NextResponse.json({ error: "Sesi verifikasi tidak ditemukan." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const token = String(body.token ?? "").trim();
  const recoveryCode = String(body.code ?? "").trim().toUpperCase();

  const { data: raw } = await supabase.rpc("get_admin_security", {
    p_user_id: user.id,
  });
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.totp_secret_encrypted) {
    return NextResponse.json({ error: "2FA tidak aktif." }, { status: 400 });
  }

  let secret = "";
  try {
    secret = decryptKey(row.totp_secret_encrypted);
  } catch {
    return NextResponse.json({ error: "Gagal membaca kunci 2FA." }, { status: 500 });
  }

  // Coba kode TOTP
  if (verifyTotp(secret, token)) {
    await clear2faPending();
    return NextResponse.json({ ok: true });
  }

  // Coba kode recovery (sekali pakai)
  if (recoveryCode.length >= 8) {
    const sec = await supabase.rpc("get_admin_security", { p_user_id: user.id });
    const secRow = Array.isArray(sec.data) ? sec.data[0] : sec.data;
    if (secRow?.recovery_codes_encrypted) {
      try {
        const codes: string[] = JSON.parse(decryptKey(secRow.recovery_codes_encrypted));
        const idx = codes.indexOf(recoveryCode);
        if (idx !== -1) {
          codes.splice(idx, 1);
          await supabase.rpc("save_admin_security", {
            p_user_id: user.id,
            p_secret_encrypted: row.totp_secret_encrypted,
            p_enabled: true,
            p_recovery_encrypted: (await import("@/lib/ai/keys")).encryptKey(JSON.stringify(codes)),
          });
          await clear2faPending();
          return NextResponse.json({ ok: true });
        }
      } catch {
        // kode rusak → jatuh ke error umum
      }
    }
  }

  return NextResponse.json({ error: "Kode salah. Coba lagi." }, { status: 400 });
}
