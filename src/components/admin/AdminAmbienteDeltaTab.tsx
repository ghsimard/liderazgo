import { useState, useEffect, useMemo } from "react";
import { supabase as cloudClient } from "@/integrations/supabase/client";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, ArrowUp, ArrowDown, Minus, Sparkles, Download, Loader2, FileDown, Archive, MapPin } from "lucide-react";
import { FREQUENCY_OPTIONS, ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT, type LikertSection } from "@/data/ambienteEscolarData";
import { useAppImages } from "@/hooks/useAppImages";
import { useGeographicData } from "@/hooks/useGeographicData";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";
import { generarPDFAmbienteDelta, type DeltaGroup, type InstitucionDeltaRow } from "@/utils/ambienteDeltaPdfGenerator";
import { generarPDFAmbienteInstitucion, type InstGroupData } from "@/utils/ambienteInstitucionPdfGenerator";
import JSZip from "jszip";
import { toast } from "sonner";


interface Cohorte { id: string; nombre: string; }
interface Campana { id: string; cohorte_id: string; fase: string; nombre: string; fecha_inicio?: string; fecha_fin?: string; }
interface Submission { campana_id: string | null; cohorte_id: string | null; tipo_formulario: string; respuestas: any; institucion_educativa: string; fase: string | null; }

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

// Convert frequency option to numeric score (1..N)
const FREQ_SCORE: Record<string, number> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((opt, i) => [opt, FREQUENCY_OPTIONS.length - i])
);
const MAX_SCORE = FREQUENCY_OPTIONS.length;

const SECTIONS_BY_FORM: Record<string, LikertSection[]> = {
  acudientes: ACUDIENTES_LIKERT,
  estudiantes: ESTUDIANTES_LIKERT,
  docentes: DOCENTES_LIKERT,
};

