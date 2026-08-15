import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan Ketentuan penggunaan englishmudah.id",
};

export default function TosPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Syarat &amp; Ketentuan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Berlaku efektif sejak tanggal publikasi aplikasi.
        </p>

        <div className="mt-8 flex flex-col gap-6 leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Layanan</h2>
            <p className="mt-2">
              englishmudah.id adalah layanan kursus Bahasa Inggris online
              berbasis kecerdasan buatan (AI). Materi pembelajaran dihasilkan
              secara otomatis oleh AI dan dapat mengandung kekeliruan. Anda
              didorong untuk melaporkan kesalahan materi melalui tombol
              &ldquo;Laporkan masalah&rdquo; di dalam pelajaran.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              2. Akun &amp; Tanggung Jawab Pengguna
            </h2>
            <p className="mt-2">
              Anda bertanggung jawab menjaga kerahasiaan kata sandi akun Anda
              dan atas seluruh aktivitas yang terjadi pada akun Anda. Anda
              setuju memberikan informasi yang benar saat mendaftar.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              3. Langganan &amp; Pembayaran
            </h2>
            <p className="mt-2">
              Layanan menawarkan paket berlangganan bulanan dan tahunan.
              Pembayaran diproses melalui Midtrans. Masa trial gratis 3 hari
              hanya dapat digunakan satu kali per orang.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              4. Kebijakan Refund
            </h2>
            <p className="mt-2">
              Seluruh pembayaran berlangganan bersifat final dan{" "}
              <strong>tidak dapat dikembalikan (no refund)</strong>, kecuali
              diwajibkan oleh hukum yang berlaku.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              5. Kekayaan Intelektual
            </h2>
            <p className="mt-2">
              Seluruh materi, desain, dan konten aplikasi dilindungi hak
              kekayaan intelektual dan tidak boleh disalin atau
              didistribusikan tanpa izin.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              6. Batasan Tanggung Jawab
            </h2>
            <p className="mt-2">
              englishmudah.id tidak menjamin hasil belajar tertentu. Layanan
              diberikan &ldquo;sebagaimana adanya&rdquo; (as is). Kami tidak
              bertanggung jawab atas kerugian tidak langsung akibat
              penggunaan layanan.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
