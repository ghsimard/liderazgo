import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ExternalLink, GitCommit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
  url: string;
}

const DEFAULT_OWNER = "your-org";
const DEFAULT_REPO = "your-repo";

export default function AdminChangelogTab() {
  const { toast } = useToast();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const [owner, setOwner] = useState(() => localStorage.getItem("changelog_owner") || DEFAULT_OWNER);
  const [repo, setRepo] = useState(() => localStorage.getItem("changelog_repo") || DEFAULT_REPO);

  const fetchCommits = async () => {
    setLoading(true);
    try {
      let data: Commit[];

      if (USE_EXPRESS) {
        const res = await apiFetch<Commit[]>(`/api/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&per_page=50`);
        if (res.error || !res.data) throw new Error(res.error || "No data");
        data = res.data;
      } else {
        const { data: fnData, error } = await supabase.functions.invoke("github-commits", {
          body: null,
          headers: {},
        });
        // Edge function called via query params isn't straightforward with invoke,
        // so we use the full URL approach
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/github-commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&per_page=50`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        data = await res.json();
      }

      setCommits(data);
      localStorage.setItem("changelog_owner", owner);
      localStorage.setItem("changelog_repo", repo);
    } catch (err: any) {
      toast({ title: "Error al cargar commits", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (owner !== DEFAULT_OWNER && repo !== DEFAULT_REPO) {
      fetchCommits();
    }
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-CO", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getFirstLine = (msg: string) => msg.split("\n")[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Owner / Org</label>
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Repository</label>
          <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="w-52" />
        </div>
        <Button onClick={fetchCommits} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando…" : "Cargar commits"}
        </Button>
      </div>

      {commits.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          Ingresa el owner y repositorio de GitHub, luego haz clic en "Cargar commits".
        </p>
      )}

      <div className="space-y-2">
        {commits.map((c) => (
          <Card key={c.sha} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 mt-0.5 shrink-0">
                <GitCommit className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium leading-snug">{getFirstLine(c.message)}</p>
                <p className="text-xs text-muted-foreground">
                  {c.author} · {formatDate(c.date)} · <code className="text-[10px]">{c.sha.slice(0, 7)}</code>
                </p>
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
