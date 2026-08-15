import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pelajaran-gratis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/daftar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/masuk`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/kontak`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/syarat-ketentuan`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/kebijakan-privasi`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
