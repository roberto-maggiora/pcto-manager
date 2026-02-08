"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const statusLabel: Record<string, { label: string; variant: "draft" | "active" | "closed" }> = {
  draft: { label: "Bozza", variant: "draft" },
  active: { label: "Attivo", variant: "active" },
  closed: { label: "Chiuso", variant: "closed" }
};

const formatHours = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

export default function StudentDetailPage({ params }: { params: { studentId: string } }) {
  const { toast } = useToast();
  const summaryQuery = useQuery({
    queryKey: ["student-summary", params.studentId],
    queryFn: () => api.getStudentSummary(params.studentId)
  });

  useEffect(() => {
    if (summaryQuery.error) {
      toast({ title: "Errore caricamento studente", variant: "error" });
    }
  }, [summaryQuery.error, toast]);

  const summary = summaryQuery.data;
  const required = summary?.pcto_required_hours ?? 150;
  const completed = summary?.completed_hours_total ?? 0;
  const remaining = Math.max(0, required - completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {summary ? `${summary.last_name} ${summary.first_name}` : "Studente"}
        </h1>
        <p className="text-slate-600">
          {summary ? `Classe ${summary.class_year}${summary.class_section}` : "—"}
        </p>
      </div>

      <Card className="space-y-2">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Ore richieste</p>
            <p className="text-lg font-semibold">{formatHours(required)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Ore svolte</p>
            <p className="text-lg font-semibold">{formatHours(completed)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Ore mancanti</p>
            <p className="text-lg font-semibold">{formatHours(remaining)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <h2 className="text-lg font-medium">Ore per progetto</h2>
        </div>
        {summaryQuery.isLoading ? (
          <p className="p-4 text-sm text-slate-500">Caricamento...</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Progetto</Th>
                  <Th>Stato</Th>
                  <Th>Ore svolte</Th>
                  <Th>Ultima sessione</Th>
                  <Th>Azioni</Th>
                </tr>
              </thead>
              <tbody>
                {(summary?.by_project ?? []).map((item) => {
                  const status = statusLabel[item.status] ?? statusLabel.draft;
                  return (
                    <tr key={item.project_id}>
                      <Td>{item.title}</Td>
                      <Td>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </Td>
                      <Td>{formatHours(item.completed_hours)}</Td>
                      <Td>
                        {item.last_session_end ? formatDateTime(item.last_session_end) : "—"}
                      </Td>
                      <Td>
                        <Link href={`/app/projects/${item.project_id}`}>Apri progetto</Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            {!summary?.by_project?.length ? (
              <div className="p-4 text-sm text-slate-500">
                Nessun progetto con ore registrate.
              </div>
            ) : null}
          </>
        )}
      </Card>
    </div>
  );
}
