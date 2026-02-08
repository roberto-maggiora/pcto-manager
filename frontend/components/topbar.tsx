"use client";

import { SchoolBadge } from "./school-badge";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-6 py-3 backdrop-blur">
      <SchoolBadge />
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>Search</span>
        <span>Profilo</span>
      </div>
    </header>
  );
}
