import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users, BookOpen, GraduationCap, Filter, Download, FileText, FlaskConical } from "lucide-react";
import { ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT, FREQUENCY_OPTIONS, JORNADA_OPTIONS, GRADOS_COMPLETOS, GRADOS_ESTUDIANTE, ANOS_OPTIONS, FUENTES_RETROALIMENTACION, type LikertSection } from "@/data/ambienteEscolarData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generarAmbienteEscolarReportPDF, type AmbienteReportData } from "@/utils/ambienteEscolarReportPdfGenerator";
import { useAppImages } from "@/hooks/useAppImages";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

const FORM_TYPES = [
  { key: "docentes", label: "Docentes", icon: BookOpen, likert: DOCENTES_LIKERT },
  { key: "estudiantes", label: "Estudiantes", icon: GraduationCap, likert: ESTUDIANTES_LIKERT },
  { key: "acudientes", label: "Acudientes", icon: Users, likert: ACUDIENTES_LIKERT },
] as const;

const FREQ_COLORS: Record<string, string> = {
  "Siempre": "hsl(142, 71%, 45%)",
  "Casi siempre": "hsl(142, 50%, 60%)",
  "A veces": "hsl(45, 93%, 47%)",
  "Casi nunca": "hsl(25, 95%, 53%)",
  "Nunca": "hsl(0, 84%, 60%)",
};

interface RawSubmission {
  institucion_educativa: string;
  tipo_formulario: string;
  respuestas: Record<string, string>;
}

interface FichaInfo {
  nombre_ie: string;
  region: string;
  entidad_territorial: string | null;
}

