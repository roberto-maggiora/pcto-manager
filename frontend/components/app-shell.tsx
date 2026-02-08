"use client";

import type { ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-7xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
