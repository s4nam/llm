import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  verifyWebhookSignature,
  checkTransactionStatus,
  refundTransaction,
} from "@/lib/midtrans";
import { sendInvoice } from "@/lib/email";

export async function POST(request: Request) {
  // Catat semua payload webhook untuk audit
  const rawText = await request.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ status: "error" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 500 });
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "no client" }, { status: 500 });
  }

  const orderId = String(payload.order_id ?? "");
  const statusCode = String(payload.status_code ?? "");
  const grossAmount = String(payload.gross_amount ?? "");
  const signatureKey = String(payload.signature_key ?? "");

  // Log semua webhook (termasuk yang gagal verifikasi)
  await supabase.from("payment_webhook_log").insert({
    order_id: orderId,
    event_type: String(payload.transaction_status ?? "unknown"),
    payload,
    processed: false,
  });

  // Verifikasi signature
  if (!verifyWebhookSignature(orderId, statusCode, grossAmount, signatureKey)) {
    // Bila signature tidak valid, lakukan cross-check status (extra safety)
    try {
      const real = await checkTransactionStatus(orderId);
      if (
        real.transaction_status !== payload.transaction_status ||
        real.status_code !== statusCode
      ) {
        return NextResponse.json({ error: "Signature invalid" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Signature invalid" }, { status: 400 });
    }
  }

  // Ambil payment dari DB
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("midtrans_order_id", orderId)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Order tidak dikenal" }, { status: 404 });
  }

  const transactionStatus = String(payload.transaction_status ?? "");
  const fraudStatus = String(payload.fraud_status ?? "");
  try {
    if (transactionStatus === "capture" || transactionStatus === "settlement") {
      // Acept atau chargeback risk → jika fraud status 'accept' atau 'settlement'
      const shouldAccept =
        fraudStatus === "accept" ||
        fraudStatus === "settlement" ||
        transactionStatus === "settlement";

      if (shouldAccept) {
        // Cek apakah order ini sudah pernah diproses (idempotensi)
        const { data: existingPaid } = await supabase
          .from("payments")
          .select("id, status")
          .eq("midtrans_order_id", orderId)
          .single();

        const alreadyProcessed = existingPaid?.status === "paid";

        if (!alreadyProcessed) {
          await supabase.rpc("mark_payment_paid", {
            p_order_id: orderId,
            p_amount: payment.amount,
            p_plan: payment.plan,
            p_user_id: payment.user_id,
            p_raw: payload,
          });
        }

        // DETEKSI PEMBAYARAN GANDA:
        // Jika user sudah member aktif DAN bayar lagi di waktu bersamaan,
        // refund otomatis untuk transaksi ini (kecuali itu perpanjangan sah).
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_member, member_expires_at")
          .eq("id", payment.user_id)
          .single();

        if (
          profile?.is_member &&
          profile.member_expires_at &&
          new Date(profile.member_expires_at).getTime() > Date.now() + 24 * 60 * 60 * 1000
        ) {
          // Member masih aktif lebih dari 24 jam ke depan → kemungkinan pembayaran ganda
          const refunded = await refundTransaction(orderId, payment.amount, "Pembayaran ganda");
          await supabase
            .from("payments")
            .update({ status: refunded ? "refunded" : "paid" })
            .eq("midtrans_order_id", orderId);
          await supabase.from("membership_log").insert({
            user_id: payment.user_id,
            action: "refund",
            detail: `Pembayaran ganda ${orderId} (refund ${refunded ? "otomatis" : "manual"})`,
          });
        } else {
          // Kirim invoice
          const { data: userData } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", payment.user_id)
            .single();
          if (userData) {
            await sendInvoice(
              userData.email,
              userData.full_name,
              orderId,
              payment.amount,
              payment.plan,
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            );
          }
        }
      } else if (fraudStatus === "challenge") {
        // Sengketa/challenge → nonaktifkan member sementara (SOP dispute)
        await supabase.from("dispute_log").insert({
          payment_id: payment.id,
          user_id: payment.user_id,
          status: "open",
          detail: `Fraud challenge untuk order ${orderId}`,
        });
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("midtrans_order_id", orderId);
      }
    } else if (transactionStatus === "expire") {
      await supabase.rpc("mark_payment_expired", { p_order_id: orderId });
    } else if (transactionStatus === "deny" || transactionStatus === "cancel") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("midtrans_order_id", orderId);
    }

    // Tandai log webhook diproses
    await supabase
      .from("payment_webhook_log")
      .update({ processed: true })
      .eq("order_id", orderId);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
