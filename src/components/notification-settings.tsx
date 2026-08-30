"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationSettings() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection after mount
    setSupported(ok);
    if (!ok) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("Izin notifikasi ditolak. Aktifkan di pengaturan browser/HP.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        // Tanpa VAPID: hanya test local notification
        new Notification("englishmudah.id", { body: "Notifikasi diaktifkan (mode lokal)!", icon: "/icon-192.png" });
        setSubscribed(true);
        setMsg("Notifikasi lokal aktif. Untuk push server, admin perlu set VAPID key.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal simpan subscription");
      setSubscribed(true);
      setMsg("Notifikasi push aktif! Kamu akan dapat pengingat belajar.");
      // test langsung
      try {
        await fetch("/api/push/test", { method: "POST" });
      } catch {}
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setSubscribed(false);
      setMsg("Notifikasi dinonaktifkan.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const testPush = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal kirim test push");
      setMsg(`Test push terkirim (${data.sent} device). Cek notifikasi HP.`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (supported === null) return null;
  if (supported === false) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Notifikasi</h2>
        <p className="mt-1 text-sm text-slate-500">Browser/HP ini belum mendukung push notification.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Notifikasi Push 🔔</h2>
      <p className="mt-1 text-sm text-slate-500">Dapat pengingat streak, trial hampir habis, dan materi baru — bahkan saat browser tertutup.</p>

      {msg && (
        <p className={`mt-3 rounded-xl p-3 text-sm ${msg.includes("aktif") || msg.includes("terkirim") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {msg}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!subscribed ? (
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {busy ? "..." : permission === "denied" ? "Izin Ditolak — Cek Pengaturan" : "Aktifkan Notifikasi"}
          </button>
        ) : (
          <>
            <button onClick={testPush} disabled={busy} className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50">
              {busy ? "..." : "Kirim Test"}
            </button>
            <button
              onClick={disable}
              disabled={busy}
              className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Nonaktifkan
            </button>
            <span className="self-center text-xs text-emerald-600">● Aktif</span>
          </>
        )}
      </div>

      {permission === "denied" && (
        <p className="mt-3 text-xs text-slate-500">
          Kamu memblokir notifikasi. Buka 🔒 di address bar → Site settings → Notifications → Allow, lalu refresh.
        </p>
      )}
    </section>
  );
}
