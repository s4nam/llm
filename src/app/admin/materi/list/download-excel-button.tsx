"use client";

import * as XLSX from "xlsx";

type LessonRow = {
  title: string;
  level_code: string;
  status: string;
  category?: string;
  updated_at?: string;
  is_free?: boolean;
};

export default function DownloadExcelButton({ lessons }: { lessons: LessonRow[] }) {
  const handleDownload = () => {
    if (lessons.length === 0) return;

    // Header: No | Judul Materi | Level | Status
    // Tambah Kategori & Gratis opsional agar tetap informatif, tapi 3 kolom wajib sesuai request.
    const rows = lessons.map((l, idx) => ({
      No: idx + 1,
      "Judul Materi": l.title ?? "-",
      Level: l.level_code ?? "-",
      Status: l.status === "published" ? "Published (Tampil)" : "Draft",
      // kolom tambahan (tidak wajib) – kalau tidak dibutuhkan bisa dihapus:
      Kategori: l.category ?? "-",
      Gratis: l.is_free ? "Ya" : "Tidak",
      Diperbarui: l.updated_at
        ? new Date(l.updated_at).toLocaleString("id-ID")
        : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom agar rapi di Excel
    worksheet["!cols"] = [
      { wch: 5 }, // No
      { wch: 50 }, // Judul
      { wch: 10 }, // Level
      { wch: 20 }, // Status
      { wch: 14 }, // Kategori
      { wch: 10 }, // Gratis
      { wch: 22 }, // Diperbarui
    ];

    // Freeze header + filter
    const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1");
    worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1" };

    // Bold header (row 1)
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
      const cell = worksheet[cellAddr];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "0F766E" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Materi");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `daftar-materi-${date}.xlsx`);
  };

  const disabled = lessons.length === 0;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      title={disabled ? "Belum ada materi untuk diunduh" : "Download daftar materi sebagai Excel (.xlsx)"}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Icon excel/download */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
        <path d="M10 9H8" />
      </svg>
      Download Excel
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700">
        .XLSX
      </span>
    </button>
  );
}
