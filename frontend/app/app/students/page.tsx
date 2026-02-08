"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [requiredHours, setRequiredHours] = useState("150");
  const [filterClassId, setFilterClassId] = useState("");
  const [search, setSearch] = useState("");
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

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return studentsQuery.data ?? [];
    }
    return (studentsQuery.data ?? []).filter((student) => {
      const full = `${student.first_name} ${student.last_name}`.toLowerCase();
      const fullReverse = `${student.last_name} ${student.first_name}`.toLowerCase();
      return (
        full.includes(query) ||
        fullReverse.includes(query) ||
        student.first_name.toLowerCase().includes(query) ||
        student.last_name.toLowerCase().includes(query)
      );
    });
  }, [search, studentsQuery.data]);

  const formatHours = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Studenti</h1>
          <p className="text-slate-600">Anagrafiche studenti</p>
        </div>
        <Button onClick={() => setOpen(true)}>Crea studente</Button>
      </div>
      <div className="flex gap-3">
        <Input
          placeholder="Cerca studente"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={filterClassId}
          onChange={(event) => setFilterClassId(event.target.value)}
        >
          <option value="">Tutte le classi</option>
          {classOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.year}
              {item.section}
            </option>
          ))}
        </select>
      </div>
      <Card>
        {studentsQuery.isLoading ? (
          <p className="p-4 text-sm text-slate-500">Caricamento...</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Cognome</Th>
                  <Th>Nome</Th>
                  <Th>Classe</Th>
                  <Th>Ore svolte</Th>
                  <Th>Ore richieste</Th>
                  <Th>Ore mancanti</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const cls = classOptions.find((item) => item.id === student.class_id);
                  const completedHours = metricsByStudent.get(student.id) ?? 0;
                  const required = student.pcto_required_hours ?? 150;
                  const remaining = Math.max(0, required - completedHours);
                  return (
                    <tr
                      key={student.id}
                      className="cursor-pointer"
                      onClick={() => {
                        window.location.href = `/app/students/${student.id}`;
                      }}
                    >
                      <Td>{student.last_name}</Td>
                      <Td>{student.first_name}</Td>
                      <Td>{cls ? `${cls.year}${cls.section}` : "-"}</Td>
                      <Td>{metricsQuery.isLoading ? "…" : formatHours(completedHours)}</Td>
                      <Td>{formatHours(required)}</Td>
                      <Td>{formatHours(remaining)}</Td>
                      <Td>
                        <div className="flex gap-2">
                          <button
                            className="text-sm text-slate-600 underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditId(student.id);
                              setEditFirstName(student.first_name);
                              setEditLastName(student.last_name);
                              setEditClassId(student.class_id);
                              setEditRequiredHours(String(required));
                              setEditOpen(true);
                            }}
                          >
                            Modifica
                          </button>
                          <button
                            className="text-sm text-rose-600 underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteId(student.id);
                            }}
                          >
                            Elimina
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!filteredStudents.length ? (
              <div className="p-4 text-sm text-slate-500">
                Nessuno studente.{" "}
                <button
                  className="text-slate-900 underline"
                  onClick={() => setOpen(true)}
                >
                  Crea studente
                </button>
              </div>
            ) : null}
          </>
        )}
      </Card>

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
