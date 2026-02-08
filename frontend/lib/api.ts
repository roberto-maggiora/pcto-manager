import { clearToken, getToken } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    let message = `API error ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data?.detail) {
        message = data.detail;
      }
    } catch {
      // ignore json parsing errors
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  getProject: (projectId: string) =>
    request<{
      id: string;
      title: string;
      status: string;
      start_date: string;
      end_date: string;
      class_id: string;
      description?: string | null;
      school_tutor_name?: string | null;
      provider_expert_name?: string | null;
      total_hours?: number | null;
    }>(`/v1/projects/${projectId}`),
  getProjects: () =>
    request<
      Array<{
        id: string;
        title: string;
        status: string;
        start_date: string;
        end_date: string;
        class_id: string;
        total_hours?: number | null;
      }>
    >("/v1/projects"),
  createProject: (payload: {
    title: string;
    status: string;
    start_date: string;
    end_date: string;
    class_id: string;
    description?: string | null;
    school_tutor_name?: string | null;
    provider_expert_name?: string | null;
    total_hours?: number | null;
  }) =>
    request<{ id: string }>(`/v1/projects`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  patchProject: (
    projectId: string,
    payload: {
      title?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      class_id?: string;
      description?: string | null;
      school_tutor_name?: string | null;
      provider_expert_name?: string | null;
      total_hours?: number | null;
    }
  ) => request(`/v1/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getSessions: (projectId: string) =>
    request<
      Array<{
        id: string;
        start: string;
        end: string;
        planned_hours: number;
        topic?: string | null;
        status: "scheduled" | "done";
      }>
    >(
      `/v1/projects/${projectId}/sessions`
    ),
  createSession: (
    projectId: string,
    payload: {
      start: string;
      end: string;
      planned_hours: number;
      topic?: string | null;
      status?: "scheduled" | "done";
    }
  ) =>
    request(`/v1/projects/${projectId}/sessions`, { method: "POST", body: JSON.stringify(payload) }),
  patchSession: (
    sessionId: string,
    payload: {
      start?: string;
      end?: string;
      planned_hours?: number;
      topic?: string | null;
      status?: "scheduled" | "done";
    }
  ) => request(`/v1/sessions/${sessionId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (sessionId: string) =>
    request(`/v1/sessions/${sessionId}`, { method: "DELETE" }),
  deleteProject: (projectId: string) =>
    request(`/v1/projects/${projectId}`, { method: "DELETE" }),
  postAttendance: (sessionId: string, payload: Array<{ student_id: string; status: string; hours: number }>) =>
    request<{ updated: number }>(`/v1/sessions/${sessionId}/attendance`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getSessionAttendance: (sessionId: string) =>
    request<Array<{ student_id: string; status: "present" | "absent"; hours: number }>>(
      `/v1/sessions/${sessionId}/attendance`
    ),
  exportAttendanceRegister: (projectId: string) =>
    request<{ export_id: string }>(`/v1/exports/projects/${projectId}/attendance-register`, { method: "POST" }),
  getClasses: () => request<Array<{ id: string; year: number; section: string }>>("/v1/classes"),
  createClass: (payload: { year: number; section: string }) =>
    request("/v1/classes", { method: "POST", body: JSON.stringify(payload) }),
  patchClass: (classId: string, payload: { year?: number; section?: string; name?: string }) =>
    request(`/v1/classes/${classId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteClass: (classId: string) =>
    request(`/v1/classes/${classId}`, { method: "DELETE" }),
  getStudents: (classId?: string) =>
    request<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        class_id: string;
        pcto_required_hours: number;
      }>
    >(
      `/v1/students${classId ? `?class_id=${classId}` : ""}`
    ),
  createStudent: (payload: {
    class_id: string;
    first_name: string;
    last_name: string;
    pcto_required_hours?: number | null;
  }) => request("/v1/students", { method: "POST", body: JSON.stringify(payload) }),
  patchStudent: (
    studentId: string,
    payload: {
      class_id?: string;
      first_name?: string;
      last_name?: string;
      pcto_required_hours?: number | null;
    }
  ) => request(`/v1/students/${studentId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteStudent: (studentId: string) =>
    request(`/v1/students/${studentId}`, { method: "DELETE" }),
  getStudentMetrics: () =>
    request<Array<{ student_id: string; completed_hours: number }>>(
      "/v1/students/metrics"
    ),
  getStudentSummary: (studentId: string) =>
    request<{
      id: string;
      first_name: string;
      last_name: string;
      class_id: string;
      class_year: number;
      class_section: string;
      pcto_required_hours: number;
      completed_hours_total: number;
      by_project: Array<{
        project_id: string;
        title: string;
        status: string;
        completed_hours: number;
        last_session_end: string | null;
      }>;
    }>(`/v1/students/${studentId}/summary`)
};
