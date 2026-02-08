"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
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
  const [providerModalIndex, setProviderModalIndex] = useState<number | null>(null);
  const [contactModalIndex, setContactModalIndex] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects
  });
  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
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

  const classLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (classesQuery.data ?? []).forEach((classItem) => {
      map.set(classItem.id, `${classItem.year}${classItem.section}`);
    });
    return map;
  }, [classesQuery.data]);

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

  const formatHours = (value: number) =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Progetti PCTO</h1>
          <p className="text-slate-600">Lista progetti</p>
        </div>
        <Link
          href="/app/projects/new"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Nuovo progetto
        </Link>
      </div>
      <div className="flex gap-3">
        <Input placeholder="Cerca titolo" />
        <Input placeholder="Stato" />
        <Input placeholder="Periodo" />
      </div>
      <Card>
        {projectsQuery.isLoading ? (
          <p className="p-4 text-sm text-slate-500">Caricamento...</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Titolo</Th>
                  <Th>Classe</Th>
                  <Th>Stato</Th>
                  <Th>Periodo</Th>
                  <Th># sessioni</Th>
                  <Th>Ore totali</Th>
                  <Th>Avanzamento</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {projectsQuery.data?.map((project, index) => {
                  const status = statusLabel[project.status] ?? statusLabel.draft;
                  const sessions = sessionsByProject.get(project.id);
                  const isLoadingSessions = sessionQueries[index]?.isLoading;
                  const sessionsCount = sessions?.length ?? 0;
                  const sessionsList = sessions ?? [];
                  const attendanceForProject: Record<string, Array<{ hours: number }>> = {};
                  sessionsList.forEach((sessionItem) => {
                    if (sessionItem.status === "done") {
                      attendanceForProject[sessionItem.id] =
                        attendanceBySession[sessionItem.id] ?? [];
                    }
                  });
                  const { progressPct, label, badgeVariant } = computeProjectProgress(
                    project,
                    sessionsList,
                    attendanceForProject
                  );
                  return (
                    <tr key={project.id}>
                      <Td>{project.title}</Td>
                      <Td>{classLabelById.get(project.class_id) ?? "—"}</Td>
                      <Td>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Td>
                      <Td>
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </Td>
                      <Td>{isLoadingSessions ? "…" : sessionsCount}</Td>
                      <Td>
                        {project.total_hours !== null && project.total_hours !== undefined
                          ? formatHours(project.total_hours)
                          : "—"}
                      </Td>
                      <Td>
                        {isLoadingSessions ? (
                          "…"
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600">{progressPct}%</span>
                            <Badge variant={badgeVariant}>{label}</Badge>
                          </div>
                        )}
                      </Td>
                      <Td>
                        <Link href={`/app/projects/${project.id}`}>Apri</Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!projectsQuery.data?.length ? (
              <div className="p-4 text-sm text-slate-500">
                Nessun progetto.{" "}
                <Link href="/app/projects/new" className="text-slate-900 underline">
                  Crea progetto
                </Link>
              </div>
            ) : null}
          </>
        )}
      </Card>
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
    </div>
  );
}
