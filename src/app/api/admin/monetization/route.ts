import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 500 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "no client" }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "list-coupons") {
    const { data: coupons } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ coupons });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 500 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "no client" }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "save-pricing") {
    const monthly = Number(body.monthly);
    const yearly = Number(body.yearly);
    const trialHours = Number(body.trialHours);
    const graceHours = Number(body.graceHours);
    if (monthly <= 0 || yearly <= 0 || trialHours <= 0 || graceHours < 0) {
      return NextResponse.json({ error: "Nilai tidak valid." }, { status: 400 });
    }
    const { error } = await supabase.rpc("save_pricing", {
      p_monthly: monthly,
      p_yearly: yearly,
      p_trial_hours: trialHours,
      p_trial_grace_hours: graceHours,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "add-coupon") {
    const code = String(body.code ?? "").toUpperCase().trim();
    const type = body.type === "nominal" ? "nominal" : "percent";
    const value = Number(body.value);
    const maxUses = Number(body.maxUses) || 1;
    if (!code || value <= 0) {
      return NextResponse.json({ error: "Kode atau nilai tidak valid." }, { status: 400 });
    }
    const { error } = await supabase.from("coupons").insert({
      code,
      discount_type: type,
      discount_value: value,
      max_uses: maxUses,
      active: true,
    });
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kode kupon sudah ada." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "set-member") {
    const userId = String(body.userId ?? "");
    const days = Number(body.days);
    const note = String(body.note ?? "");
    if (!userId || days <= 0) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const { error } = await supabase.rpc("admin_set_member", {
      p_user_id: userId,
      p_days: days,
      p_note: note,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset-trial") {
    const userId = String(body.userId ?? "");
    if (!userId) {
      return NextResponse.json({ error: "User tidak valid." }, { status: 400 });
    }
    const { error } = await supabase.rpc("admin_reset_trial", { p_user_id: userId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
