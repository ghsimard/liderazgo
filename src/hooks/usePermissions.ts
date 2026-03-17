import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export interface PermissionEntry {
  section: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export type CrudAction = "create" | "read" | "update" | "delete";

export interface PermissionsAPI {
  /** Check if the user can perform an action on a section (hierarchical resolution) */
  can: (section: string, action: CrudAction) => boolean;
  /** All readable top-level sections (for sidebar filtering) */
  readableSections: string[];
  /** Raw permissions array */
  permissions: PermissionEntry[];
  loading: boolean;
  reload: () => void;
}

const ACTION_MAP: Record<CrudAction, keyof PermissionEntry> = {
  create: "can_create",
  read: "can_read",
  update: "can_update",
  delete: "can_delete",
};

export function usePermissions(userId: string | null): PermissionsAPI {
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      let rows: PermissionEntry[] = [];

      if (USE_EXPRESS) {
        const { data } = await apiFetch<PermissionEntry[]>(`/api/user-permissions/${userId}`);
        rows = data ?? [];
      } else {
        const { data, error } = await supabase.rpc("get_user_permissions", { _user_id: userId });
        if (!error && data) rows = data as PermissionEntry[];
      }

      setPermissions(rows);
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const can = useCallback(
    (section: string, action: CrudAction): boolean => {
      const key = ACTION_MAP[action];

      // 1. Exact match
      const exact = permissions.find((p) => p.section === section);
      if (exact) return !!exact[key];

      // 2. Fallback to parent (e.g. "sistema.gestion-cuentas" → "sistema")
      const dotIdx = section.indexOf(".");
      if (dotIdx > 0) {
        const parent = section.substring(0, dotIdx);
        const parentPerm = permissions.find((p) => p.section === parent);
        if (parentPerm) return !!parentPerm[key];
      }

      // 3. Default: denied
      return false;
    },
    [permissions]
  );

  const readableSections = permissions
    .filter((p) => p.can_read && !p.section.includes("."))
    .map((p) => p.section);

  return { can, readableSections, permissions, loading, reload: load };
}
