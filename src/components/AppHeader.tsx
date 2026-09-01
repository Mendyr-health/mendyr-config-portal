"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/AuthProvider";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/configs", label: "Configs" },
  { href: "/query-info", label: "Queries" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <nav className="flex gap-5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "text-sm font-medium " +
                (pathname === link.href
                  ? "text-brand-700"
                  : "text-slate-500 hover:text-slate-700")
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={logout}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
