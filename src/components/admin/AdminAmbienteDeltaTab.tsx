import { useState, useEffect, useMemo } from "react";
import { supabase as cloudClient } from "@/integrations/supabase/client";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ArrowUp, ArrowDown, Minus, Sparkles, Download, Loader2 } from "lucide-react";
import { FREQUENCY_OPTIONS, ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT } from "@/data/ambienteEscolarData";
import { useAppImages } from "@/hooks/useAppImages";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";
import { generarPDFAmbienteDelta, type DeltaGroup } from "@/utils/ambienteDeltaPdfGenerator";
import { toast } from "sonner";

interface Cohorte { id: string; nombre: string; }
interface Campana { id: string; cohorte_id: string; fase: string; nombre: string; fecha_inicio?: string; fecha_fin?: string; }
interface Submission { campana_id: string | null; tipo_formulario: string; respuestas: any; }

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

// Convert frequency option to numeric score (1..N)
const FREQ_SCORE: Record<string, number> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((opt, i) => [opt, FREQUENCY_OPTIONS.length - i])
);
const MAX_SCORE = FREQUENCY_OPTIONS.length;

const SECTIONS_BY_FORM: Record<string, { title: string; itemIds: string[] }[]> = {
  acudientes: ACUDIENTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
  estudiantes: ESTUDIANTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
  docentes: DOCENTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
};

function avgScore(subs: Submission[], itemIds: string[]): number | null {
  let sum = 0;
  let count = 0;
  for (const s of subs) {
    const r = typeof s.respuestas === "string" ? JSON.parse(s.respuestas) : s.respuestas;
    if (!r) continue;
    for (const id of itemIds) {
      const v = r[id];
      if (v && FREQ_SCORE[v]) {
        sum += FREQ_SCORE[v];
        count++;
      }
    }
  }
  if (count === 0) return null;
  return sum / count;
}

