"use client";

import type { HTMLAttributes } from "react";

import { cn } from "../utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-separate border-spacing-0 text-sm", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-slate-100 px-3 py-2", className)} {...props} />
  );
}
