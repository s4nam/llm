import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan Privasi englishmudah.id",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Kebijakan Privasi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Berlaku efektif sejak tanggal publikasi aplikasi.
        </p>

        <div className="mt-8 flex flex-col gap-6 leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              1. Data yang Kami Kumpulkan
            </h2>
            <p className="mt-2">
              Kami mengumpulkan data yang Anda berikan saat mendaftar (nama,
              email) dan data penggunaan layanan (progress belajar, skor
              kuis). Untuk anak di bawah 17 tahun, kami memerlukan izin orang
              tua/wali sebagai syarat pendaftaran, sesuai Undang-Undang
              Perlindungan Data Pribadi (UU PDP).
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              2. Penggunaan Data
            </h2>
            <p className="mt-2">
              Data digunakan untuk: menyediakan dan meningkatkan layanan
              belajar, memproses pembayaran, mengirim notifikasi penting
              (verifikasi, tagihan, perpanjangan), serta keperluan keamanan.
              Kami tidak menjual data pribadi Anda.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              3. Cookie &amp; Pelacakan
            </h2>
            <p className="mt-2">
              Kami menggunakan cookie untuk fungsi dasar dan — jika Anda
              mengizinkan — untuk iklan dan analitik. Anda dapat menolak
              cookie iklan; layanan tetap dapat digunakan.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              4. Hak Anda
            </h2>
            <p className="mt-2">
              Anda berhak: mengakses data, mengunduh salinan data pribadi
              (format JSON), mengoreksi data, dan menghapus akun beserta
              datanya. Gunakan menu profil atau hubungi kami melalui
              WhatsApp.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              5. Keamanan
            </h2>
            <p className="mt-2">
              Data disimpan dengan enkripsi, akses dibatasi (Row Level
              Security), dan dicadangkan secara rutin. Namun, tidak ada
              metode penyimpanan online yang 100% aman.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              6. Kontak
            </h2>
            <p className="mt-2">
              Untuk pertanyaan atau permintaan data, hubungi kami melalui
              WhatsApp atau email dukungan yang tercantum di aplikasi.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
