import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Use getClaims for faster JWT verification
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
  
  let userId: string;
  
  if (claimsError || !claimsData?.claims?.sub) {
    // Fallback to getUser if getClaims fails
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    userId = user.id;
  } else {
    userId = claimsData.claims.sub as string;
  }

  // Check admin via RBAC tables (using service role to bypass RLS)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData, error: roleError } = await adminClient
    .from("user_custom_roles")
    .select("role_id, custom_roles(name)")
    .eq("user_id", userId);

  if (roleError) {
    console.error("Role lookup error:", roleError.message);
    throw new Error("Forbidden: admin only");
  }

  const roleNames = (roleData ?? []).map((r: any) => r.custom_roles?.name).filter(Boolean);
  if (!roleNames.includes("Admin") && !roleNames.includes("Superadmin")) {
    console.error("User has roles:", roleNames, "but needs Admin or Superadmin");
    throw new Error("Forbidden: admin only");
  }

  return { userId, roleNames };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId: callerId, roleNames: callerRoleNames } = await verifyAdmin(authHeader);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = body as Record<string, unknown>;

    if (typeof action !== "string" || !["list", "update_password", "delete", "update_user"].includes(action)) {
      return new Response(JSON.stringify({ error: `Invalid action. Must be one of: list, update_password, delete, update_user` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "list": {
        const { data: ucrs } = await adminClient
          .from("user_custom_roles")
          .select("user_id, custom_roles(name)");

        if (!ucrs?.length) {
          return new Response(JSON.stringify({ users: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const roleMap: Record<string, string> = {};
        const userIds: string[] = [];
        for (const ucr of ucrs) {
          const roleName = (ucr as any).custom_roles?.name;
          if (!roleName) continue;
          const legacyRole = roleName === "Superadmin" ? "superadmin" : roleName === "Monitoreo" ? "monitoreo" : "admin";
          roleMap[ucr.user_id] = legacyRole;
          if (!userIds.includes(ucr.user_id)) userIds.push(ucr.user_id);
        }

        const { data: cedulaRows } = await adminClient
          .from("admin_cedulas")
          .select("user_id, cedula, nombre")
          .in("user_id", userIds);
        const cedulaMap: Record<string, string> = {};
        const nombreMap: Record<string, string> = {};
        for (const c of cedulaRows ?? []) {
          cedulaMap[c.user_id] = c.cedula;
          nombreMap[c.user_id] = (c as any).nombre || "";
        }

        const users = [];
        for (const uid of userIds) {
          const { data } = await adminClient.auth.admin.getUserById(uid);
          if (data?.user) {
            users.push({
              id: data.user.id,
              email: data.user.email,
              created_at: data.user.created_at,
              last_sign_in_at: data.user.last_sign_in_at,
              role: roleMap[uid] ?? "admin",
              cedula: cedulaMap[uid] ?? "",
              nombre: nombreMap[uid] ?? "",
            });
          }
        }

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_password": {
        const { user_id, password } = params as Record<string, unknown>;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof user_id !== "string" || !uuidRegex.test(user_id)) {
          return new Response(JSON.stringify({ error: "user_id must be a valid UUID" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (typeof password !== "string" || password.length < 6 || password.length > 128) {
          return new Response(JSON.stringify({ error: "Password must be between 6 and 128 characters" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const { user_id } = params as Record<string, unknown>;
        const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof user_id !== "string" || !uuidRx.test(user_id)) {
          return new Response(JSON.stringify({ error: "user_id must be a valid UUID" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: targetRoles } = await adminClient
          .from("user_custom_roles")
          .select("custom_roles(name)")
          .eq("user_id", user_id);
        const targetRoleNames = (targetRoles ?? []).map((r: any) => r.custom_roles?.name).filter(Boolean);

        if (targetRoleNames.includes("Superadmin") && !callerRoleNames.includes("Superadmin")) {
          return new Response(JSON.stringify({ error: "Seul un superadmin peut supprimer un autre superadmin" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await adminClient.from("user_custom_roles").delete().eq("user_id", user_id);
        const { error } = await adminClient.auth.admin.deleteUser(user_id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_user": {
        const { user_id, email, role, cedula } = params as Record<string, unknown>;
        const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (typeof user_id !== "string" || !uuidRx.test(user_id)) {
          return new Response(JSON.stringify({ error: "user_id must be a valid UUID" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: targetRoles } = await adminClient
          .from("user_custom_roles")
          .select("custom_roles(name)")
          .eq("user_id", user_id);
        const targetRoleNames = (targetRoles ?? []).map((r: any) => r.custom_roles?.name).filter(Boolean);

        if (targetRoleNames.includes("Superadmin") && !callerRoleNames.includes("Superadmin")) {
          return new Response(JSON.stringify({ error: "Seul un superadmin peut modifier un autre superadmin" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (typeof email === "string" && email.length > 0) {
          const { error } = await adminClient.auth.admin.updateUserById(user_id, { email });
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        if (typeof role === "string" && ["admin", "superadmin", "monitoreo"].includes(role)) {
          if (!callerRoleNames.includes("Superadmin") && role === "superadmin") {
            return new Response(JSON.stringify({ error: "Seul un superadmin peut promouvoir au rôle superadmin" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const roleName = role === "superadmin" ? "Superadmin" : role === "monitoreo" ? "Monitoreo" : "Admin";
          const { data: cr } = await adminClient.from("custom_roles").select("id").eq("name", roleName).maybeSingle();
          if (cr) {
            await adminClient.from("user_custom_roles").delete().eq("user_id", user_id);
            await adminClient.from("user_custom_roles").insert({ user_id, role_id: cr.id });
          }
        }

        if (typeof cedula === "string") {
          if (cedula.trim()) {
            await adminClient.from("admin_cedulas").upsert(
              { user_id, cedula: cedula.trim() },
              { onConflict: "user_id" }
            );
          } else {
            await adminClient.from("admin_cedulas").delete().eq("user_id", user_id);
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
