/**
 * Pengiriman email via Resend.
 * 4 template: verifikasi+selamat datang, H-1 trial, perpanjangan, invoice.
 */
const RESEND_URL = "https://api.resend.com/emails";

function getApiKey(): string {
  return process.env.RESEND_API_KEY ?? "";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function from(): string {
  return `${process.env.RESEND_FROM_NAME ?? "englishmudah.id"} <${process.env.RESEND_FROM_EMAIL ?? "admin@englishmudah.id"}>`;
}

function baseLayout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b;background:#f8fafc">
    <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
      <div style="font-size:20px;font-weight:bold;color:#2563eb">
        english<span style="color:#1d4ed8">mudah</span>
      </div>
      <h2 style="margin:20px 0 8px;color:#0f172a">${title}</h2>
      <div style="line-height:1.7">${bodyHtml}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="font-size:12px;color:#64748b;margin:0">
        englishmudah.id — Belajar English jadi mudah.<br/>
        Jika ada pertanyaan, balas email ini atau hubungi kami lewat WhatsApp.
      </p>
    </div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  if (!isEmailConfigured()) return { ok: false as const };
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ from: from(), to, subject, html }),
  });
  if (!res.ok) return { ok: false as const };
  return { ok: true as const };
}

/** Email 1 — selamat datang + verifikasi sudah ditangani Supabase; ini email lanjutan. */
export async function sendWelcome(email: string, name: string): Promise<void> {
  await send(
    email,
    "Selamat datang di englishmudah.id! 🎉",
    baseLayout(
      "Selamat datang, " + name + "!",
      `<p>Terima kasih sudah bergabung dengan englishmudah.id.</p>
       <p>Langkah berikutnya:</p>
       <ol>
         <li>Kerjakan <b>tes penempatan</b> untuk tahu levelmu (A1–C2).</li>
         <li>Mulai <b>3 pelajaran gratis</b>.</li>
         <li>Kapan pun siap, aktifkan <b>trial 3 hari</b> untuk akses penuh.</li>
       </ol>
       <p>Selamat belajar! 🚀</p>`,
    ),
  );
}

/** Email 2 — H-1 trial akan habis. */
export async function sendTrialEnding(
  email: string,
  name: string,
  expiresAt: Date,
): Promise<void> {
  await send(
    email,
    "Masa trialmu hampir habis ⏳",
    baseLayout(
      "Trial hampir berakhir",
      `<p>Halo ${name},</p>
       <p>Trial 3 hari akses penuhmu akan berakhir pada <b>${expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</b>.</p>
       <p>Lanjutkan langganan agar akses ke semua materi dan sertifikat tetap aktif. Progress belajarmu aman dan tidak akan hilang.</p>
       <p>Jika sudah membayar, abaikan email ini.</p>`,
    ),
  );
}

/** Email 3 — H-3 & H-1 sebelum member berakhir (perpanjangan). */
export async function sendRenewalReminder(
  email: string,
  name: string,
  expiresAt: Date,
  link: string,
): Promise<void> {
  await send(
    email,
    "Segera perpanjang langgananmu 📅",
    baseLayout(
      "Langganan akan berakhir",
      `<p>Halo ${name},</p>
       <p>Masa keanggotaanmu akan berakhir pada <b>${expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</b>.</p>
       <p>Perpanjang sekarang agar tidak kehilangan akses materi:</p>
       <p><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-block">Perpanjang Langganan</a></p>
       <p>Progress dan sertifikatmu tetap tersimpan.</p>`,
    ),
  );
}

/** Email 4 — invoice setelah pembayaran. */
export async function sendInvoice(
  email: string,
  name: string,
  orderId: string,
  amount: number,
  plan: string,
  expiresAt: Date,
): Promise<void> {
  const planLabel = plan === "yearly" ? "Tahunan (365 hari)" : "Bulanan (30 hari)";
  await send(
    email,
    `Invoice Pembayaran #${orderId} 🧾`,
    baseLayout(
      "Pembayaran berhasil!",
      `<p>Halo ${name},</p>
       <p>Terima kasih! Pembayaran Anda telah kami terima.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0">
         <tr><td style="padding:6px 0;color:#64748b">No. Order</td><td style="text-align:right;font-weight:bold">${orderId}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Paket</td><td style="text-align:right">${planLabel}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Total</td><td style="text-align:right;font-weight:bold">Rp ${amount.toLocaleString("id-ID")}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Aktif sampai</td><td style="text-align:right">${expiresAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
       </table>
       <p>Selamat belajar! 🎉</p>`,
    ),
  );
}
