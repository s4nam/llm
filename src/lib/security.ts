import { cookies } from "next/headers";

/**
 * Helper 2FA login untuk admin.
 *
 * Alur:
 * 1. Login password benar → jika admin TOTP aktif, set cookie `em_2fa_pending`.
 * 2. Redirect ke /masuk/2fa untuk memasukkan kode.
 * 3. Setelah kode TOTP/recovery valid → hapus cookie → sesi penuh.
 *
 * Selama cookie masih ada, akses /admin* diblokir (proxy + admin-guard).
 */

const COOKIE_NAME = "em_2fa_pending";
const MAX_AGE = 5 * 60; // 5 menit

export async function set2faPending() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clear2faPending() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function is2faPending(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === "1";
}
