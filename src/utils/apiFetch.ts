/**
 * Centralized API fetch utility.
 *
 * Replaces all direct Supabase SDK calls with standard fetch() requests
 * to the Express backend. Handles JWT token storage and injection.
 *
 * Usage:
 *   const { data, error } = await apiFetch<MyType>("/api/fichas");
 *   const { data, error } = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

const TOKEN_KEY = "auth_token";

// ─── Token helpers ─────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ─── Core fetch ────────────────────────────────────────

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | FormData;
}

interface ApiFetchResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiFetchResult<T>> {
  const token = getToken();

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: isFormData
        ? options.body as FormData
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
    });

    // Handle non-JSON responses (e.g. SQL export)
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const text = await res.text();
      if (!res.ok) return { data: null, error: text || res.statusText, status: res.status };
      return { data: text as unknown as T, error: null, status: res.status };
    }

    const body = await res.json();

    if (!res.ok) {
      // Auto-logout on 401
      if (res.status === 401) {
        clearToken();
      }
      return { data: null, error: body.error || res.statusText, status: res.status };
    }

    return { data: body as T, error: null, status: res.status };
  } catch (err: any) {
    return { data: null, error: err.message || "Erreur réseau", status: 0 };
  }
}

// ─── Typed API helpers ─────────────────────────────────

/** POST /api/auth/login */
export async function apiLogin(email: string, password: string) {
  const result = await apiFetch<{ token: string; user: { id: string; email: string } }>(
    "/api/auth/login",
    { method: "POST", body: { email, password } }
  );

  if (result.data?.token) {
    setToken(result.data.token);
  }

  return result;
}

/** GET /api/auth/me */
export async function apiGetMe() {
  return apiFetch<{ user: { id: string; email: string; created_at: string } }>("/api/auth/me");
}

/** Logout — just clear the token */
export function apiLogout() {
  clearToken();
}
