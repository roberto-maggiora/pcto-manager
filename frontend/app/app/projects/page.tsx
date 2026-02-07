"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

const statusLabel: Record<string, { label: string; variant: "draft" | "active" | "closed" }> = {
  draft: { label: "Bozza", variant: "draft" },
  active: { label: "Attivo", variant: "active" },
  closed: { label: "Chiuso", variant: "closed" }
};

export default function ProjectsPage() {
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
    const map = new Map<string, Array<{ planned_hours: number }>>();
    (projectsQuery.data ?? []).forEach((project, index) => {
      const data = sessionQueries[index]?.data ?? [];
      map.set(project.id, data);
    });
    return map;
  }, [projectsQuery.data, sessionQueries]);

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
                  <Th>Stato</Th>
                  <Th>Periodo</Th>
                  <Th># sessioni</Th>
                  <Th>Ore totali</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {projectsQuery.data?.map((project, index) => {
                  const status = statusLabel[project.status] ?? statusLabel.draft;
                  const sessions = sessionsByProject.get(project.id);
                  const isLoadingSessions = sessionQueries[index]?.isLoading;
                  const sessionsCount = sessions?.length ?? 0;
                  const totalHours = sessions?.reduce(
                    (sum, item) => sum + (item.planned_hours ?? 0),
                    0
                  );
                  return (
                    <tr key={project.id}>
                      <Td>{project.title}</Td>
                      <Td>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Td>
                      <Td>
                        {formatDate(project.start_date)} - {formatDate(project.end_date)}
                      </Td>
                      <Td>{isLoadingSessions ? "…" : sessionsCount}</Td>
                      <Td>{isLoadingSessions ? "…" : formatHours(totalHours ?? 0)}</Td>
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
    </div>
  );
}
