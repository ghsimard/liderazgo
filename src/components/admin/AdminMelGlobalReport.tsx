import { useState, useRef } from "react";
import { calcularMelAnalysis, type MelAnalysisData } from "@/utils/reporte360MelCalculator";
import type { AggregatedMel, DomainIncrementPct } from "@/utils/melGlobalTypes";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Users, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppImages } from "@/hooks/useAppImages";
import { generarMelGlobalPDF } from "@/utils/melGlobalPdfGenerator";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface DirectivoOption {
  nombre: string;
  institucion: string;
  cargo: string;
  genero: string | null;
  region: string;
  entidad_territorial: string;
}

function DeltaBadge({ value, pct }: { value: number; pct?: number | null }) {
  const pctStr = pct !== undefined && pct !== null && isFinite(pct) ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)` : "";
  if (Math.abs(value) < 0.01) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> 0.00{pctStr}</span>;
  }
  if (value > 0) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" /> +{value.toFixed(2)}{pctStr}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium"><TrendingDown className="w-3 h-3" /> {value.toFixed(2)}{pctStr}</span>;
}

function aggregate(results: MelAnalysisData[]): AggregatedMel {
  const withData = results.filter((r) => r.hasInicial || r.hasFinal);
  const bothPhases = results.filter((r) => r.hasInicial && r.hasFinal);

  const avgDeltaAuto = bothPhases.length > 0 ? bothPhases.reduce((s, r) => s + r.globalDeltaAuto, 0) / bothPhases.length : 0;
  const avgDeltaObserver = bothPhases.length > 0 ? bothPhases.reduce((s, r) => s + r.globalDeltaObserver, 0) / bothPhases.length : 0;

  const domainMap = new Map<string, { label: string; sumAuto: number; sumInt: number; sumExt: number; sumIniAuto: number; sumIniInt: number; sumIniExt: number; n: number }>();
  // Track per-domain positive increments (auto, observer combined)
  const domainPosMap = new Map<string, { label: string; posAuto: number; posObs: number; total: number }>();
  for (const r of bothPhases) {
    for (const d of r.domainDeltas) {
      const entry = domainMap.get(d.domain) || { label: d.domainLabel, sumAuto: 0, sumInt: 0, sumExt: 0, sumIniAuto: 0, sumIniInt: 0, sumIniExt: 0, n: 0 };
      entry.sumAuto += d.deltaAuto;
      entry.sumInt += d.deltaInternos;
      entry.sumExt += d.deltaExternos;
      entry.sumIniAuto += d.inicialAuto;
      entry.sumIniInt += d.inicialInternos;
      entry.sumIniExt += d.inicialExternos;
      entry.n++;
      domainMap.set(d.domain, entry);

      const posEntry = domainPosMap.get(d.domain) || { label: d.domainLabel, posAuto: 0, posObs: 0, total: 0 };
      posEntry.total++;
      if (d.deltaAuto >= 0.5) posEntry.posAuto++;
      // Observer = average of internos + externos deltas
      const obsAvgDelta = (d.deltaInternos + d.deltaExternos) / 2;
      if (obsAvgDelta >= 0.5) posEntry.posObs++;
      domainPosMap.set(d.domain, posEntry);
    }
  }
  const domainDeltas = [...domainMap.entries()].map(([domain, v]) => ({
    domain,
    domainLabel: v.label,
    avgDeltaAuto: v.n > 0 ? v.sumAuto / v.n : 0,
    avgDeltaInternos: v.n > 0 ? v.sumInt / v.n : 0,
    avgDeltaExternos: v.n > 0 ? v.sumExt / v.n : 0,
    avgInicialAuto: v.n > 0 ? v.sumIniAuto / v.n : 0,
    avgInicialInternos: v.n > 0 ? v.sumIniInt / v.n : 0,
    avgInicialExternos: v.n > 0 ? v.sumIniExt / v.n : 0,
  }));

  const buildPcts = (getter: (e: { posAuto: number; posObs: number; total: number }) => number) =>
    [...domainPosMap.entries()].map(([domain, v]) => ({
      domain,
      domainLabel: v.label,
      pctPositive: v.total > 0 ? (getter(v) / v.total) * 100 : 0,
      countPositive: getter(v),
      countTotal: v.total,
    }));

  const domainIncrementPcts: DomainIncrementPct[] = buildPcts(e => e.posAuto);
  const domainIncrementPctsObserver: DomainIncrementPct[] = buildPcts(e => e.posObs);

  const compMap = new Map<string, { label: string; sumIA: number; sumFA: number; sumDA: number; sumIO: number; sumFO: number; sumDO: number; n: number }>();
  for (const r of bothPhases) {
    for (const c of r.competencyDeltas) {
      const entry = compMap.get(c.competency) || { label: c.competencyLabel, sumIA: 0, sumFA: 0, sumDA: 0, sumIO: 0, sumFO: 0, sumDO: 0, n: 0 };
      entry.sumIA += c.inicialAuto;
      entry.sumFA += c.finalAuto;
      entry.sumDA += c.deltaAuto;
      entry.sumIO += c.inicialObserver;
      entry.sumFO += c.finalObserver;
      entry.sumDO += c.deltaObserver;
      entry.n++;
      compMap.set(c.competency, entry);
    }
  }
  const competencyDeltas = [...compMap.entries()].map(([competency, v]) => ({
    competency,
    competencyLabel: v.label,
    avgInicialAuto: v.n > 0 ? v.sumIA / v.n : 0,
    avgFinalAuto: v.n > 0 ? v.sumFA / v.n : 0,
    avgDeltaAuto: v.n > 0 ? v.sumDA / v.n : 0,
    avgInicialObs: v.n > 0 ? v.sumIO / v.n : 0,
    avgFinalObs: v.n > 0 ? v.sumFO / v.n : 0,
    avgDeltaObs: v.n > 0 ? v.sumDO / v.n : 0,
  }));

  const countPositiveAuto = bothPhases.filter((r) => r.globalDeltaAuto >= 0.5).length;
  const countPositiveObs = bothPhases.filter((r) => r.globalDeltaObserver >= 0.5).length;
  const globalPctPositive = bothPhases.length > 0 ? (countPositiveAuto / bothPhases.length) * 100 : 0;

  // Global % for observers: count directivos where avg observer domain delta >= 0.5
  const countPosObserver = bothPhases.filter((r) => {
    return r.globalDeltaObserver >= 0.5;
  }).length;

  return {
    count: results.length,
    countWithData: withData.length,
    countBothPhases: bothPhases.length,
    countPositiveAuto,
    countPositiveObs,
    avgDeltaAuto,
    avgDeltaObserver,
    domainDeltas,
    competencyDeltas,
    domainIncrementPcts,
    domainIncrementPctsObserver,
    globalPctPositive,
    globalPctPositiveObserver: bothPhases.length > 0 ? (countPosObserver / bothPhases.length) * 100 : 0,
  };
}

export default function AdminMelGlobalReport({ directivos, filterLabel }: { directivos: DirectivoOption[]; filterLabel?: string }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [agg, setAgg] = useState<AggregatedMel | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { images } = useAppImages();

  // Chart refs for PDF capture
  const domainChartRef = useRef<HTMLDivElement>(null);
  const radarChartRef = useRef<HTMLDivElement>(null);
  const competencyChartRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setProgress({ current: 0, total: directivos.length });
    const results: MelAnalysisData[] = [];

    for (const d of directivos) {
      try {
        const data = await calcularMelAnalysis(d.nombre, d.institucion);
        if (data.hasInicial || data.hasFinal) results.push(data);
      } catch {
        // skip
      }
      setProgress((p) => ({ ...p, current: p.current + 1 }));
    }

    setAgg(aggregate(results));
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!agg) return;
    setDownloading(true);
    try {
      await generarMelGlobalPDF(
        agg,
        {
          logoRLT: images.logo_rlt_white || images.logo_rlt,
          logoCLT: images.logo_clt || images.logo_clt_white,
        },
        { domainChartRef, radarChartRef, competencyChartRef },
        filterLabel || "Todos los directivos"
      );
    } catch (err) {
      console.error("Global MEL PDF error:", err);
    }
    setDownloading(false);
  };

  if (!agg && !loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <BarChart3 className="w-10 h-10 text-primary mx-auto opacity-60" />
          <div>
            <p className="text-sm font-medium">Informe global MEL</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega los deltas de progresión de {directivos.length} directivo(s) filtrados.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={directivos.length === 0} className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Generar informe global
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-medium text-center">Análisis en curso…</p>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {progress.current} / {progress.total} directivo(s)
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!agg) return null;

  const domainChartData = agg.domainDeltas.map((d) => ({
    name: d.domainLabel.length > 25 ? d.domainLabel.substring(0, 23) + "…" : d.domainLabel,
    "Δ Auto": +d.avgDeltaAuto.toFixed(2),
    "Δ Internos": +d.avgDeltaInternos.toFixed(2),
    "Δ Externos": +d.avgDeltaExternos.toFixed(2),
  }));

  const radarData = agg.competencyDeltas.map((c) => ({
    competency: c.competencyLabel.length > 20 ? c.competencyLabel.substring(0, 18) + "…" : c.competencyLabel,
    "Inicial Auto": +c.avgInicialAuto.toFixed(2),
    "Final Auto": +c.avgFinalAuto.toFixed(2),
    "Inicial Obs.": +c.avgInicialObs.toFixed(2),
    "Final Obs.": +c.avgFinalObs.toFixed(2),
  }));

  const competencyBarData = agg.competencyDeltas.map((c) => ({
    name: c.competencyLabel.length > 20 ? c.competencyLabel.substring(0, 18) + "…" : c.competencyLabel,
    "Δ Auto": +c.avgDeltaAuto.toFixed(2),
    "Δ Obs.": +c.avgDeltaObs.toFixed(2),
  }));

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {agg.countBothPhases} de {agg.countWithData} directivo(s) con datos en ambas fases (inicial y final)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading} className="gap-1.5">
            {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF Global
          </Button>
          <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Recalcular
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{agg.countWithData}</p>
            <p className="text-xs text-muted-foreground">Directivos con datos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Δ Auto promedio</p>
            <div className="text-lg"><DeltaBadge value={agg.avgDeltaAuto} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Δ Obs. promedio</p>
            <div className="text-lg"><DeltaBadge value={agg.avgDeltaObserver} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{agg.countPositiveAuto}</p>
            <p className="text-xs text-muted-foreground">Progresión positiva (auto)</p>
          </CardContent>
        </Card>
      </div>

      {/* MEL Indicator: % with positive increment by domain */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold">Indicador MEL: Incremento por Gestión</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                % de directivos que presentan incremento en su puntaje promedio en la Encuesta 360°, desagregado por gestión
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Meta: 80%</p>
              <p className="text-xs text-muted-foreground">Línea base: 0%</p>
            </div>
          </div>

          {/* Global % */}
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Global (todas las gestiones)</span>
              <span className={`text-sm font-bold ${agg.globalPctPositive >= 80 ? "text-emerald-600" : agg.globalPctPositive >= 50 ? "text-amber-600" : "text-destructive"}`}>
                {agg.globalPctPositive.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${agg.globalPctPositive >= 80 ? "bg-emerald-500" : agg.globalPctPositive >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                style={{ width: `${Math.min(agg.globalPctPositive, 100)}%` }}
              />
              {/* Target line at 80% */}
              <div className="absolute inset-y-0 border-r-2 border-dashed border-foreground/40" style={{ left: "80%" }} />
            </div>
            <p className="text-xs text-muted-foreground">{agg.countPositiveAuto} / {agg.countBothPhases} directivos con incremento</p>
          </div>

          {/* Per domain */}
          <div className="grid gap-2">
            {agg.domainIncrementPcts.map((d) => (
              <div key={d.domain} className="rounded-md border p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{d.domainLabel}</span>
                  <span className={`text-xs font-bold ${d.pctPositive >= 80 ? "text-emerald-600" : d.pctPositive >= 50 ? "text-amber-600" : "text-destructive"}`}>
                    {d.pctPositive.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${d.pctPositive >= 80 ? "bg-emerald-500" : d.pctPositive >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${Math.min(d.pctPositive, 100)}%` }}
                  />
                  <div className="absolute inset-y-0 border-r-2 border-dashed border-foreground/30" style={{ left: "80%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{d.countPositive} / {d.countTotal} directivos</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* MEL Indicator: % with positive increment by domain - OBSERVERS */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold">Indicador MEL: Observadores</h4>
              <p className="text-xs text-muted-foreground mt-0.5">% de directivos con incremento (ΔP ≥ 0.5) por gestión según observadores</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Meta: 80%</p>
              <p className="text-xs text-muted-foreground">Línea base: 0%</p>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Global (todas las gestiones)</span>
              <span className={`text-sm font-bold ${agg.globalPctPositiveObserver >= 80 ? "text-emerald-600" : agg.globalPctPositiveObserver >= 50 ? "text-amber-600" : "text-destructive"}`}>
                {agg.globalPctPositiveObserver.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${agg.globalPctPositiveObserver >= 80 ? "bg-emerald-500" : agg.globalPctPositiveObserver >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                style={{ width: `${Math.min(agg.globalPctPositiveObserver, 100)}%` }}
              />
              <div className="absolute inset-y-0 border-r-2 border-dashed border-foreground/40" style={{ left: "80%" }} />
            </div>
            <p className="text-xs text-muted-foreground">{agg.countPositiveObs} / {agg.countBothPhases} directivos con incremento</p>
          </div>

          <div className="grid gap-2">
            {agg.domainIncrementPctsObserver.map((d) => (
              <div key={d.domain} className="rounded-md border p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{d.domainLabel}</span>
                  <span className={`text-xs font-bold ${d.pctPositive >= 80 ? "text-emerald-600" : d.pctPositive >= 50 ? "text-amber-600" : "text-destructive"}`}>
                    {d.pctPositive.toFixed(1)}%
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${d.pctPositive >= 80 ? "bg-emerald-500" : d.pctPositive >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                    style={{ width: `${Math.min(d.pctPositive, 100)}%` }}
                  />
                  <div className="absolute inset-y-0 border-r-2 border-dashed border-foreground/30" style={{ left: "80%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{d.countPositive} / {d.countTotal} directivos</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Domain delta bar chart */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Progresión promedio por Dominio</h4>
          <div ref={domainChartRef}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={domainChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Δ Auto" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Δ Internos" fill="hsl(var(--muted-foreground))" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Δ Externos" fill="hsl(var(--accent-foreground))" radius={[0, 3, 3, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Domain table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Deltas promedio por Dominio</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dominio</TableHead>
                <TableHead className="text-center">Δ Auto</TableHead>
                <TableHead className="text-center">Δ Internos</TableHead>
                <TableHead className="text-center">Δ Externos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agg.domainDeltas.map((d) => (
                <TableRow key={d.domain}>
                  <TableCell className="text-sm font-medium">{d.domainLabel}</TableCell>
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaAuto} pct={d.avgInicialAuto ? (d.avgDeltaAuto / d.avgInicialAuto) * 100 : null} /></TableCell>
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaInternos} pct={d.avgInicialInternos ? (d.avgDeltaInternos / d.avgInicialInternos) * 100 : null} /></TableCell>
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaExternos} pct={d.avgInicialExternos ? (d.avgDeltaExternos / d.avgInicialExternos) * 100 : null} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Radar chart */}
      {radarData.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Comparación Inicial vs Final por Competencia</h4>
            <div ref={radarChartRef}>
              <ResponsiveContainer width="100%" height={380}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="competency" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 9 }} />
                  <Radar name="Inicial Auto" dataKey="Inicial Auto" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} strokeDasharray="4 4" />
                  <Radar name="Final Auto" dataKey="Final Auto" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                  <Radar name="Inicial Obs." dataKey="Inicial Obs." stroke="hsl(var(--accent-foreground))" fill="none" strokeDasharray="4 4" opacity={0.5} />
                  <Radar name="Final Obs." dataKey="Final Obs." stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent-foreground))" fillOpacity={0.1} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competency delta bar chart */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Deltas promedio por Competencia</h4>
          <div ref={competencyChartRef}>
            <ResponsiveContainer width="100%" height={Math.max(300, agg.competencyDeltas.length * 28)}>
              <BarChart data={competencyBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Δ Auto" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Δ Obs." fill="hsl(var(--muted-foreground))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Competency detail table */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Detalle por Competencia</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competencia</TableHead>
                <TableHead className="text-center">Ini. Auto</TableHead>
                <TableHead className="text-center">Fin. Auto</TableHead>
                <TableHead className="text-center">Δ Auto</TableHead>
                <TableHead className="text-center">Ini. Obs.</TableHead>
                <TableHead className="text-center">Fin. Obs.</TableHead>
                <TableHead className="text-center">Δ Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agg.competencyDeltas.map((c) => (
                <TableRow key={c.competency}>
                  <TableCell className="text-sm">{c.competencyLabel}</TableCell>
                  <TableCell className="text-center text-xs">{c.avgInicialAuto.toFixed(2)}</TableCell>
                  <TableCell className="text-center text-xs">{c.avgFinalAuto.toFixed(2)}</TableCell>
                  <TableCell className="text-center"><DeltaBadge value={c.avgDeltaAuto} pct={c.avgInicialAuto ? (c.avgDeltaAuto / c.avgInicialAuto) * 100 : null} /></TableCell>
                  <TableCell className="text-center text-xs">{c.avgInicialObs.toFixed(2)}</TableCell>
                  <TableCell className="text-center text-xs">{c.avgFinalObs.toFixed(2)}</TableCell>
                  <TableCell className="text-center"><DeltaBadge value={c.avgDeltaObs} pct={c.avgInicialObs ? (c.avgDeltaObs / c.avgInicialObs) * 100 : null} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
