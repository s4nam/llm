import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Layanan belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(String(email), {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirm`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Selalu kembalikan sukses (anti user-enumeration)
  return NextResponse.json({ ok: true });
}
