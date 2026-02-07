"use client";

import { SchoolBadge } from "./school-badge";

export function Topbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <SchoolBadge />
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>Search</span>
        <span>Profilo</span>
      </div>
    </header>
  );
}
