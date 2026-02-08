"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";

export type DataTableColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  meta?: {
    label?: string;
  };
};

export function getColumnLabel<TData>(column: Column<TData, unknown>) {
  const meta = column.columnDef.meta as { label?: string } | undefined;
  const metaLabel = meta?.label;
  if (typeof metaLabel === "string" && metaLabel.length > 0) {
    return metaLabel;
  }
  const header = column.columnDef.header;
  if (typeof header === "string") {
    return header;
  }
  return column.id;
}
