import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import PushManager from "./push-manager";

export const dynamic = "force-dynamic";

export default async function NotifikasiPage() {
  await requireAdmin();

  const vapidConfigured = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

  return (
    <>
      <AdminHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Notifikasi Push 🔔</h1>
        <p className="mt-1 text-sm text-slate-600">Kirim push notification ke pengguna mobile app / PWA. Cron otomatis mengirim pengingat trial, renew & daily streak.</p>

        {!vapidConfigured && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">VAPID belum dikonfigurasi</p>
            <p className="mt-1">Push belum bisa dikirim. Generate key: <code className="rounded bg-white px-1 py-0.5">npx web-push generate-vapid-keys</code> lalu isi <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> & <code>VAPID_PRIVATE_KEY</code> di <code>.env.local</code> + Vercel env.</p>
          </div>
        )}

        {vapidConfigured && <p className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">● VAPID terkonfigurasi</p>}

        <PushManager />

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Cron otomatis</h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            <li>Trial H-1 → push ke user trial yang mau habis (bersamaan dengan email)</li>
            <li>Renew H-3 & H-1 → push ke member yang mau habis</li>
            <li>Daily reminder → push ke user yang belum belajar hari ini (bersamaan email streak)</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">Lihat hasil di Vercel Logs → /api/cron → {`{ trialPush, renewPush, reminderPush }`}</p>
        </div>
      </main>
    </>
  );
}
