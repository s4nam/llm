import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Jika Supabase belum dikonfigurasi (mis. fase development awal),
  // biarkan request lewat tanpa refresh sesi.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: isProd,
              path: "/",
            }),
          );
        },
      },
    },
  );

  // Baca sesi dari cookie tanpa network call selama akses token masih valid
  // (>90 detik dari kedaluwarsa). Jika sudah dekat kedaluwarsa, auth-js
  // otomatis refresh via refresh_token (network call) & menulis cookie baru,
  // sehingga pengguna tetap login.
  // Sebelumnya getUser() dipanggil untuk semua request — termasuk pengunjung
  // anonim tanpa sesi — sehingga 1 round-trip ke Supabase Auth per navigasi.
  await supabase.auth.getSession();

  return response;
}

export const config = {
  matcher: [
    /*
     * Jalankan di semua rute kecuali:
     * - api (route handler)
     * - _next/static (file statis)
     * - _next/image (optimasi gambar)
     * - favicon.ico, sitemap.xml, robots.txt (metadata)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
