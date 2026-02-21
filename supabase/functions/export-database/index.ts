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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

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

    // Tables to export
    const tables = [
      "entidades_territoriales",
      "regiones",
      "municipios",
      "instituciones",
      "region_municipios",
      "region_instituciones",
      "fichas_rlt",
      "user_roles",
    ];

    let sql = `-- Database export generated on ${new Date().toISOString()}\n`;
    sql += `-- Project: Fichas RLT\n\n`;

    for (const table of tables) {
      // Get all data
      const { data: rows, error } = await supabaseAdmin
        .from(table)
        .select("*");

      if (error) {
        sql += `-- Error exporting table ${table}: ${error.message}\n\n`;
        continue;
      }

      if (!rows || rows.length === 0) {
        sql += `-- Table ${table}: no data\n\n`;
        continue;
      }

      sql += `-- Table: ${table} (${rows.length} rows)\n`;

      // Generate INSERT statements
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
