import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Verifikasi Sertifikat",
  robots: { index: false },
};

export default async function VerifyCertificatePage({
  params,
}: PageProps<"/cek-sertifikat/[code]">) {
  const { code } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Layanan verifikasi belum aktif
          </h1>
        </main>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Terjadi kesalahan</h1>
        </main>
        <Footer />
      </>
    );
  }

  const { data: raw } = await supabase.rpc("get_certificate", {
    p_code: code.toUpperCase(),
  });
  const cert = Array.isArray(raw) ? raw[0] : raw;
  if (!cert) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
        <div className="rounded-3xl border-2 border-brand bg-white p-10 text-center shadow-sm">
          <p className="text-4xl">🏅</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Sertifikat Terverifikasi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sertifikat ini diterbitkan secara resmi oleh englishmudah.id.
          </p>
          <div className="mx-auto mt-6 max-w-sm border-y border-slate-100 py-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Diberikan kepada
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {cert.full_name}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
              Telah menyelesaikan Level
            </p>
            <p className="mt-1 text-3xl font-bold text-brand">
              {cert.level_code}
            </p>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Diterbitkan pada{" "}
            {new Date(cert.issued_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-2 font-mono text-xs text-slate-400">
            Kode: {cert.code}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
