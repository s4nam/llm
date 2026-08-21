import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
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

  const [statsRes, revenueRes, popularRes, businessRes] = await Promise.all([
    supabase.rpc("get_admin_stats"),
    supabase.rpc("get_revenue_daily"),
    supabase.rpc("get_popular_lessons", { p_limit: 10 }),
    supabase.rpc("get_business_report"),
  ]);

  return NextResponse.json({
    stats: statsRes.data,
    revenue: Array.isArray(revenueRes.data) ? revenueRes.data : [],
    popular: Array.isArray(popularRes.data) ? popularRes.data : [],
    business: businessRes.data,
  });
}
