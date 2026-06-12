import type {
  CreateTicketInput,
  Ticket,
  UpdateTicketInput,
  User,
  UserRole
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

export type ApiResult<T> =
  | { ok: true; data: T; requestId?: string }
  | { ok: false; message: string; status?: number; requestId?: string };

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const requestId = response.headers.get("X-Request-Id") ?? undefined;
    const data = (await response.json().catch(() => ({}))) as T & {
      message?: string;
      requestId?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: data.message ?? "Request failed",
        requestId: data.requestId ?? requestId
      };
    }

    return { ok: true, data, requestId: data.requestId ?? requestId };
  } catch {
    return { ok: false, message: "API unavailable" };
  }
};

const authorized = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`
});

export const api = {
  health: () => request<{ success: boolean; message: string }>("/health"),

  login: (email: string, password: string) =>
    request<{ success: boolean; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  register: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),

  me: (token: string) =>
    request<{ success: boolean; user: User }>("/auth/me", {
      headers: authorized(token)
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>("/auth/password", {
      method: "PATCH",
      headers: authorized(token),
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  users: (token: string) =>
    request<{ success: boolean; users: User[] }>("/admin/users", {
      headers: authorized(token)
    }),

  updateUserRole: (token: string, userId: string, role: UserRole) =>
    request<{ success: boolean; user: User }>(
      `/admin/users/${encodeURIComponent(userId)}/role`,
      {
        method: "PATCH",
        headers: authorized(token),
        body: JSON.stringify({ role })
      }
    ),

  tickets: (token: string) =>
    request<{ success: boolean; tickets: Ticket[] }>("/tickets", {
      headers: authorized(token)
    }),

  createTicket: (token: string, input: CreateTicketInput) =>
    request<{ success: boolean; ticket: Ticket }>("/tickets", {
      method: "POST",
      headers: authorized(token),
      body: JSON.stringify(input)
    }),

  updateTicket: (token: string, ticketId: string, input: UpdateTicketInput) =>
    request<{ success: boolean; ticket: Ticket }>(
      `/tickets/${encodeURIComponent(ticketId)}`,
      {
        method: "PATCH",
        headers: authorized(token),
        body: JSON.stringify(input)
      }
    ),

  deleteTicket: (token: string, ticketId: string) =>
    request<{ success: boolean; ticket: Ticket }>(
      `/tickets/${encodeURIComponent(ticketId)}`,
      {
        method: "DELETE",
        headers: authorized(token)
      }
    )
};
