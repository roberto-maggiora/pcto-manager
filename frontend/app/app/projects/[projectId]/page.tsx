"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { addActivity } from "@/lib/activity";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";

type TabKey = "overview" | "sessions" | "attendance" | "exports";

const statusLabel: Record<string, { label: string; variant: "draft" | "active" | "closed" }> = {
  draft: { label: "Bozza", variant: "draft" },
  active: { label: "Attivo", variant: "active" },
  closed: { label: "Chiuso", variant: "closed" }
};

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const [tab, setTab] = useState<TabKey>("overview");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [attendanceBySession, setAttendanceBySession] = useState<
    Record<string, Record<string, { status: "present" | "absent"; hours: number }>>
  >({});
  const [exportId, setExportId] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["project", params.projectId],
    queryFn: () => api.getProject(params.projectId)
  });

  const sessionsQuery = useQuery({
    queryKey: ["sessions", params.projectId],
    queryFn: () => api.getSessions(params.projectId)
  });

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });

  const studentsQuery = useQuery({
    queryKey: ["students", filterClassId],
    queryFn: () => api.getStudents(filterClassId || undefined),
    enabled: tab === "attendance"
  });

  const attendanceQuery = useQuery({
    queryKey: ["attendance", selectedSessionId],
    queryFn: () => api.getSessionAttendance(selectedSessionId),
    enabled: tab === "attendance" && Boolean(selectedSessionId)
  });

  const createSession = useMutation({
    mutationFn: (payload: { start: string; end: string; planned_hours: number }) =>
      api.createSession(params.projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", params.projectId] });
      setSessionModalOpen(false);
      setStart("");
      setEnd("");
      setPlannedHours("");
      toast({ title: "Sessione creata" });
    },
    onError: () => {
      toast({ title: "Errore creazione sessione", variant: "destructive" });
    }
  });

  const saveAttendance = useMutation({
    mutationFn: (payload: Array<{ student_id: string; status: string; hours: number }>) =>
      api.postAttendance(selectedSessionId, payload),
    onSuccess: (data, variables) => {
      if (process.env.NODE_ENV === "development") {
        console.log("attendance.save.response", data);
      }
      if (selectedSessionId) {
        const next: Record<string, { status: "present" | "absent"; hours: number }> =
          {};
        variables.forEach((row) => {
          next[row.student_id] = {
            status: row.status as "present" | "absent",
            hours: row.hours
          };
        });
        setAttendanceBySession((prev) => ({
          ...prev,
          [selectedSessionId]: next
        }));
      }
      addActivity(`Presenze salvate (${data.updated})`);
      toast({ title: `Presenze salvate (${data.updated} aggiornate)`, variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore salvataggio presenze", variant: "error" });
    }
  });

  const exportAttendance = useMutation({
    mutationFn: () => api.exportAttendanceRegister(params.projectId),
    onSuccess: (data) => {
      setExportId(data.export_id);
      addActivity("Registro presenze generato");
      toast({ title: "Registro generato", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore export", variant: "error" });
    }
  });

  useEffect(() => {
    if (!studentsQuery.data || !selectedSessionId) {
      return;
    }
    const existing = attendanceBySession[selectedSessionId];
    if (!existing && attendanceQuery.data) {
      const mapped: Record<string, { status: "present" | "absent"; hours: number }> =
        {};
      attendanceQuery.data.forEach((row) => {
        mapped[row.student_id] = { status: row.status, hours: row.hours };
      });
      setAttendanceBySession((prev) => ({
        ...prev,
        [selectedSessionId]: mapped
      }));
    }
  }, [attendanceBySession, attendanceQuery.data, selectedSessionId, studentsQuery.data]);

  useEffect(() => {
    if (!studentsQuery.data || !selectedSessionId) {
      return;
    }
    setAttendanceBySession((prev) => {
      const current = prev[selectedSessionId] ?? {};
      const next = { ...current };
      for (const student of studentsQuery.data) {
        if (!next[student.id]) {
          next[student.id] = { status: "present", hours: 0 };
        }
      }
      return { ...prev, [selectedSessionId]: next };
    });
  }, [studentsQuery.data, selectedSessionId]);

  const projectStatus = statusLabel[projectQuery.data?.status ?? "draft"];

  const sessionOptions = useMemo(
    () => sessionsQuery.data ?? [],
    [sessionsQuery.data]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {projectQuery.data?.title ?? "Progetto"}
          </h1>
          <p className="text-slate-600">
            {formatDate(projectQuery.data?.start_date)} -{" "}
            {formatDate(projectQuery.data?.end_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={projectStatus.variant}>{projectStatus.label}</Badge>
          <Button onClick={() => setSessionModalOpen(true)} disabled={createSession.isPending}>
            {createSession.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Salvataggio
              </span>
            ) : (
              "Crea sessione"
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportAttendance.mutate()}
            disabled={exportAttendance.isPending}
          >
            {exportAttendance.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generazione
              </span>
            ) : (
              "Genera Registro Presenze (PDF)"
            )}
          </Button>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex gap-3 text-sm text-slate-600">
          <button onClick={() => setTab("overview")} className={tab === "overview" ? "font-medium text-slate-900" : ""}>
            Panoramica
          </button>
          <button onClick={() => setTab("sessions")} className={tab === "sessions" ? "font-medium text-slate-900" : ""}>
            Sessioni
          </button>
          <button onClick={() => setTab("attendance")} className={tab === "attendance" ? "font-medium text-slate-900" : ""}>
            Presenze
          </button>
          <button onClick={() => setTab("exports")} className={tab === "exports" ? "font-medium text-slate-900" : ""}>
            Export
          </button>
        </div>
        {tab === "overview" ? (
          <div>
            <h2 className="text-lg font-medium">Panoramica</h2>
            <p className="text-slate-600">KPI e dati progetto</p>
          </div>
        ) : null}
      </Card>

      {tab === "sessions" ? (
        <Card>
          <h2 className="mb-3 text-lg font-medium">Sessioni</h2>
          {sessionsQuery.isLoading ? (
            <p className="p-4 text-sm text-slate-500">Caricamento...</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Inizio</Th>
                  <Th>Fine</Th>
                  <Th>Ore pianificate</Th>
                </tr>
              </thead>
              <tbody>
                {sessionsQuery.data?.map((item) => (
                  <tr key={item.id}>
                    <Td>{formatDateTime(item.start)}</Td>
                    <Td>{formatDateTime(item.end)}</Td>
                    <Td>{item.planned_hours}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      ) : null}

      {tab === "attendance" ? (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
            >
              <option value="">Seleziona sessione</option>
              {sessionOptions.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {formatDateTime(sess.start)} - {formatDateTime(sess.end)}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={filterClassId}
              onChange={(event) => setFilterClassId(event.target.value)}
            >
              <option value="">Tutte le classi</option>
              {classesQuery.data?.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.year}
                  {cls.section}
                </option>
              ))}
            </select>
            <Button
              onClick={() => {
                const currentMap = attendanceBySession[selectedSessionId] ?? {};
                const payload = (studentsQuery.data ?? []).map((student) => ({
                  student_id: student.id,
                  status: currentMap[student.id]?.status ?? "present",
                  hours: Number.parseFloat(String(currentMap[student.id]?.hours ?? 0))
                }));
                if (process.env.NODE_ENV === "development") {
                  console.log("attendance.save.payload", payload);
                }
                saveAttendance.mutate(payload);
              }}
              disabled={!selectedSessionId || saveAttendance.isPending}
            >
              {saveAttendance.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Salvataggio
                </span>
              ) : (
                "Salva presenze"
              )}
            </Button>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Studente</Th>
                <Th>Classe</Th>
                <Th>Stato</Th>
                <Th>Ore</Th>
              </tr>
            </thead>
            <tbody>
              {studentsQuery.data?.map((student) => {
                const cls = classesQuery.data?.find((item) => item.id === student.class_id);
                const current = attendanceBySession[selectedSessionId] ?? {};
                return (
                  <tr key={student.id}>
                    <Td>
                      {student.last_name} {student.first_name}
                    </Td>
                    <Td>{cls ? `${cls.year}${cls.section}` : "-"}</Td>
                    <Td>
                      <select
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                        value={current[student.id]?.status ?? "present"}
                        onChange={(event) =>
                          setAttendanceBySession((prev) => ({
                            ...prev,
                            [selectedSessionId]: {
                              ...current,
                              [student.id]: {
                                status: event.target.value as "present" | "absent",
                                hours: current[student.id]?.hours ?? 0
                              }
                            }
                          }))
                        }
                      >
                        <option value="present">Presente</option>
                        <option value="absent">Assente</option>
                      </select>
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        value={current[student.id]?.hours ?? 0}
                        onChange={(event) =>
                          setAttendanceBySession((prev) => ({
                            ...prev,
                            [selectedSessionId]: {
                              ...current,
                              [student.id]: {
                                status: current[student.id]?.status ?? "present",
                                hours: Number(event.target.value)
                              }
                            }
                          }))
                        }
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : null}

      {tab === "exports" ? (
        <Card className="space-y-3">
          <Button onClick={() => exportAttendance.mutate()} disabled={exportAttendance.isPending}>
            {exportAttendance.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generazione
              </span>
            ) : (
              "Genera Registro Presenze (PDF)"
            )}
          </Button>
          {exportId ? (
            <a
              className="text-sm text-slate-700 underline"
              target="_blank"
              rel="noreferrer"
              href={`${apiBase}/v1/exports/${exportId}/download`}
            >
              Scarica PDF
            </a>
          ) : (
            <p className="text-sm text-slate-500">Nessun export generato.</p>
          )}
        </Card>
      ) : null}

      {sessionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Crea sessione</h2>
              <p className="text-sm text-slate-600">Inserisci dati sessione</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <Input
                value={start}
                onChange={(event) => setStart(event.target.value)}
                placeholder="2026-02-10T09:00:00Z"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                placeholder="2026-02-10T12:00:00Z"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ore pianificate</label>
              <Input
                type="number"
                value={plannedHours}
                onChange={(event) => setPlannedHours(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setSessionModalOpen(false)}
                disabled={createSession.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={createSession.isPending}
                onClick={() =>
                  createSession.mutate({
                    start,
                    end,
                    planned_hours: Number(plannedHours)
                  })
                }
              >
                {createSession.isPending ? (
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
    </div>
  );
}
