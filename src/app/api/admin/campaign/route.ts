import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.rpc("get_campaign_detail", {
      p_code: code,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ detail: Array.isArray(data) ? data : [] });
  }

  const { data, error } = await supabase.rpc("get_campaign_report");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: Array.isArray(data) ? data : [] });
}
