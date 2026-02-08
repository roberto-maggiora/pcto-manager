"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { Table as TableInstance } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState
} from "@tanstack/react-table";

import { Card } from "../ui/card";
import { Table, Td, Th } from "../ui/table";
import { cn } from "../utils";
import type { DataTableColumnDef } from "./columns";
import type { TableDensity } from "./use-table-density";

type ToolbarRenderProps<TData> = {
  table: TableInstance<TData>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  density: TableDensity;
  setDensity: (value: TableDensity) => void;
  resultCount: number;
};

type DataTableProps<TData> = {
  columns: Array<DataTableColumnDef<TData, unknown>>;
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  toolbar?: (props: ToolbarRenderProps<TData>) => ReactNode;
  emptyState?: ReactNode;
  density?: TableDensity;
  setDensity?: (value: TableDensity) => void;
  initialColumnVisibility?: VisibilityState;
  globalFilterFn?: (row: TData, filterValue: string) => boolean;
};

export function DataTable<TData>({
  columns,
  data,
  loading,
  onRowClick,
  toolbar,
  emptyState,
  density = "normal",
  setDensity,
  initialColumnVisibility,
  globalFilterFn
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {}
  );
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFilterFn
      ? (row, _columnId, filterValue) =>
          globalFilterFn(row.original, String(filterValue ?? ""))
      : (row, columnId, filterValue) =>
          String(row.getValue(columnId) ?? "")
            .toLowerCase()
            .includes(String(filterValue ?? "").toLowerCase())
  });

  const rowCount = table.getFilteredRowModel().rows.length;
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <Card className="space-y-4">
      {toolbar ? (
        <div className="-mx-5 -mt-5 sticky top-0 z-10 rounded-t-2xl border-b border-slate-200/70 bg-white/85 px-5 py-4 backdrop-blur">
          {toolbar({
            table,
            globalFilter,
            setGlobalFilter,
            density,
            setDensity: setDensity ?? (() => {}),
            resultCount: rowCount
          })}
        </div>
      ) : null}
      <div className="overflow-auto rounded-lg border border-slate-200">
        <Table>
          <thead className="bg-slate-50/70">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    className={cn(
                      "sticky top-0 z-10 whitespace-nowrap bg-slate-50/90 px-4",
                      density === "compact" ? "py-2" : "py-3"
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </Th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {visibleColumns.map((column) => (
                      <Td key={column.id}>
                        <div className="h-4 w-full animate-pulse rounded-md bg-slate-100" />
                      </Td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "group transition-colors hover:bg-slate-50/80",
                      onRowClick ? "cursor-pointer" : "",
                      density === "compact" ? "text-sm" : ""
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td
                        key={cell.id}
                        className={cn(
                          "px-4",
                          density === "compact" ? "py-2" : "py-3"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </Table>
      </div>
      {!loading && rowCount === 0 ? emptyState : null}
    </Card>
  );
}
