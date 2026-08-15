import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { checkTransactionStatus } from "@/lib/midtrans";
import { sendTrialEnding, sendRenewalReminder } from "@/lib/email";

/**
 * Cron job (dipanggil Vercel Cron tiap 6 jam).
 * Tugas:
 *  1. Nonaktifkan member yang expired.
 *  2. Cek ulang pembayaran pending (webhook gagal) → mark paid.
 *  3. Kirim email pengingat trial H-1.
 *  4. Kirim email perpanjangan member H-3 & H-1.
 * Keamanan: memerlukan header X-Cron-Secret yang cocok dengan env.
 */

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // jika belum diset, hanya jalankan saat ada header (untuk dev)
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
          await supabase.rpc("mark_payment_paid", {
            p_order_id: p.midtrans_order_id,
            p_amount: p.amount,
            p_plan: p.plan,
            p_user_id: p.user_id,
            p_raw: real,
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
