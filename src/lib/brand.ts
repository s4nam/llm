export const BRAND = {
  name: "englishmudah.id",
  tagline: "Belajar English jadi mudah",
  description:
    "Kursus Bahasa Inggris online dari dasar (A1) sampai lanjutan (C2). Materi jelas, latihan langsung, cocok untuk pemula.",
  colors: {
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    primaryLight: "#dbeafe",
    surface: "#f8fafc",
    success: "#16a34a",
    danger: "#dc2626",
  },
} as const;

export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}