// Likert option order for PDF (Nunca → Siempre)
const LIKERT_ORDER = ["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"] as const;

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
  const { regionNames, getInstitucionesForRegion } = useGeographicData();
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohorte, setSelectedCohorte] = useState<string>("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
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
          .select("campana_id, cohorte_id, tipo_formulario, respuestas, institucion_educativa, fase")
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

  // Split submissions for the selected cohort into two strictly separated sets:
  // Inicial = phase 'linea_base', Evolución = phase 'cierre'.
  // Phase resolution: prefer the submission's own `fase`; fallback to the campaign's `fase`.
  // Cohort filter: prefer `cohorte_id`; fallback to membership in this cohort's campaigns.
  const phaseSplit = useMemo(() => {
    const empty = { inicial: [] as Submission[], evolucion: [] as Submission[], iniCamp: undefined as Campana | undefined, evoCamp: undefined as Campana | undefined };
    if (!selectedCohorte) return empty;
    const campanasCohorte = campanas.filter((c) => c.cohorte_id === selectedCohorte);
    const campIds = new Set(campanasCohorte.map((c) => c.id));
    const campFaseById = new Map(campanasCohorte.map((c) => [c.id, c.fase]));

    const inicial: Submission[] = [];
    const evolucion: Submission[] = [];
    for (const s of submissions) {
      // Cohort gate
      const inCohort = s.cohorte_id
        ? s.cohorte_id === selectedCohorte
        : s.campana_id != null && campIds.has(s.campana_id);
      if (!inCohort) continue;
      // Resolve actual phase (submission wins; fallback to campaign)
      const fase = s.fase || (s.campana_id ? campFaseById.get(s.campana_id) ?? null : null);
      if (fase === "linea_base") inicial.push(s);
      else if (fase === "cierre") evolucion.push(s);
    }
    return {
      inicial,
      evolucion,
      iniCamp: campanasCohorte.find((c) => c.fase === "linea_base"),
      evoCamp: campanasCohorte.find((c) => c.fase === "cierre"),
    };
  }, [selectedCohorte, campanas, submissions]);

  // Institutions present in BOTH phases → comparable set
  const institucionesConEvolucion = useMemo(() => {
    const iniSet = new Set(phaseSplit.inicial.map((s) => s.institucion_educativa));
    const evoSet = new Set(phaseSplit.evolucion.map((s) => s.institucion_educativa));
    return new Set([...evoSet].filter((i) => iniSet.has(i)));
  }, [phaseSplit]);

  const analysis = useMemo(() => {
    if (!selectedCohorte) return null;
    const { inicial: iniAll, evolucion: evoAll, iniCamp, evoCamp } = phaseSplit;
    const comparable = institucionesConEvolucion;

    const groups = ["docentes", "estudiantes", "acudientes"] as const;
    const result = groups.map((g) => {
      const subsIni = iniAll.filter((s) => s.tipo_formulario === g && comparable.has(s.institucion_educativa));
      const subsEvo = evoAll.filter((s) => s.tipo_formulario === g && comparable.has(s.institucion_educativa));
      const sections = SECTIONS_BY_FORM[g].map((sec) => {
        const ids = sec.items.map((i) => i.id);
        const ini = avgScore(subsIni, ids);
        const evo = avgScore(subsEvo, ids);
        const delta = ini !== null && evo !== null ? evo - ini : null;
        return { title: sec.title, ini, evo, delta };
      });
      return { grupo: g, countIni: subsIni.length, countEvo: subsEvo.length, sections };
    });
    return { inicial: iniCamp, evolucion: evoCamp, groups: result };
  }, [selectedCohorte, phaseSplit, institucionesConEvolucion]);

  // Per-institution deltas (only those with responses in BOTH phases)
  const institucionDeltas = useMemo(() => {
    if (!selectedCohorte) return [];
    const { inicial: iniAll, evolucion: evoAll } = phaseSplit;
    const groups = ["docentes", "estudiantes", "acudientes"] as const;
    const rows = Array.from(institucionesConEvolucion).map((inst) => {
      const subsIni = iniAll.filter((s) => s.institucion_educativa === inst);
      const subsEvo = evoAll.filter((s) => s.institucion_educativa === inst);
      const perGroup = groups.map((g) => {
        const sIni = subsIni.filter((s) => s.tipo_formulario === g);
        const sEvo = subsEvo.filter((s) => s.tipo_formulario === g);
        const secAvgIni = SECTIONS_BY_FORM[g].map((sec) => avgScore(sIni, sec.items.map((i) => i.id))).filter((v): v is number => v !== null);
        const secAvgEvo = SECTIONS_BY_FORM[g].map((sec) => avgScore(sEvo, sec.items.map((i) => i.id))).filter((v): v is number => v !== null);
        return {
          ini: secAvgIni.length ? secAvgIni.reduce((a, b) => a + b, 0) / secAvgIni.length : null,
          evo: secAvgEvo.length ? secAvgEvo.reduce((a, b) => a + b, 0) / secAvgEvo.length : null,
        };
      });
      const iniVals = perGroup.map((p) => p.ini).filter((v): v is number => v !== null);
      const evoVals = perGroup.map((p) => p.evo).filter((v): v is number => v !== null);
      const ini = iniVals.length ? iniVals.reduce((a, b) => a + b, 0) / iniVals.length : null;
      const evo = evoVals.length ? evoVals.reduce((a, b) => a + b, 0) / evoVals.length : null;
      const delta = ini !== null && evo !== null ? evo - ini : null;
      return { institucion: inst, countIni: subsIni.length, countEvo: subsEvo.length, ini, evo, delta };
    });
    return rows
      .filter((r) => r.delta !== null)
      .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  }, [selectedCohorte, phaseSplit, institucionesConEvolucion]);

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

  // ─── Per-institution payload builder (sections + Likert distribution) ───
  const countLikert = (subs: Submission[], itemId: string): number[] => {
    const counts = [0, 0, 0, 0, 0]; // Nunca → Siempre
    for (const s of subs) {
      const r = typeof s.respuestas === "string" ? JSON.parse(s.respuestas) : s.respuestas;
      if (!r) continue;
      const v = r[itemId];
      const idx = LIKERT_ORDER.indexOf(v);
      if (idx >= 0) counts[idx]++;
    }
    return counts;
  };

  const buildInstitucionGroups = (institucion: string): InstGroupData[] => {
    const { inicial: iniAll, evolucion: evoAll } = phaseSplit;
    const groups = ["docentes", "estudiantes", "acudientes"] as const;
    return groups.map((g) => {
      const subsIni = iniAll.filter((s) => s.tipo_formulario === g && s.institucion_educativa === institucion);
      const subsEvo = evoAll.filter((s) => s.tipo_formulario === g && s.institucion_educativa === institucion);
      const sections = SECTIONS_BY_FORM[g].map((sec) => {
        const ids = sec.items.map((i) => i.id);
        const ini = avgScore(subsIni, ids);
        const evo = avgScore(subsEvo, ids);
        const delta = ini !== null && evo !== null ? evo - ini : null;
        return {
          title: sec.title,
          ini: ini !== null ? Number(ini.toFixed(2)) : null,
          evo: evo !== null ? Number(evo.toFixed(2)) : null,
          delta: delta !== null ? Number(delta.toFixed(2)) : null,
        };
      });
      const iniVals = sections.map((s) => s.ini).filter((v): v is number => v !== null);
      const evoVals = sections.map((s) => s.evo).filter((v): v is number => v !== null);
      const iniGlobal = iniVals.length ? iniVals.reduce((a, b) => a + b, 0) / iniVals.length : null;
      const evoGlobal = evoVals.length ? evoVals.reduce((a, b) => a + b, 0) / evoVals.length : null;
      const deltaGlobal = iniGlobal !== null && evoGlobal !== null ? evoGlobal - iniGlobal : null;

      const likertItems = SECTIONS_BY_FORM[g].flatMap((sec) =>
        sec.items.map((it) => {
          const countsIni = countLikert(subsIni, it.id);
          const countsEvo = countLikert(subsEvo, it.id);
          const avgIni = avgScore(subsIni, [it.id]);
          const avgEvo = avgScore(subsEvo, [it.id]);
          const delta = avgIni !== null && avgEvo !== null ? avgEvo - avgIni : null;
          return {
            id: it.id,
            text: it.text,
            countsIni,
            countsEvo,
            avgIni: avgIni !== null ? Number(avgIni.toFixed(2)) : null,
            avgEvo: avgEvo !== null ? Number(avgEvo.toFixed(2)) : null,
            delta: delta !== null ? Number(delta.toFixed(2)) : null,
          };
        })
      );

      return {
        grupo: g,
        countIni: subsIni.length,
        countEvo: subsEvo.length,
        iniGlobal: iniGlobal !== null ? Number(iniGlobal.toFixed(2)) : null,
        evoGlobal: evoGlobal !== null ? Number(evoGlobal.toFixed(2)) : null,
        deltaGlobal: deltaGlobal !== null ? Number(deltaGlobal.toFixed(2)) : null,
        sections,
        likertItems,
      };
    });
  };

  const buildInstitucionDeltasPayload = (): InstitucionDeltaRow[] =>
    institucionDeltas.map((r) => ({
      institucion: r.institucion,
      countIni: r.countIni,
      countEvo: r.countEvo,
      ini: r.ini !== null ? Number(r.ini.toFixed(2)) : null,
      evo: r.evo !== null ? Number(r.evo.toFixed(2)) : null,
      delta: r.delta !== null ? Number(r.delta.toFixed(2)) : null,
    }));

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
          institucionDeltas: buildInstitucionDeltasPayload(),
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

  const [downloadingInst, setDownloadingInst] = useState<string | null>(null);
  const [zipping, setZipping] = useState<{ done: number; total: number } | null>(null);

  const handleDownloadInstitucionPdf = async (institucion: string) => {
    if (!analysis || !selectedCohorte) return;
    setDownloadingInst(institucion);
    try {
      const sources = getPdfLogoSources(images);
      const row = institucionDeltas.find((r) => r.institucion === institucion);
      const groups = buildInstitucionGroups(institucion);
      await generarPDFAmbienteInstitucion(
        {
          cohorteNombre,
          institucionNombre: institucion,
          fechaInicial: analysis.inicial?.fecha_inicio || null,
          fechaEvolucion: analysis.evolucion?.fecha_inicio || null,
          maxScore: MAX_SCORE,
          instIni: row?.ini ?? null,
          instEvo: row?.evo ?? null,
          instDelta: row?.delta ?? null,
          groups,
        },
        {
          logoRLT: sources.logoRLT,
          logoCLT: sources.logoCLT,
          logoCosmo: sources.logoCosmo,
          showLogoRLT: true,
          showLogoCLT: true,
        },
      );
      toast.success(`PDF generado: ${institucion}`);
    } catch (e: any) {
      toast.error(e.message || "Error al generar el PDF de la institución");
    } finally {
      setDownloadingInst(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!analysis || !selectedCohorte || institucionDeltas.length === 0) return;
    const sources = getPdfLogoSources(images);
    const zip = new JSZip();
    const total = institucionDeltas.length;
    setZipping({ done: 0, total });
    try {
      for (let i = 0; i < institucionDeltas.length; i++) {
        const r = institucionDeltas[i];
        const groups = buildInstitucionGroups(r.institucion);
        const blob = (await generarPDFAmbienteInstitucion(
          {
            cohorteNombre,
            institucionNombre: r.institucion,
            fechaInicial: analysis.inicial?.fecha_inicio || null,
            fechaEvolucion: analysis.evolucion?.fecha_inicio || null,
            maxScore: MAX_SCORE,
            instIni: r.ini,
            instEvo: r.evo,
            instDelta: r.delta,
            groups,
          },
          {
            logoRLT: sources.logoRLT,
            logoCLT: sources.logoCLT,
            logoCosmo: sources.logoCosmo,
            showLogoRLT: true,
            showLogoCLT: true,
          },
          { returnBlob: true },
        )) as Blob;
        const safe = r.institucion.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60);
        zip.file(`Informe_Delta_${safe}.pdf`, blob);
        setZipping({ done: i + 1, total });
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      const safeCoh = cohorteNombre.replace(/[^a-zA-Z0-9-_]+/g, "_");
      a.href = url;
      a.download = `Informes_Delta_PorInstitucion_${safeCoh}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`ZIP generado (${total} PDFs)`);
    } catch (e: any) {
      toast.error(e.message || "Error al generar el ZIP");
    } finally {
      setZipping(null);
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
              Inicial: {phaseSplit.inicial.length} resp · Evolución: {phaseSplit.evolucion.length} resp · Comparables: {institucionesConEvolucion.size} institución(es)
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
      {ratingCard}

      {/* Empty state when no Evolución data exists for this cohort */}
      {analysis && phaseSplit.evolucion.length === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-5 text-sm space-y-1">
            <h3 className="text-base font-bold">Sin datos de Evolución</h3>
            <p className="text-muted-foreground">
              Esta cohorte aún no tiene respuestas en la fase <strong>cierre</strong>. El Δ no se puede calcular hasta que se registren respuestas de Evolución para al menos una institución que también tenga datos de Inicial.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cohort-level summary card — only when comparable data exists */}
      {analysis && institucionesConEvolucion.size > 0 && (
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
              <br />
              <strong>Solo se incluyen las {institucionesConEvolucion.size} institución(es) con datos en ambas fases</strong> — la línea Inicial se filtra a esas mismas instituciones para comparar lo comparable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Group-level detail cards */}
      {analysis && institucionesConEvolucion.size > 0 && analysis.groups.map((g, idx) => {
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

      {/* Per-institution delta breakdown */}
      {institucionDeltas.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold">Δ por institución ({institucionDeltas.length})</h3>
                <p className="text-xs text-muted-foreground">Instituciones con respuestas tanto en Inicial como en Evolución. Ordenadas por Δ descendente.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={!!zipping}>
                {zipping ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando {zipping.done}/{zipping.total}…</>
                ) : (
                  <><Archive className="w-4 h-4 mr-2" />Descargar PDFs por institución (ZIP)</>
                )}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Institución</th>
                    <th className="py-2 px-2 text-right">N ini</th>
                    <th className="py-2 px-2 text-right">N evo</th>
                    <th className="py-2 px-2 text-right">Inicial</th>
                    <th className="py-2 px-2 text-right">Evolución</th>
                    <th className="py-2 px-2 text-right">Δ</th>
                    <th className="py-2 pl-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {institucionDeltas.map((r) => {
                    const d = r.delta ?? 0;
                    const color = d > 0.05 ? "text-green-600" : d < -0.05 ? "text-destructive" : "text-muted-foreground";
                    const isDl = downloadingInst === r.institucion;
                    return (
                      <tr key={r.institucion} className="border-b last:border-0">
                        <td className="py-2 pr-3">{r.institucion}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.countIni}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.countEvo}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.ini !== null ? r.ini.toFixed(2) : "—"}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.evo !== null ? r.evo.toFixed(2) : "—"}</td>
                        <td className={`py-2 px-2 text-right tabular-nums font-semibold ${color}`}>
                          {d > 0 ? "+" : ""}{d.toFixed(2)}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadInstitucionPdf(r.institucion)}
                            disabled={isDl || !!zipping}
                            title="Descargar informe PDF de esta institución"
                          >
                            {isDl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
