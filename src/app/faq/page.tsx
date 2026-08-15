import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "FAQ — Pertanyaan yang Sering Diajukan",
  description: "Pertanyaan umum tentang englishmudah.id",
};

const faqs = [
  {
    q: "Apakah 3 pelajaran gratis benar-benar gratis?",
    a: "Ya, sepenuhnya gratis dan tanpa perlu mendaftar. Anda bisa langsung membuka pelajaran pertama dan belajar.",
  },
  {
    q: "Bagaimana cara kerja trial 3 hari?",
    a: "Setelah mendaftar, Anda bisa mengklik 'Mulai Trial'. Anda mendapatkan akses penuh selama 72 jam. Trial hanya dapat digunakan satu kali per orang.",
  },
  {
    q: "Bagaimana cara membayar langganan?",
    a: "Pembayaran dilakukan melalui Midtrans dengan metode QRIS, transfer bank (virtual account), atau e-wallet seperti GoPay, OVO, DANA, dan ShopeePay.",
  },
  {
    q: "Apakah saya bisa membatalkan langganan?",
    a: "Langganan diperpanjang secara manual — Anda hanya membayar saat ingin melanjutkan. Tanpa pembayaran, akses otomatis terkunci dan progress belajar Anda tetap tersimpan.",
  },
  {
    q: "Bagaimana jika saya lupa kata sandi?",
    a: "Gunakan tautan 'Lupa kata sandi' di halaman Masuk. Kami kirim tautan atur ulang ke email Anda.",
  },
  {
    q: "Level mana yang cocok untuk saya?",
    a: "Anda bisa mengerjakan tes penempatan singkat saat mendaftar, atau memilih level secara manual. Level tersedia dari A1 (pemula) sampai C2 (lancar).",
  },
];

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Pertanyaan yang Sering Diajukan
        </h1>
        <div className="mt-8 flex flex-col gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="font-semibold text-slate-900">{faq.q}</h2>
              <p className="mt-2 leading-7 text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
