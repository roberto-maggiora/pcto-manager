"use client";

import { useState } from "react";
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
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
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
      setOpen(false);
      setYear("");
      setSection("");
      toast({ title: "Classe creata", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore creazione classe", variant: "error" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Classi</h1>
          <p className="text-slate-600">Gestisci classi e studenti</p>
        </div>
        <Button onClick={() => setOpen(true)}>Crea classe</Button>
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
                </tr>
              </thead>
              <tbody>
                {classesQuery.data?.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.year}</Td>
                    <Td>{item.section}</Td>
                    <Td>{studentsQuery.isLoading ? "…" : studentsByClass.get(item.id) ?? 0}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!classesQuery.data?.length ? (
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
                Salva
                )}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
