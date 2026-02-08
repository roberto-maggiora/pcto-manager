"use client";

import type { InputHTMLAttributes } from "react";

import { cn } from "../utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--radius)] border border-slate-200/70 bg-white px-3 py-2 text-sm outline-none transition focus:border-[color:var(--primary)]/40 focus:ring-2 focus:ring-[color:var(--primary)]/20",
        className
      )}
      {...props}
    />
  );
}
