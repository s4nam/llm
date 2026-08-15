import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";

export const metadata: Metadata = {
  title: "Panduan Admin",
  robots: { index: false },
};

const guides = [
  {
    section: "1. Membuat Materi Baru",
    steps: [
      "Buka menu 'Materi'.",
      "Pilih Level (A1–C2) dan Kategori (Vocabulary, Grammar, dll).",
      "Tulis topik pelajaran (misal: 'Daily Routines').",
      "Klik 'Generate Materi (AI)'. Tunggu beberapa detik.",
      "Materi muncul sebagai DRAFT di 'Daftar Materi'.",
      "Buka draft → baca pratinjau → jika bagus klik 'Setujui & Tampilkan'.",
      "Jika kurang bagus, klik 'Regenerate' untuk membuat ulang, atau 'Tolak'.",
    ],
    tip: "Materi yang sudah disetujui langsung muncul di aplikasi untuk siswa. Selalu cek hasil AI sebelum disetujui.",
  },
  {
    section: "2. Mengatur Harga & Kupon",
    steps: [
      "Buka menu 'Monetisasi'.",
      "Atur harga bulanan & tahunan, lalu 'Simpan Harga'.",
      "Untuk kupon: isi kode, jenis (persen/nominal), nilai, lalu 'Buat'.",
      "Kupon aktif otomatis tersedia di halaman langganan siswa.",
    ],
    tip: "Harga default: Rp 49.000/bulan dan Rp 490.000/tahun. Kupon hanya bisa dipakai 1x per akun.",
  },
  {
    section: "3. Kelola Member",
    steps: [
      "Buka menu 'Monetisasi' → bagian 'Kelola Member'.",
      "Lihat status setiap pengguna (Free / Trial / Member).",
      "Untuk perpanjangan manual (kompensasi): klik '+30 hari' atau '+1 tahun'.",
      "Untuk memberi trial lagi (koreksi): klik 'Reset trial'.",
    ],
    tip: "Semua perubahan tercatat di riwayat. Member yang kedaluwarsa otomatis dinonaktifkan oleh sistem.",
  },
  {
    section: "4. Tangani Laporan Masalah",
    steps: [
      "Jika ada laporan, muncul pemberitahuan di Dashboard Admin.",
      "Buka menu 'Laporan' untuk melihat detail keluhan.",
      "Buka pelajaran terkait → klik 'Regenerate' untuk memperbaiki materi.",
      "Kembali ke Laporan → klik 'Tandai Selesai'.",
    ],
    tip: "Materi dihasilkan AI, jadi kadang ada kekeliruan. Laporan siswa adalah cara terbaik untuk memperbaiki kualitas.",
  },
  {
    section: "5. Aktifkan Keamanan 2FA",
    steps: [
      "Buka menu 'Keamanan'.",
      "Klik 'Aktifkan 2FA' → pindai QR dengan aplikasi Google Authenticator.",
      "Masukkan kode 6 digit untuk konfirmasi.",
      "Simpan 10 kode cadangan di tempat aman.",
    ],
    tip: "Kode cadangan hanya muncul sekali. Jika ponsel hilang, kode cadangan satu-satunya jalan masuk.",
  },
  {
    section: "6. Pantau Biaya AI",
    steps: [
      "Buka menu 'Monitoring' untuk melihat pemakaian token & estimasi biaya.",
      "Atur alarm budget di 'Pengaturan AI' agar diingatkan saat biaya melebihi batas.",
    ],
    tip: "Materi digenerate sekali lalu disimpan. Biaya per pelajaran sekitar Rp 10–500 tergantung model.",
  },
];

export default async function PanduanPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">
          Panduan Admin (Cara Pakai)
        </h1>
        <p className="mt-1 text-slate-600">
          Langkah-langkah mengoperasikan aplikasi englishmudah.id sehari-hari.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {guides.map((g) => (
            <section key={g.section} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{g.section}</h2>
              <ol className="mt-3 flex flex-col gap-2">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-xl bg-surface p-3 text-sm text-slate-600">
                💡 <span className="font-medium">Tips:</span> {g.tip}
              </p>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
