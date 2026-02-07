type ActivityItem = {
  id: string;
  message: string;
  createdAt: string;
};

const STORAGE_KEY = "activity_log";

export function addActivity(message: string) {
  if (typeof window === "undefined") return;
  const items = getActivities();
  const next: ActivityItem = {
    id: crypto.randomUUID(),
    message,
    createdAt: new Date().toISOString()
  };
  const updated = [next, ...items].slice(0, 20);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getActivities(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ActivityItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
