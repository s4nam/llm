"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message?: string } | undefined;

export async function login(
  prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  if (!supabase) {
    return { message: "Layanan belum siap. Silakan coba lagi nanti." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

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

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
