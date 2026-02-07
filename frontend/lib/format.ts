export function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const value = new Date(dateStr);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value);
}

export function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  const value = new Date(dateStr);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}
