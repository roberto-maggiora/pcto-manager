"use client";

import type { HTMLAttributes } from "react";

import { cn } from "./utils";

export function CardSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "h-24 rounded-2xl border border-slate-200/70 bg-slate-100/70 shadow-sm animate-pulse",
        className
      )}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 6
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 rounded-md bg-slate-100/80 animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
