import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "englishmudah.id — Belajar English jadi mudah",
    short_name: "EnglishMudah",
    description:
      "Kursus Bahasa Inggris online dari dasar sampai mahir. Belajar dengan mudah, kapan pun dan di mana pun.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "any",
    lang: "id",
    dir: "ltr",
    categories: ["education"],
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: "Beranda englishmudah.id di HP",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        form_factor: "wide",
        label: "Dashboard belajar englishmudah.id",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard Belajar",
        short_name: "Dashboard",
        description: "Lanjut belajar dari level kamu",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Placement Test",
        short_name: "Tes Level",
        description: "Cek level bahasa Inggris kamu",
        url: "/placement-test",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Latihan Akademik",
        short_name: "Akademik",
        description: "Latihan Reading, Listening, Writing, Speaking",
        url: "/academic",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    // handle_links tidak ada di tipe Next, tapi didukung browser untuk TWA
    ...({ handle_links: "preferred" } as object),
  };
}