export default function AdminAmbienteDeltaTab() {
  const { images } = useAppImages();
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohorte, setSelectedCohorte] = useState<string>("");
  const [analysisHtml, setAnalysisHtml] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cohortesRes, campanasRes] = await Promise.all([
        supabase.from("ae_cohortes").select("id, nombre").order("nombre"),
        supabase.from("ae_campanas" as any).select("id, cohorte_id, fase, nombre, fecha_inicio, fecha_fin"),
      ]);
      setCohortes((cohortesRes.data as Cohorte[]) || []);
      setCampanas((campanasRes.data as any as Campana[]) || []);

      const all: Submission[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from("encuestas_ambiente_escolar")
          .select("campana_id, tipo_formulario, respuestas")
          .not("campana_id", "is", null)
          .range(from, from + PAGE - 1);
        if (!data || data.length === 0) break;
        all.push(...(data as Submission[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setSubmissions(all);
      setLoading(false);
    })();
  }, []);

  const cohortesConCampanas = useMemo(() => {
    const ids = new Set(campanas.map((c) => c.cohorte_id));
    return cohortes.filter((c) => ids.has(c.id));
  }, [cohortes, campanas]);

  useEffect(() => {
    if (!selectedCohorte && cohortesConCampanas.length > 0) {
      setSelectedCohorte(cohortesConCampanas[0].id);
    }
  }, [cohortesConCampanas, selectedCohorte]);

  // Reset analysis when cohort changes
  useEffect(() => {
    setAnalysisHtml("");
  }, [selectedCohorte]);

  const analysis = useMemo(() => {
    if (!selectedCohorte) return null;
    const campanasCohorte = campanas.filter((c) => c.cohorte_id === selectedCohorte);
    const inicial = campanasCohorte.find((c) => c.fase === "linea_base");
    const evolucion = campanasCohorte.find((c) => c.fase === "cierre");

    const groups = ["docentes", "estudiantes", "acudientes"] as const;
    const result = groups.map((g) => {
      const subsIni = inicial ? submissions.filter((s) => s.campana_id === inicial.id && s.tipo_formulario === g) : [];
      const subsEvo = evolucion ? submissions.filter((s) => s.campana_id === evolucion.id && s.tipo_formulario === g) : [];
      const sections = SECTIONS_BY_FORM[g].map((sec) => {
        const ini = avgScore(subsIni, sec.itemIds);
        const evo = avgScore(subsEvo, sec.itemIds);
        const delta = ini !== null && evo !== null ? evo - ini : null;
        return { title: sec.title, ini, evo, delta };
      });
      return { grupo: g, countIni: subsIni.length, countEvo: subsEvo.length, sections };
    });
    return { inicial, evolucion, groups: result };
  }, [selectedCohorte, campanas, submissions]);

  // Compute group-level and cohort-level aggregates
  const groupAggregates = useMemo(() => {
    if (!analysis) return [];
    return analysis.groups.map((g) => {
      const iniVals = g.sections.map((s) => s.ini).filter((v): v is number => v !== null);
      const evoVals = g.sections.map((s) => s.evo).filter((v): v is number => v !== null);
      const ini = iniVals.length ? iniVals.reduce((a, b) => a + b, 0) / iniVals.length : null;
      const evo = evoVals.length ? evoVals.reduce((a, b) => a + b, 0) / evoVals.length : null;
      const delta = ini !== null && evo !== null ? evo - ini : null;
      return { grupo: g.grupo, ini, evo, delta };
    });
  }, [analysis]);

  const cohortIni = useMemo(() => {
    const v = groupAggregates.map((g) => g.ini).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [groupAggregates]);
  const cohortEvo = useMemo(() => {
    const v = groupAggregates.map((g) => g.evo).filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [groupAggregates]);
  const cohortDelta = cohortIni !== null && cohortEvo !== null ? cohortEvo - cohortIni : null;

  const cohorteNombre = cohortes.find((c) => c.id === selectedCohorte)?.nombre || "";

  // Build payload for API + PDF
  const buildDeltasPayload = (): DeltaGroup[] => {
    if (!analysis) return [];
    return analysis.groups.map((g, idx) => {
      const agg = groupAggregates[idx] || { ini: null, evo: null, delta: null };
      return {
        grupo: g.grupo,
        countIni: g.countIni,
        countEvo: g.countEvo,
        iniGlobal: agg.ini,
        evoGlobal: agg.evo,
        deltaGlobal: agg.delta,
        sections: g.sections.map((s) => ({
          title: s.title,
          ini: s.ini !== null ? Number(s.ini.toFixed(2)) : null,
          evo: s.evo !== null ? Number(s.evo.toFixed(2)) : null,
          delta: s.delta !== null ? Number(s.delta.toFixed(2)) : null,
        })),
      };
    });
  };

  const handleGenerateAnalysis = async () => {
    if (!analysis || !selectedCohorte) return;
    setGenerating(true);
    setAnalysisHtml("");
    try {
      const payload = {
        sectionType: "ambiente_delta",
        cohorteNombre,
        maxScore: MAX_SCORE,
        cohortIni: cohortIni !== null ? Number(cohortIni.toFixed(2)) : null,
        cohortEvo: cohortEvo !== null ? Number(cohortEvo.toFixed(2)) : null,
        cohortDelta: cohortDelta !== null ? Number(cohortDelta.toFixed(2)) : null,
        deltasPorGrupo: buildDeltasPayload(),
      };

      let text = "";
      if (USE_EXPRESS) {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const token = localStorage.getItem("auth_token");
        const res = await fetch(`${apiBase}/api/generate-section-text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Error del servicio");
        text = json.text || "";
      } else {
        const { data, error } = await cloudClient.functions.invoke("generate-section-text", { body: payload });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        text = data?.text || "";
      }

      if (!text) throw new Error("Respuesta vacía del servicio de análisis");
      setAnalysisHtml(text);
      toast.success("Análisis generado correctamente");
    } catch (e: any) {
      toast.error(e.message || "Error al generar el análisis");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!analysis || !selectedCohorte) return;
    setDownloading(true);
    try {
      const sources = getPdfLogoSources(images);
      await generarPDFAmbienteDelta(
        {
          cohorteNombre,
          fechaInicial: analysis.inicial?.fecha_inicio || null,
          fechaEvolucion: analysis.evolucion?.fecha_inicio || null,
          maxScore: MAX_SCORE,
          cohortIni,
          cohortEvo,
          cohortDelta,
          groups: buildDeltasPayload(),
          analysisHtml,
        },
        {
          logoRLT: sources.logoRLT,
          logoCLT: sources.logoCLT,
          logoCosmo: sources.logoCosmo,
          showLogoRLT: true,
          showLogoCLT: true,
        },
      );
      toast.success("PDF generado");
    } catch (e: any) {
      toast.error(e.message || "Error al generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const ratingCard = (
    <Card className="border-muted">
      <CardContent className="p-5 space-y-2 text-sm">
        <h3 className="text-base font-bold">Sistema de calificación</h3>
        <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
          <li>Escala Likert de frecuencia: <strong>1 (Nunca) → {MAX_SCORE} (Siempre)</strong>.</li>
          <li>Cálculo del Δ: promedio Evolución − promedio Inicial, por sección y por grupo.</li>
          <li>Umbral pedagógico significativo: <strong>ΔP ≥ 0.5 puntos</strong> indica mejora notable; ΔP ≤ −0.5 indica retroceso.</li>
          <li>Convención visual: <span className="text-green-600 font-semibold">▲ verde</span> (mejora), <span className="text-destructive font-semibold">▼ rojo</span> (retroceso), <span className="text-muted-foreground font-semibold">= gris</span> (estable, |Δ| &lt; 0.05).</li>
          <li>Promedio global de la cohorte: media no ponderada de los promedios de los 3 grupos (Docentes, Estudiantes, Acudientes).</li>
        </ul>
      </CardContent>
    </Card>
  );

  if (cohortesConCampanas.length === 0) {
    return (
      <div className="space-y-6">
        {ratingCard}
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay cohortes con campañas configuradas. Crea campañas en la pestaña "Campañas".
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedCohorte} onValueChange={setSelectedCohorte}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Cohorte" /></SelectTrigger>
            <SelectContent>
              {cohortesConCampanas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {analysis && (
            <div className="text-sm text-muted-foreground">
              {analysis.inicial ? "✓ Inicial" : "— Inicial"} | {analysis.evolucion ? "✓ Evolución" : "— Evolución"}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateAnalysis} disabled={generating || !analysis}>
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {analysisHtml ? "Regenerar análisis" : "Generar análisis"}
          </Button>
          <Button size="sm" onClick={handleDownloadPdf} disabled={downloading || !analysis}>
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Descargar informe PDF
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Escala Likert: 1 (Nunca) — {MAX_SCORE} (Siempre). Δ expresado en puntos sobre {MAX_SCORE}.</p>

      {/* Sistema de calificación (statique, toujours visible) */}
      <Card className="border-muted">
        <CardContent className="p-5 space-y-2 text-sm">
          <h3 className="text-base font-bold">Sistema de calificación</h3>
          <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
            <li>Escala Likert de frecuencia: <strong>1 (Nunca) → {MAX_SCORE} (Siempre)</strong>.</li>
            <li>Cálculo del Δ: promedio Evolución − promedio Inicial, por sección y por grupo.</li>
            <li>Umbral pedagógico significativo: <strong>ΔP ≥ 0.5 puntos</strong> indica mejora notable; ΔP ≤ −0.5 indica retroceso.</li>
            <li>Convención visual: <span className="text-green-600 font-semibold">▲ verde</span> (mejora), <span className="text-destructive font-semibold">▼ rojo</span> (retroceso), <span className="text-muted-foreground font-semibold">= gris</span> (estable, |Δ| &lt; 0.05).</li>
            <li>Promedio global de la cohorte: media no ponderada de los promedios de los 3 grupos (Docentes, Estudiantes, Acudientes).</li>
          </ul>
        </CardContent>
      </Card>

      {/* Cohort-level summary card */}
      {analysis && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between items-baseline flex-wrap gap-2">
              <h3 className="text-lg font-bold">Δ Global de la cohorte</h3>
              <DeltaIndicator delta={cohortDelta} ini={cohortIni} evo={cohortEvo} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <ScoreBar label="Inicial (promedio)" value={cohortIni} color="bg-muted-foreground" />
              <ScoreBar label="Evolución (promedio)" value={cohortEvo} color="bg-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Promedio no ponderado de las medias por sección de los 3 grupos (Docentes, Estudiantes, Acudientes).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Análisis automatizado (UI) */}
      <Card className="border-accent/40">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Análisis automatizado
            </h3>
          </div>
          {generating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Generando interpretación de los resultados…
            </div>
          ) : analysisHtml ? (
            <div
              className="prose prose-sm max-w-none text-foreground [&_strong]:text-foreground [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: analysisHtml }}
            />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Pulse «Generar análisis» para obtener una interpretación pedagógica de los deltas observados (fortalezas, áreas de mejora y recomendación).
            </p>
          )}
        </CardContent>
      </Card>

      {analysis && analysis.groups.map((g, idx) => {
        const agg = groupAggregates[idx];
        return (
          <Card key={g.grupo}>
            <CardContent className="p-5 space-y-4">
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <h3 className="text-lg font-bold capitalize">{g.grupo}</h3>
                <div className="flex items-center gap-3">
                  <DeltaIndicator delta={agg.delta} ini={agg.ini} evo={agg.evo} />
                  <span className="text-xs text-muted-foreground">
                    Inicial: {g.countIni} · Evolución: {g.countEvo}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b">
                <ScoreBar label={`${g.grupo} — Inicial global`} value={agg.ini} color="bg-muted-foreground" />
                <ScoreBar label={`${g.grupo} — Evolución global`} value={agg.evo} color="bg-primary" />
              </div>
              {g.sections.map((sec) => (
                <div key={sec.title} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{sec.title}</span>
                    <DeltaIndicator delta={sec.delta} ini={sec.ini} evo={sec.evo} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ScoreBar label="Inicial" value={sec.ini} color="bg-muted-foreground" />
                    <ScoreBar label="Evolución" value={sec.evo} color="bg-primary" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value !== null ? (value / MAX_SCORE) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-muted-foreground">
        <span>{label}</span>
        <span>{value !== null ? `${value.toFixed(2)} / ${MAX_SCORE}` : "—"}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        {value !== null && <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}

function DeltaIndicator({ delta, ini, evo }: { delta: number | null; ini: number | null; evo: number | null }) {
  if (delta === null) return <span className="text-xs text-muted-foreground">Sin datos comparables</span>;
  const Icon = delta > 0.05 ? ArrowUp : delta < -0.05 ? ArrowDown : Minus;
  const color = delta > 0.05 ? "text-green-600" : delta < -0.05 ? "text-destructive" : "text-muted-foreground";
  const pctRel = ini && ini !== 0 ? (delta / ini) * 100 : null;
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold ${color}`}>
      <Icon className="w-4 h-4" />
      {delta > 0 ? "+" : ""}{delta.toFixed(2)} pt
      {pctRel !== null && (
        <span className="text-xs font-normal opacity-80">
          ({pctRel > 0 ? "+" : ""}{pctRel.toFixed(1)}%)
        </span>
      )}
    </span>
  );
}
