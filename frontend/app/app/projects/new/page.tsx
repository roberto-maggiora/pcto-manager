"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SectionContainer } from "@/components/section-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { addActivity } from "@/lib/activity";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalHours, setTotalHours] = useState("");
  const [classId, setClassId] = useState("");
  const [description, setDescription] = useState("");
  const [schoolTutor, setSchoolTutor] = useState("");
  const [providerExpert, setProviderExpert] = useState("");
  const { toast } = useToast();

  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });

  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: (data) => {
      toast({ title: "Progetto creato", variant: "success" });
      addActivity("Progetto creato");
      router.push(`/app/projects/${data.id}`);
    },
    onError: () => {
      toast({ title: "Errore creazione progetto", variant: "error" });
    }
  });

  return (
    <SectionContainer section="projects" className="space-y-8">
      <PageHeader title="Nuovo progetto" description="Crea un progetto PCTO" />
      <Card className="space-y-4">
        <div>
          <label className="text-sm font-medium">Titolo</label>
          <Input
            placeholder="Titolo progetto"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Stato</label>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="draft">Bozza</option>
            <option value="active">Attivo</option>
            <option value="closed">Chiuso</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Classe</label>
          <select
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Data inizio</label>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data fine</label>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Ore totali PCTO</label>
          <Input
            type="number"
            step="0.5"
            value={totalHours}
            onChange={(event) => setTotalHours(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Descrizione</label>
          <textarea
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Tutor scolastico</label>
          <Input
            value={schoolTutor}
            onChange={(event) => setSchoolTutor(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Esperto/fornitore</label>
          <Input
            value={providerExpert}
            onChange={(event) => setProviderExpert(event.target.value)}
          />
        </div>
        <Button
          disabled={createProject.isPending || !classId}
          onClick={() =>
            createProject.mutate({
              title: title.trim(),
              status: status || "draft",
              start_date: startDate,
              end_date: endDate,
              class_id: classId,
              description: description.trim() || null,
              school_tutor_name: schoolTutor.trim() || null,
              provider_expert_name: providerExpert.trim() || null,
              total_hours: totalHours ? Number(totalHours) : null
            })
          }
        >
          {createProject.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Salvataggio
            </span>
          ) : (
            "Crea progetto"
          )}
        </Button>
      </Card>
    </SectionContainer>
  );
}
