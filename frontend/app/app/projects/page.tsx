"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowUpDown, MoreHorizontal, Sparkles } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { EmptyState as FriendlyEmptyState } from "@/components/empty-state";
import type { DataTableColumnDef } from "@/components/data-table/columns";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/status-chip";
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
import { SectionContainer } from "@/components/section-container";
import { api } from "@/lib/api";
import { getProgressChip, getProjectStatusChip } from "@/lib/badges";
import { formatDate } from "@/lib/format";
import { computeProjectProgress } from "@/lib/progress";

const statusLabel: Record<string, { label: string; variant: "draft" | "active" | "closed" }> = {
  draft: { label: "Bozza", variant: "draft" },
  active: { label: "Attivo", variant: "active" },
  closed: { label: "Chiuso", variant: "closed" }
};

const activatableProjects = [
  {
    title: "Sviluppo siti web",
    description:
      "Percorso pratico per realizzare un sito completo (UX, contenuti, pubblicazione). Focus su strumenti moderni e collaborazione in team.",
    trainer: "Impakt Studio",
    category: "Digitale",
    duration: "30 ore",
    provider: {
      name: "Impakt Studio",
      bio: "Team multidisciplinare con esperienza in design, sviluppo web e progetti educativi sul territorio.",
      email: "info@impaktstudio.it",
      website: "www.impaktstudio.it"
    }
  },
  {
    title: "AI per contenuti e comunicazione",
    description:
      "Uso responsabile dell’AI per scrittura, slide, video brevi e workflow di revisione. Output: un kit comunicazione per la scuola.",
    trainer: "Roberto Maggiora",
    category: "AI",
    duration: "20 ore",
    provider: {
      name: "Roberto Maggiora",
      bio: "Consulente AI e formatore su strumenti generativi applicati alla comunicazione scolastica.",
      email: "roberto@impakt.it",
      website: "www.impakt.it"
    }
  },
  {
    title: "Cybersecurity & cittadinanza digitale",
    description:
      "Laboratorio su sicurezza online, phishing, password, privacy e comportamento digitale. Output: guida e campagna di sensibilizzazione.",
    trainer: "Impakt Academy",
    category: "Sicurezza",
    duration: "15 ore",
    provider: {
      name: "Impakt Academy",
      bio: "Percorsi formativi per studenti e docenti su cittadinanza digitale e sicurezza online.",
      email: "academy@impakt.it",
      website: "www.impakt.it/academy"
    }
  },
  {
    title: "Educazione finanziaria per studenti",
    description:
      "Budget, risparmio, interessi, rischio, obiettivi. Simulazioni e casi reali. Output: piano finanziario personale e quiz finale.",
    trainer: "FinLab",
    category: "Finanza",
    duration: "12 ore",
    provider: {
      name: "FinLab",
      bio: "Formazione finanziaria pratica per giovani, con simulazioni e casi d’uso reali.",
      email: "info@finlab.it",
      website: "www.finlab.it"
    }
  },
  {
    title: "Impresa simulata: dal problema al pitch",
    description:
      "Creazione di un’idea imprenditoriale: problema, soluzione, modello di business, go-to-market. Output: pitch deck + demo.",
    trainer: "Startup Mentor Network",
    category: "Imprenditorialità",
    duration: "25 ore",
    provider: {
      name: "Startup Mentor Network",
      bio: "Network di mentor e founder per percorsi di imprenditorialità e innovazione.",
      email: "contatti@startupmentor.it",
      website: "www.startupmentor.it"
    }
  },
  {
    title: "Design e prototipazione (Figma)",
    description:
      "Progettazione di un’app o servizio: wireframe, UI kit, prototipo cliccabile e test rapido con utenti. Output: prototipo finale.",
    trainer: "UX Studio Italia",
    category: "Design",
    duration: "18 ore",
    provider: {
      name: "UX Studio Italia",
      bio: "Studio di user experience con workshop pratici su Figma e prototipazione.",
      email: "hello@uxstudio.it",
      website: "www.uxstudio.it"
    }
  }
];

