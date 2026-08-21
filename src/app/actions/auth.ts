"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupErrors = {
  name?: string;
  email?: string;
  password?: string[];
};

export type SignupState = {
  errors?: SignupErrors;
  message?: string;
} | undefined;

function validate(
  name: string,
  email: string,
  password: string,
): SignupErrors | undefined {
  const errors: SignupErrors = {};
  if (!name || name.trim().length < 2) {
    errors.name = "Nama minimal 2 karakter.";
  }
  if (
    !email ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(
      email,
    )
  ) {
    errors.email = "Masukkan email yang valid.";
  }
  const pwdIssues: string[] = [];
  if (!password || password.length < 8) {
    pwdIssues.push("Minimal 8 karakter.");
  }
  if (!/[a-zA-Z]/.test(password ?? "")) {
    pwdIssues.push("Harus mengandung huruf.");
  }
  if (!/[0-9]/.test(password ?? "")) {
    pwdIssues.push("Harus mengandung angka.");
  }
  if (pwdIssues.length > 0) {
    errors.password = pwdIssues;
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("consent") === "on";
  const parentalConsent = formData.get("parentalConsent") === "on";

  const errors = validate(name, email, password);
  if (errors) return { errors };

  if (!consent) {
    return { errors: { name: "Harap centang persetujuan Syarat & Ketentuan." } };
  }
  if (!parentalConsent) {
    return {
      errors: {
        name: "Harap centang izin orang tua / pernyataan usia 17+.",
      },
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      message:
        "Layanan belum siap. Silakan hubungi admin (panduan di .env.example).",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { message: error.message };
  }

  // Jika email sudah terverifikasi (mis. sesi langsung aktif) → ke dashboard
  if (data.session) {
    redirect("/dashboard");
  }

  return {
    message:
      "Akun berhasil dibuat! Periksa email Anda untuk memverifikasi akun (berlaku 24 jam). Jika tidak muncul, cek folder spam.",
  };
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const supabase = await createClient();
  if (!supabase) {
    return { message: "Layanan belum siap. Silakan coba lagi nanti." };
  }
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) {
    return { message: "Gagal mengirim ulang: " + error.message };
  }
  return { message: "Email verifikasi telah dikirim ulang. Cek folder inbox/spam Anda." };
}

const EMAIL_RE =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

export async function changeEmailBeforeVerify(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const oldEmail = String(formData.get("oldEmail") ?? "").trim();
  const newEmail = String(formData.get("newEmail") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!EMAIL_RE.test(oldEmail) || !EMAIL_RE.test(newEmail)) {
    return { errors: { email: "Masukkan alamat email yang valid." } };
  }
  if (!password) {
    return { errors: { password: ["Masukkan kata sandi akun."] } };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { message: "Layanan belum siap. Silakan coba lagi nanti." };
  }

  const { data, error } = await supabase.rpc("change_email_unverified", {
    p_old_email: oldEmail,
    p_new_email: newEmail,
    p_password: password,
  });

  if (error) {
    return { message: "Gagal mengubah email: " + error.message };
  }

  const result = String(data ?? "");
  if (result === "OK") {
    await resendVerification(newEmail);
    return {
      message: `Email berhasil diubah ke ${newEmail}. Email verifikasi telah dikirim ulang — cek folder inbox/spam Anda.`,
    };
  }
  if (result === "WRONG_PASSWORD") {
    return {
      errors: {
        password: ["Kata sandi tidak cocok dengan akun tersebut."],
      },
    };
  }
  if (result === "NOT_FOUND") {
    return {
      errors: { email: "Akun dengan email tersebut tidak ditemukan." },
    };
  }
  if (result === "CONFIRMED") {
    return {
      errors: {
        email:
          "Akun dengan email tersebut sudah terverifikasi. Masuk dengan kata sandi Anda.",
      },
    };
  }
  if (result === "EMAIL_TAKEN") {
    return {
      errors: { email: "Alamat email tersebut sudah dipakai akun lain." },
    };
  }
  return { message: "Gagal mengubah email. Silakan coba lagi." };
}
