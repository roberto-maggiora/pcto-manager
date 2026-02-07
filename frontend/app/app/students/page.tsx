"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const { toast } = useToast();

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects
  });

  const sessionsQueries = useQueries({
    queries:
      projectsQuery.data?.map((project) => ({
        queryKey: ["sessions", project.id],
        queryFn: () => api.getSessions(project.id),
        enabled: !!project.id
      })) ?? []
  });

  const sessionsList = useMemo(
    () => sessionsQueries.flatMap((query) => query.data ?? []),
    [sessionsQueries]
  );

  const attendanceQueries = useQueries({
    queries: sessionsList.map((sessionItem) => ({
      queryKey: ["attendance", sessionItem.id],
      queryFn: () => api.getSessionAttendance(sessionItem.id),
      enabled: !!sessionItem.id
    }))
  });

  const studentsQuery = useQuery({
    queryKey: ["students", filterClassId],
    queryFn: () => api.getStudents(filterClassId || undefined)
  });

  const createStudent = useMutation({
    mutationFn: api.createStudent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setOpen(false);
      setClassId("");
      setFirstName("");
      setLastName("");
      toast({ title: "Studente creato", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore creazione studente", variant: "error" });
    }
  });

  const classOptions = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);

  const attendanceLoading =
    projectsQuery.isLoading ||
    sessionsQueries.some((query) => query.isLoading) ||
    attendanceQueries.some((query) => query.isLoading);

  const totalsByStudent = useMemo(() => {
    const hours = new Map<string, number>();
    const sessionsCount = new Map<string, number>();
    attendanceQueries.forEach((query) => {
      (query.data ?? []).forEach((row) => {
        hours.set(row.student_id, (hours.get(row.student_id) ?? 0) + row.hours);
        if (row.status === "present") {
          sessionsCount.set(
            row.student_id,
            (sessionsCount.get(row.student_id) ?? 0) + 1
          );
        }
      });
    });
    return { hours, sessionsCount };
  }, [attendanceQueries]);

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
        <Input placeholder="Cerca studente" />
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
                  <Th>Cognome Nome</Th>
                  <Th>Classe</Th>
                  <Th># sessioni</Th>
                  <Th>Ore</Th>
                </tr>
              </thead>
              <tbody>
                {studentsQuery.data?.map((student) => {
                  const cls = classOptions.find((item) => item.id === student.class_id);
                  const totalHours = totalsByStudent.hours.get(student.id) ?? 0;
                  const totalSessions = totalsByStudent.sessionsCount.get(student.id) ?? 0;
                  return (
                    <tr key={student.id}>
                      <Td>
                        {student.last_name} {student.first_name}
                      </Td>
                      <Td>{cls ? `${cls.year}${cls.section}` : "-"}</Td>
                      <Td>{attendanceLoading ? "…" : totalSessions}</Td>
                      <Td>{attendanceLoading ? "…" : formatHours(totalHours)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!studentsQuery.data?.length ? (
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
                    last_name: lastName.trim()
                  })
                }
              >
                {createStudent.isPending ? (
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
