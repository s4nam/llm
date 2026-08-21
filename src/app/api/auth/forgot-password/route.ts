import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  // Rate limit: cegah spam email / user-enumeration probe
  const limited = await rateLimit(`forgot-pwd:${clientIp(request)}`, { limit: 5, window: "60 s" });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const email = String(body.email ?? "");
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(email)) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Layanan belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Selalu kembalikan sukses (anti user-enumeration)
  return NextResponse.json({ ok: true });
}
