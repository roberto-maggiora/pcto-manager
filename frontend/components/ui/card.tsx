"use client";

import type { HTMLAttributes } from "react";

import { cn } from "../utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition-all hover:border-slate-300/60 hover:shadow-[var(--shadow-md)]",
        className
      )}
      {...props}
    />
  );
}
