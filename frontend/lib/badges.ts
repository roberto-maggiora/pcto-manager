export function getProjectStatusChip(status: string) {
  if (status === "active") {
    return { label: "Attivo", tone: "success" as const };
  }
  if (status === "closed") {
    return { label: "Chiuso", tone: "neutral" as const };
  }
  return { label: "Bozza", tone: "warning" as const };
}

export function getProgressChip(label: string) {
  if (label === "Completato") {
    return { label, tone: "success" as const };
  }
  if (label === "Non iniziato") {
    return { label, tone: "neutral" as const };
  }
  return { label, tone: "info" as const };
}

export function getSessionStatusChip(status: "scheduled" | "done") {
  if (status === "done") {
    return { label: "Svolta", tone: "success" as const };
  }
  return { label: "Programmata", tone: "info" as const };
}
