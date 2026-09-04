import { supabase } from "@/utils/dbClient";

export interface InstitucionReferenceCount {
  table: string;
  column: string;
  count: number;
}

export interface RenameResult {
  success: boolean;
  counts: InstitucionReferenceCount[];
  errors: string[];
}

export interface RenameHistoryEntry {
  id: string;
  old_name: string;
  new_name: string;
  changed_by_cedula: string | null;
  changed_by_nombre: string | null;
  counts: InstitucionReferenceCount[];
  total_rows: number;
  status: string;
  reverted_at: string | null;
  created_at: string;
}

// Tables and columns that store the institution name denormalized.
// Keep this list in sync with any new table that copies instituciones.nombre.
const INSTITUCION_NAME_COLUMNS: { table: string; column: string }[] = [
  { table: "instituciones", column: "nombre" },
  { table: "fichas_rlt", column: "nombre_ie" },
  { table: "encuestas_360", column: "institucion_educativa" },
  { table: "encuesta_invitaciones", column: "institucion" },
  { table: "rubrica_asignaciones", column: "institucion" },
  { table: "encuestas_ambiente_escolar", column: "institucion_educativa" },
  { table: "ae_cohorte_instituciones", column: "institucion_educativa" },
  { table: "ae_docentes_submissions_2025", column: "institucion_educativa" },
  { table: "ae_estudiantes_submissions_2025", column: "institucion_educativa" },
  { table: "ae_acudientes_submissions_2025", column: "institucion_educativa" },
  { table: "ae_rectores_2025", column: "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_" },
  { table: "operator_permissions", column: "institucion" },
];

export async function countInstitucionReferences(
  oldName: string
): Promise<InstitucionReferenceCount[]> {
  const results: InstitucionReferenceCount[] = [];

  await Promise.all(
    INSTITUCION_NAME_COLUMNS.map(async ({ table, column }) => {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(column, oldName);

        if (error) {
          results.push({ table, column, count: -1 });
        } else {
          results.push({ table, column, count: count ?? 0 });
        }
      } catch {
        results.push({ table, column, count: -1 });
      }
    })
  );

  return results.sort((a, b) => a.table.localeCompare(b.table));
}

/**
 * Propagates the new name everywhere. Stops at the first failing table so the
 * caller can report exactly which section failed instead of silently leaving a
 * half-applied state.
 */
export async function renameInstitucionEverywhere(
  oldName: string,
  newName: string
): Promise<RenameResult> {
  const result: RenameResult = { success: true, counts: [], errors: [] };

  for (const { table, column } of INSTITUCION_NAME_COLUMNS) {
    // Count first so the history keeps a reliable per-table number even when
    // the proxy does not return an affected-rows count on UPDATE.
    let expected = 0;
    try {
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, oldName);
      expected = count ?? 0;
    } catch {
      expected = 0;
    }

    if (expected === 0) {
      result.counts.push({ table, column, count: 0 });
      continue;
    }

    try {
      const { error } = await supabase
        .from(table)
        .update({ [column]: newName } as any)
        .eq(column, oldName);

      if (error) throw new Error(error.message);

      // Verify the write actually landed.
      const { count: remaining } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, oldName);

      if ((remaining ?? 0) > 0) {
        throw new Error(`quedan ${remaining} registros con el nombre anterior`);
      }

      result.counts.push({ table, column, count: expected });
    } catch (err: any) {
      result.success = false;
      result.errors.push(`${table}.${column}: ${err?.message || String(err)}`);
      result.counts.push({ table, column, count: -1 });
      return result; // stop at first failure
    }
  }

  return result;
}

export function totalRenamedRows(counts: InstitucionReferenceCount[]): number {
  return counts.reduce((sum, c) => sum + (c.count > 0 ? c.count : 0), 0);
}

export async function logRename(params: {
  oldName: string;
  newName: string;
  counts: InstitucionReferenceCount[];
}): Promise<void> {
  const cedula =
    sessionStorage.getItem("admin_cedula") ||
    sessionStorage.getItem("user_cedula") ||
    null;
  const nombre =
    sessionStorage.getItem("admin_nombre") ||
    sessionStorage.getItem("user_nombre") ||
    null;

  try {
    await supabase.from("institucion_renames").insert({
      old_name: params.oldName,
      new_name: params.newName,
      changed_by_cedula: cedula,
      changed_by_nombre: nombre,
      counts: params.counts as any,
      total_rows: totalRenamedRows(params.counts),
      status: "aplicado",
    });
  } catch {
    // History is best-effort: never block the rename itself.
  }
}

export async function fetchRenameHistory(): Promise<RenameHistoryEntry[]> {
  const { data, error } = await supabase
    .from("institucion_renames")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data as any[]) || []).map((r) => ({
    ...r,
    counts: Array.isArray(r.counts)
      ? r.counts
      : typeof r.counts === "string"
      ? JSON.parse(r.counts || "[]")
      : [],
  })) as RenameHistoryEntry[];
}

/** Reverts a rename (new -> old) and records the reversal in the history. */
export async function revertRename(entry: RenameHistoryEntry): Promise<RenameResult> {
  const result = await renameInstitucionEverywhere(entry.new_name, entry.old_name);
  if (!result.success) return result;

  try {
    await supabase
      .from("institucion_renames")
      .update({ status: "revertido", reverted_at: new Date().toISOString() })
      .eq("id", entry.id);

    await logRename({
      oldName: entry.new_name,
      newName: entry.old_name,
      counts: result.counts,
    });
  } catch {
    // best effort
  }

  return result;
}
