import { NextResponse } from "next/server";

// Digital Asset Links untuk TWA (Trusted Web Activity)
// File ini harus bisa diakses di https://domain/.well-known/assetlinks.json
// Isi sha256_cert_fingerprints diisi SETELAH generate signing key / Play App Signing.
// Sementara kosong — TWA tetap bisa jalan via browser fallback sampai fingerprint diisi.

const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      // Ganti dengan package name yang dipakai saat build TWA (mis: id.englishmudah.app)
      package_name: process.env.TWA_PACKAGE_NAME || "id.englishmudah.app",
      // Isi fingerprint SHA-256 dari keystore atau dari Play Console > Setup > App signing
      // Format: "AA:BB:CC:...:FF" (32 byte hex colon-separated). Kosong = belum verifikasi.
      sha256_cert_fingerprints: process.env.TWA_SHA256_FINGERPRINT
        ? [process.env.TWA_SHA256_FINGERPRINT]
        : [],
    },
  },
];

export async function GET() {
  // Jika fingerprint belum diisi, tetap return tapi Play Console akan warning "not verified"
  // Ini tidak mengganggu PWA — hanya TWA yang belum auto-verify.
  return NextResponse.json(assetLinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
