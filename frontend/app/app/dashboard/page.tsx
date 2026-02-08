"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card } from "@/components/ui/card";
import { CardSkeleton } from "@/components/skeletons";
import { PageHeader } from "@/components/page-header";
import { SectionContainer } from "@/components/section-container";
import { EmptyState } from "@/components/empty-state";
import { Activity, BarChart3 } from "lucide-react";
import { api } from "@/lib/api";
import { getActivities } from "@/lib/activity";
import { formatDate } from "@/lib/format";

function formatHours(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function getLast30Days() {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

export default function DashboardPage() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects
  });
  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: api.getClasses
  });
  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => api.getStudents()
  });

  const sessionsQueries = useQueries({
    queries:
      projectsQuery.data?.map((project) => ({
        queryKey: ["sessions", project.id],
        queryFn: () => api.getSessions(project.id),
        enabled: !!project.id
      })) ?? []
  });

  const sessions = useMemo(
    () => sessionsQueries.flatMap((query) => query.data ?? []),
    [sessionsQueries]
  );

  const attendanceQueries = useQueries({
    queries: sessions.map((sessionItem) => ({
      queryKey: ["attendance", sessionItem.id],
      queryFn: () => api.getSessionAttendance(sessionItem.id),
      enabled: !!sessionItem.id
    }))
  });

  const attendanceRows = useMemo(() => {
    return attendanceQueries.flatMap((query, index) => {
      const sessionItem = sessions[index];
      if (!sessionItem) return [];
      return (query.data ?? []).map((row) => ({
        ...row,
        sessionStart: sessionItem.start
      }));
    });
  }, [attendanceQueries, sessions]);

  const loading =
    projectsQuery.isLoading ||
    classesQuery.isLoading ||
    studentsQuery.isLoading ||
    sessionsQueries.some((query) => query.isLoading) ||
    attendanceQueries.some((query) => query.isLoading);

  const kpis = useMemo(() => {
    const totalProjects = projectsQuery.data?.length ?? 0;
    const totalSessions = sessions.length;
    const totalHours = attendanceRows.reduce((sum, row) => sum + row.hours, 0);
    const presentCount = attendanceRows.filter((row) => row.status === "present").length;
    const presenceAvg =
      attendanceRows.length > 0
        ? Math.round((presentCount / attendanceRows.length) * 100)
        : 0;
    return { totalProjects, totalSessions, totalHours, presenceAvg };
  }, [attendanceRows, projectsQuery.data, sessions.length]);

  const lineData = useMemo(() => {
    const dateMap = new Map<string, number>();
    attendanceRows.forEach((row) => {
      const dateKey = row.sessionStart.slice(0, 10);
      dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + row.hours);
    });
    const last30 = getLast30Days();
    return last30.map((date) => ({
      date,
      label: formatDate(date),
      hours: dateMap.get(date) ?? 0
    }));
  }, [attendanceRows]);

  const barData = useMemo(() => {
    const studentToClass = new Map(
      (studentsQuery.data ?? []).map((student) => [student.id, student.class_id])
    );
    const classLabel = new Map(
      (classesQuery.data ?? []).map((cls) => [cls.id, `${cls.year}${cls.section}`])
    );
    const classHours = new Map<string, number>();
    attendanceRows.forEach((row) => {
      const classId = studentToClass.get(row.student_id);
      if (!classId) return;
      classHours.set(classId, (classHours.get(classId) ?? 0) + row.hours);
    });
    return Array.from(classHours.entries()).map(([classId, hours]) => ({
      classId,
      label: classLabel.get(classId) ?? "Classe",
      hours
    }));
  }, [attendanceRows, classesQuery.data, studentsQuery.data]);

  const activities = useMemo(() => getActivities().slice(0, 5), []);

  return (
    <SectionContainer section="dashboard" className="space-y-8">
      <PageHeader title="Dashboard" description="Panoramica attività PCTO" />

      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <Card className="space-y-1 border-l-4 border-l-[var(--primary)]/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                # Progetti
              </div>
              <div className="text-3xl font-semibold">{kpis.totalProjects}</div>
              <div className="text-xs text-slate-500">Ultimi 30 giorni</div>
            </Card>
            <Card className="space-y-1 border-l-4 border-l-[var(--primary)]/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                # Sessioni
              </div>
              <div className="text-3xl font-semibold">{kpis.totalSessions}</div>
              <div className="text-xs text-slate-500">Ultimi 30 giorni</div>
            </Card>
            <Card className="space-y-1 border-l-4 border-l-[var(--primary)]/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ore totali registrate
              </div>
              <div className="text-3xl font-semibold">{formatHours(kpis.totalHours)}</div>
              <div className="text-xs text-slate-500">Ultimi 30 giorni</div>
            </Card>
            <Card className="space-y-1 border-l-4 border-l-[var(--primary)]/60">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                % Presenza media
              </div>
              <div className="text-3xl font-semibold">{kpis.presenceAvg}%</div>
              <div className="text-xs text-slate-500">Ultimi 30 giorni</div>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-72">
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Ore registrate nel tempo
          </div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-md bg-slate-100/80" />
          ) : lineData.every((row) => row.hours === 0) ? (
            <EmptyState
              title="Nessun dato da mostrare"
              description="Registra una prima sessione per vedere l’andamento."
              icon={Activity}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "var(--border)",
                    boxShadow: "var(--shadow-sm)"
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                />
                <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="h-72">
          <div className="mb-2 text-sm font-semibold text-slate-700">Ore per classe</div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-md bg-slate-100/80" />
          ) : barData.length === 0 ? (
            <EmptyState
              title="Nessun dato da mostrare"
              description="Registra presenze per popolare il grafico."
              icon={BarChart3}
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "var(--border)",
                    boxShadow: "var(--shadow-sm)"
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                />
                <Bar dataKey="hours" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-slate-700">Attività recenti</div>
        {activities.length === 0 ? (
          <EmptyState
            title="Nessuna attività recente"
            description="Le azioni appariranno qui man mano che lavori."
            icon={Activity}
          />
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {activities.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <span>{item.message}</span>
                <span className="text-xs text-slate-400">
                  {formatDate(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </SectionContainer>
  );
}
