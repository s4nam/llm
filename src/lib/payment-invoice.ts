import type { SupabaseClient } from "@supabase/supabase-js";
import { sendInvoice } from "@/lib/email";

/**
 * Mengirim invoice pembayaran setelah `mark_payment_paid` berhasil.
 * Dipakai dari semua jalur sukses (webhook, status, cron) agar konsisten.
 *
 * - Mengambil email + nama dari `profiles`.
 * - `expiresAt` diambil dari `profiles.member_expires_at` (nilai sebenarnya
 *   setelah member diaktifkan), bukan hardcoded.
 * - Menyertakan tautan "Lihat Detail Pesanan" ke halaman status order.
 */
export async function sendPaymentInvoice(
  supabase: SupabaseClient,
  payment: {
    user_id: string;
    midtrans_order_id: string;
    amount: number;
    plan: string;
  },
): Promise<void> {
  const { data: userData } = await supabase
    .from("profiles")
    .select("email, full_name, member_expires_at")
    .eq("id", payment.user_id)
    .single();

  if (!userData?.email) return;

  const expiresAt = userData.member_expires_at
    ? new Date(userData.member_expires_at)
    : new Date(
        Date.now() +
          (payment.plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
      );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const detailUrl = `${appUrl}/langganan/status?order_id=${payment.midtrans_order_id}`;

  await sendInvoice(
    userData.email,
    userData.full_name,
    payment.midtrans_order_id,
    payment.amount,
    payment.plan,
    expiresAt,
    detailUrl,
  );
}
