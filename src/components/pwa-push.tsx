// Banner ringan — opsional. Untuk kontrol penuh pakai /profil → Notifikasi push.
// Komponen ini hanya tampil jika user belum subscribe & permission masih default.
// Dihide total jika sudah aktif atau ditolak agar tidak mengganggu UX.
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

const DISMISS_KEY = "pwa-push-dismissed-at";
const DISMISS_DAYS = 3;

function isDismissedRecently(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function PwaPush() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isDismissedRecently()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hide after mount check
      setHidden(true);
      return;
    }
    const ok = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection needs sync setState after mount
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
    if (ok) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(!!sub))
        .catch(() => {});
    }
  }, []);

  if (hidden || !supported) return null;
  if (permission === "denied") return null;
  if (permission === "granted" && subscribed) return null;
  if (permission !== "default") return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      let sub: PushSubscription | null = null;
      if (vapid) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      } else {
        new Notification("englishmudah.id", { body: "Notifikasi diaktifkan! Kamu akan dapat pengingat belajar.", icon: "/icon-192.png" });
        setSubscribed(true);
        return;
      }
      if (sub) {
        try {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
          });
        } catch {}
        setSubscribed(true);
        new Notification("englishmudah.id", { body: "Notifikasi diaktifkan!", icon: "/icon-192.png" });
      }
    } catch {
      // abaikan
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-[76px] z-40 p-3 sm:p-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg">🔔</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Aktifkan pengingat belajar</p>
          <p className="text-xs text-slate-600">Dapat notifikasi streak & materi baru</p>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="shrink-0 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50"
        >
          {loading ? "..." : "Aktifkan"}
        </button>
        <button onClick={dismiss} aria-label="Tutup" className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-amber-100">
          ✕
        </button>
      </div>
    </div>
  );
}
