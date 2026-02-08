"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Download,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UsersRound
} from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "./ui/toast";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/classes", label: "Classi", icon: UsersRound },
  { href: "/app/students", label: "Studenti", icon: GraduationCap },
  { href: "/app/projects", label: "Progetti PCTO", icon: FolderKanban },
  { href: "/app/exports", label: "Export", icon: Download }
];

const footerItem = { href: "/app/settings/school", label: "Impostazioni Scuola", icon: Settings };

export function Sidebar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("impakt.sidebarCollapsed");
    setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("impakt.sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-200/70 bg-white/95 py-4 ${
        collapsed ? "w-16 px-2" : "w-64 px-4"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 ${
            collapsed ? "justify-center w-full" : "flex-1"
          }`}
          onClick={() => toast({ title: "Workspace switcher (demo)", variant: "success" })}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primarySoft)] text-xs font-semibold text-[var(--primary)]">
            N
          </div>
          {!collapsed ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span>Nome Scuola</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          ) : null}
        </button>
        <button
          className="rounded-md p-2 text-slate-500 transition hover:bg-slate-50"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "relative bg-[var(--primarySoft)] font-semibold text-[var(--primary)]"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isActive ? (
                <span
                  className="absolute left-1 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--section-accent,var(--primary))]"
                  aria-hidden="true"
                />
              ) : null}
              <Icon className={`h-[18px] w-[18px] ${isActive ? "" : "opacity-70"}`} />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200/70 pt-4">
        <Link
          href={footerItem.href}
          title={collapsed ? footerItem.label : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
            pathname === footerItem.href
              ? "relative bg-[var(--primarySoft)] font-semibold text-[var(--primary)]"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          {pathname === footerItem.href ? (
            <span
              className="absolute left-1 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-[var(--section-accent,var(--primary))]"
              aria-hidden="true"
            />
          ) : null}
          <footerItem.icon
            className={`h-[18px] w-[18px] ${pathname === footerItem.href ? "" : "opacity-70"}`}
          />
          {!collapsed ? <span>{footerItem.label}</span> : null}
        </Link>
      </div>
    </aside>
  );
}
