const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

type ApiResult<T> =
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
    return {
      ok: false,
      message: "API unavailable"
    };
  }
};

export const api = {
  health: () => request<{ success: boolean; message: string }>("/health"),
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  tickets: (token: string) =>
    request<{ success: boolean; tickets: unknown[] }>("/tickets", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
};