export default function ProjectsPage() {
  const router = useRouter();
  const [providerModalIndex, setProviderModalIndex] = useState<number | null>(null);
  const [contactModalIndex, setContactModalIndex] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects
  });
  const { toast } = useToast();
  useEffect(() => {
    if (projectsQuery.error) {
      toast({ title: "Errore caricamento progetti", variant: "error" });
    }
  }, [projectsQuery.error, toast]);

  const sessionQueries = useQueries({
    queries:
      projectsQuery.data?.map((project) => ({
        queryKey: ["sessions", project.id],
        queryFn: () => api.getSessions(project.id),
        enabled: !!project.id
      })) ?? []
  });

  const sessionsByProject = useMemo(() => {
    const map = new Map<
      string,
      Array<{ id: string; planned_hours: number; status: "scheduled" | "done" }>
    >();
    (projectsQuery.data ?? []).forEach((project, index) => {
      const data = sessionQueries[index]?.data ?? [];
      map.set(project.id, data);
    });
    return map;
  }, [projectsQuery.data, sessionQueries]);

  const doneSessionPairs = useMemo(
    () =>
      (projectsQuery.data ?? []).flatMap((project) => {
        const sessions = sessionsByProject.get(project.id) ?? [];
        return sessions
          .filter((sessionItem) => sessionItem.status === "done")
          .map((sessionItem) => ({ projectId: project.id, sessionId: sessionItem.id }));
      }),
    [projectsQuery.data, sessionsByProject]
  );

  const attendanceQueries = useQueries({
    queries: doneSessionPairs.map((pair) => ({
      queryKey: ["attendance", pair.sessionId],
      queryFn: () => api.getSessionAttendance(pair.sessionId),
      enabled: Boolean(pair.sessionId)
    }))
  });

  const attendanceBySession = useMemo(() => {
    const map: Record<string, Array<{ hours: number }>> = {};
    doneSessionPairs.forEach((pair, index) => {
      map[pair.sessionId] = attendanceQueries[index]?.data ?? [];
    });
    return map;
  }, [attendanceQueries, doneSessionPairs]);

  const sessionsLoadingByProject = useMemo(() => {
    const map = new Map<string, boolean>();
    (projectsQuery.data ?? []).forEach((project, index) => {
      map.set(project.id, sessionQueries[index]?.isLoading ?? false);
    });
    return map;
  }, [projectsQuery.data, sessionQueries]);

  const formatHours = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);

  const filteredProjects = useMemo(() => {
    const items = projectsQuery.data ?? [];
    return items.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }
      if (periodFilter === "all") {
        return true;
      }
      const start = new Date(project.start_date);
      const now = new Date();
      if (periodFilter === "last-30") {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return start >= cutoff;
      }
      if (periodFilter === "this-month") {
        return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
      }
      if (periodFilter === "this-year") {
        return start.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [periodFilter, projectsQuery.data, statusFilter]);

  type ProjectRow = {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string;
    total_hours?: number | null;
  };

  const columns = useMemo<DataTableColumnDef<ProjectRow>[]>(() => {
    return [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Titolo
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.title}</span>,
        meta: { label: "Titolo" }
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Stato
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        cell: ({ row }) => {
          const status = getProjectStatusChip(row.original.status);
          return <StatusChip label={status.label} tone={status.tone} withDot />;
        },
        meta: { label: "Stato" }
      },
      {
        accessorKey: "start_date",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Periodo
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-slate-600">
            {formatDate(row.original.start_date)} - {formatDate(row.original.end_date)}
          </span>
        ),
        meta: { label: "Periodo" }
      },
      {
        id: "sessions",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            # sessioni
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => {
          const sessions = sessionsByProject.get(row.id) ?? [];
          return sessions.length;
        },
        cell: ({ row }) => {
          const isLoadingSessions = sessionsLoadingByProject.get(row.original.id);
          const sessions = sessionsByProject.get(row.original.id);
          return isLoadingSessions ? "…" : sessions?.length ?? 0;
        },
        meta: { label: "# sessioni" }
      },
      {
        accessorKey: "total_hours",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Ore totali
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        cell: ({ row }) =>
          row.original.total_hours !== null && row.original.total_hours !== undefined
            ? formatHours(row.original.total_hours)
            : "—",
        meta: { label: "Ore totali" }
      },
      {
        id: "progress",
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 text-left"
            onClick={column.getToggleSortingHandler()}
          >
            Avanzamento
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        ),
        accessorFn: (row) => {
          const sessions = sessionsByProject.get(row.id) ?? [];
          const attendanceForProject: Record<string, Array<{ hours: number }>> = {};
          sessions.forEach((sessionItem) => {
            if (sessionItem.status === "done") {
              attendanceForProject[sessionItem.id] = attendanceBySession[sessionItem.id] ?? [];
            }
          });
          return computeProjectProgress(row, sessions, attendanceForProject).progressPct;
        },
        cell: ({ row }) => {
          const sessions = sessionsByProject.get(row.original.id) ?? [];
          const attendanceForProject: Record<string, Array<{ hours: number }>> = {};
          sessions.forEach((sessionItem) => {
            if (sessionItem.status === "done") {
              attendanceForProject[sessionItem.id] = attendanceBySession[sessionItem.id] ?? [];
            }
          });
          const { progressPct, label } = computeProjectProgress(
            row.original,
            sessions,
            attendanceForProject
          );
          const progressChip = getProgressChip(label);
          const isLoadingSessions = sessionsLoadingByProject.get(row.original.id);
          return isLoadingSessions ? (
            "…"
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{progressPct}%</span>
              <StatusChip label={progressChip.label} tone={progressChip.tone} withDot />
            </div>
          );
        },
        meta: { label: "Avanzamento" }
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
                    router.push(`/app/projects/${row.original.id}`);
                  }}
                >
                  Apri
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    toast({ title: "Modifica progetto (demo)", variant: "success" });
                  }}
                >
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    toast({ title: "Elimina progetto (demo)", variant: "error" });
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
  }, [attendanceBySession, router, sessionsByProject, sessionsLoadingByProject, toast]);

  return (
    <SectionContainer section="projects" className="space-y-8">
      <PageHeader title="Progetti PCTO" description="Lista progetti" />
      <DataTable
        columns={columns}
        data={filteredProjects}
        loading={projectsQuery.isLoading}
        onRowClick={(row) => router.push(`/app/projects/${row.id}`)}
        toolbar={({ table, globalFilter, setGlobalFilter, resultCount }) => (
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            resultCount={resultCount}
            action={
              <Button onClick={() => router.push("/app/projects/new")}>
                Nuovo progetto
              </Button>
            }
            filters={
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Stato</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="draft">Bozza</option>
                    <option value="active">Attivo</option>
                    <option value="closed">Completato</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Periodo</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                  >
                    <option value="all">Tutti</option>
                    <option value="last-30">Ultimi 30 giorni</option>
                    <option value="this-month">Questo mese</option>
                    <option value="this-year">Quest’anno</option>
                  </select>
                </div>
              </div>
            }
          />
        )}
        emptyState={
          <FriendlyEmptyState
            title="Ancora nessun progetto PCTO"
            description="Crea il primo progetto oppure attiva un percorso preconfezionato."
            actionLabel="Crea progetto"
            onAction={() => router.push("/app/projects/new")}
            icon={Sparkles}
          />
        }
      />
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Progetti attivabili</h2>
          <p className="text-sm text-slate-600">
            Percorsi PCTO preconfezionati attivabili con fornitori sul territorio (demo).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {activatableProjects.map((project, index) => (
            <Card key={project.title} className="space-y-3 p-4">
              <div>
                <h3 className="text-lg font-semibold">{project.title}</h3>
                <p className="text-sm text-slate-600">{project.description}</p>
              </div>
              <p className="text-sm text-slate-500">Formatore: {project.trainer}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="draft">Categoria: {project.category}</Badge>
                <Badge variant="active">Durata: {project.duration}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onClick={() => toast({ title: "Download scheda progetto (demo)" })}
                >
                  Scarica scheda
                </button>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                  onClick={() => {
                    setContactModalIndex(index);
                  }}
                >
                  Contatta
                </button>
                <button
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  onClick={() => setProviderModalIndex(index)}
                >
                  Vedi formatore
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {providerModalIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">
                {activatableProjects[providerModalIndex].provider.name}
              </h2>
              <p className="text-sm text-slate-600">
                {activatableProjects[providerModalIndex].provider.bio}
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div>Email: {activatableProjects[providerModalIndex].provider.email}</div>
              <div>Sito: {activatableProjects[providerModalIndex].provider.website}</div>
            </div>
            <div className="flex justify-end">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                onClick={() => setProviderModalIndex(null)}
              >
                Chiudi
              </button>
            </div>
          </Card>
        </div>
      ) : null}
      {contactModalIndex !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-medium">Contatta formatore</h2>
              <p className="text-sm text-slate-600">
                Invia una richiesta al fornitore per attivare il percorso (demo).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Referente scuola</label>
              <Input
                placeholder="Nome e cognome"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note</label>
              <textarea
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                rows={4}
                placeholder="Es. periodo preferito, numero studenti, richieste specifiche..."
                value={contactNotes}
                onChange={(event) => setContactNotes(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                onClick={() => {
                  setContactModalIndex(null);
                  setContactName("");
                  setContactNotes("");
                }}
              >
                Annulla
              </button>
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
                onClick={() => {
                  if (!contactName.trim()) {
                    toast({ title: "Referente scuola obbligatorio", variant: "error" });
                    return;
                  }
                  setContactModalIndex(null);
                  setContactName("");
                  setContactNotes("");
                  toast({ title: "Richiesta inviata al fornitore (demo)" });
                }}
              >
                Invia richiesta
              </button>
            </div>
          </Card>
        </div>
      ) : null}
    </SectionContainer>
  );
}
