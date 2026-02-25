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
    sql += `-- Includes: CREATE TABLE + INSERT data + Auth Users + Storage files\n\n`;

    // Get column info for all tables from information_schema
    const { data: columnsInfo } = await supabaseAdmin.rpc("get_table_columns", {
      table_names: tables,
    });

    // Get enum types
    const { data: enumInfo } = await supabaseAdmin.rpc("get_enum_types");

    // Get constraints (PK, UNIQUE, FK)
    const { data: constraintsInfo } = await supabaseAdmin.rpc("get_table_constraints", {
      table_names: tables,
    });

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

      // Add constraints (PK, UNIQUE, FK)
      const tableConstraints = (constraintsInfo || []).filter(
        (c: any) => c.table_name === table
      );

      for (const c of tableConstraints) {
        const cols = c.column_names.split(", ").map((col: string) => `"${col.trim()}"`).join(", ");
        if (c.constraint_type === "PRIMARY KEY") {
          sql += `ALTER TABLE public.${table} ADD CONSTRAINT "${c.constraint_name}" PRIMARY KEY (${cols});\n`;
        } else if (c.constraint_type === "UNIQUE") {
          sql += `ALTER TABLE public.${table} ADD CONSTRAINT "${c.constraint_name}" UNIQUE (${cols});\n`;
        } else if (c.constraint_type === "FOREIGN KEY" && c.foreign_table) {
          const fCols = c.foreign_columns.split(", ").map((col: string) => `"${col.trim()}"`).join(", ");
          sql += `ALTER TABLE public.${table} ADD CONSTRAINT "${c.constraint_name}" FOREIGN KEY (${cols}) REFERENCES public.${c.foreign_table} (${fCols});\n`;
        }
      }

      if (tableConstraints.length > 0) {
        sql += `\n`;
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

    // ════════════════════════════════════════════════════════
    // AUTH USERS EXPORT
    // ════════════════════════════════════════════════════════
    sql += `-- ========================\n`;
    sql += `-- AUTH USERS\n`;
    sql += `-- ========================\n`;
    sql += `-- Note: Passwords cannot be exported. Users will need new passwords after migration.\n\n`;

    try {
      const allUsers: any[] = [];
      let page = 1;
      let fetchMore = true;
      while (fetchMore) {
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 100,
        });
        if (listError || !users || users.length === 0) {
          fetchMore = false;
        } else {
          allUsers.push(...users);
          fetchMore = users.length === 100;
          page++;
        }
      }

      if (allUsers.length > 0) {
        sql += `-- ${allUsers.length} user(s) found\n`;
        sql += `-- Format: id | email | created_at | email_confirmed_at | last_sign_in_at\n\n`;
        for (const u of allUsers) {
          const escapedEmail = (u.email || "").replace(/'/g, "''");
          sql += `-- User: ${u.email}\n`;
          sql += `--   id: ${u.id}\n`;
          sql += `--   created_at: ${u.created_at || "NULL"}\n`;
          sql += `--   email_confirmed_at: ${u.email_confirmed_at || "NULL"}\n`;
          sql += `--   last_sign_in_at: ${u.last_sign_in_at || "NULL"}\n\n`;
        }

        sql += `-- To recreate users in a standard PostgreSQL setup, create a users table:\n`;
        sql += `-- CREATE TABLE IF NOT EXISTS public.users (\n`;
        sql += `--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
        sql += `--   email TEXT UNIQUE NOT NULL,\n`;
        sql += `--   password_hash TEXT NOT NULL,\n`;
        sql += `--   created_at TIMESTAMPTZ DEFAULT now(),\n`;
        sql += `--   email_confirmed_at TIMESTAMPTZ\n`;
        sql += `-- );\n\n`;

        for (const u of allUsers) {
          const escapedEmail = (u.email || "").replace(/'/g, "''");
          sql += `-- INSERT INTO public.users (id, email, password_hash, created_at, email_confirmed_at)\n`;
          sql += `-- VALUES ('${u.id}', '${escapedEmail}', 'CHANGE_ME', '${u.created_at || "now()"}', ${u.email_confirmed_at ? `'${u.email_confirmed_at}'` : "NULL"});\n`;
        }
        sql += `\n`;
      } else {
        sql += `-- No users found\n\n`;
      }
    } catch (authErr: any) {
      sql += `-- Error exporting auth users: ${authErr.message}\n\n`;
    }

    // ════════════════════════════════════════════════════════
    // STORAGE EXPORT
    // ════════════════════════════════════════════════════════
    sql += `-- ========================\n`;
    sql += `-- STORAGE FILES\n`;
    sql += `-- ========================\n\n`;

    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();

      if (buckets && buckets.length > 0) {
        for (const bucket of buckets) {
          sql += `-- Bucket: ${bucket.name} (public: ${bucket.public})\n`;

          const { data: files, error: listErr } = await supabaseAdmin.storage
            .from(bucket.name)
            .list("", { limit: 500 });

          if (listErr || !files || files.length === 0) {
            sql += `-- No files in bucket ${bucket.name}\n\n`;
            continue;
          }

          sql += `-- ${files.length} file(s)\n\n`;

          // Section 1: Download URLs
          sql += `-- === Download URLs ===\n`;
          for (const file of files) {
            if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
            const { data: urlData } = supabaseAdmin.storage
              .from(bucket.name)
              .getPublicUrl(file.name);
            sql += `-- File: ${file.name}\n`;
            sql += `--   URL: ${urlData.publicUrl}\n`;
            sql += `--   Size: ${file.metadata?.size || "unknown"} bytes\n`;
            sql += `--   Type: ${file.metadata?.mimetype || "unknown"}\n\n`;
          }

          // Section 2: Base64 encoded files
          sql += `-- === Base64 Encoded Files ===\n`;
          sql += `-- Decode with: echo "<base64>" | base64 -d > filename\n\n`;
          for (const file of files) {
            if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
            try {
              const { data: fileData, error: dlErr } = await supabaseAdmin.storage
                .from(bucket.name)
                .download(file.name);

              if (dlErr || !fileData) {
                sql += `-- Could not download ${file.name}: ${dlErr?.message || "unknown error"}\n\n`;
                continue;
              }

              const arrayBuffer = await fileData.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);

              // Manual base64 encoding for Deno
              const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
              let b64 = "";
              for (let i = 0; i < bytes.length; i += 3) {
                const b0 = bytes[i];
                const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
                const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
                b64 += chars[b0 >> 2];
                b64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
                b64 += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
                b64 += i + 2 < bytes.length ? chars[b2 & 63] : "=";
              }

              // Split base64 into lines of 76 chars
              sql += `-- FILE: ${bucket.name}/${file.name}\n`;
              sql += `-- DECODE: echo "..." | base64 -d > ${file.name}\n`;
              sql += `-- BEGIN BASE64\n`;
              for (let i = 0; i < b64.length; i += 76) {
                sql += `-- ${b64.slice(i, i + 76)}\n`;
              }
              sql += `-- END BASE64\n\n`;
            } catch (fileErr: any) {
              sql += `-- Error downloading ${file.name}: ${fileErr.message}\n\n`;
            }
          }
        }
      } else {
        sql += `-- No storage buckets found\n\n`;
      }
    } catch (storageErr: any) {
      sql += `-- Error exporting storage: ${storageErr.message}\n\n`;
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
