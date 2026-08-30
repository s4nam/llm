import Link from "next/link";

export const metadata = {
  title: "Offline — englishmudah.id",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 text-5xl">📡</div>
      <h1 className="text-2xl font-bold text-slate-900">Kamu sedang offline</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Sepertinya koneksi internet terputus. Beberapa halaman yang pernah kamu buka masih bisa dilihat. Coba lagi saat online.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Ke Beranda
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </div>
      <p className="mt-8 text-xs text-slate-400">Tip: Install aplikasi untuk akses lebih cepat saat sinyal lemah.</p>
    </div>
  );
}
