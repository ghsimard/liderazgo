import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "GITHUB_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const owner = url.searchParams.get("owner") || "your-org";
    const repo = url.searchParams.get("repo") || "your-repo";
    const perPage = url.searchParams.get("per_page") || "30";
    const page = url.searchParams.get("page") || "1";

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`;

    const ghRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Lovable-Changelog",
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return new Response(JSON.stringify({ error: `GitHub API error: ${ghRes.status}`, details: errText }), {
        status: ghRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commits = await ghRes.json();

    const simplified = commits.map((c: any) => ({
      sha: c.sha,
      message: c.commit?.message || "",
      date: c.commit?.author?.date || c.commit?.committer?.date || "",
      author: c.commit?.author?.name || c.author?.login || "Unknown",
      url: c.html_url || "",
    }));

    return new Response(JSON.stringify(simplified), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
