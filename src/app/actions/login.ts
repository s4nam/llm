"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { loginRateLimit, clientIp } from "@/lib/ratelimit";
import { set2faPending } from "@/lib/security";

export type LoginState = { message?: string } | undefined;

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const headerList = await headers();
  const ip = clientIp(headerList);

  const supabase = await createClient();
  if (!supabase) {
    return { message: "Layanan belum siap. Silakan coba lagi nanti." };
  }

  // Anti brute-force: lapisan 1 (Upstash/memory rate limit)
  const limited = await loginRateLimit(email, ip);
  if (limited) {
    return { message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." };
  }

  // Anti brute-force: lapisan 2 (database login_attempts)
  try {
    const { data: locked } = await supabase.rpc("is_login_locked", {
      p_email: email,
      p_ip: ip,
    });
    if (locked) {
      return { message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." };
    }
  } catch {
    // RPC belum ada (migration 012 belum jalan) → lanjut tanpa cek DB
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Catat percobaan (best-effort)
  try {
    await supabase.rpc("record_login_attempt", {
      p_email: email,
      p_ip: ip,
      p_success: !error,
    });
  } catch {
    // abaikan — log tidak menghalangi login
  }

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    // Kasus umum dengan pesan yang membantu:
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return {
        message:
          "Email Anda belum diverifikasi. Cek inbox/spam Anda dan klik tautan verifikasi dari Supabase. Jika tautan kedaluwarsa, daftar ulang atau hubungi kami.",
      };
    }
    if (
      msg.includes("invalid login credentials") ||
      msg.includes("invalid credentials") ||
      msg.includes("password") ||
      msg.includes("email")
    ) {
      // Aman untuk ditampilkan — tidak membocorkan informasi spesifik.
      return { message: "Email atau kata sandi salah. Periksa kembali." };
    }
    // Pesan lain dari Supabase (mis. rate limit) — tampilkan supaya jelas.
    return { message: error.message };
  }

  // 2FA: jika admin dengan TOTP aktif → redirect ke halaman verifikasi 2FA
  if (data.user) {
    try {
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) {
        const { data: sec } = await supabase.rpc("get_admin_security", {
          p_user_id: data.user.id,
        });
        const row = Array.isArray(sec) ? sec[0] : sec;
        if (row?.totp_enabled) {
          // Simpan flag sesi sementara → redirect ke verifikasi 2FA
          await set2faPending();
          redirect("/masuk/2fa");
        }
      }
    } catch {
      // RPC 2FA belum tersedia → lanjut login normal
    }
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
