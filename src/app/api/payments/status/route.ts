import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { checkTransactionStatus } from "@/lib/midtrans";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id diperlukan." }, { status: 400 });
  }

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

  // Ambil payment + pastikan milik user
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("midtrans_order_id", orderId)
    .single();
  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }

  // Jika sudah paid di DB, langsung kembalikan
  if (payment.status === "paid") {
    return NextResponse.json({ status: "paid" });
  }

  // Cek ke Midtrans (rekon)
  try {
    const real = await checkTransactionStatus(orderId);
    const txn = real.transaction_status;
    const isPaid = txn === "capture" || txn === "settlement";

    if (isPaid) {
      // Proses seperti webhook (via function yang sama)
      await supabase.rpc("mark_payment_paid", {
        p_order_id: orderId,
        p_amount: payment.amount,
        p_plan: payment.plan,
        p_user_id: payment.user_id,
        p_raw: real,
      });
      return NextResponse.json({ status: "paid" });
    }
    if (txn === "expire") {
      await supabase.rpc("mark_payment_expired", { p_order_id: orderId });
      return NextResponse.json({ status: "expired" });
    }
    return NextResponse.json({ status: payment.status ?? txn });
  } catch {
    return NextResponse.json({ status: payment.status ?? "pending" });
  }
}
