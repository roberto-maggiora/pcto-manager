"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { addActivity } from "@/lib/activity";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { computeProjectProgress } from "@/lib/progress";

type TabKey = "overview" | "sessions" | "attendance" | "exports";
type InlineSessionRow = {
  id: string;
  start: string;
  end: string;
  plannedHours: string;
  topic: string;
  status: "scheduled" | "done";
};

const statusLabel: Record<string, { label: string; variant: "draft" | "active" | "closed" }> = {
  draft: { label: "Bozza", variant: "draft" },
  active: { label: "Attivo", variant: "active" },
  closed: { label: "Chiuso", variant: "closed" }
};

const sessionStatusLabel: Record<
  "scheduled" | "done",
  { label: string; variant: "scheduled" | "done" }
> = {
  scheduled: { label: "Programmata", variant: "scheduled" },
  done: { label: "Svolta", variant: "done" }
};

const toLocalInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  const [tab, setTab] = useState<TabKey>("overview");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [plannedHours, setPlannedHours] = useState("");
  const [topic, setTopic] = useState("");
  const [sessionStatus, setSessionStatus] = useState<"scheduled" | "done">("scheduled");
  const [editSessionId, setEditSessionId] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editPlannedHours, setEditPlannedHours] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editSessionStatus, setEditSessionStatus] = useState<"scheduled" | "done">(
    "scheduled"
  );
  const [markDoneSessionId, setMarkDoneSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [filterClassId, setFilterClassId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("draft");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editTotalHours, setEditTotalHours] = useState("");
  const [editClassId, setEditClassId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSchoolTutor, setEditSchoolTutor] = useState("");
  const [editProviderExpert, setEditProviderExpert] = useState("");
  const [inlineRows, setInlineRows] = useState<InlineSessionRow[]>([]);
  const [savingInlineRowId, setSavingInlineRowId] = useState<string | null>(null);
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

  const doneSessions = useMemo(
    () => (sessionsQuery.data ?? []).filter((sessionItem) => sessionItem.status === "done"),
    [sessionsQuery.data]
  );

  const doneAttendanceQueries = useQueries({
    queries: doneSessions.map((sessionItem) => ({
      queryKey: ["attendance", sessionItem.id],
      queryFn: () => api.getSessionAttendance(sessionItem.id),
      enabled: tab === "overview" || tab === "sessions"
    }))
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
    mutationFn: (payload: {
      start: string;
      end: string;
      planned_hours: number;
      topic?: string | null;
      status?: "scheduled" | "done";
    }) => api.createSession(params.projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setSessionModalOpen(false);
      setStart("");
      setEnd("");
      setPlannedHours("");
      setTopic("");
      setSessionStatus("scheduled");
      toast({ title: "Sessione creata" });
    },
    onError: () => {
      toast({ title: "Errore creazione sessione", variant: "error" });
    }
  });

  const createInlineSession = useMutation({
    mutationFn: (payload: {
      rowId: string;
      start: string;
      end: string;
      planned_hours: number;
      topic?: string | null;
      status?: "scheduled" | "done";
    }) =>
      api.createSession(params.projectId, {
        start: payload.start,
        end: payload.end,
        planned_hours: payload.planned_hours,
        topic: payload.topic,
        status: payload.status
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setInlineRows((prev) => prev.filter((row) => row.id !== variables.rowId));
      setSavingInlineRowId(null);
      toast({ title: "Sessione creata", variant: "success" });
    },
    onError: () => {
      setSavingInlineRowId(null);
      toast({ title: "Errore creazione sessione", variant: "error" });
    }
  });

  const updateSession = useMutation({
    mutationFn: (payload: {
      sessionId: string;
      start: string;
      end: string;
      planned_hours: number;
      topic?: string | null;
      status?: "scheduled" | "done";
    }) =>
      api.patchSession(payload.sessionId, {
        start: payload.start,
        end: payload.end,
        planned_hours: payload.planned_hours,
        topic: payload.topic,
        status: payload.status
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setEditSessionOpen(false);
      toast({ title: "Sessione aggiornata", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore aggiornamento sessione", variant: "error" });
    }
  });

  const removeSession = useMutation({
    mutationFn: (sessionId: string) => api.deleteSession(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setDeleteSessionId(null);
      toast({ title: "Sessione eliminata", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore eliminazione sessione", variant: "error" });
    }
  });

  const removeProject = useMutation({
    mutationFn: () => api.deleteProject(params.projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setDeleteProjectOpen(false);
      toast({ title: "Progetto eliminato", variant: "success" });
      window.location.href = "/app/projects";
    },
    onError: () => {
      toast({ title: "Errore eliminazione progetto", variant: "error" });
    }
  });

  const markSessionDone = useMutation({
    mutationFn: (sessionId: string) =>
      api.patchSession(sessionId, { status: "done" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setMarkDoneSessionId(null);
      toast({ title: "Sessione segnata come svolta", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore aggiornamento sessione", variant: "error" });
    }
  });

  const updateProject = useMutation({
    mutationFn: (payload: {
      title?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      class_id?: string;
      description?: string | null;
      school_tutor_name?: string | null;
      provider_expert_name?: string | null;
      total_hours?: number | null;
    }) => api.patchProject(params.projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Progetto aggiornato", variant: "success" });
    },
    onError: () => {
      toast({ title: "Errore aggiornamento progetto", variant: "error" });
    }
  });

  const saveAttendance = useMutation({
    mutationFn: (payload: Array<{ student_id: string; status: string; hours: number }>) =>
      api.postAttendance(selectedSessionId, payload),
    onSuccess: async (data, variables) => {
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
      if (selectedSession?.status === "scheduled") {
        setMarkDoneSessionId(selectedSession.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["project", params.projectId] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance"] });
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
    if (!projectQuery.data) {
      return;
    }
    setEditTitle(projectQuery.data.title ?? "");
    setEditStatus(projectQuery.data.status);
    setEditStartDate(projectQuery.data.start_date ?? "");
    setEditEndDate(projectQuery.data.end_date ?? "");
    setEditTotalHours(
      projectQuery.data.total_hours !== null && projectQuery.data.total_hours !== undefined
        ? String(projectQuery.data.total_hours)
        : ""
    );
    setEditClassId(projectQuery.data.class_id ?? "");
    setEditDescription(projectQuery.data.description ?? "");
    setEditSchoolTutor(projectQuery.data.school_tutor_name ?? "");
    setEditProviderExpert(projectQuery.data.provider_expert_name ?? "");
  }, [projectQuery.data]);

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
  const selectedSession = useMemo(
    () => (sessionsQuery.data ?? []).find((item) => item.id === selectedSessionId),
    [selectedSessionId, sessionsQuery.data]
  );

  const totalHours =
    projectQuery.data?.total_hours !== undefined ? projectQuery.data?.total_hours : null;

  const hasFutureScheduled = useMemo(() => {
    const now = Date.now();
    return (sessionsQuery.data ?? []).some(
      (sessionItem) =>
        sessionItem.status === "scheduled" &&
        new Date(sessionItem.start).getTime() > now
    );
  }, [sessionsQuery.data]);

  const attendanceByDoneSession = useMemo(() => {
    const map: Record<string, Array<{ hours: number }>> = {};
    doneSessions.forEach((sessionItem, index) => {
      map[sessionItem.id] = doneAttendanceQueries[index]?.data ?? [];
    });
    return map;
  }, [doneAttendanceQueries, doneSessions]);

  const { usedHours, progressPct, label: progressLabel, badgeVariant: progressVariant } =
    computeProjectProgress(
    projectQuery.data ?? {},
    sessionsQuery.data ?? [],
    attendanceByDoneSession
  );

  const formatHours = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);

  const sessionOptions = useMemo(
    () => sessionsQuery.data ?? [],
    [sessionsQuery.data]
  );

  const addInlineRow = () => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setInlineRows((prev) => [
      {
        id,
        start: "",
        end: "",
        plannedHours: "",
        topic: "",
        status: "scheduled"
      },
      ...prev
    ]);
  };

  const updateInlineRow = (rowId: string, patch: Partial<InlineSessionRow>) => {
    setInlineRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  };

  const removeInlineRow = (rowId: string) => {
    setInlineRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const saveInlineRow = (row: InlineSessionRow) => {
    if (!row.start || !row.end || Number(row.plannedHours) <= 0) {
      toast({ title: "Completa inizio, fine e ore pianificate", variant: "error" });
      return;
    }
    setSavingInlineRowId(row.id);
    createInlineSession.mutate({
      rowId: row.id,
      start: new Date(row.start).toISOString(),
      end: new Date(row.end).toISOString(),
      planned_hours: Number(row.plannedHours),
      topic: row.topic.trim() || null,
      status: row.status
    });
  };

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
          <Button
            variant="secondary"
            disabled={removeProject.isPending}
            onClick={() => setDeleteProjectOpen(true)}
            className="text-rose-600"
          >
            {removeProject.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
                Eliminazione
              </span>
            ) : (
              "Elimina progetto"
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
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Panoramica</h2>
              <p className="text-slate-600">KPI e dati progetto</p>
            </div>
            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Ore svolte</p>
                  <p className="text-lg font-semibold">{formatHours(usedHours)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ore totali</p>
                  <p className="text-lg font-semibold">
                    {totalHours && totalHours > 0 ? formatHours(totalHours) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avanzamento</p>
                  <p className="text-lg font-semibold">{progressPct}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Stato</p>
                  <Badge variant={progressVariant}>{progressLabel}</Badge>
                </div>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            {!hasFutureScheduled ? (
              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Nessuna sessione programmata</p>
                    <p className="text-sm text-slate-600">
                      Aggiungi una sessione futura per organizzare il calendario.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setSessionStatus("scheduled");
                      setSessionModalOpen(true);
                    }}
                  >
                    Aggiungi sessione programmata
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Titolo</label>
                <Input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stato</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value)}
                >
                  <option value="draft">Bozza</option>
                  <option value="active">Attivo</option>
                  <option value="closed">Chiuso</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Classe</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={editClassId}
                  onChange={(event) => setEditClassId(event.target.value)}
                >
                  <option value="">Seleziona classe</option>
                  {(classesQuery.data ?? []).map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.year}
                      {classItem.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Data inizio</label>
                <Input
                  type="date"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data fine</label>
                <Input
                  type="date"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Ore totali PCTO</label>
                <Input
                  type="number"
                  step="0.5"
                  value={editTotalHours}
                  onChange={(event) => setEditTotalHours(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tutor scolastico</label>
                <Input
                  value={editSchoolTutor}
                  onChange={(event) => setEditSchoolTutor(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Esperto/fornitore</label>
                <Input
                  value={editProviderExpert}
                  onChange={(event) => setEditProviderExpert(event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Descrizione</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  rows={4}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </div>
            </div>
            <div>
              <Button
                disabled={updateProject.isPending || !editClassId}
                onClick={() =>
                  updateProject.mutate({
                    title: editTitle.trim() || undefined,
                    status: editStatus,
                    start_date: editStartDate || undefined,
                    end_date: editEndDate || undefined,
                    class_id: editClassId || undefined,
                    description: editDescription.trim() || null,
                    school_tutor_name: editSchoolTutor.trim() || null,
                    provider_expert_name: editProviderExpert.trim() || null,
                    total_hours: editTotalHours ? Number(editTotalHours) : null
                  })
                }
              >
                {updateProject.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvataggio
                  </span>
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {tab === "sessions" ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Sessioni</h2>
            <Button variant="secondary" onClick={addInlineRow}>
              Aggiungi riga
            </Button>
          </div>
          {sessionsQuery.isLoading ? (
            <p className="p-4 text-sm text-slate-500">Caricamento...</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Inizio</Th>
                  <Th>Fine</Th>
                  <Th>Ore pianificate</Th>
                  <Th>Argomento</Th>
                  <Th>Stato</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {inlineRows.map((row) => (
                  <tr key={row.id} className="bg-slate-50">
                    <Td>
                      <Input
                        type="datetime-local"
                        value={row.start}
                        onChange={(event) =>
                          updateInlineRow(row.id, { start: event.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        type="datetime-local"
                        value={row.end}
                        onChange={(event) =>
                          updateInlineRow(row.id, { end: event.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        type="number"
                        step="0.5"
                        value={row.plannedHours}
                        onChange={(event) =>
                          updateInlineRow(row.id, { plannedHours: event.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <Input
                        value={row.topic}
                        onChange={(event) =>
                          updateInlineRow(row.id, { topic: event.target.value })
                        }
                      />
                    </Td>
                    <Td>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={row.status}
                        onChange={(event) =>
                          updateInlineRow(row.id, {
                            status: event.target.value as "scheduled" | "done"
                          })
                        }
                      >
                        <option value="scheduled">Programmata</option>
                        <option value="done">Svolta</option>
                      </select>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-60"
                          disabled={savingInlineRowId === row.id}
                          onClick={() => saveInlineRow(row)}
                        >
                          {savingInlineRowId === row.id ? "Salvataggio" : "Salva"}
                        </button>
                        <button
                          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                          onClick={() => removeInlineRow(row.id)}
                        >
                          Annulla
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
                {sessionsQuery.data?.map((item) => (
                  <tr key={item.id}>
                    <Td>{formatDateTime(item.start)}</Td>
                    <Td>{formatDateTime(item.end)}</Td>
                    <Td>{item.planned_hours}</Td>
                    <Td>{item.topic ?? "—"}</Td>
                    <Td>
                      <Badge variant={sessionStatusLabel[item.status].variant}>
                        {sessionStatusLabel[item.status].label}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="text-sm text-slate-600 underline"
                          onClick={() => {
                            setEditSessionId(item.id);
                            setEditStart(toLocalInput(item.start));
                            setEditEnd(toLocalInput(item.end));
                            setEditPlannedHours(String(item.planned_hours));
                            setEditTopic(item.topic ?? "");
                            setEditSessionStatus(item.status);
                            setEditSessionOpen(true);
                          }}
                        >
                          Modifica
                        </button>
                        <button
                          className="text-sm text-rose-600 underline"
                          onClick={() => setDeleteSessionId(item.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </Td>
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
                type="datetime-local"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stato sessione</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={sessionStatus}
                onChange={(event) =>
                  setSessionStatus(event.target.value as "scheduled" | "done")
                }
              >
                <option value="scheduled">Programmata</option>
                <option value="done">Svolta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ore pianificate</label>
              <Input
                type="number"
                value={plannedHours}
                onChange={(event) => setPlannedHours(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Argomento</label>
              <Input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
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
                    start: start ? new Date(start).toISOString() : start,
                    end: end ? new Date(end).toISOString() : end,
                    planned_hours: Number(plannedHours),
                    topic: topic.trim() || null,
                    status: sessionStatus
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
      {editSessionOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Modifica sessione</h2>
              <p className="text-sm text-slate-600">Aggiorna i dati della sessione</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Start</label>
              <Input
                type="datetime-local"
                value={editStart}
                onChange={(event) => setEditStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End</label>
              <Input
                type="datetime-local"
                value={editEnd}
                onChange={(event) => setEditEnd(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Stato sessione</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={editSessionStatus}
                onChange={(event) =>
                  setEditSessionStatus(event.target.value as "scheduled" | "done")
                }
              >
                <option value="scheduled">Programmata</option>
                <option value="done">Svolta</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ore pianificate</label>
              <Input
                type="number"
                value={editPlannedHours}
                onChange={(event) => setEditPlannedHours(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Argomento</label>
              <Input
                value={editTopic}
                onChange={(event) => setEditTopic(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditSessionOpen(false)}
                disabled={updateSession.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={updateSession.isPending}
                onClick={() =>
                  updateSession.mutate({
                    sessionId: editSessionId,
                    start: editStart ? new Date(editStart).toISOString() : editStart,
                    end: editEnd ? new Date(editEnd).toISOString() : editEnd,
                    planned_hours: Number(editPlannedHours),
                    topic: editTopic.trim() || null,
                    status: editSessionStatus
                  })
                }
              >
                {updateSession.isPending ? (
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
      {deleteSessionId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Elimina sessione</h2>
              <p className="text-sm text-slate-600">
                Questa operazione elimina anche le presenze della sessione.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteSessionId(null)}
                disabled={removeSession.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={removeSession.isPending}
                onClick={() => removeSession.mutate(deleteSessionId)}
                className="text-rose-600"
              >
                {removeSession.isPending ? (
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
      {deleteProjectOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Elimina progetto</h2>
              <p className="text-sm text-slate-600">
                Questa operazione elimina anche sessioni e presenze.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteProjectOpen(false)}
                disabled={removeProject.isPending}
              >
                Annulla
              </Button>
              <Button
                disabled={removeProject.isPending}
                onClick={() => removeProject.mutate()}
                className="text-rose-600"
              >
                {removeProject.isPending ? (
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
      {markDoneSessionId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Presenze salvate</h2>
              <p className="text-sm text-slate-600">
                Vuoi segnare questa sessione come svolta?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setMarkDoneSessionId(null)}
                disabled={markSessionDone.isPending}
              >
                Non ora
              </Button>
              <Button
                onClick={() => markSessionDone.mutate(markDoneSessionId)}
                disabled={markSessionDone.isPending}
              >
                {markSessionDone.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvataggio
                  </span>
                ) : (
                  "Segna come svolta"
                )}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
