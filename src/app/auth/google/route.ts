import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Layanan belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      { error: error?.message ?? "Terjadi kesalahan." },
      { status: 400 },
    );
  }

  return NextResponse.redirect(data.url);
}
