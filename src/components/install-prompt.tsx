"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isDismissedRecently(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const t = Number(v);
    return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Jangan tampil jika sudah standalone (sudah terinstall)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS
      ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone) ||
      document.referrer.includes("android-app://");

    if (isStandalone) return;
    if (isDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const installedHandler = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!visible || !deferred) return null;

  const onInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
    } catch {
      // abaikan
    }
    setDeferred(null);
  };

  const onDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- icon statis, tidak perlu next/image */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install englishmudah.id</p>
          <p className="text-xs text-slate-500">Akses lebih cepat & bisa dibuka tanpa browser</p>
        </div>
        <button
          onClick={onInstall}
          className="shrink-0 rounded-full bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          aria-label="Tutup"
          className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
