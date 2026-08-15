import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-6xl font-bold text-brand">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-slate-600">
          Halaman yang Anda cari mungkin sudah dipindahkan atau tidak tersedia.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
        >
          Kembali ke Beranda
        </Link>
      </main>
      <Footer />
    </>
  );
}
