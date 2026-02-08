"use client";

import { Inbox } from "lucide-react";

import { Button } from "../ui/button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200/70 bg-slate-50/60 p-10 text-center">
      <div className="rounded-full bg-white p-3 shadow-sm">
        <Inbox className="h-5 w-5 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
