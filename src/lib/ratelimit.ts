import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}` | `${number}${"ms" | "s" | "m" | "h" | "d"}`;

/**
 * Rate limiting untuk API & aksi login.
 *
 * Prioritas:
 * 1. Upstash Ratelimit — jika UPSTASH_REDIS_REST_URL + TOKEN terisi.
 * 2. Fallback in-memory sederhana — jika env kosong (dev lokal).
 *    Catatan: fallback per-instance server, cukup untuk pengembangan.
 *
 * Setiap helper mengembalikan `NextResponse | null`:
 * - null → izinkan lanjut.
 * - NextResponse → tolak (429).
 */

const isUpstashConfigured = () =>
  Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );

const ratelimitCache: Record<string, Ratelimit> = {};

function getRatelimit(limit: number, window: Duration): Ratelimit {
  const key = `${limit}:${window}`;
  if (!ratelimitCache[key]) {
    const redis = Redis.fromEnv();
    ratelimitCache[key] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      analytics: true,
    });
  }
  return ratelimitCache[key];
}

/** Fallback in-memory sederhana (per instance server). */
const memoryStore: Record<string, { count: number; resetAt: number }> = {};

function checkMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memoryStore[key];
  if (!entry || entry.resetAt < now) {
    memoryStore[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
}

async function check(
  identifier: string,
  limit: number,
  window: Duration,
  windowMs: number,
): Promise<RateLimitResult> {
  if (isUpstashConfigured()) {
    try {
      const rl = getRatelimit(limit, window);
      const { success, reset } = await rl.limit(identifier);
      return success
        ? { ok: true }
        : { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
    } catch {
      // jika Upstash error, lanjut ke fallback agar tidak memblokir app
    }
  }
  const ok = checkMemory(identifier, limit, windowMs);
  return { ok };
}

/** Rate limit umum untuk API. Gunakan di awal route handler. */
export async function rateLimit(
  identifier: string,
  opts?: { limit?: number; window?: Duration },
): Promise<NextResponse | null> {
  const limit = opts?.limit ?? 60;
  const window: Duration = opts?.window ?? "60 s";
  const windowMs = 60_000;
  const r = await check(identifier, limit, window, windowMs);
  if (r.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi nanti." },
    { status: 429, headers: { "Retry-After": String(r.retryAfterSeconds ?? 60) } },
  );
}

/** Rate limit untuk aksi login (lebih ketat). */
export async function loginRateLimit(
  email: string,
  ip: string,
): Promise<NextResponse | null> {
  // 10 percobaan / 15 menit per email, 20 / 15 menit per IP
  const byEmail = await check(`login:email:${email.toLowerCase()}`, 10, "15 m", 15 * 60_000);
  const byIp = await check(`login:ip:${ip}`, 20, "15 m", 15 * 60_000);
  if (byEmail.ok && byIp.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
    { status: 429 },
  );
}

/** Ambil IP dari header (dengan dukungan proxy/header standar). */
export function clientIp(headersLike: Headers | Request): string {
  const headersObj =
    headersLike instanceof Headers ? headersLike : headersLike.headers;
  const fwd = headersObj.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headersObj.get("x-real-ip") ?? "unknown";
}
