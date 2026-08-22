import Link from "next/link";

export function Logo({ dark = false, href = "/" }: { dark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
        E
      </span>
      <span
        className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}
      >
        english<span className="text-brand">mudah</span>
      </span>
    </Link>
  );
}
