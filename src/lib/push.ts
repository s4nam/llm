import * as webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@englishmudah.id";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function toWebPushSubscription(row: SubscriptionRow): webpush.PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

export async function sendPushToSubscription(row: SubscriptionRow, payload: PushPayload): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!ensureConfigured()) return { ok: false, error: "VAPID not configured" };
  const sub = toWebPushSubscription(row);
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
    return { ok: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    // 410 Gone = subscription expired, 404 = not found -> hapus dari DB
    if (e.statusCode === 410 || e.statusCode === 404) {
      return { ok: false, gone: true, error: e.message };
    }
    return { ok: false, error: e.message ?? String(err) };
  }
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };
  let sent = 0;
  let removed = 0;
  for (const row of subs as SubscriptionRow[]) {
    const res = await sendPushToSubscription(row, payload);
    if (res.ok) sent++;
    else if (res.gone) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      removed++;
    }
  }
  return { sent, removed };
}

export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;
  for (const uid of userIds) {
    const r = await sendPushToUser(supabase, uid, payload);
    sent += r.sent;
    removed += r.removed;
  }
  return { sent, removed };
}

export async function sendPushBroadcast(
  supabase: SupabaseClient,
  payload: PushPayload,
  filter?: (row: SubscriptionRow & { user_id: string }) => boolean
): Promise<{ sent: number; removed: number }> {
  const { data: rows } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth,user_id");
  const list = (rows ?? []) as (SubscriptionRow & { user_id: string })[];
  const filtered = filter ? list.filter(filter) : list;
  let sent = 0;
  let removed = 0;
  for (const row of filtered) {
    const res = await sendPushToSubscription(row, payload);
    if (res.ok) sent++;
    else if (res.gone) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      removed++;
    }
  }
  return { sent, removed };
}
