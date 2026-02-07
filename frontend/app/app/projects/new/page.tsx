"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
  const { toast } = useToast();

  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      toast({ title: "Progetto creato", variant: "success" });
      addActivity("Progetto creato");
      router.push("/app/projects");
    },
    onError: () => {
      toast({ title: "Errore creazione progetto", variant: "error" });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuovo progetto</h1>
        <p className="text-slate-600">Crea un progetto PCTO</p>
      </div>
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Data inizio</label>
            <Input
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Data fine</label>
            <Input
              placeholder="YYYY-MM-DD"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        <Button
          disabled={createProject.isPending}
          onClick={() =>
            createProject.mutate({
              title: title.trim(),
              status: status || "draft",
              start_date: startDate,
              end_date: endDate
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
    </div>
  );
}
