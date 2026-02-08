"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function ClassesPage() {
  const queryClient = useQueryClient();
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

  const studentsByClass = new Map<string, number>();
  (studentsQuery.data ?? []).forEach((student) => {
    studentsByClass.set(
      student.class_id,
      (studentsByClass.get(student.class_id) ?? 0) + 1
    );
  });

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
  }, [classesQuery.data, filterYear, filterSection]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Classi</h1>
          <p className="text-slate-600">Gestisci classi e studenti</p>
        </div>
        <Button onClick={() => setOpen(true)}>Crea classe</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          value={filterYear}
          onChange={(event) => setFilterYear(event.target.value)}
        >
          <option value="">Tutti gli anni</option>
          {yearOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Input
          placeholder="Sezione"
          value={filterSection}
          onChange={(event) => setFilterSection(event.target.value)}
        />
      </div>
      <Card>
        {classesQuery.isLoading ? (
          <p className="p-4 text-sm text-slate-500">Caricamento...</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Anno</Th>
                  <Th>Sezione</Th>
                  <Th># studenti</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.year}</Td>
                    <Td>{item.section}</Td>
                    <Td>
                      {studentsQuery.isLoading ? (
                        "…"
                      ) : (
                        <Link
                          className="text-slate-900 underline"
                          href={`/app/students?classId=${item.id}`}
                        >
                          {studentsByClass.get(item.id) ?? 0}
                        </Link>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          className="text-sm text-slate-600 underline"
                          onClick={() => {
                            setEditId(item.id);
                            setEditYear(String(item.year));
                            setEditSection(item.section);
                            setEditOpen(true);
                          }}
                        >
                          Modifica
                        </button>
                        <button
                          className="text-sm text-rose-600 underline"
                          onClick={() => setDeleteId(item.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredClasses.length ? (
              <div className="p-4 text-sm text-slate-500">
                Nessuna classe.{" "}
                <button
                  className="text-slate-900 underline"
                  onClick={() => setOpen(true)}
                >
                  Crea classe
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
