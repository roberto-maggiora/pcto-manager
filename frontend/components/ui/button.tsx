"use client";

import type { ButtonHTMLAttributes } from "react";

import { cn } from "../utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/30",
        variant === "default"
          ? "bg-[var(--primary)] text-white shadow-sm hover:shadow-md hover:brightness-95"
          : "bg-white text-slate-900 border border-slate-200/70 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
