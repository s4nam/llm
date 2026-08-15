import crypto from "crypto";

/**
 * Integrasi Midtrans (Snap).
 * - Server key dipakai untuk API backend (create transaksi, status, refund).
 * - Client key dipakai di frontend untuk menampilkan Snap.
 * Semua kunci dari environment variable.
 */

function getBaseUrl(): string {
  const isProduction =
    process.env.MIDTRANS_IS_PRODUCTION === "true";
  return isProduction
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function getServerKey(): string {
  return process.env.MIDTRANS_SERVER_KEY ?? "";
}

export function getClientKey(): string {
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
}

export function isMidtransConfigured(): boolean {
  return Boolean(getServerKey() && getClientKey());
}

function authHeader(): string {
  return "Basic " + Buffer.from(getServerKey() + ":").toString("base64");
}

export interface MidtransTransaction {
  order_id: string;
  gross_amount: number;
  plan: "monthly" | "yearly";
  user_id: string;
}

/** Buat transaksi Snap — mengembalikan snap_token. */
export async function createSnapTransaction(
  tx: MidtransTransaction,
): Promise<{ snapToken: string; snapUrl: string }> {
  const res = await fetch(`${getBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: tx.order_id,
        gross_amount: tx.gross_amount,
      },
      item_details: [
        {
          id: `plan-${tx.plan}`,
          price: tx.gross_amount,
          quantity: 1,
          name:
            tx.plan === "yearly"
              ? "Langganan Tahunan englishmudah.id"
              : "Langganan Bulanan englishmudah.id",
        },
      ],
      customer_details: {
        id: tx.user_id,
      },
      credit_card: { secure: true },
      // user akan kembali ke halaman status
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/langganan/status`,
        error: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/langganan/status`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/langganan/status`,
      },
      expiry: {
        start_time: new Date(Date.now() + 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "+07:00"),
        unit: "minutes",
        duration: 120, // 2 jam
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans create ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    snapToken: data.token,
    snapUrl: data.redirect_url,
  };
}

/**
 * Verifikasi signature webhook Midtrans.
 * Signature = sha512(order_id + status_code + gross_amount + server_key)
 */
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + getServerKey())
    .digest("hex");
  return expected === signature;
}

/** Cek status transaksi di Midtrans. */
export async function checkTransactionStatus(
  orderId: string,
): Promise<{
  transaction_status: string;
  fraud_status?: string;
  status_code: string;
}> {
  const res = await fetch(`${getBaseUrl()}/transactions/${orderId}/status`, {
    method: "GET",
    headers: { Authorization: authHeader(), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Midtrans status ${res.status}`);
  }
  return res.json();
}

/** Refund transaksi (jika channel mendukung). */
export async function refundTransaction(
  orderId: string,
  amount: number,
  reason = "Pembayaran ganda / koreksi",
): Promise<boolean> {
  const res = await fetch(`${getBaseUrl()}/transactions/${orderId}/refund`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ amount, reason }),
  });
  if (!res.ok) {
    // channel tidak mendukung refund otomatis
    return false;
  }
  return true;
}
