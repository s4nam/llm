import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { encryptKey, decryptKey } from "@/lib/ai/keys";
import {
  generateSecret,
  verifyTotp,
  totpProvisioningUri,
  generateRecoveryCodes,
} from "@/lib/totp";

async function requireAdmin() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return null;
  return supabase;
}

async function loadSecurity(userId: string) {
  // via helper — gunakan createClient kembali? Kita butuh client.
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: raw } = await supabase.rpc("get_admin_security", {
    p_user_id: userId,
  });
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row ?? null;
}

export async function GET() {
  const supabase = await requireAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sec = await loadSecurity(user!.id);

  let enabled = false;
  let recoveryCodes: string[] = [];
  let secret = "";
  if (sec?.totp_secret_encrypted) {
    try {
      secret = decryptKey(sec.totp_secret_encrypted);
    } catch {
      secret = "";
    }
  }
  enabled = Boolean(sec?.totp_enabled && secret);
  if (sec?.recovery_codes_encrypted) {
    try {
      recoveryCodes = JSON.parse(decryptKey(sec.recovery_codes_encrypted));
    } catch {
      recoveryCodes = [];
    }
  }

  return NextResponse.json({
    enabled,
    hasRecovery: recoveryCodes.length > 0,
    provisioningUri: enabled ? "" : totpProvisioningUri(secret, user!.email ?? "admin"),
  });
}

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user!.id;

  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "setup") {
    // Generate secret baru + recovery codes, belum aktif (menunggu verify)
    const secret = generateSecret();
    const codes = generateRecoveryCodes();
    const { error } = await supabase.rpc("save_admin_security", {
      p_user_id: userId,
      p_secret_encrypted: encryptKey(secret),
      p_enabled: false,
      p_recovery_encrypted: encryptKey(JSON.stringify(codes)),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      secret,
      provisioningUri: totpProvisioningUri(secret, user!.email ?? "admin"),
      recoveryCodes: codes,
    });
  }

  if (action === "verify") {
    const token = String(body.token ?? "").trim();
    const sec = await loadSecurity(userId);
    if (!sec?.totp_secret_encrypted) {
      return NextResponse.json({ error: "Belum ada secret. Mulai setup dulu." }, { status: 400 });
    }
    let secret = "";
    try {
      secret = decryptKey(sec.totp_secret_encrypted);
    } catch {
      return NextResponse.json({ error: "Gagal membaca secret." }, { status: 500 });
    }
    if (!verifyTotp(secret, token)) {
      return NextResponse.json({ error: "Kode verifikasi salah." }, { status: 400 });
    }
    // Aktifkan
    await supabase.rpc("save_admin_security", {
      p_user_id: userId,
      p_secret_encrypted: sec.totp_secret_encrypted,
      p_enabled: true,
      p_recovery_encrypted: sec.recovery_codes_encrypted ?? "[]",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "verify-recovery") {
    const code = String(body.code ?? "").trim().toUpperCase();
    const sec = await loadSecurity(userId);
    if (!sec?.recovery_codes_encrypted) {
      return NextResponse.json({ error: "Tidak ada kode recovery." }, { status: 400 });
    }
    let codes: string[] = [];
    try {
      codes = JSON.parse(decryptKey(sec.recovery_codes_encrypted));
    } catch {
      return NextResponse.json({ error: "Gagal membaca kode." }, { status: 500 });
    }
    const idx = codes.indexOf(code);
    if (idx === -1) {
      return NextResponse.json({ error: "Kode recovery salah." }, { status: 400 });
    }
    // hapus kode yang dipakai (sekali pakai)
    codes.splice(idx, 1);
    await supabase.rpc("save_admin_security", {
      p_user_id: userId,
      p_secret_encrypted: sec.totp_secret_encrypted ?? "",
      p_enabled: sec.totp_enabled,
      p_recovery_encrypted: encryptKey(JSON.stringify(codes)),
    });
    return NextResponse.json({ ok: true, remaining: codes.length });
  }

  if (action === "disable") {
    // Verifikasi kode dulu sebelum menonaktifkan
    const token = String(body.token ?? "").trim();
    const sec = await loadSecurity(userId);
    if (!sec?.totp_secret_encrypted) {
      return NextResponse.json({ error: "2FA tidak aktif." }, { status: 400 });
    }
    let secret = "";
    try {
      secret = decryptKey(sec.totp_secret_encrypted);
    } catch {
      return NextResponse.json({ error: "Gagal membaca secret." }, { status: 500 });
    }
    if (!verifyTotp(secret, token)) {
      return NextResponse.json({ error: "Kode verifikasi salah." }, { status: 400 });
    }
    await supabase.rpc("save_admin_security", {
      p_user_id: userId,
      p_secret_encrypted: "",
      p_enabled: false,
      p_recovery_encrypted: "[]",
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
