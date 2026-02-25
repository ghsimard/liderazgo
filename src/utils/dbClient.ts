/**
 * Supabase-compatible query builder that uses apiFetch.
 * 
 * Provides the same fluent API as the Supabase JS client so admin components
 * require minimal changes — just swap the import:
 * 
 *   Before: import { supabase } from "@/integrations/supabase/client";
 *   After:  import { supabase } from "@/utils/dbClient";
 * 
 * All queries are routed through the Express REST API via apiFetch.
 * The Express backend must implement matching endpoints.
 */

import { apiFetch, getToken } from "./apiFetch";

// ── Query Builder ──────────────────────────────────────

class QueryBuilder<T = any> {
  private _table: string;
  private _select: string = "*";
  private _filters: Array<{ type: string; col: string; val: any }> = [];
  private _order: Array<{ col: string; asc: boolean }> = [];
  private _limit?: number;
  private _rangeFrom?: number;
  private _rangeTo?: number;
  private _single = false;
  private _maybeSingle = false;
  private _head = false;
  private _count?: string;
  private _method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET";
  private _body?: any;

  constructor(table: string) {
    this._table = table;
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    this._select = cols || "*";
    if (opts?.head) this._head = true;
    if (opts?.count) this._count = opts.count;
    return this;
  }

  insert(data: any) {
    this._method = "POST";
    this._body = data;
    return this;
  }

  upsert(data: any, opts?: { onConflict?: string }) {
    this._method = "POST";
    this._body = { ...( Array.isArray(data) ? { rows: data } : data), _upsert: true, _onConflict: opts?.onConflict };
    return this;
  }

  update(data: any) {
    this._method = "PATCH";
    this._body = data;
    return this;
  }

  delete() {
    this._method = "DELETE";
    return this;
  }

  eq(col: string, val: any) { this._filters.push({ type: "eq", col, val }); return this; }
  neq(col: string, val: any) { this._filters.push({ type: "neq", col, val }); return this; }
  gt(col: string, val: any) { this._filters.push({ type: "gt", col, val }); return this; }
  gte(col: string, val: any) { this._filters.push({ type: "gte", col, val }); return this; }
  lt(col: string, val: any) { this._filters.push({ type: "lt", col, val }); return this; }
  lte(col: string, val: any) { this._filters.push({ type: "lte", col, val }); return this; }
  like(col: string, val: string) { this._filters.push({ type: "like", col, val }); return this; }
  ilike(col: string, val: string) { this._filters.push({ type: "ilike", col, val }); return this; }
  in(col: string, vals: any[]) { this._filters.push({ type: "in", col, val: vals }); return this; }
  is(col: string, val: any) { this._filters.push({ type: "is", col, val }); return this; }
  or(expr: string) { this._filters.push({ type: "or", col: "_expr", val: expr }); return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order.push({ col, asc: opts?.ascending ?? true });
    return this;
  }

  limit(n: number) { this._limit = n; return this; }

  range(from: number, to: number) {
    this._rangeFrom = from;
    this._rangeTo = to;
    return this;
  }

  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }

  /** Build query string for GET requests */
  private buildQuery(): string {
    const params = new URLSearchParams();
    if (this._select !== "*") params.set("select", this._select);
    for (const f of this._filters) {
      params.append(`${f.type}.${f.col}`, Array.isArray(f.val) ? f.val.join(",") : String(f.val));
    }
    for (const o of this._order) {
      params.append("order", `${o.col}.${o.asc ? "asc" : "desc"}`);
    }
    if (this._limit != null) params.set("limit", String(this._limit));
    if (this._rangeFrom != null) params.set("from", String(this._rangeFrom));
    if (this._rangeTo != null) params.set("to", String(this._rangeTo));
    if (this._single || this._maybeSingle) params.set("single", "true");
    if (this._head) params.set("head", "true");
    if (this._count) params.set("count", this._count);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  /** Execute the query */
  async then<R>(
    resolve: (value: { data: T | T[] | null; error: any; count?: number | null }) => R,
    reject?: (reason: any) => R
  ): Promise<R> {
    try {
      const path = `/api/db/${this._table}`;

      if (this._method === "GET") {
        const result = await apiFetch<any>(path + this.buildQuery());
        const data = result.data;
        return resolve({
          data: data?.rows ?? data?.data ?? data,
          error: result.error ? { message: result.error } : null,
          count: data?.count ?? null,
        });
      }

      // For mutations, include filters in the body
      const body: any = {
        _method: this._method,
        _filters: this._filters,
        _body: this._body,
      };

      const result = await apiFetch<any>(path, { method: "POST", body });
      return resolve({
        data: result.data?.rows ?? result.data?.data ?? result.data,
        error: result.error ? { message: result.error } : null,
      });
    } catch (err: any) {
      if (reject) return reject(err);
      return resolve({ data: null, error: { message: err.message } });
    }
  }
}

// ── RPC Builder ────────────────────────────────────────

async function rpc(fnName: string, params?: Record<string, any>) {
  const query = params
    ? "?" + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()
    : "";
  const result = await apiFetch<any>(`/api/rpc/${fnName}${query}`);
  return {
    data: result.data,
    error: result.error ? { message: result.error } : null,
  };
}

// ── Auth Compat ────────────────────────────────────────

const auth = {
  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null }, error: null };
    return {
      data: { session: { access_token: token, user: { id: "" } } },
      error: null,
    };
  },
  async signOut() {
    const { clearToken } = await import("./apiFetch");
    clearToken();
  },
};

// ── Functions Compat ───────────────────────────────────

const functions = {
  async invoke(fnName: string, opts?: { body?: any; headers?: Record<string, string> }) {
    const result = await apiFetch<any>(`/api/${fnName}`, {
      method: opts?.body ? "POST" : "GET",
      body: opts?.body,
    });
    return { data: result.data, error: result.error ? { message: result.error } : null };
  },
};

// ── Storage Compat ─────────────────────────────────────

function storageFrom(bucket: string) {
  return {
    async upload(path: string, file: File, opts?: { upsert?: boolean; cacheControl?: string }) {
      const formData = new FormData();
      formData.append("file", file);
      if (opts?.upsert) formData.append("upsert", "true");
      const result = await apiFetch(`/api/storage/${bucket}/${path}`, {
        method: "POST",
        body: formData,
      });
      return { data: result.data, error: result.error ? { message: result.error } : null };
    },
    async remove(paths: string[]) {
      const result = await apiFetch(`/api/storage/${bucket}`, {
        method: "DELETE",
        body: { paths } as any,
      });
      return { data: result.data, error: result.error ? { message: result.error } : null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `/uploads/${path}` } };
    },
  };
}

const storage = {
  from: storageFrom,
};

// ── Exported client (same shape as supabase client) ────

export const supabase = {
  from: <T = any>(table: string) => new QueryBuilder<T>(table),
  rpc,
  auth,
  functions,
  storage,
};
