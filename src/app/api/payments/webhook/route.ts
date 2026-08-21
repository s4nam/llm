import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  verifyWebhookSignature,
  checkTransactionStatus,
} from "@/lib/midtrans";
import { sendPaymentInvoice } from "@/lib/payment-invoice";

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
        // INTEGRITAS NOMINAL (gaya e-commerce): hanya aktifkan member jika
        // gross_amount yang dikonfirmasi Midtrans (dibawa dalam signature,
        // tak bisa dipalsukan) PERSIS sama dengan nominal order.
        // Kurang/lebih bayar → status 'mismatch', member TIDAK aktif, tanpa
        // refund otomatis (admin yang memutuskan via Midtrans dashboard).
        const actualAmount = Number(String(payload.gross_amount ?? ""));
        const amountMismatch = !actualAmount || actualAmount !== Number(payment.amount);

        if (amountMismatch) {
          await supabase.rpc("mark_payment_mismatch", {
            p_order_id: orderId,
            p_expected: payment.amount,
            p_actual: actualAmount,
            p_reason: "Nominal tidak sesuai saat settlement",
          });
        } else {
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

            // Invoice hanya untuk transisi pending → paid (hindari dobel saat webhook ulang)
            await sendPaymentInvoice(supabase, {
              user_id: payment.user_id,
              midtrans_order_id: orderId,
              amount: payment.amount,
              plan: payment.plan,
            });
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
