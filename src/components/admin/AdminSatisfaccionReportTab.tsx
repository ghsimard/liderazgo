/**
 * Admin sub-tab: Generate satisfaction PDF report.
 * Filters (region/module/type), extra logo upload, and PDF generation.
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, FileDown, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FORM_TYPE_LABELS, SATISFACCION_FORMS } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef, SatisfaccionQuestion } from "@/data/satisfaccionData";
import { generateSatisfaccionPdf } from "@/utils/satisfaccionPdfGenerator";

const FORM_TYPES = ["asistencia", "interludio", "intensivo"] as const;
const MODULES = [1, 2, 3, 4];

interface ResponseRow {
  id: string;
  form_type: string;
  module_number: number;
  region: string;
  cedula: string;
  respuestas: any;
  created_at: string;
}

interface RegionRow {
  nombre: string;
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

export default function AdminSatisfaccionReportTab({ regions }: { regions: string[] }) {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("intensivo");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const [extraLogos, setExtraLogos] = useState<string[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [regionData, setRegionData] = useState<RegionRow[]>([]);

  useEffect(() => {
    supabase.from("regiones").select("nombre,mostrar_logo_rlt,mostrar_logo_clt").then(({ data }) => {
      setRegionData((data || []) as RegionRow[]);
    });
  }, []);

  const fetchResponses = async () => {
    setLoading(true);
    let query = supabase.from("satisfaccion_responses").select("*");
    if (filterType !== "all") query = query.eq("form_type", filterType);
    if (filterModule !== "all") query = query.eq("module_number", parseInt(filterModule));
    if (filterRegion !== "all") query = query.eq("region", filterRegion);
    const { data } = await query;
    setResponses((data || []) as ResponseRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchResponses(); }, [filterType, filterModule, filterRegion]);

  // Compute stats (same logic as AdminSatisfaccionStats)
  const stats = useMemo(() => {
    const formDef = SATISFACCION_FORMS[filterType] as SatisfaccionFormDef | undefined;
    if (!formDef || responses.length === 0) return null;

    const totalResponses = responses.length;
    const sections: { title: string; type: "checkbox" | "grid" | "likert" | "other"; data: { label: string; value: number; count: number }[] }[] = [];

    for (const section of formDef.sections) {
      for (const q of section.questions) {
        if (q.type === "textarea" || q.type === "text" || q.type === "date") continue;

        if (q.type === "checkbox-max3") {
          const counts: Record<string, number> = {};
          (q.options || []).forEach(o => counts[o.value] = 0);
          for (const r of responses) {
            const val = r.respuestas?.[q.key];
            if (Array.isArray(val)) val.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
          }
          const data = (q.options || []).map(o => ({
            label: o.label, value: totalResponses > 0 ? Math.round((counts[o.value] / totalResponses) * 10000) / 100 : 0, count: counts[o.value],
          })).sort((a, b) => b.value - a.value);
          sections.push({ title: section.title, type: "checkbox", data });
        }

        if (q.type === "radio" || q.type === "likert4") {
          const counts: Record<string, number> = {};
          (q.options || []).forEach(o => counts[o.value] = 0);
          for (const r of responses) {
            const val = r.respuestas?.[q.key];
            if (val !== undefined && val !== null) counts[String(val)] = (counts[String(val)] || 0) + 1;
          }
          if (q.type === "likert4") {
            const positive = (counts["3"] || 0) + (counts["4"] || 0);
            const pct = totalResponses > 0 ? Math.round((positive / totalResponses) * 10000) / 100 : 0;
            sections.push({ title: section.title, type: "likert", data: [{ label: q.label, value: pct, count: positive }] });
          } else {
            const data = (q.options || []).map(o => ({
              label: o.label, value: totalResponses > 0 ? Math.round((counts[o.value] / totalResponses) * 10000) / 100 : 0, count: counts[o.value],
            }));
            sections.push({ title: section.title, type: "other", data });
          }
        }

        if (q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") {
          const data: { label: string; value: number; count: number }[] = [];
          for (const row of (q.rows || [])) {
            let positiveCount = 0, total = 0;
            for (const r of responses) {
              const gridVal = r.respuestas?.[q.key];
              if (gridVal && typeof gridVal === "object") {
                const cellVal = gridVal[row.key];
                if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
                  total++;
                  if (q.type === "grid-sino" && cellVal === "si") positiveCount++;
                  else if (q.type === "grid-frequency" && (cellVal === "frecuentemente" || cellVal === "siempre")) positiveCount++;
                  else if (q.type === "grid-logistic" && (cellVal === "3" || cellVal === "4")) positiveCount++;
                }
              }
            }
            data.push({ label: row.label, value: total > 0 ? Math.round((positiveCount / total) * 10000) / 100 : 0, count: positiveCount });
          }
          data.sort((a, b) => b.value - a.value);
          sections.push({ title: section.title, type: "grid", data });
        }
      }
    }

    // Merge likert with same title
    const merged: typeof sections = [];
    for (const s of sections) {
      const existing = merged.find(m => m.title === s.title && m.type === s.type);
      if (existing && s.type === "likert") existing.data.push(...s.data);
      else merged.push({ ...s, data: [...s.data] });
    }

    // General satisfaction
    const gridSections = merged.filter(s => s.type === "grid" && !s.title.toLowerCase().includes("autoevaluación") && !s.title.toLowerCase().includes("autoevaluacion"));
    const generalSatisfaction: { label: string; value: number }[] = [];
    let overallSatisfaction = 0;
    if (gridSections.length > 0) {
      let totalPct = 0;
      for (const gs of gridSections) {
        const avg = gs.data.length > 0 ? gs.data.reduce((sum, d) => sum + d.value, 0) / gs.data.length : 0;
        generalSatisfaction.push({ label: gs.title, value: Math.round(avg * 100) / 100 });
        totalPct += avg;
      }
      overallSatisfaction = Math.round((totalPct / gridSections.length) * 100) / 100;
    }
    const likertSections = merged.filter(s => s.type === "likert");
    for (const ls of likertSections) {
      if (ls.data.length > 0) {
        const avg = ls.data.reduce((sum, d) => sum + d.value, 0) / ls.data.length;
        generalSatisfaction.push({ label: ls.title, value: Math.round(avg * 100) / 100 });
      }
    }

    return { sections: merged, generalSatisfaction, overallSatisfaction };
  }, [responses, filterType]);

  const getLogoFlags = () => {
    if (filterRegion === "all") return { showLogoRlt: true, showLogoClt: true };
    const r = regionData.find(rd => rd.nombre === filterRegion);
    return { showLogoRlt: r?.mostrar_logo_rlt ?? true, showLogoClt: r?.mostrar_logo_clt ?? true };
  };

  const handleAddLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (extraLogos.length >= 3) {
      toast({ title: "Máximo 3 logos adicionales", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setExtraLogos(prev => [...prev, reader.result as string]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (!stats || responses.length === 0) {
      toast({ title: "Sin datos para generar", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { showLogoRlt, showLogoClt } = getLogoFlags();
      await generateSatisfaccionPdf({
        filterType, filterModule, filterRegion, responses,
        showLogoRlt, showLogoClt, extraLogos,
        sectionStats: stats.sections,
        generalSatisfaction: stats.generalSatisfaction,
        overallSatisfaction: stats.overallSatisfaction,
      });
      toast({ title: "PDF generado exitosamente" });
    } catch (err: any) {
      toast({ title: "Error generando PDF", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuración del informe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de encuesta</Label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                {FORM_TYPES.map((ft) => <option key={ft} value={ft}>{FORM_TYPE_LABELS[ft]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Módulo</Label>
              <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                <option value="all">Todos</option>
                {MODULES.map((m) => <option key={m} value={String(m)}>Módulo {m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Región</Label>
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                <option value="all">Todas</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Stats summary */}
          <div className="text-sm text-muted-foreground">
            {loading ? <Loader2 className="animate-spin h-4 w-4 inline" /> : `${responses.length} respuestas encontradas`}
          </div>
        </CardContent>
      </Card>

      {/* Extra logos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Logos adicionales (página título)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Los logos RLT, CLT y Cosmo se incluyen automáticamente según la configuración de la región. Puede agregar hasta 3 logos adicionales de socios o aliados.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            {extraLogos.map((logo, i) => (
              <div key={i} className="relative group border rounded-lg p-2 bg-muted/30">
                <img src={logo} alt={`Logo ${i + 1}`} className="h-12 w-auto object-contain" />
                <button
                  onClick={() => setExtraLogos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {extraLogos.length < 3 && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Agregar logo</span>
                <input type="file" accept="image/*" onChange={handleAddLogo} className="hidden" />
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating || loading || responses.length === 0}
          className="gap-2 min-w-[200px]"
        >
          {generating ? <Loader2 className="animate-spin h-4 w-4" /> : <FileDown className="w-4 h-4" />}
          {generating ? "Generando…" : "Generar PDF"}
        </Button>
      </div>
    </div>
  );
}
