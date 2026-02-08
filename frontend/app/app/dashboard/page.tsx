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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-600">Panoramica attività PCTO</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          <>
            <Card className="h-24 animate-pulse bg-slate-100" />
            <Card className="h-24 animate-pulse bg-slate-100" />
            <Card className="h-24 animate-pulse bg-slate-100" />
            <Card className="h-24 animate-pulse bg-slate-100" />
          </>
        ) : (
          <>
            <Card className="space-y-1 shadow-sm">
              <div className="text-sm text-slate-500"># Progetti</div>
              <div className="text-2xl font-semibold">{kpis.totalProjects}</div>
            </Card>
            <Card className="space-y-1 shadow-sm">
              <div className="text-sm text-slate-500"># Sessioni</div>
              <div className="text-2xl font-semibold">{kpis.totalSessions}</div>
            </Card>
            <Card className="space-y-1 shadow-sm">
              <div className="text-sm text-slate-500">Ore totali registrate</div>
              <div className="text-2xl font-semibold">
                {formatHours(kpis.totalHours)}
              </div>
            </Card>
            <Card className="space-y-1 shadow-sm">
              <div className="text-sm text-slate-500">% Presenza media</div>
              <div className="text-2xl font-semibold">{kpis.presenceAvg}%</div>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-72 shadow-sm">
          <div className="mb-2 text-sm text-slate-500">Ore registrate nel tempo</div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-md bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#0f172a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="h-72 shadow-sm">
          <div className="mb-2 text-sm text-slate-500">Ore per classe</div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-md bg-slate-100" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#1e293b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="shadow-sm">
        <div className="text-sm text-slate-500">Attività recenti</div>
        {activities.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nessuna attività recente.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {activities.map((item) => (
              <li key={item.id} className="flex items-center justify-between">
                <span>{item.message}</span>
                <span className="text-xs text-slate-400">
                  {formatDate(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
