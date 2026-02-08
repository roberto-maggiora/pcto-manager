"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { EmptyState } from "@/components/data-table/empty-state";
import { useTableDensity } from "@/components/data-table/use-table-density";
import type { DataTableColumnDef } from "@/components/data-table/columns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { density, setDensity } = useTableDensity("classes-table-density");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [editId, setEditId] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSection, setEditSection] = useState("");
  const { toast } = useToast();

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });
  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => api.getStudents()
  });

  const studentsByClass = useMemo(() => {
    const map = new Map<string, number>();
    (studentsQuery.data ?? []).forEach((student) => {
      map.set(student.class_id, (map.get(student.class_id) ?? 0) + 1);
    });
    return map;
  }, [studentsQuery.data]);

  const createClass = useMutation({
    mutationFn: api.createClass,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setYear("");
      setSection("");
      toast({ title: "Classe creata", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore creazione classe", variant: "error" });
    }
  });

  const updateClass = useMutation({
    mutationFn: (payload: { id: string; year: number; section: string }) =>
      api.patchClass(payload.id, { year: payload.year, section: payload.section }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditOpen(false);
      toast({ title: "Classe aggiornata", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore aggiornamento classe", variant: "error" });
    }
  });

  const deleteClass = useMutation({
    mutationFn: (classId: string) => api.deleteClass(classId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeleteId(null);
      toast({ title: "Classe eliminata", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore eliminazione classe", variant: "error" });
    }
  });

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    (classesQuery.data ?? []).forEach((item) => years.add(item.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [classesQuery.data]);

  const filteredClasses = useMemo(() => {
    return (classesQuery.data ?? []).filter((item) => {
      if (filterYear && item.year !== Number(filterYear)) {
        return false;
      }
      if (filterSection && !item.section.toLowerCase().includes(filterSection.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [classesQuery.data, filterSection, filterYear]);

  type ClassRow = {
    id: string;
    year: number;
    section: string;
  };

  const columns = useMemo<DataTableColumnDef<ClassRow>[]>(() => {
    return [
      {
        id: "label",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Classe
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => `${row.year}${row.section}`,
        cell: ({ row }) => <span className="font-medium">{row.original.year}{row.original.section}</span>,
        meta: { label: "Classe" }
      },
      {
        accessorKey: "year",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Anno
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        meta: { label: "Anno" }
      },
      {
        accessorKey: "section",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Sezione
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        meta: { label: "Sezione" }
      },
      {
        id: "students",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            # Studenti
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => studentsByClass.get(row.id) ?? 0,
        cell: ({ row }) => (
          <button
            className="text-slate-900 underline"
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/app/students?classId=${row.original.id}`);
            }}
          >
            {studentsQuery.isLoading ? "…" : studentsByClass.get(row.original.id) ?? 0}
          </button>
        ),
        meta: { label: "# Studenti" }
      },
      {
        id: "actions",
        enableHiding: false,
        header: "Azioni",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-md p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setEditId(row.original.id);
                    setEditYear(String(row.original.year));
                    setEditSection(row.original.section);
                    setEditOpen(true);
                  }}
                >
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setDeleteId(row.original.id);
                  }}
                >
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        meta: { label: "Azioni" }
      }
    ];
  }, [router, studentsByClass, studentsQuery.isLoading]);

  return (
    <div className="space-y-8">
      <PageHeader title="Classi" description="Gestisci classi e studenti" />
      <DataTable
        columns={columns}
        data={filteredClasses}
        loading={classesQuery.isLoading}
        density={density}
        setDensity={setDensity}
        onRowClick={(row) => router.push(`/app/students?classId=${row.id}`)}
        globalFilterFn={(row, filterValue) => {
          const query = filterValue.trim().toLowerCase();
          if (!query) {
            return true;
          }
          const label = `${row.year}${row.section}`.toLowerCase();
          return (
            label.includes(query) ||
            String(row.year).includes(query) ||
            row.section.toLowerCase().includes(query)
          );
        }}
        toolbar={({ table, globalFilter, setGlobalFilter, resultCount, density, setDensity }) => (
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            resultCount={resultCount}
            showDensityToggle
            density={density}
            onDensityChange={setDensity}
            action={<Button onClick={() => setOpen(true)}>Crea classe</Button>}
            filters={
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Anno</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={filterYear}
                    onChange={(event) => setFilterYear(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Sezione</label>
                  <Input
                    value={filterSection}
                    onChange={(event) => setFilterSection(event.target.value)}
                    placeholder="Es. A, B, C"
                    className="mt-1"
                  />
                </div>
              </div>
            }
          />
        )}
        emptyState={
          <EmptyState
            title="Nessuna classe"
            description="Crea la prima classe per iniziare."
            actionLabel="Crea classe"
            onAction={() => setOpen(true)}
          />
        }
      />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Crea classe</h2>
              <p className="text-sm text-slate-600">Inserisci anno e sezione</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Anno</label>
              <Input
                type="number"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sezione</label>
              <Input
                value={section}
                onChange={(event) => setSection(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={createClass.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={createClass.isPending}
                onClick={() =>
                  createClass.mutate({ year: Number(year), section: section.trim() })
                }
              >
                {createClass.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvataggio
                  </span>
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Modifica classe</h2>
              <p className="text-sm text-slate-600">Aggiorna anno e sezione</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Anno</label>
              <Input
                type="number"
                value={editYear}
                onChange={(event) => setEditYear(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sezione</label>
              <Input
                value={editSection}
                onChange={(event) => setEditSection(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditOpen(false)}
                disabled={updateClass.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={updateClass.isPending}
                onClick={() =>
                  updateClass.mutate({
                    id: editId,
                    year: Number(editYear),
                    section: editSection.trim()
                  })
                }
              >
                {updateClass.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvataggio
                  </span>
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Elimina classe</h2>
              <p className="text-sm text-slate-600">
                Questa operazione è irreversibile.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteId(null)}
                disabled={deleteClass.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={deleteClass.isPending}
                onClick={() => deleteClass.mutate(deleteId)}
                className="text-rose-600"
              >
                {deleteClass.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                    Eliminazione
                  </span>
                ) : (
                  "Elimina"
                )}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
