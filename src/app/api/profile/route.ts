import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Nama minimal 2 karakter." }, { status: 400 });
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: name },
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "change-email") {
    const newEmail = String(body.email ?? "").trim();
    if (!EMAIL_RE.test(newEmail)) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "change-password") {
    const current = String(body.currentPassword ?? "");
    const next = String(body.newPassword ?? "");
    if (next.length < 8) {
      return NextResponse.json(
        { error: "Kata sandi baru minimal 8 karakter." },
        { status: 400 },
      );
    }
    // Verifikasi kata sandi saat ini
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: current,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "Kata sandi saat ini salah." },
        { status: 400 },
      );
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "export") {
    const { data } = await supabase.rpc("export_user_data", { p_user_id: user.id });
    if (!data) {
      return NextResponse.json({ error: "Gagal menyiapkan data." }, { status: 500 });
    }
    return NextResponse.json({ data });
  }

  if (action === "delete") {
    const { error } = await supabase.rpc("delete_account", { p_user_id: user.id });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
