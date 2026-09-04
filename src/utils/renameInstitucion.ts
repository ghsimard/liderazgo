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

export async function renameInstitucionEverywhere(
  oldName: string,
  newName: string
): Promise<RenameResult> {
  const result: RenameResult = { success: true, counts: [], errors: [] };

  for (const { table, column } of INSTITUCION_NAME_COLUMNS) {
    try {
      const { error, count } = await supabase
        .from(table)
        .update({ [column]: newName } as any)
        .eq(column, oldName);

      if (error) {
        result.success = false;
        result.errors.push(`${table}.${column}: ${error.message}`);
        result.counts.push({ table, column, count: -1 });
      } else {
        result.counts.push({ table, column, count: count ?? 0 });
      }
    } catch (err: any) {
      result.success = false;
      result.errors.push(`${table}.${column}: ${err?.message || String(err)}`);
      result.counts.push({ table, column, count: -1 });
    }
  }

  return result;
}
