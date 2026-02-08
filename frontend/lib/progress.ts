type ProjectLike = {
  total_hours?: number | null;
};

type SessionLike = {
  id: string;
  status: "scheduled" | "done";
  planned_hours: number;
};

type AttendanceLike = {
  hours: number;
};

export type ProgressBadgeVariant = "draft" | "active" | "closed";

export function computeProjectProgress(
  project: ProjectLike,
  sessions: SessionLike[],
  attendanceBySession: Record<string, AttendanceLike[]>
) {
  const doneSessions = sessions.filter((sessionItem) => sessionItem.status === "done");
  const completedHours = doneSessions.reduce((sum, sessionItem) => {
    const rows = attendanceBySession[sessionItem.id] ?? [];
    const hours = rows.reduce((acc, row) => acc + (row.hours ?? 0), 0);
    return sum + hours;
  }, 0);
  const hasAttendanceHours = completedHours > 0;
  const plannedDoneHours = doneSessions.reduce(
    (sum, sessionItem) => sum + (sessionItem.planned_hours ?? 0),
    0
  );
  const usedHours = hasAttendanceHours ? completedHours : plannedDoneHours;
  const totalHours = project.total_hours ?? 0;
  const progressPct =
    totalHours > 0 ? Math.min(100, Math.round((usedHours / totalHours) * 100)) : 0;
  let label: "Non iniziato" | "In corso" | "Completato" = "In corso";
  if (usedHours <= 0 || progressPct === 0) {
    label = "Non iniziato";
  } else if (progressPct >= 100) {
    label = "Completato";
  }

  const badgeVariant: ProgressBadgeVariant =
    label === "Non iniziato" ? "draft" : label === "Completato" ? "closed" : "active";

  return { usedHours, progressPct, label, badgeVariant };
}
