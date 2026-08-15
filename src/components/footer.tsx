import Link from "next/link";
import { Logo } from "@/components/header";

const footerLinks = [
  { label: "Coba Gratis", href: "/pelajaran-gratis" },
  { label: "Daftar", href: "/daftar" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontak", href: "/kontak" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-xs text-sm text-slate-500">
            Kursus Bahasa Inggris online dari dasar sampai mahir. Belajar
            dengan mudah, kapan pun dan di mana pun.
          </p>
        </div>
        <nav className="flex flex-col gap-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} englishmudah.id — Belajar English jadi
        mudah.
      </div>
    </footer>
  );
}
