"use client";

import type { HTMLAttributes } from "react";

import { cn } from "../utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        "w-full border-separate border-spacing-0 text-sm [&_thead]:bg-slate-50/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/80",
        className
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-slate-200/70 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-slate-100/70 px-4 py-3 text-slate-700", className)}
      {...props}
    />
  );
}
