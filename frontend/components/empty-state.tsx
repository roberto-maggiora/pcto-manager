"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "./ui/button";
import { cn } from "./utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: LucideIcon;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon: Icon,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-white/70 p-10 text-center shadow-sm",
        className
      )}
    >
      {Icon ? (
        <div className="rounded-full bg-[var(--primarySoft)] p-3 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onAction}>{actionLabel}</Button>
          {secondaryActionLabel && onSecondaryAction ? (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
