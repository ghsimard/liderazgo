import { useState, useEffect, useMemo } from "react";
import { supabase as cloudClient } from "@/integrations/supabase/client";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RefreshCw, ArrowUp, ArrowDown, Minus, Sparkles, Download, Loader2, FileDown, Archive, Search, ArrowUpDown } from "lucide-react";
import { FREQUENCY_OPTIONS, ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT, type LikertSection } from "@/data/ambienteEscolarData";
import { useAppImages } from "@/hooks/useAppImages";
import { useGeographicData } from "@/hooks/useGeographicData";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";
import { generarPDFAmbienteDelta, type DeltaGroup, type InstitucionDeltaRow, type MelIndicadorPdf } from "@/utils/ambienteDeltaPdfGenerator";
import { generarPDFAmbienteInstitucion, type InstGroupData } from "@/utils/ambienteInstitucionPdfGenerator";
import {
  buildItemIdsByComponent,
  computeInstitucionesMel,
  aggregateMel,
  META_PCT,
  THRESHOLD_S_PP,
  THRESHOLD_N_PP,
  type InstitucionMel,
} from "@/utils/melAmbienteIndicator";
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
  const [cohorteInst, setCohorteInst] = useState<{ cohorte_id: string; institucion_educativa: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohortes, setSelectedCohortes] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [analysisHtml, setAnalysisHtml] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [instSearch, setInstSearch] = useState("");
  const [instGroupByRegion, setInstGroupByRegion] = useState(false);
  const [instSortKey, setInstSortKey] = useState<"institucion" | "countIni" | "countEvo" | "ini" | "evo" | "delta">("delta");
  const [instSortDir, setInstSortDir] = useState<"asc" | "desc">("desc");
  const [ignorarComparabilidad, setIgnorarComparabilidad] = useState(false);


  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cohortesRes, campanasRes, cohorteInstRes] = await Promise.all([
        supabase.from("ae_cohortes").select("id, nombre").order("nombre"),
        supabase.from("ae_campanas" as any).select("id, cohorte_id, fase, nombre, fecha_inicio, fecha_fin"),
        supabase.from("v_ae_instituciones_por_cohorte").select("cohorte_id, institucion_educativa"),
      ]);
      setCohortes((cohortesRes.data as Cohorte[]) || []);
      setCampanas((campanasRes.data as any as Campana[]) || []);
      setCohorteInst((cohorteInstRes.data as any) || []);

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

  // No cohort is selected by default; the user must explicitly choose one or more.

  // Reset analysis when cohort or region filter changes
  useEffect(() => {
    setAnalysisHtml("");
  }, [selectedCohortes, selectedRegions]);


  // Institutions allowed by region filter (null = no filter)
  const allowedInstitutionsSet = useMemo<Set<string> | null>(() => {
    if (selectedRegions.length === 0) return null;
    const s = new Set<string>();
    for (const r of selectedRegions) {
      for (const inst of getInstitucionesForRegion(r)) s.add(inst);
    }
    return s;
  }, [selectedRegions, getInstitucionesForRegion]);


  // Split submissions for the selected cohort into two strictly separated sets:
  // Inicial = phase 'linea_base', Evolución = phase 'cierre'.
  // Phase resolution: prefer the submission's own `fase`; fallback to the campaign's `fase`.
  // Cohort filter: prefer `cohorte_id`; fallback to membership in this cohort's campaigns.
  const phaseSplit = useMemo(() => {
    const empty = { inicial: [] as Submission[], evolucion: [] as Submission[], iniCamp: undefined as Campana | undefined, evoCamp: undefined as Campana | undefined };
    if (selectedCohortes.length === 0) return empty;
    const cohorteSet = new Set(selectedCohortes);
    const campanasCohorte = campanas.filter((c) => cohorteSet.has(c.cohorte_id));
    const campIds = new Set(campanasCohorte.map((c) => c.id));
    const campFaseById = new Map(campanasCohorte.map((c) => [c.id, c.fase]));

    const inicial: Submission[] = [];
    const evolucion: Submission[] = [];
    for (const s of submissions) {
      // Cohort gate
      const inCohort = s.cohorte_id
        ? cohorteSet.has(s.cohorte_id)
        : s.campana_id != null && campIds.has(s.campana_id);
      if (!inCohort) continue;
      // Region gate (via institution)
      if (allowedInstitutionsSet && !allowedInstitutionsSet.has(s.institucion_educativa)) continue;
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
  }, [selectedCohortes, campanas, submissions, allowedInstitutionsSet]);


  const regionesLabel = selectedRegions.length === 0 ? "Todas" : selectedRegions.join(", ");


  // Institutions present in BOTH phases → comparable set
  const institucionesConEvolucion = useMemo(() => {
    const iniSet = new Set(phaseSplit.inicial.map((s) => s.institucion_educativa));
    const evoSet = new Set(phaseSplit.evolucion.map((s) => s.institucion_educativa));
    return new Set([...evoSet].filter((i) => iniSet.has(i)));
  }, [phaseSplit]);

  const analysis = useMemo(() => {
    if (selectedCohortes.length === 0) return null;
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
  }, [selectedCohortes, phaseSplit, institucionesConEvolucion]);

  // Per-institution deltas (only those with responses in BOTH phases)
  const institucionDeltas = useMemo(() => {
    if (selectedCohortes.length === 0) return [];
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
  }, [selectedCohortes, phaseSplit, institucionesConEvolucion]);

  // ─── Indicador MEL (tabla oficial) ───
  // Componente cumple si ΔS ≥ +5 pp o ΔN ≤ −5 pp; institución cumple si ≥2/3.
  const melItemsByComponent = useMemo(
    () => buildItemIdsByComponent(SECTIONS_BY_FORM),
    [],
  );

  const melInstituciones = useMemo<InstitucionMel[]>(() => {
    if (selectedCohortes.length === 0) return [];
    const { inicial: iniAll, evolucion: evoAll } = phaseSplit;
    return Array.from(institucionesConEvolucion).map((inst) => {
      const subsIni = iniAll.filter((s) => s.institucion_educativa === inst);
      const subsEvo = evoAll.filter((s) => s.institucion_educativa === inst);
      return computeInstitucionesMel(inst, subsIni, subsEvo, melItemsByComponent);
    }).sort((a, b) =>
      Number(b.cumple) - Number(a.cumple) ||
      b.componentsCumplen - a.componentsCumplen ||
      a.institucion.localeCompare(b.institucion),
    );
  }, [selectedCohortes, phaseSplit, institucionesConEvolucion, melItemsByComponent]);

  const melGlobal = useMemo(
    () => aggregateMel(melInstituciones, { ignorarComparabilidad }),
    [melInstituciones, ignorarComparabilidad],
  );

  // Institution → region lookup (geographic data first; fallback: cohorte name for
  // 2025 institutions not present in regiones/region_instituciones)
  const instToRegion = useMemo(() => {
    const m = new Map<string, string>();
    for (const rn of regionNames) {
      for (const ie of getInstitucionesForRegion(rn)) m.set(ie, rn);
    }
    const cohorteNameById = new Map(cohortes.map((c) => [c.id, c.nombre]));
    for (const ci of cohorteInst) {
      if (m.has(ci.institucion_educativa)) continue;
      const nom = cohorteNameById.get(ci.cohorte_id);
      if (nom) m.set(ci.institucion_educativa, nom);
    }
    return m;
  }, [regionNames, getInstitucionesForRegion, cohorteInst, cohortes]);

  // Filtered + sorted rows for the per-institution table
  const institucionDeltasView = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    const filtered = q
      ? institucionDeltas.filter((r) => r.institucion.toLowerCase().includes(q))
      : institucionDeltas.slice();
    const dir = instSortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (instSortKey === "institucion") {
        return a.institucion.localeCompare(b.institucion) * dir;
      }
      const va = a[instSortKey];
      const vb = b[instSortKey];
      const na = va === null || va === undefined ? -Infinity : (va as number);
      const nb = vb === null || vb === undefined ? -Infinity : (vb as number);
      return (na - nb) * dir;
    });
    return filtered;
  }, [institucionDeltas, instSearch, instSortKey, instSortDir]);

  // Grouped variant: Map<region, rows[]> preserving sort order within each region
  const institucionDeltasGrouped = useMemo(() => {
    const groups = new Map<string, typeof institucionDeltasView>();
    for (const r of institucionDeltasView) {
      const region = instToRegion.get(r.institucion) || "Sin región";
      if (!groups.has(region)) groups.set(region, [] as typeof institucionDeltasView);
      groups.get(region)!.push(r);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [institucionDeltasView, instToRegion]);

  const toggleInstSort = (key: typeof instSortKey) => {
    if (instSortKey === key) {
      setInstSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setInstSortKey(key);
      setInstSortDir(key === "institucion" ? "asc" : "desc");
    }
  };

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

  const cohorteNombre = selectedCohortes
    .map((id) => cohortes.find((c) => c.id === id)?.nombre)
    .filter(Boolean)
    .join(", ") || "";


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
    if (!analysis || selectedCohortes.length === 0) return;
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
        melIndicator: {
          meta: META_PCT,
          pctInstitucionesCumplen: Number(melGlobal.pct.toFixed(1)),
          nCumplen: melGlobal.nCumplen,
          nInstituciones: melGlobal.nInstituciones,
          metaAlcanzada: melGlobal.metaAlcanzada,
          nExcluidasMuestra: melGlobal.nExcluidasMuestra,
          nNoEvaluables: melGlobal.nNoEvaluables,
          porInstitucion: melInstituciones.map((r) => ({
            institucion: r.institucion,
            cumple: r.cumple,
            componentsCumplen: r.componentsCumplen,
            variacionMuestralPct: Number(r.variacionMuestralPct.toFixed(1)),
            components: r.components.map((c) => ({
              componente: c.title,
              deltaS: c.deltaS !== null ? Number(c.deltaS.toFixed(1)) : null,
              deltaN: c.deltaN !== null ? Number(c.deltaN.toFixed(1)) : null,
              cumple: c.cumple,
            })),
          })),
        },
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
    if (!analysis || selectedCohortes.length === 0) return;
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
          regionesLabel,
          melIndicator: {
            meta: META_PCT,
            pctInstitucionesCumplen: melGlobal.pct,
            nCumplen: melGlobal.nCumplen,
            nInstituciones: melGlobal.nInstituciones,
            metaAlcanzada: melGlobal.metaAlcanzada,
            nExcluidasMuestra: melGlobal.nExcluidasMuestra,
            nNoEvaluables: melGlobal.nNoEvaluables,
            ignorarComparabilidad,
            componentes: Object.keys(melItemsByComponent),
            porInstitucion: melInstituciones.map((r) => ({
              institucion: r.institucion,
              nBase: r.nBase,
              nPost: r.nPost,
              variacionMuestralPct: r.variacionMuestralPct,
              comparable: r.comparable,
              componentsCumplen: r.componentsCumplen,
              cumple: r.cumple,
              components: r.components.map((c) => ({
                title: c.title,
                deltaS: c.deltaS,
                deltaN: c.deltaN,
                cumple: c.cumple,
                evaluable: c.evaluable,
              })),
            })),
          },
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
    if (!analysis || selectedCohortes.length === 0) return;
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
    if (!analysis || selectedCohortes.length === 0 || institucionDeltas.length === 0) return;
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 min-w-[16rem] justify-start">
                {selectedCohortes.length === 0
                  ? "Seleccionar cohorte(s)…"
                  : selectedCohortes.length === 1
                    ? cohorteNombre
                    : `${selectedCohortes.length} cohortes seleccionadas`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Cohortes</span>
                <div className="flex gap-2">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setSelectedCohortes(cohortes.map((c) => c.id))}
                  >
                    Todas
                  </button>
                  {selectedCohortes.length > 0 && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setSelectedCohortes([])}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cohortes.map((c) => {
                  const hasCampanas = cohortesConCampanas.some((cc) => cc.id === c.id);

                  const checked = selectedCohortes.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelectedCohortes((prev) =>
                            v ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                          );
                        }}
                      />
                      <span className={hasCampanas ? "" : "text-muted-foreground italic"}>
                        {c.nombre}{!hasCampanas && " (sin campañas)"}
                      </span>

                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>


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

      {/* ─── INDICADOR MEL — Ambiente Escolar (tabla oficial) ─── */}
      {analysis && institucionesConEvolucion.size > 0 && (
        <Card className="border-primary/60">
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-start flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-bold">Indicador MEL — Ambiente Escolar</h3>
                <p className="text-xs text-muted-foreground">
                  Regla oficial: una componente <strong>cumple</strong> si ΔS ≥ +{THRESHOLD_S_PP} pp
                  <em> o</em> ΔN ≤ {THRESHOLD_N_PP} pp. Una institución cumple si <strong>≥ 2 de 3 componentes</strong> cumplen. Meta: <strong>{META_PCT}%</strong>.
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={ignorarComparabilidad}
                  onCheckedChange={(v) => setIgnorarComparabilidad(v === true)}
                />
                Ignorar comparabilidad muestral (&gt; 10 %)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <div className="text-3xl font-bold tabular-nums text-primary">
                  {melGlobal.pct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {melGlobal.nCumplen} / {melGlobal.nInstituciones} institución(es) cumplen
                </div>
              </div>
              <div className={`rounded-md border p-3 text-center ${melGlobal.metaAlcanzada ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
                <div className={`text-lg font-bold ${melGlobal.metaAlcanzada ? "text-green-700" : "text-amber-700"}`}>
                  {melGlobal.metaAlcanzada ? "✓ Meta alcanzada" : `✗ Falta ${(META_PCT - melGlobal.pct).toFixed(1)} pp`}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">Meta: {META_PCT}% · Línea base: 0%</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xs text-muted-foreground">Excluidas</div>
                <div className="text-sm">
                  <div>{melGlobal.nExcluidasMuestra} por muestra no comparable</div>
                  <div>{melGlobal.nNoEvaluables} sin datos suficientes</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Institución</th>
                    <th className="py-2 px-2 text-right">N base</th>
                    <th className="py-2 px-2 text-right">N post</th>
                    <th className="py-2 px-2 text-right">Var. muestral</th>
                    {Object.keys(melItemsByComponent).map((c) => (
                      <th key={c} className="py-2 px-2 text-center" colSpan={2}>{c}</th>
                    ))}
                    <th className="py-2 pl-2 text-center">Cumple</th>
                  </tr>
                  <tr className="text-[10px] text-muted-foreground border-b">
                    <th></th><th></th><th></th><th></th>
                    {Object.keys(melItemsByComponent).flatMap((c) => [
                      <th key={`${c}-s`} className="py-1 px-2 text-right">ΔS pp</th>,
                      <th key={`${c}-n`} className="py-1 px-2 text-right">ΔN pp</th>,
                    ])}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {melInstituciones.length === 0 && (
                    <tr><td colSpan={99} className="py-6 text-center text-muted-foreground italic">Sin instituciones comparables.</td></tr>
                  )}
                  {melInstituciones.map((r) => {
                    const excluded = !r.comparable && !ignorarComparabilidad;
                    return (
                      <tr key={r.institucion} className={`border-b last:border-0 ${excluded ? "opacity-50" : ""}`}>
                        <td className="py-2 pr-3">
                          {r.institucion}
                          {!r.comparable && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800">muestra no comparable</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.nBase}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{r.nPost}</td>
                        <td className={`py-2 px-2 text-right tabular-nums ${r.comparable ? "" : "text-amber-700 font-semibold"}`}>
                          {r.variacionMuestralPct.toFixed(1)}%
                        </td>
                        {r.components.map((c) => {
                          const sOk = c.deltaS !== null && c.deltaS >= THRESHOLD_S_PP;
                          const nOk = c.deltaN !== null && c.deltaN <= THRESHOLD_N_PP;
                          const compOk = c.cumple;
                          return [
                            <td key={`${c.title}-s`} className={`py-2 px-2 text-right tabular-nums ${sOk ? "text-green-700 font-semibold" : ""}`}>
                              {c.deltaS === null ? "—" : `${c.deltaS > 0 ? "+" : ""}${c.deltaS.toFixed(1)}`}
                            </td>,
                            <td key={`${c.title}-n`} className={`py-2 px-2 text-right tabular-nums ${nOk ? "text-green-700 font-semibold" : ""}`}>
                              {c.deltaN === null ? "—" : `${c.deltaN > 0 ? "+" : ""}${c.deltaN.toFixed(1)}`}
                              {compOk && <span className="ml-1 text-green-700">✓</span>}
                            </td>,
                          ];
                        })}
                        <td className="py-2 pl-2 text-center">
                          {r.cumple ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-800 font-semibold">✓ {r.componentsCumplen}/3</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground">✗ {r.componentsCumplen}/3</span>
                          )}
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

      {/* Lectura complementaria — promedios Likert 1-5 */}
      {analysis && institucionesConEvolucion.size > 0 && (
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold pt-2 border-t">
          Lectura complementaria — promedios Likert 1-5
        </div>
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
                <p className="text-xs text-muted-foreground">Instituciones con respuestas tanto en Inicial como en Evolución. Ordene una columna o agrupe por región.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={!!zipping}>
                {zipping ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando {zipping.done}/{zipping.total}…</>
                ) : (
                  <><Archive className="w-4 h-4 mr-2" />Descargar PDFs por institución (ZIP)</>
                )}
              </Button>
            </div>

            {/* Controls: search + group toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={instSearch}
                  onChange={(e) => setInstSearch(e.target.value)}
                  placeholder="Buscar institución…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={instGroupByRegion}
                  onCheckedChange={(v) => setInstGroupByRegion(v === true)}
                />
                Agrupar por región
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                {institucionDeltasView.length} / {institucionDeltas.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <SortableTh label="Institución" active={instSortKey === "institucion"} dir={instSortDir} onClick={() => toggleInstSort("institucion")} className="py-2 pr-3" />
                    <SortableTh label="N ini" active={instSortKey === "countIni"} dir={instSortDir} onClick={() => toggleInstSort("countIni")} className="py-2 px-2" align="right" />
                    <SortableTh label="N evo" active={instSortKey === "countEvo"} dir={instSortDir} onClick={() => toggleInstSort("countEvo")} className="py-2 px-2" align="right" />
                    <SortableTh label="Inicial" active={instSortKey === "ini"} dir={instSortDir} onClick={() => toggleInstSort("ini")} className="py-2 px-2" align="right" />
                    <SortableTh label="Evolución" active={instSortKey === "evo"} dir={instSortDir} onClick={() => toggleInstSort("evo")} className="py-2 px-2" align="right" />
                    <SortableTh label="Δ" active={instSortKey === "delta"} dir={instSortDir} onClick={() => toggleInstSort("delta")} className="py-2 px-2" align="right" />
                    <th className="py-2 pl-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const renderRow = (r: typeof institucionDeltasView[number]) => {
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
                    };

                    if (institucionDeltasView.length === 0) {
                      return (
                        <tr><td colSpan={7} className="py-6 text-center text-muted-foreground italic">Sin resultados para «{instSearch}».</td></tr>
                      );
                    }

                    if (!instGroupByRegion) {
                      return institucionDeltasView.map(renderRow);
                    }

                    return institucionDeltasGrouped.flatMap(([region, rows]) => [
                      <tr key={`grp-${region}`} className="bg-muted/40">
                        <td colSpan={7} className="py-1.5 px-2 text-xs font-semibold text-foreground">
                          {region} <span className="text-muted-foreground font-normal">· {rows.length}</span>
                        </td>
                      </tr>,
                      ...rows.map(renderRow),
                    ]);
                  })()}
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

function SortableTh({ label, active, dir, onClick, className = "", align = "left" }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string; align?: "left" | "right" }) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`${className} ${align === "right" ? "text-right" : "text-left"} select-none`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground font-semibold" : ""} ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <Icon className="w-3 h-3 opacity-70" />
        {label}
      </button>
    </th>
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
