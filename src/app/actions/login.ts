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
    // Jangan bocorkan apakah email/password salah untuk alasan keamanan
    return { message: "Email atau kata sandi salah." };
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
