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
          <Button
            variant="secondary"
            onClick={() => onDensityChange(density === "compact" ? "normal" : "compact")}
          >
            {density === "compact" ? "Normale" : "Compatta"}
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}
