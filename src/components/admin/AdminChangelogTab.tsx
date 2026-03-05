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

const OWNER = "ghsimard";
const REPO = "liderazgo";

export default function AdminChangelogTab() {
  const { toast } = useToast();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(false);
  const owner = OWNER;
  const repo = REPO;

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
    } catch (err: any) {
      toast({ title: "Error al cargar commits", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
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
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={fetchCommits} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Cargando…" : "Actualizar"}
        </Button>
      </div>

      {commits.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No hay commits para mostrar.</p>
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
