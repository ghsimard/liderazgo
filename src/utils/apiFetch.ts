/**
 * Centralized API fetch utility — DUAL MODE.
 *
 * • When VITE_API_URL is set  → Express backend (JWT auth)
 * • When VITE_API_URL is empty → Supabase client directly
 */

import { supabase as supabaseClient } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_URL || "";
const USE_EXPRESS = !!API_BASE;

const TOKEN_KEY = "auth_token";

// ─── Token helpers (Express mode only) ─────────────────

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
  if (!USE_EXPRESS) {
    // In Supabase mode, we check synchronously via localStorage
    const sb = localStorage.getItem("sb-krqxzxhqjkpimscufxnc-auth-token");
    return !!sb;
  }
  return !!getToken();
}

// ─── Core fetch (Express mode) ─────────────────────────

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

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      const text = await res.text();
      if (!res.ok) return { data: null, error: text || res.statusText, status: res.status };
      return { data: text as unknown as T, error: null, status: res.status };
    }

    const body = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        clearToken();
      }
      return { data: null, error: body.error || res.statusText, status: res.status };
    }

    return { data: body as T, error: null, status: res.status };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error", status: 0 };
  }
}

// ─── Typed API helpers (dual-mode) ─────────────────────

/** Login */
export async function apiLogin(email: string, password: string) {
  if (!USE_EXPRESS) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { data: null, error: error.message, status: 401 };
    return {
      data: { token: data.session?.access_token || "", user: { id: data.user?.id || "", email: data.user?.email || "" } },
      error: null,
      status: 200,
    };
  }

  const result = await apiFetch<{ token: string; user: { id: string; email: string } }>(
    "/api/auth/login",
    { method: "POST", body: { email, password } }
  );
  if (result.data?.token) {
    setToken(result.data.token);
  }
  return result;
}

/** Get current user */
export async function apiGetMe() {
  if (!USE_EXPRESS) {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error || !user) return { data: null, error: error?.message || "Not authenticated", status: 401 };
    return {
      data: { user: { id: user.id, email: user.email || "", created_at: user.created_at || "" } },
      error: null,
      status: 200,
    };
  }

  return apiFetch<{ user: { id: string; email: string; created_at: string; roles?: string[] } }>("/api/auth/me");
}

/** Logout */
export async function apiLogout() {
  if (!USE_EXPRESS) {
    await supabaseClient.auth.signOut();
    return;
  }
  clearToken();
}
