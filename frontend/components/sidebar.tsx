"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/classes", label: "Classi" },
  { href: "/app/students", label: "Studenti" },
  { href: "/app/projects", label: "Progetti PCTO" },
  { href: "/app/exports", label: "Export" },
  { href: "/app/settings/school", label: "Impostazioni Scuola" }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 border-r border-slate-200/70 bg-white/95 px-4 py-6">
      <div className="mb-6 text-lg font-semibold tracking-tight text-slate-900">
        Impakt PCTO
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              pathname === item.href
                ? "bg-[var(--primarySoft)] font-medium text-[var(--primary)]"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