interface RegionInfo {
  nombre: string;
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

function computeFrequencies(
  submissions: RawSubmission[],
  sections: LikertSection[]
): { section: string; items: { id: string; text: string; freqs: Record<string, number>; total: number }[] }[] {
  return sections.map((sec) => ({
    section: sec.title,
    items: sec.items.map((item) => {
      const freqs: Record<string, number> = {};
      FREQUENCY_OPTIONS.forEach((f) => (freqs[f] = 0));
      let total = 0;
      for (const sub of submissions) {
        const val = sub.respuestas?.[item.id];
        if (val && val in freqs) {
          freqs[val]++;
          total++;
        }
      }
      return { id: item.id, text: item.text, freqs, total };
    }),
  }));
}

function FrequencyTable({ data }: { data: ReturnType<typeof computeFrequencies> }) {
  return (
    <div className="space-y-6">
      {data.map((sec) => (
        <div key={sec.section} className="space-y-2">
          <h4 className="font-semibold text-sm">{sec.section}</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Ítem</TableHead>
                <TableHead className="text-center">N</TableHead>
                {FREQUENCY_OPTIONS.map((f) => (
                  <TableHead key={f} className="text-center text-xs">{f}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sec.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.text}</TableCell>
                  <TableCell className="text-center text-xs font-medium">{item.total}</TableCell>
                  {FREQUENCY_OPTIONS.map((f) => {
                    const pct = item.total > 0 ? Math.round((item.freqs[f] / item.total) * 100) : 0;
                    return (
                      <TableCell key={f} className="text-center text-xs">
                        {item.total > 0 ? `${pct}%` : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

function FrequencyChart({ data }: { data: ReturnType<typeof computeFrequencies> }) {
  const chartData = data.map((sec) => {
    const totals: Record<string, number> = {};
    FREQUENCY_OPTIONS.forEach((f) => (totals[f] = 0));
    let grand = 0;
    sec.items.forEach((item) => {
      FREQUENCY_OPTIONS.forEach((f) => (totals[f] += item.freqs[f]));
      grand += item.total;
    });
    const row: Record<string, string | number> = { section: sec.section };
    FREQUENCY_OPTIONS.forEach((f) => {
      row[f] = grand > 0 ? Math.round((totals[f] / grand) * 100) : 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="section" width={110} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend />
        {FREQUENCY_OPTIONS.map((f) => (
          <Bar key={f} dataKey={f} stackId="a" fill={FREQ_COLORS[f]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminAmbienteStatsTab() {
  const { images } = useAppImages();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<RawSubmission[]>([]);
  const [fichas, setFichas] = useState<FichaInfo[]>([]);
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selectedIE, setSelectedIE] = useState("__all__");

  // PDF state
  const [generating, setGenerating] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [subRes, fichaRes, regRes] = await Promise.all([
        supabase.from("encuestas_ambiente_escolar").select("institucion_educativa, tipo_formulario, respuestas"),
        supabase.from("fichas_rlt").select("nombre_ie, region, entidad_territorial"),
        supabase.from("regiones").select("nombre, mostrar_logo_rlt, mostrar_logo_clt"),
      ]);
      setSubmissions((subRes.data || []) as RawSubmission[]);
      setFichas((fichaRes.data || []) as FichaInfo[]);
      setRegions((regRes.data || []) as RegionInfo[]);
      setLoading(false);
    }
    load();
  }, []);

  // Clear downstream filters
  useEffect(() => { setSelEntidades([]); setSelectedIE("__all__"); }, [selRegions]);
  useEffect(() => { setSelectedIE("__all__"); }, [selEntidades]);

  // Build institution list from submissions + fichas, filtered by region/entidad
  const institutionOptions = useMemo(() => {
    // All institutions that have submissions
    const ieFromSubs = new Set(submissions.map((s) => s.institucion_educativa));

    // Map IE → region/entidad from fichas
    const ieInfo = new Map<string, FichaInfo>();
    for (const f of fichas) {
      ieInfo.set(f.nombre_ie, f);
    }

    let ieList = Array.from(ieFromSubs);

    if (selRegions.length > 0) {
      ieList = ieList.filter((ie) => {
        const info = ieInfo.get(ie);
        return info && selRegions.includes(info.region);
      });
    }
    if (selEntidades.length > 0) {
      ieList = ieList.filter((ie) => {
        const info = ieInfo.get(ie);
        return info && info.entidad_territorial && selEntidades.includes(info.entidad_territorial);
      });
    }

    return ieList.sort();
  }, [submissions, fichas, selRegions, selEntidades]);

  const regionOptions = useMemo(() => {
    const vals = [...new Set(fichas.map((f) => f.region).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [fichas]);

  const entidadOptions = useMemo(() => {
    let pool = fichas;
    if (selRegions.length > 0) pool = pool.filter((f) => selRegions.includes(f.region));
    const vals = [...new Set(pool.map((f) => f.entidad_territorial).filter(Boolean) as string[])].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [fichas, selRegions]);

  const filtered = useMemo(() => {
    if (selectedIE === "__all__") {
      // Filter by region/entidad via institutionOptions
      if (selRegions.length === 0 && selEntidades.length === 0) return submissions;
      return submissions.filter((s) => institutionOptions.includes(s.institucion_educativa));
    }
    return submissions.filter((s) => s.institucion_educativa === selectedIE);
  }, [submissions, selectedIE, institutionOptions, selRegions, selEntidades]);

  const hasFilters = selRegions.length > 0 || selEntidades.length > 0;

  // ── PDF generation ──
  const getLogoFlags = (ie: string) => {
    const fichaInfo = fichas.find((f) => f.nombre_ie === ie);
    if (!fichaInfo) return { showLogoRlt: true, showLogoClt: true };
    const regionInfo = regions.find((r) => r.nombre === fichaInfo.region);
    if (!regionInfo) return { showLogoRlt: true, showLogoClt: true };
    return { showLogoRlt: regionInfo.mostrar_logo_rlt, showLogoClt: regionInfo.mostrar_logo_clt };
  };

  const buildReportData = (ie: string): AmbienteReportData => {
    const fichaInfo = fichas.find((f) => f.nombre_ie === ie);
    return {
      institucion: ie,
      entidadTerritorial: fichaInfo?.entidad_territorial || "",
      submissions: submissions
        .filter((s) => s.institucion_educativa === ie)
        .map((s) => ({ tipo_formulario: s.tipo_formulario, respuestas: s.respuestas })),
    };
  };

  const handleGeneratePDF = async () => {
    if (selectedIE === "__all__") {
      // Generate ZIP with all institutions in the current filter
      await handleBatchExport();
      return;
    }
    setGenerating(true);
    try {
      const reportData = buildReportData(selectedIE);
      const flags = getLogoFlags(selectedIE);
      await generarAmbienteEscolarReportPDF(
        reportData,
        getPdfLogoSources(images),
        flags
      );
      toast({ title: "PDF generado", description: `Informe descargado para ${selectedIE}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleBatchExport = async () => {
    if (institutionOptions.length === 0) return;
    setBatchGenerating(true);
    setBatchProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;
      for (let i = 0; i < institutionOptions.length; i++) {
        const ie = institutionOptions[i];
        try {
          const reportData = buildReportData(ie);
          if (reportData.submissions.length === 0) continue;
          const flags = getLogoFlags(ie);
          const blob = await generarAmbienteEscolarReportPDF(
            reportData,
            getPdfLogoSources(images),
            flags,
            { returnBlob: true }
          );
          if (blob) {
            const safeName = ie.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "").replace(/\s+/g, "_");
            zip.file(`Informe_Ambiente_${safeName}.pdf`, blob);
            count++;
          }
        } catch {
          // skip failed
        }
        setBatchProgress(Math.round(((i + 1) / institutionOptions.length) * 100));
      }
      if (count === 0) {
        toast({ title: "Sin informes", description: "No se pudo generar ningún informe", variant: "destructive" });
        setBatchGenerating(false);
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informes_Ambiente_Escolar_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP descargado", description: `${count} informe(s) generados` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBatchGenerating(false);
    setBatchProgress(0);
  };

  // ── Demo PDF with fictitious data ──
  const handleDemoPDF = async () => {
    setGenerating(true);
    try {
      const freq = ["Siempre", "Casi siempre", "A veces", "Casi nunca", "Nunca"];
      const jornadas = JORNADA_OPTIONS;
      const buildFakeResponses = (likert: LikertSection[], formType: string): Record<string, any> => {
        const r: Record<string, any> = {};
        const jornadas = JORNADA_OPTIONS;
        r.jornada = jornadas[Math.floor(Math.random() * jornadas.length)];

        if (formType === "docentes") {
          r.anos_docente = ANOS_OPTIONS[Math.floor(Math.random() * ANOS_OPTIONS.length)];
          // Pick 1-3 random grados
          const numGrados = 1 + Math.floor(Math.random() * 3);
          const shuffled = [...GRADOS_COMPLETOS].sort(() => Math.random() - 0.5);
          r.grados = shuffled.slice(0, numGrados);
          r.jornadas = [jornadas[Math.floor(Math.random() * jornadas.length)]];
          // Pick 1-2 fuentes
          const numFuentes = 1 + Math.floor(Math.random() * 2);
          const shuffledF = [...FUENTES_RETROALIMENTACION].sort(() => Math.random() - 0.5);
          r.fuentes_retroalimentacion = shuffledF.slice(0, numFuentes);
        } else if (formType === "estudiantes") {
          r.anos_estudiando = ANOS_OPTIONS[Math.floor(Math.random() * ANOS_OPTIONS.length)];
          r.grado = GRADOS_ESTUDIANTE[Math.floor(Math.random() * GRADOS_ESTUDIANTE.length)];
        } else if (formType === "acudientes") {
          // Weighted distribution: most pick common grades, a few pick rare ones for <1% demo
          const weighted = ["3°","4°","5°","6°","7°","8°","9°","5°","6°","7°","3°","4°","5°","6°","7°","8°","9°","10°","11°"];
          const numGrados = 1 + Math.floor(Math.random() * 2);
          if (Math.random() < 0.02) {
            // Rare: pick "Primera infancia" or "12°" to create <1% segments
            r.grados = [Math.random() < 0.5 ? "Primera infancia" : "12°"];
          } else {
            const shuffled = [...weighted].sort(() => Math.random() - 0.5);
            r.grados = shuffled.slice(0, numGrados);
          }
        }

        for (const sec of likert) {
          for (const item of sec.items) {
            const weights = [40, 25, 20, 10, 5];
            const roll = Math.random() * 100;
            let cum = 0;
            for (let i = 0; i < 5; i++) {
              cum += weights[i];
              if (roll < cum) { r[item.id] = freq[i]; break; }
            }
          }
        }
        return r;
      };

      const fakeSubs: AmbienteReportData["submissions"] = [];
      // 12 docentes, 25 estudiantes, 8 acudientes
      for (let i = 0; i < 12; i++) fakeSubs.push({ tipo_formulario: "docentes", respuestas: buildFakeResponses(DOCENTES_LIKERT, "docentes") });
      for (let i = 0; i < 25; i++) fakeSubs.push({ tipo_formulario: "estudiantes", respuestas: buildFakeResponses(ESTUDIANTES_LIKERT, "estudiantes") });
      for (let i = 0; i < 8; i++) fakeSubs.push({ tipo_formulario: "acudientes", respuestas: buildFakeResponses(ACUDIENTES_LIKERT, "acudientes") });

      await generarAmbienteEscolarReportPDF(
        {
          institucion: "I.E. Ejemplo Ficticio de Medellín",
          entidadTerritorial: "Secretaría de Educación de Medellín",
          submissions: fakeSubs,
        },
        getPdfLogoSources(images),
        { showLogoRlt: true, showLogoClt: true }
      );
      toast({ title: "Demo PDF generado", description: "PDF de ejemplo descargado con datos ficticios" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cascade filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <button
                onClick={() => { setSelRegions([]); setSelEntidades([]); setSelectedIE("__all__"); }}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Región</label>
              <MultiSelect
                options={regionOptions}
                selected={selRegions}
                onChange={setSelRegions}
                placeholder="Todas las regiones"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect
                options={entidadOptions}
                selected={selEntidades}
                onChange={setSelEntidades}
                placeholder="Todas las entidades"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución</label>
              <Select value={selectedIE} onValueChange={setSelectedIE}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas las instituciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las instituciones</SelectItem>
                  {institutionOptions.map((ie) => (
                    <SelectItem key={ie} value={ie}>{ie}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Export */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Informes PDF</span>
            <Button
              size="sm"
              onClick={handleGeneratePDF}
              disabled={generating || batchGenerating || institutionOptions.length === 0}
              className="gap-1.5"
            >
              {(generating || (selectedIE === "__all__" && batchGenerating)) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {(generating || (selectedIE === "__all__" && batchGenerating))
                ? "Generando…"
                : selectedIE === "__all__"
                  ? `Generar Informe ZIP (${institutionOptions.length})`
                  : "Generar Informe"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchExport}
              disabled={institutionOptions.length === 0 || batchGenerating}
              className="gap-1.5"
            >
              {batchGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {batchGenerating ? "Generando ZIP…" : `Exportar ZIP (${institutionOptions.length})`}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDemoPDF}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Demo PDF
            </Button>
          </div>
          {batchGenerating && (
            <Progress value={batchProgress} className="h-2" />
          )}
          {selectedIE === "__all__" && !batchGenerating && (
            <p className="text-xs text-muted-foreground">Con "Todas las instituciones", se generará un ZIP con todos los informes de la selección actual.</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} respuestas</span>
      </div>

      <Tabs defaultValue="docentes">
        <TabsList className="flex-wrap h-auto gap-1">
          {FORM_TYPES.map((ft) => {
            const Icon = ft.icon;
            const count = filtered.filter((s) => s.tipo_formulario === ft.key).length;
            return (
              <TabsTrigger key={ft.key} value={ft.key} className="gap-1.5">
                <Icon className="w-4 h-4" /> {ft.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {FORM_TYPES.map((ft) => {
          const typeSubs = filtered.filter((s) => s.tipo_formulario === ft.key);
          const freqData = computeFrequencies(typeSubs, ft.likert);
          return (
            <TabsContent key={ft.key} value={ft.key} className="space-y-6">
              {typeSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay respuestas para este tipo.</p>
              ) : (
                <>
                  <FrequencyChart data={freqData} />
                  <FrequencyTable data={freqData} />
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
