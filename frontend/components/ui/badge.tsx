"use client";

import type { HTMLAttributes } from "react";

import { cn } from "../utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "draft" | "active" | "closed" | "scheduled" | "done";
};

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  draft: "bg-amber-100 text-amber-900",
  active: "bg-emerald-100 text-emerald-900",
  closed: "bg-slate-200 text-slate-700",
  scheduled: "bg-sky-100 text-sky-900",
  done: "bg-emerald-100 text-emerald-900"
};

export function Badge({ className, variant = "draft", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
