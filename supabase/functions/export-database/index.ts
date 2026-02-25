import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tables to export (order matters for foreign keys)
    const tables = [
      "entidades_territoriales",
      "regiones",
      "municipios",
      "instituciones",
      "region_municipios",
      "region_instituciones",
      "domains_360",
      "competencies_360",
      "items_360",
      "item_texts_360",
      "competency_weights",
      "fichas_rlt",
      "encuestas_360",
      "deleted_records",
      "user_roles",
      "app_images",
    ];

    let sql = `-- Database export generated on ${new Date().toISOString()}\n`;
    sql += `-- Project: Fichas RLT\n`;
    sql += `-- Includes: CREATE TABLE + INSERT data\n\n`;

    // Get column info for all tables from information_schema
    const { data: columnsInfo } = await supabaseAdmin.rpc("get_table_columns", {
      table_names: tables,
    });

    // Get enum types
    const { data: enumInfo } = await supabaseAdmin.rpc("get_enum_types");

    // Export enums first
    if (enumInfo && enumInfo.length > 0) {
      sql += `-- ========================\n`;
      sql += `-- ENUM TYPES\n`;
      sql += `-- ========================\n\n`;
      for (const e of enumInfo) {
        sql += `DO $$ BEGIN\n  CREATE TYPE ${e.type_name} AS ENUM (${e.enum_values});\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;\n\n`;
      }
    }

    // Export structure + data per table
    for (const table of tables) {
      sql += `-- ========================\n`;
      sql += `-- TABLE: ${table}\n`;
      sql += `-- ========================\n\n`;

      // CREATE TABLE from column info
      const tableCols = (columnsInfo || []).filter(
        (c: any) => c.table_name === table
      );

      if (tableCols.length > 0) {
        sql += `CREATE TABLE IF NOT EXISTS public.${table} (\n`;
        const colDefs = tableCols.map((c: any) => {
          let def = `  "${c.column_name}" ${c.udt_name_full}`;
          if (c.is_nullable === "NO") def += " NOT NULL";
          if (c.column_default) def += ` DEFAULT ${c.column_default}`;
          return def;
        });
        sql += colDefs.join(",\n");
        sql += `\n);\n\n`;
      }

      // Get all data (paginated to avoid 1000-row limit)
      let allRows: Record<string, unknown>[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error: pageError } = await supabaseAdmin
          .from(table)
          .select("*")
          .range(from, from + pageSize - 1);

        if (pageError) {
          sql += `-- Error exporting data for ${table}: ${pageError.message}\n\n`;
          hasMore = false;
          break;
        }

        if (page && page.length > 0) {
          allRows = allRows.concat(page);
          from += pageSize;
          hasMore = page.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const rows = allRows;
      const error = null;

      if (error) {
        sql += `-- Error exporting data for ${table}: ${error.message}\n\n`;
        continue;
      }

      if (!rows || rows.length === 0) {
        sql += `-- No data in ${table}\n\n`;
        continue;
      }

      sql += `-- Data: ${rows.length} rows\n`;

      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");

      for (const row of rows) {
        const values = columns
          .map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return "NULL";
            if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
            if (typeof val === "number") return String(val);
            if (Array.isArray(val)) {
              const items = val
                .map((v: unknown) => `'${String(v).replace(/'/g, "''")}'`)
                .join(", ");
              return `ARRAY[${items}]`;
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          })
          .join(", ");

        sql += `INSERT INTO public.${table} (${colList}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      }

      sql += `\n`;
    }

    return new Response(sql, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_${new Date().toISOString().slice(0, 10)}.sql"`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
