import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { FREQUENCY_OPTIONS, ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT } from "@/data/ambienteEscolarData";

interface Cohorte { id: string; nombre: string; }
interface Campana { id: string; cohorte_id: string; fase: string; nombre: string; }
interface Submission { campana_id: string | null; tipo_formulario: string; respuestas: any; }

const DB_TO_UI: Record<string, string> = { linea_base: "Inicial", cierre: "Evolución" };

// Convert frequency option to numeric score (1..N)
// FREQUENCY_OPTIONS is declared in display order (Siempre → Nunca for stacked charts),
// so we must REVERSE the index to map Nunca=1 ... Siempre=5.
const FREQ_SCORE: Record<string, number> = Object.fromEntries(
  FREQUENCY_OPTIONS.map((opt, i) => [opt, FREQUENCY_OPTIONS.length - i])
);
const MAX_SCORE = FREQUENCY_OPTIONS.length;

const SECTIONS_BY_FORM: Record<string, { title: string; itemIds: string[] }[]> = {
  acudientes: ACUDIENTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
  estudiantes: ESTUDIANTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
  docentes: DOCENTES_LIKERT.map((s) => ({ title: s.title, itemIds: s.items.map((i) => i.id) })),
};

// Returns raw Likert mean on a 1..MAX_SCORE scale (same method as "Línea Base 2025")
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
  return sum / count; // raw Likert average (1..MAX_SCORE)
}

export default function AdminAmbienteDeltaTab() {
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCohorte, setSelectedCohorte] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cohortesRes, campanasRes] = await Promise.all([
        supabase.from("ae_cohortes").select("id, nombre").order("nombre"),
        supabase.from("ae_campanas" as any).select("id, cohorte_id, fase, nombre"),
      ]);
      setCohortes((cohortesRes.data as Cohorte[]) || []);
      setCampanas((campanasRes.data as any as Campana[]) || []);

      // Load all submissions with campana_id
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

  const analysis = useMemo(() => {
    if (!selectedCohorte) return null;
    const campanasCohorte = campanas.filter((c) => c.cohorte_id === selectedCohorte);
    const inicial = campanasCohorte.find((c) => c.fase === "linea_base");
    const evolucion = campanasCohorte.find((c) => c.fase === "cierre");

    // ⚠️ TEMP SIMULATION — remove after demo
    const SIM_COHORTE_ID = "2ca48e5d-2c62-4576-a341-a158474fa088"; // Itagüí 2025
    const isSimCohorte = selectedCohorte === SIM_COHORTE_ID;

    const groups = ["docentes", "estudiantes", "acudientes"] as const;
    const result = groups.map((g) => {
      const subsIni = inicial ? submissions.filter((s) => s.campana_id === inicial.id && s.tipo_formulario === g) : [];
      const subsEvo = evolucion ? submissions.filter((s) => s.campana_id === evolucion.id && s.tipo_formulario === g) : [];
      const sections = SECTIONS_BY_FORM[g].map((sec) => {
        const ini = avgScore(subsIni, sec.itemIds);
        let evo = avgScore(subsEvo, sec.itemIds);
        // ⚠️ TEMP SIMULATION — Itagüí / Docentes / Comunicación
        if (isSimCohorte && g === "docentes" && sec.title === "Comunicación") {
          evo = 4.67;
        }
        const delta = ini !== null && evo !== null ? evo - ini : null;
        return { title: sec.title, ini, evo, delta };
      });
      const countEvoFinal = isSimCohorte && g === "docentes" ? 240 : subsEvo.length;
      return { grupo: g, countIni: subsIni.length, countEvo: countEvoFinal, sections };
    });
    const evolucionFinal = evolucion ?? (isSimCohorte ? ({ id: "sim", cohorte_id: selectedCohorte, fase: "cierre", nombre: "SIMULADO" } as Campana) : undefined);
    return { inicial, evolucion: evolucionFinal, groups: result };
  }, [selectedCohorte, campanas, submissions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (cohortesConCampanas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No hay cohortes con campañas configuradas. Crea campañas en la pestaña "Campañas".
      </div>
    );
  }

  // Compute group-level and cohort-level aggregates (mean of section means)
  const groupAggregates = analysis?.groups.map((g) => {
    const iniVals = g.sections.map((s) => s.ini).filter((v): v is number => v !== null);
    const evoVals = g.sections.map((s) => s.evo).filter((v): v is number => v !== null);
    const ini = iniVals.length ? iniVals.reduce((a, b) => a + b, 0) / iniVals.length : null;
    const evo = evoVals.length ? evoVals.reduce((a, b) => a + b, 0) / evoVals.length : null;
    const delta = ini !== null && evo !== null ? evo - ini : null;
    return { grupo: g.grupo, ini, evo, delta };
  }) ?? [];
  const cohortIniVals = groupAggregates.map((g) => g.ini).filter((v): v is number => v !== null);
  const cohortEvoVals = groupAggregates.map((g) => g.evo).filter((v): v is number => v !== null);
  const cohortIni = cohortIniVals.length ? cohortIniVals.reduce((a, b) => a + b, 0) / cohortIniVals.length : null;
  const cohortEvo = cohortEvoVals.length ? cohortEvoVals.reduce((a, b) => a + b, 0) / cohortEvoVals.length : null;
  const cohortDelta = cohortIni !== null && cohortEvo !== null ? cohortEvo - cohortIni : null;

  return (
    <div className="space-y-6">
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
      <p className="text-xs text-muted-foreground">Escala Likert: 1 (Nunca) — {MAX_SCORE} (Siempre). Δ expresado en puntos sobre {MAX_SCORE}.</p>

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
              {/* Group-level score bars */}
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
