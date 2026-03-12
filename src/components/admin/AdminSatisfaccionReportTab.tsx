/**
 * Admin sub-tab: Build and generate satisfaction PDF reports.
 * Matches the reference report structure:
 * - Cover page with logos
 * - Table of contents (auto)
 * - Introduction (text)
 * - Contextualización (text)
 * - Ficha técnica (auto from data)
 * - Descripción de bloques (text)
 * - Per-block: chart (auto) + analysis (text)
 * - Nivel general de satisfacción (auto)
 * - Aportes cualitativos (text)
 * - Recomendaciones (text)
 * - Anexo: comentarios textuales (auto)
 */
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileDown, Upload, X, Save, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, BarChart3, FileText, List, Table as TableIcon, MessageSquare, Image as ImageIcon, GripVertical, Eye, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FORM_TYPE_LABELS, SATISFACCION_FORMS } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef, SatisfaccionQuestion } from "@/data/satisfaccionData";
import { generateSatisfaccionReport } from "@/utils/satisfaccionPdfGenerator";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

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

/** Section types for the report builder */
type SectionType = "text" | "chart_analysis" | "ficha_tecnica" | "satisfaction_summary" | "comments_annex" | "bullet_list";

type ChartType = "horizontal_bar" | "vertical_bar" | "radar" | "pie";

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  horizontal_bar: "Barras horizontales",
  vertical_bar: "Barras verticales",
  radar: "Araña / Radar",
  pie: "Circular (Pie)",
};

interface ReportSection {
  id: string;
  type: SectionType;
  title: string;
  /** For text/analysis sections */
  content?: string;
  /** For bullet_list */
  bullets?: string[];
  /** For chart_analysis: which survey section to chart */
  chartSectionTitle?: string;
  /** Chart visualization type */
  chartType?: ChartType;
  /** Whether to include this section */
  enabled: boolean;
  /** If true, numbered as sub-section (e.g. 1.1 instead of 2) */
  isSubsection?: boolean;
}

interface ExtraLogoEntry {
  src: string;
  scale: number; // percentage 10-200, default 100
}

interface ReportContent {
  reportTitle: string;
  reportSubtitle: string;
  sections: ReportSection[];
  extraLogos: ExtraLogoEntry[];
  executiveSummaryEnabled?: boolean;
  executiveSummary?: string;
}

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  text: "Texto libre",
  chart_analysis: "Gráfico + Análisis",
  ficha_tecnica: "Ficha Técnica",
  satisfaction_summary: "Nivel General de Satisfacción",
  comments_annex: "Anexo: Comentarios",
  bullet_list: "Lista de viñetas",
};

const SECTION_TYPE_ICONS: Record<SectionType, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  chart_analysis: <BarChart3 className="w-4 h-4" />,
  ficha_tecnica: <TableIcon className="w-4 h-4" />,
  satisfaction_summary: <BarChart3 className="w-4 h-4" />,
  comments_annex: <MessageSquare className="w-4 h-4" />,
  bullet_list: <List className="w-4 h-4" />,
};

function generateId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Build default report sections based on form type */
function buildDefaultSections(formType: string): ReportSection[] {
  const formDef = SATISFACCION_FORMS[formType] as SatisfaccionFormDef | undefined;
  if (!formDef) return [];

  const sections: ReportSection[] = [
    { id: generateId(), type: "text", title: "INTRODUCCIÓN", content: "", enabled: true },
    { id: generateId(), type: "text", title: "CONTEXTUALIZACIÓN DE LA ENCUESTA DE SATISFACCIÓN EN EL SISTEMA DE EVALUACIÓN DEL PROGRAMA RLT", content: "", enabled: true },
    { id: generateId(), type: "ficha_tecnica", title: "FICHA TÉCNICA DE LA ENCUESTA DE SATISFACCIÓN", content: "", enabled: true },
    { id: generateId(), type: "text", title: "DESCRIPCIÓN DE LOS BLOQUES TEMÁTICOS DE LA ENCUESTA DE SATISFACCIÓN", content: "", enabled: true },
  ];

  // Add chart+analysis for each form section (excluding textarea-only sections)
  for (const section of formDef.sections) {
    const hasChartable = section.questions.some(q => q.type !== "textarea" && q.type !== "text" && q.type !== "date");
    if (hasChartable) {
      sections.push({
        id: generateId(),
        type: "chart_analysis",
        title: `BLOQUE: ${section.title.toUpperCase()}`,
        content: "",
        chartSectionTitle: section.title,
        enabled: true,
      });
    }
  }

  sections.push(
    { id: generateId(), type: "satisfaction_summary", title: "NIVEL GENERAL DE SATISFACCIÓN", content: "", enabled: true },
    { id: generateId(), type: "bullet_list", title: "APORTES CUALITATIVOS Y OPORTUNIDADES DE MEJORA", bullets: [], enabled: true },
    { id: generateId(), type: "text", title: "RECOMENDACIONES", content: "", enabled: true },
    { id: generateId(), type: "comments_annex", title: "ANEXO: OBSERVACIONES TEXTUALES", content: "", enabled: true },
  );

  return sections;
}

