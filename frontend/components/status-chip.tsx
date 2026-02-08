"use client";

import { cn } from "./utils";

type StatusChipProps = {
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "violet";
  withDot?: boolean;
  className?: string;
};

const tones: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-900",
  success: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-900",
  violet: "bg-violet-100 text-violet-900"
};

const dotTones: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  neutral: "bg-slate-400",
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  violet: "bg-violet-500"
};

export function StatusChip({
  label,
  tone = "neutral",
  withDot,
  className
}: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {withDot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotTones[tone])} /> : null}
      {label}
    </span>
  );
}
