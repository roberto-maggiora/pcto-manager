"use client";

import { useEffect, useState } from "react";

export type TableDensity = "compact" | "normal";

const DEFAULT_DENSITY: TableDensity = "normal";
const STORAGE_KEY = "data-table-density";

export function useTableDensity(storageKey: string = STORAGE_KEY) {
  const [density, setDensity] = useState<TableDensity>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_DENSITY;
    }
    const stored = window.localStorage.getItem(storageKey);
    return stored === "compact" || stored === "normal" ? stored : DEFAULT_DENSITY;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, density);
  }, [density, storageKey]);

  return { density, setDensity };
}
