import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const isProd = process.env.NODE_ENV === "production";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function createClient(): Promise<SupabaseClient | null> {
  const cookieStore = await cookies();

  if (!isSupabaseConfigured()) {
    return null;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: isProd,
                path: "/",
              }),
            );
          } catch {
            // Dipanggil dari Server Component — aman diabaikan.
            // Cookie akan disetel ulang di proxy.ts (refresh sesi).
          }
        },
      },
    },
  );
}
