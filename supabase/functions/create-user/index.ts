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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin via new RBAC tables
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller role via custom_roles
    const { data: callerRoleData } = await adminClient
      .from("user_custom_roles")
      .select("role_id, custom_roles(name)")
      .eq("user_id", caller.id);

    const callerRoleNames = (callerRoleData ?? []).map((r: any) => r.custom_roles?.name).filter(Boolean);
    if (!callerRoleNames.includes("Admin") && !callerRoleNames.includes("Superadmin")) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, makeAdmin, makeSuperAdmin, makeViewer, makeAuditor, makeMonitoreo, customRoleId } = body as Record<string, unknown>;

    if (typeof email !== "string" || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return new Response(JSON.stringify({ error: "Le mot de passe doit contenir entre 6 et 128 caractères" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only superadmins can create superadmins
    if (makeSuperAdmin && !callerRoleNames.includes("Superadmin")) {
      return new Response(JSON.stringify({ error: "Seul un superadmin peut créer un autre superadmin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with service role
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newUser.user) {
      const uid = newUser.user.id;

      // Determine legacy role for mapping
      const legacyRole = makeSuperAdmin ? "superadmin" : (makeViewer || makeAuditor || makeMonitoreo) ? "monitoreo" : "admin";

      // Write to new user_custom_roles
      if (typeof customRoleId === "string" && customRoleId) {
        // Use the explicitly provided custom role ID
        await adminClient.from("user_custom_roles").upsert(
          { user_id: uid, role_id: customRoleId },
          { onConflict: "user_id,role_id" }
        );
      } else {
        // Map legacy role to custom_roles by name
        const roleName = makeSuperAdmin ? "Superadmin" : (makeViewer || makeAuditor || makeMonitoreo) ? "Monitoreo" : "Admin";
        const { data: cr } = await adminClient
          .from("custom_roles")
          .select("id")
          .eq("name", roleName)
          .maybeSingle();
        if (cr) {
          await adminClient.from("user_custom_roles").upsert(
            { user_id: uid, role_id: cr.id },
            { onConflict: "user_id,role_id" }
          );
        }
      }
    }

    return new Response(JSON.stringify({ user: { id: newUser.user?.id, email: newUser.user?.email } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
