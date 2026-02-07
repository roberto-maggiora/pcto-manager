"use client";

import type { InputHTMLAttributes } from "react";

import { cn } from "../utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300",
        className
      )}
      {...props}
    />
  );
}
