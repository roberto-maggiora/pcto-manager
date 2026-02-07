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
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        variant === "default"
          ? "bg-slate-900 text-white hover:bg-slate-800"
          : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