export default function AdminSatisfaccionReportTab({ regions }: { regions: string[] }) {
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("intensivo");
  const [filterModule, setFilterModule] = useState<string>("1");
  const [filterRegion, setFilterRegion] = useState<string>(regions[0] || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [regionData, setRegionData] = useState<RegionRow[]>([]);

  // Report content
  const [reportContent, setReportContent] = useState<ReportContent>({
    reportTitle: "INFORME EXTENDIDO – ENCUESTA DE SATISFACCIÓN",
    reportSubtitle: "",
    sections: buildDefaultSections("intensivo"),
    extraLogos: [],
    executiveSummaryEnabled: false,
    executiveSummary: "",
  });

  useEffect(() => {
    supabase.from("regiones").select("nombre,mostrar_logo_rlt,mostrar_logo_clt").then(({ data }) => {
      setRegionData((data || []) as RegionRow[]);
    });
  }, []);

  // Load saved report content from DB
  const loadReportContent = useCallback(async () => {
    if (!filterRegion || filterModule === "all") return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("satisfaccion_report_content")
        .select("*")
        .eq("form_type", filterType)
        .eq("module_number", parseInt(filterModule))
        .eq("region", filterRegion)
        .maybeSingle();

      if (data?.content) {
        const saved = data.content as any;
        setReportContent({
          reportTitle: saved.reportTitle || "INFORME EXTENDIDO – ENCUESTA DE SATISFACCIÓN",
          reportSubtitle: saved.reportSubtitle || "",
          sections: saved.sections || buildDefaultSections(filterType),
          extraLogos: (saved.extraLogos || (data as any).extra_logos || []).map((l: any) => {
            if (typeof l === 'string') {
              try { const parsed = JSON.parse(l); if (parsed?.src) return { src: parsed.src, scale: parsed.scale ?? 100 }; } catch {}
              return { src: l, scale: 100 };
            }
            return l;
          }),
          executiveSummaryEnabled: saved.executiveSummaryEnabled ?? false,
          executiveSummary: saved.executiveSummary || "",
        });
      } else {
        setReportContent({
          reportTitle: `INFORME EXTENDIDO – ENCUESTA DE SATISFACCIÓN ${FORM_TYPE_LABELS[filterType]?.toUpperCase() || ""} ${filterModule}`,
          reportSubtitle: "",
          sections: buildDefaultSections(filterType),
          extraLogos: [],
          executiveSummaryEnabled: false,
          executiveSummary: "",
        });
      }
    } catch (err) {
      console.error("Error loading report content:", err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterModule, filterRegion]);

  useEffect(() => { loadReportContent(); }, [loadReportContent]);

  // Fetch responses for auto-generated content
  const fetchResponses = useCallback(async () => {
    setLoadingData(true);
    let query = supabase.from("satisfaccion_responses").select("*").eq("form_type", filterType);
    if (filterModule !== "all") query = query.eq("module_number", parseInt(filterModule));
    if (filterRegion) query = query.eq("region", filterRegion);
    const { data } = await query;
    setResponses((data || []) as ResponseRow[]);
    setLoadingData(false);
  }, [filterType, filterModule, filterRegion]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  // Compute stats for PDF
  const stats = useMemo(() => {
    const formDef = SATISFACCION_FORMS[filterType] as SatisfaccionFormDef | undefined;
    if (!formDef || responses.length === 0) return null;
    const totalResponses = responses.length;
    const sections: { title: string; type: string; data: { label: string; value: number; count: number }[] }[] = [];

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

    // Merge likert sections with same title
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

    // Raw comments (textarea answers)
    const comments: string[] = [];
    for (const section of formDef.sections) {
      for (const q of section.questions) {
        if (q.type === "textarea") {
          for (const r of responses) {
            const val = r.respuestas?.[q.key];
            if (val && typeof val === "string" && val.trim()) comments.push(val.trim());
          }
        }
      }
    }

    return { sections: merged, generalSatisfaction, overallSatisfaction, totalResponses, comments };
  }, [responses, filterType]);

  // Logo flags
  const getLogoFlags = () => {
    const r = regionData.find(rd => rd.nombre === filterRegion);
    return { showLogoRlt: r?.mostrar_logo_rlt ?? true, showLogoClt: r?.mostrar_logo_clt ?? true };
  };

  // Section management
  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setReportContent(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  };

  const sectionsEndRef = useRef<HTMLDivElement>(null);

  const addSection = (type: SectionType) => {
    const newSection: ReportSection = {
      id: generateId(),
      type,
      title: SECTION_TYPE_LABELS[type],
      content: "",
      bullets: type === "bullet_list" ? [""] : undefined,
      enabled: true,
    };
    setReportContent(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
    toast({ title: `Sección "${SECTION_TYPE_LABELS[type]}" agregada` });
    setTimeout(() => sectionsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const removeSection = (id: string) => {
    setReportContent(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setReportContent(prev => {
      const idx = prev.sections.findIndex(s => s.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.sections.length) return prev;
      const newSections = [...prev.sections];
      [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
      return { ...prev, sections: newSections };
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    setReportContent(prev => {
      const newSections = [...prev.sections];
      const [moved] = newSections.splice(from, 1);
      newSections.splice(to, 0, moved);
      return { ...prev, sections: newSections };
    });
  };

  // Extra logos
  const handleAddLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (reportContent.extraLogos.length >= 3) {
      toast({ title: "Máximo 3 logos adicionales", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReportContent(prev => ({ ...prev, extraLogos: [...prev.extraLogos, { src: reader.result as string, scale: 100 }] }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Save to DB
  const handleSave = async () => {
    if (!filterRegion || filterModule === "all") {
      toast({ title: "Seleccione una región y un módulo específico", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("satisfaccion_report_content")
      .upsert({
        form_type: filterType,
        module_number: parseInt(filterModule),
        region: filterRegion,
        content: {
          reportTitle: reportContent.reportTitle,
          reportSubtitle: reportContent.reportSubtitle,
          sections: reportContent.sections,
          executiveSummaryEnabled: reportContent.executiveSummaryEnabled,
          executiveSummary: reportContent.executiveSummary,
          extraLogos: reportContent.extraLogos,
        },
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "form_type,module_number,region" });

    if (error) {
      toast({ title: "Error guardando", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Informe guardado" });
    }
    setSaving(false);
  };

  // Generate Executive Summary with AI
  const handleGenerateExecutiveSummary = async () => {
    if (!stats || responses.length === 0) {
      toast({ title: "Se necesitan datos para generar el resumen", variant: "destructive" });
      return;
    }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-executive-summary", {
        body: {
          reportTitle: reportContent.reportTitle,
          filterType,
          filterModule,
          filterRegion,
          totalResponses: stats.totalResponses,
          sectionTitles: reportContent.sections.filter(s => s.enabled).map(s => s.title),
          generalSatisfaction: stats.generalSatisfaction,
          overallSatisfaction: stats.overallSatisfaction,
          commentsCount: stats.comments.length,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.summary) {
        setReportContent(prev => ({ ...prev, executiveSummary: data.summary }));
        toast({ title: "Resumen ejecutivo generado" });
      }
    } catch (err: any) {
      toast({ title: "Error generando resumen", description: err.message, variant: "destructive" });
    }
    setGeneratingAI(false);
  };

  // Generate PDF
  const handleGenerate = async () => {
    if (!stats || responses.length === 0) {
      toast({ title: "Sin datos para generar", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { showLogoRlt, showLogoClt } = getLogoFlags();
      await generateSatisfaccionReport({
        filterType,
        filterModule,
        filterRegion,
        totalResponses: stats.totalResponses,
        showLogoRlt,
        showLogoClt,
        extraLogos: reportContent.extraLogos,
        reportContent,
        sectionStats: stats.sections,
        generalSatisfaction: stats.generalSatisfaction,
        overallSatisfaction: stats.overallSatisfaction,
        comments: stats.comments,
        executiveSummary: reportContent.executiveSummaryEnabled ? reportContent.executiveSummary : undefined,
      });
      toast({ title: "PDF generado exitosamente" });
    } catch (err: any) {
      toast({ title: "Error generando PDF", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos del informe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-background">
                {FORM_TYPES.map(ft => <option key={ft} value={ft}>{FORM_TYPE_LABELS[ft]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Módulo</Label>
              <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-background">
                {MODULES.map(m => <option key={m} value={String(m)}>Módulo {m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Región</Label>
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="border rounded px-2 py-1.5 text-sm bg-background">
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Badge variant={responses.length > 0 ? "secondary" : "outline"} className="text-xs h-8">
              {loadingData ? <Loader2 className="animate-spin h-3 w-3" /> : `${responses.length} respuestas`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Cover page config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Página de título</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Título del informe</Label>
            <Input
              value={reportContent.reportTitle}
              onChange={e => setReportContent(prev => ({ ...prev, reportTitle: e.target.value }))}
              placeholder="INFORME EXTENDIDO – ENCUESTA DE SATISFACCIÓN..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtítulo (ej: "El valor de ser y de ser con otros")</Label>
            <Input
              value={reportContent.reportSubtitle}
              onChange={e => setReportContent(prev => ({ ...prev, reportSubtitle: e.target.value }))}
              placeholder="Subtítulo opcional..."
            />
          </div>
          {/* Extra logos */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Logos adicionales</Label>
            <p className="text-xs text-muted-foreground">Los logos RLT/CLT/Cosmo se incluyen automáticamente. Agregue hasta 3 logos de aliados.</p>
            <div className="flex flex-wrap gap-3 items-center">
              {reportContent.extraLogos.map((logo, i) => (
                <div key={i} className="relative group border rounded-lg p-2 bg-muted/30 space-y-1.5">
                  <img src={logo.src} alt={`Logo ${i + 1}`} className="h-10 w-auto object-contain" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{logo.scale}%</span>
                    <input
                      type="range"
                      min={30}
                      max={200}
                      step={5}
                      value={logo.scale}
                      onChange={(e) => {
                        const newScale = Number(e.target.value);
                        setReportContent(prev => ({
                          ...prev,
                          extraLogos: prev.extraLogos.map((l, idx) => idx === i ? { ...l, scale: newScale } : l),
                        }));
                      }}
                      className="w-20 h-1 accent-primary"
                    />
                  </div>
                  <button
                    onClick={() => setReportContent(prev => ({ ...prev, extraLogos: prev.extraLogos.filter((_, idx) => idx !== i) }))}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {reportContent.extraLogos.length < 3 && (
                <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-2.5 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground mb-0.5" />
                  <span className="text-xs text-muted-foreground">Agregar</span>
                  <input type="file" accept="image/*" onChange={handleAddLogo} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Resumen Ejecutivo
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="exec-summary-toggle" className="text-xs text-muted-foreground">Incluir</Label>
              <Switch
                id="exec-summary-toggle"
                checked={!!reportContent.executiveSummaryEnabled}
                onCheckedChange={(checked) => setReportContent(prev => ({ ...prev, executiveSummaryEnabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>
        {reportContent.executiveSummaryEnabled && (
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-muted-foreground">
              Se mostrará en una página dedicada justo después de la portada. Puede generarlo con IA o escribirlo manualmente.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateExecutiveSummary}
                disabled={generatingAI || !stats || responses.length === 0}
                className="gap-1.5"
              >
                {generatingAI ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingAI ? "Generando…" : "Generar con IA"}
              </Button>
              {reportContent.executiveSummary && (
                <Badge variant="secondary" className="text-xs">
                  {reportContent.executiveSummary.length} caracteres
                </Badge>
              )}
            </div>
            <Textarea
              value={reportContent.executiveSummary || ""}
              onChange={e => setReportContent(prev => ({ ...prev, executiveSummary: e.target.value }))}
              placeholder="Escriba o genere el resumen ejecutivo del informe…"
              className="min-h-[120px] text-sm"
            />
          </CardContent>
        )}
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Secciones del informe</h3>
          <div className="flex gap-1.5">
            {(["text", "chart_analysis", "bullet_list", "ficha_tecnica", "satisfaction_summary", "comments_annex"] as SectionType[]).map(type => (
              <Button key={type} variant="outline" size="sm" onClick={() => addSection(type)} className="gap-1 text-xs h-7">
                <Plus className="w-3 h-3" />
                {SECTION_TYPE_LABELS[type].split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="report-sections">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {reportContent.sections.map((section, si) => (
                  <Draggable key={section.id} draggableId={section.id} index={si}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={dragProvided.draggableProps.style}
                      >
                        <SectionEditor
                          section={section}
                          index={si}
                          total={reportContent.sections.length}
                          onUpdate={(updates) => updateSection(section.id, updates)}
                          onRemove={() => removeSection(section.id)}
                          onMove={(dir) => moveSection(section.id, dir)}
                          stats={stats}
                          filterType={filterType}
                          filterModule={filterModule}
                          filterRegion={filterRegion}
                          totalResponses={responses.length}
                          dragHandleProps={dragProvided.dragHandleProps}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div ref={sectionsEndRef} />
      </div>

      {/* Actions */}
      <Separator />
      <div className="flex gap-3 justify-center">
        <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2">
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando…" : "Guardar borrador"}
        </Button>
        <Button onClick={handleGenerate} disabled={generating || responses.length === 0} className="gap-2 min-w-[180px]">
          {generating ? <Loader2 className="animate-spin h-4 w-4" /> : <FileDown className="w-4 h-4" />}
          {generating ? "Generando…" : "Generar PDF"}
        </Button>
      </div>
    </div>
  );
}

// ── Section Editor Component ──
function SectionEditor({
  section, index, total, onUpdate, onRemove, onMove, stats, filterType, filterModule, filterRegion, totalResponses, dragHandleProps, isDragging,
}: {
  section: ReportSection;
  index: number;
  total: number;
  onUpdate: (updates: Partial<ReportSection>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  stats: any;
  filterType: string;
  filterModule: string;
  filterRegion: string;
  totalResponses: number;
  dragHandleProps?: any;
  isDragging?: boolean;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [previewChart, setPreviewChart] = useState<any>(null);
  const [showFichaPreview, setShowFichaPreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const isAuto = section.type === "ficha_tecnica" || section.type === "satisfaction_summary" || section.type === "comments_annex";
  const chartData = section.type === "chart_analysis" && stats
    ? stats.sections.find((s: any) => s.title === section.chartSectionTitle)
    : null;

  const handleGenerateAI = async (targetType?: string) => {
    const effectiveType = targetType || section.type;
    // Check if content exists and confirm overwrite
    if (effectiveType === "bullet_list") {
      if (section.bullets && section.bullets.some(b => b.trim())) {
        if (!confirm("¿Reemplazar las viñetas existentes con contenido generado por IA?")) return;
      }
    } else {
      if (section.content && section.content.replace(/<[^>]*>/g, "").trim()) {
        if (!confirm("¿Reemplazar el contenido existente con texto generado por IA?")) return;
      }
    }

    setAiLoading(true);
    try {
      const body: any = {
        sectionType: effectiveType === "chart_analysis" ? "chart_analysis" : effectiveType === "satisfaction_summary" ? "satisfaction_summary" : effectiveType === "bullet_list" ? "bullet_list" : "text",
        sectionTitle: section.title,
        filterType,
        filterModule,
        filterRegion,
        totalResponses,
        overallSatisfaction: stats?.overallSatisfaction,
      };

      if (effectiveType === "chart_analysis" && chartData) {
        body.chartData = chartData.data.map((d: any) => ({ label: d.label, value: d.value }));
      }
      if (effectiveType === "satisfaction_summary" || effectiveType === "bullet_list") {
        body.generalStats = stats?.generalSatisfaction || [];
      }
      if (effectiveType === "bullet_list" && stats?.comments) {
        body.comments = stats.comments.slice(0, 20);
      }

      const { data, error } = await supabase.functions.invoke("generate-section-text", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.text) {
        if (effectiveType === "bullet_list") {
          // Split by ||| separator
          const bullets = data.text.split("|||").map((b: string) => b.trim()).filter((b: string) => b);
          onUpdate({ bullets: bullets.length > 0 ? bullets : [data.text] });
        } else {
          onUpdate({ content: data.text });
        }
        toast({ title: "Texto generado con IA" });
      }
    } catch (err: any) {
      toast({ title: "Error generando texto", description: err.message, variant: "destructive" });
    }
    setAiLoading(false);
  };

  return (
    <Card className={`border-l-4 transition-shadow ${isDragging ? "shadow-lg ring-2 ring-primary/30" : ""} ${section.enabled ? "border-l-primary/40" : "border-l-muted opacity-60"}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 py-2 px-3">
          {/* Drag handle */}
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Expand toggle */}
          <CollapsibleTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground p-0.5 transition-transform">
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
            </button>
          </CollapsibleTrigger>

          {/* Icon + Title */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {SECTION_TYPE_ICONS[section.type]}
          </div>
          <span className={`flex-1 text-sm truncate ${section.isSubsection ? "font-normal pl-3 text-muted-foreground" : "font-semibold"}`}>{section.title}</span>

          {section.isSubsection && <Badge variant="secondary" className="text-[10px] shrink-0">Sub</Badge>}
          <Badge variant="outline" className="text-xs shrink-0">{SECTION_TYPE_LABELS[section.type]}</Badge>
          <label className="flex items-center gap-1 text-xs shrink-0">
            <input type="checkbox" checked={section.enabled} onChange={e => { e.stopPropagation(); onUpdate({ enabled: e.target.checked }); }} className="rounded" />
          </label>
          <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive h-7 w-7 p-0">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4 space-y-2">
            {/* Subsection toggle + Editable title */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!section.isSubsection}
                  onChange={e => onUpdate({ isSubsection: e.target.checked })}
                  className="rounded"
                />
                Sub-sección
              </label>
              <Input
                value={section.title}
                onChange={e => onUpdate({ title: e.target.value })}
                className="h-8 text-sm font-semibold flex-1"
                placeholder="Título de la sección"
              />
            </div>

            {/* Content editor based on type */}
            {section.enabled && (
              <>
                {(section.type === "text" || section.type === "chart_analysis") && (
                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateAI(section.type)}
                      disabled={aiLoading || !stats || totalResponses === 0}
                      className="gap-1.5 text-xs h-7"
                    >
                      {aiLoading ? <Loader2 className="animate-spin h-3 w-3" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading ? "Generando…" : "Generar con IA"}
                    </Button>
                    <RichTextEditor
                      value={section.content || ""}
                      onChange={val => onUpdate({ content: val })}
                      placeholder={section.type === "chart_analysis" ? "Escriba el análisis de este bloque…" : "Escriba el contenido de esta sección…"}
                      minHeight={section.type === "chart_analysis" ? "80px" : "120px"}
                    />
                  </div>
                )}

                {section.type === "chart_analysis" && (
                  <div className="text-xs text-muted-foreground">
                    {chartData ? (
                      <button
                        type="button"
                        onClick={() => setPreviewChart(chartData)}
                        className="text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        ✓ Gráfico disponible ({CHART_TYPE_LABELS[section.chartType || "horizontal_bar"]}): {chartData.data.length} indicadores — clic para ver/cambiar
                      </button>
                    ) : (
                      <span className="text-amber-600">⚠ Sin datos para gráfico "{section.chartSectionTitle}"</span>
                    )}
                  </div>
                )}

                {section.type === "ficha_tecnica" && (
                  <button
                    type="button"
                    onClick={() => setShowFichaPreview(true)}
                    className="text-xs text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver ficha técnica ({totalResponses} respuestas)
                  </button>
                )}

                {isAuto && (
                  <p className="text-xs text-muted-foreground italic">
                    {section.type === "ficha_tecnica" && "Se genera automáticamente con los datos de la encuesta"}
                    {section.type === "satisfaction_summary" && "Se calcula automáticamente a partir de los bloques temáticos"}
                    {section.type === "comments_annex" && "Se incluyen automáticamente las respuestas abiertas de los participantes"}
                  </p>
                )}

                {section.type === "satisfaction_summary" && stats && (
                  <div className="space-y-3 pt-1">
                    {/* Overall */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{stats.overallSatisfaction ?? 0}%</div>
                      <span className="text-sm text-muted-foreground">Satisfacción general</span>
                    </div>
                    {/* Per-block breakdown */}
                    {stats.generalSatisfaction && stats.generalSatisfaction.length > 0 && (
                      <div className="space-y-2">
                        {stats.generalSatisfaction.map((gs: { label: string; value: number }, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground break-words leading-tight flex-1 mr-2">{gs.label}</span>
                              <span className="font-semibold text-foreground whitespace-nowrap">{gs.value}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/70 transition-all"
                                style={{ width: `${Math.min(gs.value, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {section.type === "satisfaction_summary" && section.content !== undefined && (
                  <div className="space-y-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateAI("satisfaction_summary")}
                      disabled={aiLoading || !stats || totalResponses === 0}
                      className="gap-1.5 text-xs h-7"
                    >
                      {aiLoading ? <Loader2 className="animate-spin h-3 w-3" /> : <Sparkles className="w-3 h-3" />}
                      {aiLoading ? "Generando…" : "Generar con IA"}
                    </Button>
                    <RichTextEditor
                      value={section.content || ""}
                      onChange={val => onUpdate({ content: val })}
                      placeholder="Texto introductorio para la sección de satisfacción general (opcional)…"
                      minHeight="60px"
                    />
                  </div>
                )}

                {section.type === "bullet_list" && (
                  <BulletListEditor
                    bullets={section.bullets || []}
                    onChange={bullets => onUpdate({ bullets })}
                  />
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Chart preview modal with type selector */}
      <Dialog open={!!previewChart} onOpenChange={() => setPreviewChart(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{previewChart?.title}</DialogTitle>
          </DialogHeader>
          {previewChart && (
            <div className="space-y-4">
              {/* Chart type selector */}
              <div className="flex items-center gap-2 flex-wrap">
                {(Object.keys(CHART_TYPE_LABELS) as ChartType[]).map(ct => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => onUpdate({ chartType: ct })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      (section.chartType || "horizontal_bar") === ct
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    }`}
                  >
                    {CHART_TYPE_LABELS[ct]}
                  </button>
                ))}
              </div>

              {/* Live chart preview */}
              <ChartPreview data={previewChart.data} chartType={section.chartType || "horizontal_bar"} />

              <p className="text-xs text-muted-foreground pt-2">
                {previewChart.data.length} indicadores
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Ficha técnica preview modal */}
      <Dialog open={showFichaPreview} onOpenChange={setShowFichaPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <TableIcon className="w-4 h-4" />
              Ficha Técnica de la Encuesta
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Ítem</TableHead>
                <TableHead className="font-bold">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["Nombre del instrumento", `Encuesta de satisfacción ${FORM_TYPE_LABELS[filterType] || filterType} ${filterModule}`],
                ["Entidad responsable", "Sistema de evaluación del Programa RLT"],
                ["Objetivo", "Recoger percepciones sobre la experiencia formativa y oportunidades de mejora"],
                ["Región", filterRegion],
                ["Módulo", `Módulo ${filterModule}`],
                ["Total respuestas válidas", String(totalResponses)],
                ["Modalidad", "En línea, mediante formulario digital"],
              ].map(([item, detail], i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-muted-foreground text-sm">{item}</TableCell>
                  <TableCell className="text-sm">{detail}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Chart Preview Component ──
const PREVIEW_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#f97316",
];

function ChartPreview({ data, chartType }: { data: { label: string; value: number }[]; chartType: ChartType }) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  if (chartType === "horizontal_bar") {
    return (
      <div className="space-y-2">
        {data.map((item, i) => {
          const barWidth = Math.max((item.value / maxVal) * 100, 2);
          return (
            <div key={i} className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-foreground break-words leading-tight">{item.label}</span>
                <span className="font-semibold text-foreground">{item.value}%</span>
              </div>
              <div className="h-5 bg-muted rounded overflow-hidden">
                <div className="h-full rounded transition-all" style={{ width: `${barWidth}%`, backgroundColor: PREVIEW_COLORS[i % PREVIEW_COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === "vertical_bar") {
    const barW = Math.max(100 / data.length - 2, 4);
    return (
      <div className="flex items-end gap-1 justify-center" style={{ height: 200 }}>
        {data.map((item, i) => {
          const barH = Math.max((item.value / maxVal) * 170, 4);
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${barW}%`, maxWidth: 60 }}>
              <span className="text-[10px] font-semibold text-foreground">{item.value}%</span>
              <div className="w-full rounded-t transition-all" style={{ height: barH, backgroundColor: PREVIEW_COLORS[i % PREVIEW_COLORS.length] }} />
              <span className="text-[9px] text-muted-foreground text-center leading-tight w-full break-words">{item.label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === "pie") {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let cumAngle = 0;
    const slices = data.map((item, i) => {
      const angle = (item.value / total) * 360;
      const startAngle = cumAngle;
      cumAngle += angle;
      return { ...item, startAngle, angle, color: PREVIEW_COLORS[i % PREVIEW_COLORS.length] };
    });

    const r = 80;
    const cx = 90, cy = 90;
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

    return (
      <div className="flex items-center gap-6 justify-center">
        <svg width={180} height={180} viewBox="0 0 180 180">
          {slices.map((s, i) => {
            if (s.angle >= 359.99) {
              return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} stroke="#ffffff" strokeWidth={1.5} />;
            }
            const startRad = toRad(s.startAngle);
            const endRad = toRad(s.startAngle + s.angle);
            const largeArc = s.angle > 180 ? 1 : 0;
            const x1 = cx + r * Math.cos(startRad);
            const y1 = cy + r * Math.sin(startRad);
            const x2 = cx + r * Math.cos(endRad);
            const y2 = cy + r * Math.sin(endRad);
            return (
              <path
                key={i}
                d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            );
          })}
        </svg>
        <div className="space-y-1.5 text-xs flex-1 min-w-0">
          {data.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0 mt-0.5" style={{ backgroundColor: PREVIEW_COLORS[i % PREVIEW_COLORS.length] }} />
              <span className="text-foreground break-words leading-tight">{item.label}: {item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chartType === "radar") {
    const n = data.length;
    if (n < 3) return <p className="text-xs text-muted-foreground text-center py-4">Se necesitan al menos 3 indicadores para el gráfico radar.</p>;

    const svgWidth = 620;
    const svgHeight = 360;
    const padding = 20;
    const r = 95;
    const cx = svgWidth / 2;
    const cy = svgHeight / 2;
    const angleStep = (2 * Math.PI) / n;

    const wrapLabel = (text: string, maxChars = 30) => {
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxChars) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      });
      if (current) lines.push(current);
      return lines.length ? lines : [text];
    };

    const points = data.map((item, i) => {
      const a = -Math.PI / 2 + i * angleStep;
      const val = (Math.min(item.value, 100) / 100) * r;
      return { x: cx + val * Math.cos(a), y: cy + val * Math.sin(a) };
    });
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(" ");

    return (
      <div className="w-full overflow-x-auto">
        <svg className="mx-auto min-w-[620px]" width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map(ring => (
            <polygon
              key={ring}
              points={Array.from({ length: n }, (_, i) => {
                const a = -Math.PI / 2 + i * angleStep;
                return `${cx + r * ring * Math.cos(a)},${cy + r * ring * Math.sin(a)}`;
              }).join(" ")}
              fill="none"
              stroke="#d1d5db"
              strokeWidth={0.5}
            />
          ))}

          {/* Axes */}
          {Array.from({ length: n }, (_, i) => {
            const a = -Math.PI / 2 + i * angleStep;
            return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#d1d5db" strokeWidth={0.5} />;
          })}

          {/* Data polygon */}
          <polygon points={polyPoints} fill="rgba(37, 99, 235, 0.15)" stroke="#2563eb" strokeWidth={2} />

          {/* Labels */}
          {data.map((item, i) => {
            const a = -Math.PI / 2 + i * angleStep;
            const labelRadius = r + 42;
            let lx = cx + labelRadius * Math.cos(a);
            const ly = cy + labelRadius * Math.sin(a);

            const cosA = Math.cos(a);
            const anchor: "start" | "middle" | "end" = cosA < -0.15 ? "end" : cosA > 0.15 ? "start" : "middle";

            const labelText = `${item.label} (${item.value}%)`;
            const lines = wrapLabel(labelText, 28);
            const longestLine = Math.max(...lines.map(line => line.length));
            const approxWidth = longestLine * 5.2;

            const minX = padding + (anchor === "end" ? approxWidth : anchor === "middle" ? approxWidth / 2 : 0);
            const maxX = svgWidth - padding - (anchor === "start" ? approxWidth : anchor === "middle" ? approxWidth / 2 : 0);
            lx = Math.max(minX, Math.min(maxX, lx));

            const lineHeight = 10;
            const firstLineY = ly - ((lines.length - 1) * lineHeight) / 2;

            return (
              <text key={i} x={lx} y={firstLineY} textAnchor={anchor} fill="hsl(var(--foreground))" fontSize={8}>
                {lines.map((line, lineIndex) => (
                  <tspan key={lineIndex} x={lx} dy={lineIndex === 0 ? 0 : lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
}

// ── Bullet List Editor ──
function BulletListEditor({ bullets, onChange }: { bullets: string[]; onChange: (bullets: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Categorías / Viñetas</Label>
      {bullets.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-xs text-muted-foreground mt-2">•</span>
          <RichTextEditor
            value={b}
            onChange={val => {
              const newBullets = [...bullets];
              newBullets[i] = val;
              onChange(newBullets);
            }}
            placeholder="Punto de la lista…"
            minHeight="50px"
          />
          <Button variant="ghost" size="sm" onClick={() => onChange(bullets.filter((_, idx) => idx !== i))} className="text-destructive h-7 w-7 p-0 shrink-0">
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...bullets, ""])} className="gap-1 text-xs h-7">
        <Plus className="w-3 h-3" /> Agregar viñeta
      </Button>
    </div>
  );
}
