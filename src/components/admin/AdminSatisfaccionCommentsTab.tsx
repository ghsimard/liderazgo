import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageSquare, Sparkles, Copy, Check } from "lucide-react";
import { FORM_TYPE_LABELS } from "@/data/satisfaccionData";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

const COMMENT_KEYS: Record<string, string> = {
  asistencia: "comentarios",
  interludio: "oportunidades_mejora",
  intensivo: "comentarios_generales",
};

interface CommentEntry {
  id: string;
  nombre: string;
  institucion: string;
  region: string;
  form_type: string;
  module_number: number;
  created_at: string;
  comment: string;
}

export default function AdminSatisfaccionCommentsTab() {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setAiAnalysis("");
  }, [filterRegion, filterType, filterModule]);

  useEffect(() => {
    (async () => {
      const [resResp, resFichas] = await Promise.all([
        supabase.from("satisfaccion_responses").select("id, form_type, module_number, region, cedula, respuestas, created_at"),
        supabase.from("fichas_rlt").select("numero_cedula, nombres_apellidos, nombre_ie, cargo_actual, region"),
      ]);

      const responses = resResp.data ?? [];
      const fichas = resFichas.data ?? [];

      const rectorMap = new Map<string, { nombre: string; ie: string; region: string }>();
      for (const f of fichas) {
        if (f.cargo_actual === "Rector/a" && f.numero_cedula) {
          rectorMap.set(f.numero_cedula, { nombre: f.nombres_apellidos, ie: f.nombre_ie, region: f.region });
        }
      }

      const entries: CommentEntry[] = [];
      for (const r of responses) {
        const rector = rectorMap.get(r.cedula);
        if (!rector) continue;
        const key = COMMENT_KEYS[r.form_type];
        if (!key) continue;
        const resp = r.respuestas as any;
        const text = resp?.[key];
        if (!text || typeof text !== "string" || text.trim() === "") continue;
        entries.push({
          id: r.id,
          nombre: rector.nombre,
          institucion: rector.ie,
          region: r.region || rector.region,
          form_type: r.form_type,
          module_number: r.module_number,
          created_at: r.created_at,
          comment: text.trim(),
        });
      }

      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(entries);
      setLoading(false);
    })();
  }, []);

  const regions = useMemo(() => {
    const set = new Set(comments.map((c) => c.region));
    return Array.from(set).sort();
  }, [comments]);

  const modules = useMemo(() => {
    const set = new Set(comments.map((c) => c.module_number));
    return Array.from(set).sort((a, b) => a - b);
  }, [comments]);

  const filtered = useMemo(() => {
    return comments.filter((c) => {
      if (filterRegion !== "all" && c.region !== filterRegion) return false;
      if (filterType !== "all" && c.form_type !== filterType) return false;
      if (filterModule !== "all" && c.module_number !== Number(filterModule)) return false;
      return true;
    });
  }, [comments, filterRegion, filterType, filterModule]);

  const handleGenerateAnalysis = async () => {
    setAiLoading(true);
    setAiAnalysis("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-section-text", {
        body: {
          sectionType: "bullet_list",
          sectionTitle: "Análisis de comentarios cualitativos",
          comments: filtered.slice(0, 50).map((c) => c.comment),
          filterRegion: filterRegion === "all" ? "Todas" : filterRegion,
          filterType: filterType === "all" ? "Todos" : (FORM_TYPE_LABELS[filterType] ?? filterType),
          filterModule: filterModule === "all" ? "Todos" : `Módulo ${filterModule}`,
          totalResponses: filtered.length,
          generalStats: [],
          overallSatisfaction: null,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      } else {
        setAiAnalysis(data?.text || "");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Error al generar análisis", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Región" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las regiones</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="ml-auto">
          <MessageSquare className="w-3.5 h-3.5 mr-1" />
          {filtered.length} comentario{filtered.length !== 1 ? "s" : ""}
        </Badge>

        {filtered.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleGenerateAnalysis} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Análisis IA
          </Button>
        )}
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              Análisis IA de comentarios
            </div>
            <div
              className="text-sm text-foreground/85 space-y-2 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: aiAnalysis.split("|||").map((s) => s.trim()).filter(Boolean).map((s) => `<div>${s}</div>`).join("") }}
            />
          </CardContent>
        </Card>
      )}

      {/* Comment cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No hay comentarios con los filtros seleccionados.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="font-medium text-foreground">{c.nombre}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{c.institucion}</span>
                  <div className="ml-auto flex gap-2">
                    <Badge variant="outline">{c.region}</Badge>
                    <Badge variant="secondary">{FORM_TYPE_LABELS[c.form_type] ?? c.form_type}</Badge>
                    <Badge variant="secondary">M{c.module_number}</Badge>
                  </div>
                </div>
                <p className="text-sm italic text-foreground/80 whitespace-pre-line">{c.comment}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(c.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
