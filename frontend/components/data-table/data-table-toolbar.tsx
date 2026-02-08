"use client";

import type { Table } from "@tanstack/react-table";
import { Columns, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getColumnLabel } from "./columns";
import type { TableDensity } from "./use-table-density";
type DataTableToolbarProps<TData> = {
  table: Table<TData>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  resultCount: number;
  filters?: ReactNode;
  action?: ReactNode;
  showDensityToggle?: boolean;
  density?: TableDensity;
  onDensityChange?: (value: TableDensity) => void;
};

export function DataTableToolbar<TData>({
  table,
  globalFilter,
  onGlobalFilterChange,
  resultCount,
  filters,
  action,
  showDensityToggle,
  density,
  onDensityChange
}: DataTableToolbarProps<TData>) {
  const columns = useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={globalFilter ?? ""}
            onChange={(event) => onGlobalFilterChange(event.target.value)}
            placeholder="Cerca…"
            className="pl-8"
          />
        </div>
        {filters ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtri
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">{filters}</PopoverContent>
          </Popover>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>{resultCount} risultati</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="gap-2">
              <Columns className="h-4 w-4" />
              Colonne
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
              >
                {getColumnLabel(column)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {showDensityToggle && density && onDensityChange ? (
          <div className="flex items-center rounded-full border border-slate-200/70 bg-white p-1">
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                density === "normal"
                  ? "bg-[var(--primarySoft)] text-[var(--primary)]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => onDensityChange("normal")}
            >
              Normale
            </button>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                density === "compact"
                  ? "bg-[var(--primarySoft)] text-[var(--primary)]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => onDensityChange("compact")}
            >
              Compatta
            </button>
          </div>
        ) : null}
        {action}
      </div>
    </div>
  );
}
