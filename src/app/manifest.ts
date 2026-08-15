import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "englishmudah.id — Belajar English jadi mudah",
    short_name: "EnglishMudah",
    description:
      "Kursus Bahasa Inggris online dari dasar sampai mahir. Belajar dengan mudah, kapan pun dan di mana pun.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
