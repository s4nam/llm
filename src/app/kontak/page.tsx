import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Kontak & Dukungan",
  description: "Hubungi englishmudah.id untuk bantuan",
};

export default function KontakPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        "Halo englishmudah.id, saya butuh bantuan.",
      )}`
    : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Kontak &amp; Dukungan
        </h1>
        <p className="mt-2 text-slate-600">
          Butuh bantuan dengan akun, pembayaran, atau materi? Kami siap
          membantu.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              WhatsApp
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Respon tercepat — hubungi kami lewat WhatsApp.
            </p>
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-xl bg-success px-6 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Chat WhatsApp
              </a>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Nomor WhatsApp akan tersedia setelah aplikasi diluncurkan.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Email</h2>
            <p className="mt-1 text-sm text-slate-500">
              Untuk pertanyaan formal atau permintaan data pribadi (UU PDP).
            </p>
            <p className="mt-3 font-medium text-brand">
              {process.env.NEXT_PUBLIC_APP_URL
                ? "admin@englishmudah.id"
                : "admin@englishmudah.id"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Pertanyaan umum
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kemungkinan pertanyaan Anda sudah terjawab di halaman FAQ.
            </p>
            <a
              href="/faq"
              className="mt-4 inline-block rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Buka FAQ
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
