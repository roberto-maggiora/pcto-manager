"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { EmptyState } from "@/components/data-table/empty-state";
import { useTableDensity } from "@/components/data-table/use-table-density";
import type { DataTableColumnDef } from "@/components/data-table/columns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { density, setDensity } = useTableDensity("students-table-density");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [requiredHours, setRequiredHours] = useState("150");
  const [filterClassId, setFilterClassId] = useState("");
  const [editId, setEditId] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRequiredHours, setEditRequiredHours] = useState("150");
  const { toast } = useToast();

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });

  const metricsQuery = useQuery({
    queryKey: ["students-metrics"],
    queryFn: api.getStudentMetrics
  });

  const studentsQuery = useQuery({
    queryKey: ["students", filterClassId],
    queryFn: () => api.getStudents(filterClassId || undefined)
  });

  const createStudent = useMutation({
    mutationFn: api.createStudent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["students-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      setOpen(false);
      setClassId("");
      setFirstName("");
      setLastName("");
      setRequiredHours("150");
      toast({ title: "Studente creato", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore creazione studente", variant: "error" });
    }
  });

  const updateStudent = useMutation({
    mutationFn: (payload: {
      id: string;
      class_id: string;
      first_name: string;
      last_name: string;
      pcto_required_hours: number;
    }) =>
      api.patchStudent(payload.id, {
        class_id: payload.class_id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        pcto_required_hours: payload.pcto_required_hours
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["students-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      setEditOpen(false);
      toast({ title: "Studente aggiornato", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore aggiornamento studente", variant: "error" });
    }
  });

  const deleteStudent = useMutation({
    mutationFn: (studentId: string) => api.deleteStudent(studentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["students-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      setDeleteId(null);
      toast({ title: "Studente eliminato", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Errore eliminazione studente", variant: "error" });
    }
  });

  const classOptions = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);

  useEffect(() => {
    const initialClassId = searchParams.get("classId");
    if (initialClassId) {
      setFilterClassId(initialClassId);
      setClassId(initialClassId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (filterClassId && !classId) {
      setClassId(filterClassId);
    }
  }, [filterClassId, classId]);

  const metricsByStudent = useMemo(() => {
    const map = new Map<string, number>();
    (metricsQuery.data ?? []).forEach((row) => {
      map.set(row.student_id, row.completed_hours);
    });
    return map;
  }, [metricsQuery.data]);

  const filteredStudents = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);

  const formatHours = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);

  type StudentRow = {
    id: string;
    first_name: string;
    last_name: string;
    class_id: string;
    pcto_required_hours: number;
  };

  const columns = useMemo<DataTableColumnDef<StudentRow>[]>(() => {
    return [
      {
        accessorKey: "last_name",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Cognome
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        meta: { label: "Cognome" }
      },
      {
        accessorKey: "first_name",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Nome
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        meta: { label: "Nome" }
      },
      {
        id: "class",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Classe
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => {
          const cls = classOptions.find((item) => item.id === row.class_id);
          return cls ? `${cls.year}${cls.section}` : "-";
        },
        cell: ({ row }) => {
          const cls = classOptions.find((item) => item.id === row.original.class_id);
          return cls ? `${cls.year}${cls.section}` : "-";
        },
        meta: { label: "Classe" }
      },
      {
        id: "active_projects",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Progetti PCTO attivi
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: () => 0,
        cell: () => "—",
        meta: { label: "Progetti PCTO attivi" }
      },
      {
        id: "completed_hours",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Ore svolte
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => metricsByStudent.get(row.id) ?? 0,
        cell: ({ row }) =>
          metricsQuery.isLoading
            ? "…"
            : formatHours(metricsByStudent.get(row.original.id) ?? 0),
        meta: { label: "Ore svolte" }
      },
      {
        id: "required_hours",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Ore richieste
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => row.pcto_required_hours ?? 150,
        cell: ({ row }) => formatHours(row.original.pcto_required_hours ?? 150),
        meta: { label: "Ore richieste" }
      },
      {
        id: "remaining_hours",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Ore mancanti
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => {
          const completed = metricsByStudent.get(row.id) ?? 0;
          const required = row.pcto_required_hours ?? 150;
          return Math.max(0, required - completed);
        },
        cell: ({ row }) => {
          const completed = metricsByStudent.get(row.original.id) ?? 0;
          const required = row.original.pcto_required_hours ?? 150;
          return formatHours(Math.max(0, required - completed));
        },
        meta: { label: "Ore mancanti" }
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
                    setEditFirstName(row.original.first_name);
                    setEditLastName(row.original.last_name);
                    setEditClassId(row.original.class_id);
                    setEditRequiredHours(String(row.original.pcto_required_hours ?? 150));
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
  }, [classOptions, metricsByStudent, metricsQuery.isLoading]);

  return (
    <div className="space-y-8">
      <PageHeader title="Studenti" description="Anagrafiche studenti" />
      <DataTable
        columns={columns}
        data={filteredStudents}
        loading={studentsQuery.isLoading}
        density={density}
        setDensity={setDensity}
        onRowClick={(row) => router.push(`/app/students/${row.id}`)}
        globalFilterFn={(row, filterValue) => {
          const query = filterValue.trim().toLowerCase();
          if (!query) {
            return true;
          }
          const full = `${row.first_name} ${row.last_name}`.toLowerCase();
          const fullReverse = `${row.last_name} ${row.first_name}`.toLowerCase();
          return (
            full.includes(query) ||
            fullReverse.includes(query) ||
            row.first_name.toLowerCase().includes(query) ||
            row.last_name.toLowerCase().includes(query)
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
            action={<Button onClick={() => setOpen(true)}>Aggiungi studente</Button>}
            filters={
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={filterClassId}
                    onChange={(event) => setFilterClassId(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {classOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.year}
                        {item.section}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />
        )}
        emptyState={
          <EmptyState
            title="Nessuno studente"
            description="Aggiungi il primo studente per iniziare."
            actionLabel="Aggiungi studente"
            onAction={() => setOpen(true)}
          />
        }
      />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Crea studente</h2>
              <p className="text-sm text-slate-600">Inserisci dati studente</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
              >
                <option value="">Seleziona classe</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.year}
                    {item.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cognome</label>
              <Input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ore PCTO richieste</label>
              <Input
                type="number"
                value={requiredHours}
                onChange={(event) => setRequiredHours(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={createStudent.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={createStudent.isPending}
                onClick={() =>
                  createStudent.mutate({
                    class_id: classId,
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    pcto_required_hours: requiredHours ? Number(requiredHours) : 150
                  })
                }
              >
                {createStudent.isPending ? (
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
              <h2 className="text-lg font-medium">Modifica studente</h2>
              <p className="text-sm text-slate-600">Aggiorna dati studente</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editClassId}
                onChange={(event) => setEditClassId(event.target.value)}
              >
                <option value="">Seleziona classe</option>
                {classOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.year}
                    {item.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={editFirstName}
                onChange={(event) => setEditFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cognome</label>
              <Input
                value={editLastName}
                onChange={(event) => setEditLastName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ore PCTO richieste</label>
              <Input
                type="number"
                value={editRequiredHours}
                onChange={(event) => setEditRequiredHours(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditOpen(false)}
                disabled={updateStudent.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={updateStudent.isPending}
                onClick={() =>
                  updateStudent.mutate({
                    id: editId,
                    class_id: editClassId,
                    first_name: editFirstName.trim(),
                    last_name: editLastName.trim(),
                    pcto_required_hours: editRequiredHours
                      ? Number(editRequiredHours)
                      : 150
                  })
                }
              >
                {updateStudent.isPending ? (
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
              <h2 className="text-lg font-medium">Elimina studente</h2>
              <p className="text-sm text-slate-600">
                Questa operazione è irreversibile.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteId(null)}
                disabled={deleteStudent.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={deleteStudent.isPending}
                onClick={() => deleteStudent.mutate(deleteId)}
                className="text-rose-600"
              >
                {deleteStudent.isPending ? (
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
