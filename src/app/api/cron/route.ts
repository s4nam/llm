import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { checkTransactionStatus } from "@/lib/midtrans";
import { sendPaymentInvoice } from "@/lib/payment-invoice";
import { sendTrialEnding, sendRenewalReminder } from "@/lib/email";

/**
 * Cron job (dipanggil Vercel Cron tiap 6 jam).
 * Tugas:
 *  1. Bersihkan log: login_attempts (24 jam), lesson_opens (30 hari),
 *     ai_usage_log (90 hari) — hemat storage.
 *  2. Nonaktifkan member yang expired.
 *  3. Cek ulang pembayaran pending (webhook gagal) → mark paid.
 *  4. Kirim email pengingat trial H-1.
 *  5. Kirim email perpanjangan member H-3 & H-1.
 * Keamanan: memerlukan header X-Cron-Secret yang cocok dengan env.
 */

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail-closed: tanpa CRON_SECRET, endpoint tidak bisa dipanggil publik.
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "unconfigured" }, { status: 500 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "no client" }, { status: 500 });
  }

  const results: Record<string, number> = {
    expired: 0,
    recovered: 0,
    trialEmails: 0,
    renewEmails: 0,
  };

  try {
    // 0. Bersihkan log login lama (anti brute-force, hemat storage)
    await supabase.rpc("purge_login_attempts");

    // 0a. Bersihkan log akses pelajaran (30 hari) & pemakaian AI (90 hari)
    await supabase.rpc("purge_lesson_opens", { p_days: 30 });
    await supabase.rpc("purge_ai_usage_log", { p_days: 90 });

    // 1. Expire members
    await supabase.rpc("expire_members");

    // 2. Cek pembayaran pending yang sudah lewat 15 menit (webhook gagal)
    const { data: pending } = await supabase
      .from("payments")
      .select("*")
      .eq("status", "pending");
    for (const p of pending ?? []) {
      const created = new Date(p.created_at).getTime();
      if (Date.now() - created < 15 * 60 * 1000) continue;
      try {
        const real = await checkTransactionStatus(p.midtrans_order_id);
        if (real.transaction_status === "settlement" || real.transaction_status === "capture") {
          // Integritas nominal: hanya aktifkan jika gross_amount persis sesuai
          const actual = Number(String(real.gross_amount ?? ""));
          if (!actual || actual !== Number(p.amount)) {
            await supabase.rpc("mark_payment_mismatch", {
              p_order_id: p.midtrans_order_id,
              p_expected: p.amount,
              p_actual: actual,
              p_reason: "Nominal tidak sesuai saat pemulihan pending",
            });
            continue;
          }
          await supabase.rpc("mark_payment_paid", {
            p_order_id: p.midtrans_order_id,
            p_amount: p.amount,
            p_plan: p.plan,
            p_user_id: p.user_id,
            p_raw: real,
          });
          // Invoice (jalur webhook bisa terlewat) — hanya dikirim di transisi ini
          await sendPaymentInvoice(supabase, {
            user_id: p.user_id,
            midtrans_order_id: p.midtrans_order_id,
            amount: p.amount,
            plan: p.plan,
          });
          results.recovered++;
        } else if (real.transaction_status === "expire") {
          await supabase.rpc("mark_payment_expired", {
            p_order_id: p.midtrans_order_id,
          });
        }
      } catch {
        // abaikan
      }
    }

    // 3. Email pengingat trial H-1 (24 jam sebelum expired)
    const { data: trialUsers } = await supabase
      .from("profiles")
      .select("id, email, full_name, trial_expires_at")
      .eq("trial_used", true)
      .not("trial_expires_at", "is", null);
    for (const u of trialUsers ?? []) {
      const expire = new Date(u.trial_expires_at).getTime();
      const diff = expire - Date.now();
      const hoursLeft = diff / (60 * 60 * 1000);
      if (hoursLeft > 6 && hoursLeft <= 30) {
        // kirim sekali (dalam rentang ~1 hari, wajar terkirim sekali per siklus 6 jam)
        await sendTrialEnding(u.email, u.full_name, new Date(expire));
        results.trialEmails++;
      }
    }

    // 4. Email perpanjangan member H-3 & H-1 (dalam 24-72 jam)
    const { data: members } = await supabase
      .from("profiles")
      .select("id, email, full_name, member_expires_at")
      .eq("is_member", true)
      .not("member_expires_at", "is", null);
    for (const m of members ?? []) {
      const expire = new Date(m.member_expires_at).getTime();
      const hoursLeft = (expire - Date.now()) / (60 * 60 * 1000);
      if (hoursLeft > 0 && hoursLeft <= 72) {
        const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/langganan`;
        await sendRenewalReminder(m.email, m.full_name, new Date(expire), link);
        results.renewEmails++;
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
