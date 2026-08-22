"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/login";

type Props = {
  name: string;
  isAdmin: boolean;
  isMember: boolean;
};

const MAIN_LINKS = [
  { href: "/dashboard", label: "Kursus Utama" },
  { href: "/academic", label: "Latihan Akademik" },
  { href: "/percakapan-situasional", label: "Percakapan Situasional" },
];

export default function HeaderNav({ name, isAdmin, isMember }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const userLinks = [
    { href: "/prestasi", label: "Prestasi" },
    { href: "/study-sets", label: "Study Sets" },
    { href: "/profil", label: "Profil" },
  ];

  return (
    <>
      {/* Navbar desktop */}
      <nav className="hidden items-center gap-4 md:flex">
        {MAIN_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}

        {isMember ? (
          <Link
            href="/langganan"
            className="rounded-lg border border-success/40 bg-success/5 px-3 py-1.5 text-sm font-semibold text-success transition hover:bg-success/10"
          >
            ✓ Member
          </Link>
        ) : (
          <Link
            href="/pelajaran-gratis"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Coba Gratis
          </Link>
        )}

        {/* Menu user */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="max-w-[8rem] truncate">{name}</span>
            <svg
              className={`h-4 w-4 text-slate-400 transition ${userOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setUserOpen(false)}
                  className="block border-b border-slate-100 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Admin
                </Link>
              )}
              {userLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setUserOpen(false)}
                  className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
              <form action={logout}>
                <button
                  type="submit"
                  className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm text-danger transition hover:bg-red-50"
                >
                  Keluar
                </button>
              </form>
            </div>
          )}
        </div>
      </nav>

      {/* Tombol hamburger (mobile) */}
      <div className="md:hidden" ref={menuRef}>
        <button
          type="button"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {MAIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-1 border-t border-slate-100" />
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white"
              >
                Admin
              </Link>
            )}
            {!isMember && (
              <Link
                href="/pelajaran-gratis"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Coba Gratis
              </Link>
            )}
            <Link
              href="/prestasi"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Prestasi
            </Link>
            <Link
              href="/study-sets"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Study Sets
            </Link>
            <Link
              href="/profil"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Profil
            </Link>
            {isMember && (
              <Link
                href="/langganan"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-success"
              >
                ✓ Member
              </Link>
            )}
            <div className="my-1 border-t border-slate-100" />
            <form action={logout}>
              <button
                type="submit"
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50"
              >
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}