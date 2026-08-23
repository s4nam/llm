"use client";

import { usePathname } from "next/navigation";

/**
 * Layout admin. Memberi ruang (padding kiri) untuk sidebar fixed di layar
 * besar. Halaman login & setup sengaja tanpa sidebar → tanpa padding.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const noSidebar =
    pathname === "/admin/login" || pathname === "/admin/setup";

  return (
    <div className={noSidebar ? "" : "lg:pl-60"}>{children}</div>
  );
}