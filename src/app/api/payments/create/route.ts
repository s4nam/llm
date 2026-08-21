import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { createSnapTransaction, isMidtransConfigured } from "@/lib/midtrans";
import { formatRupiah } from "@/lib/brand";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

const ORDER_ID_PREFIX = "EM";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
  if (!isMidtransConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran belum dikonfigurasi oleh admin." },
      { status: 503 },
    );
  }

  // Rate limit: cegah spam buat transaksi
  const limited = await rateLimit(`pay-create:${clientIp(request)}`, { limit: 20, window: "60 s" });
  if (limited) return limited;

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

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const plan = body.plan as "monthly" | "yearly";
  const couponCode = String(body.couponCode ?? "").trim();

  if (!["monthly", "yearly"].includes(plan)) {
    return NextResponse.json({ error: "Paket tidak valid." }, { status: 400 });
  }

  // Ambil harga
  const { data: pricingRaw } = await supabase.rpc("get_pricing");
  const pricing = Array.isArray(pricingRaw) ? pricingRaw[0] : pricingRaw;
  const basePrice = plan === "yearly" ? pricing?.yearly_price ?? 490000 : pricing?.monthly_price ?? 49000;

  let amount = basePrice;
  let discountLabel = "";

  // Terapkan kupon jika ada
  if (couponCode) {
    const { data: couponRaw } = await supabase.rpc("get_coupon", {
      p_code: couponCode,
    });
    const coupon = Array.isArray(couponRaw) ? couponRaw[0] : couponRaw;
    if (!coupon || !coupon.active || (coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
      return NextResponse.json({ error: "Kupon tidak valid atau kedaluwarsa." }, { status: 400 });
    }
    // Cek belum pernah dipakai akun ini (hanya pesanan yang benar-benar lunas)
    const { data: existing } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("coupon_code", couponCode.toUpperCase())
      .eq("status", "paid")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Kupon ini sudah pernah digunakan." }, { status: 400 });
    }
    // Cek kuota total pemakaian (max_uses) — hanya menghitung pesanan lunas
    const { data: usage } = await supabase.rpc("get_coupon_usage", {
      p_code: couponCode,
    });
    if ((usage ?? 0) >= coupon.max_uses) {
      return NextResponse.json({ error: "Kuota pemakaian kupon sudah habis." }, { status: 400 });
    }

    if (coupon.discount_type === "percent") {
      const discount = Math.round((basePrice * coupon.discount_value) / 100);
      amount = Math.max(0, basePrice - discount);
      discountLabel = `-${coupon.discount_value}%`;
    } else {
      amount = Math.max(0, basePrice - coupon.discount_value);
      discountLabel = `-${formatRupiah(coupon.discount_value)}`;
    }
  }

  // Jaga integritas: nominal harus wajar (mencegah diskon 100% → Rp 0)
  if (amount <= 0) {
    return NextResponse.json({ error: "Nominal tidak valid. Periksa diskon kupon." }, { status: 400 });
  }

  const orderId = `${ORDER_ID_PREFIX}${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Simpan order pending
  const { error: insertError } = await supabase.from("payments").insert({
    user_id: user.id,
    midtrans_order_id: orderId,
    amount,
    plan,
    status: "pending",
    coupon_code: couponCode.toUpperCase() || null,
    base_price: basePrice,
    discount_amount: Math.max(0, basePrice - amount),
    raw: { coupon: couponCode.toUpperCase() || null, base_price: basePrice, discount: discountLabel },
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const snap = await createSnapTransaction({
      order_id: orderId,
      gross_amount: amount,
      plan,
      user_id: user.id,
    });
    return NextResponse.json({ snapToken: snap.snapToken, orderId });
  } catch (err) {
    // Gagal buat transaksi → tandai failed
    await supabase.rpc("mark_payment_expired", { p_order_id: orderId });
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 502 },
    );
  }
}
