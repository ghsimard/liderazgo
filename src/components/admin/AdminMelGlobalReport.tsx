import { useState, useEffect, useMemo } from "react";
import { calcularMelAnalysis, type MelAnalysisData, type MelDomainDelta, type MelCompetencyDelta } from "@/utils/reporte360MelCalculator";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface AggregatedMel {
  count: number;
  countWithData: number;
  countPositiveAuto: number;
  countPositiveObs: number;
  avgDeltaAuto: number;
  avgDeltaObserver: number;
  domainDeltas: { domain: string; domainLabel: string; avgDeltaAuto: number; avgDeltaInternos: number; avgDeltaExternos: number }[];
  competencyDeltas: { competency: string; competencyLabel: string; avgInicialAuto: number; avgFinalAuto: number; avgDeltaAuto: number; avgInicialObs: number; avgFinalObs: number; avgDeltaObs: number }[];
}

function DeltaBadge({ value }: { value: number }) {
  if (Math.abs(value) < 0.01) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> 0.00</span>;
  }
  if (value > 0) {
    return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp className="w-3 h-3" /> +{value.toFixed(2)}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium"><TrendingDown className="w-3 h-3" /> {value.toFixed(2)}</span>;
}

function aggregate(results: MelAnalysisData[]): AggregatedMel {
  const withData = results.filter((r) => r.hasInicial || r.hasFinal);
  const bothPhases = results.filter((r) => r.hasInicial && r.hasFinal);

  const avgDeltaAuto = bothPhases.length > 0 ? bothPhases.reduce((s, r) => s + r.globalDeltaAuto, 0) / bothPhases.length : 0;
  const avgDeltaObserver = bothPhases.length > 0 ? bothPhases.reduce((s, r) => s + r.globalDeltaObserver, 0) / bothPhases.length : 0;

  // Domain aggregation
  const domainMap = new Map<string, { label: string; sumAuto: number; sumInt: number; sumExt: number; n: number }>();
  for (const r of bothPhases) {
    for (const d of r.domainDeltas) {
      const entry = domainMap.get(d.domain) || { label: d.domainLabel, sumAuto: 0, sumInt: 0, sumExt: 0, n: 0 };
      entry.sumAuto += d.deltaAuto;
      entry.sumInt += d.deltaInternos;
      entry.sumExt += d.deltaExternos;
      entry.n++;
      domainMap.set(d.domain, entry);
    }
  }
  const domainDeltas = [...domainMap.entries()].map(([domain, v]) => ({
    domain,
    domainLabel: v.label,
    avgDeltaAuto: v.n > 0 ? v.sumAuto / v.n : 0,
    avgDeltaInternos: v.n > 0 ? v.sumInt / v.n : 0,
    avgDeltaExternos: v.n > 0 ? v.sumExt / v.n : 0,
  }));

  // Competency aggregation
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

  return {
    count: results.length,
    countWithData: withData.length,
    countPositiveAuto: bothPhases.filter((r) => r.globalDeltaAuto > 0).length,
    countPositiveObs: bothPhases.filter((r) => r.globalDeltaObserver > 0).length,
    avgDeltaAuto,
    avgDeltaObserver,
    domainDeltas,
    competencyDeltas,
  };
}

export default function AdminMelGlobalReport({ directivos }: { directivos: DirectivoOption[] }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [agg, setAgg] = useState<AggregatedMel | null>(null);

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

  if (!agg && !loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <BarChart3 className="w-10 h-10 text-primary mx-auto opacity-60" />
          <div>
            <p className="text-sm font-medium">Rapport global MEL</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrège les deltas de progression de {directivos.length} directivo(s) filtrés.
            </p>
          </div>
          <Button onClick={handleGenerate} disabled={directivos.length === 0} className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Générer le rapport global
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm font-medium text-center">Analyse en cours…</p>
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {progress.current} / {progress.total} directivo(s)
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!agg) return null;

  const bothCount = agg.countPositiveAuto + (agg.countWithData - agg.countPositiveAuto); // total with both phases is implicit

  // Chart data
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

      {/* Domain delta bar chart */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Progresión promedio por Dominio</h4>
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
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaAuto} /></TableCell>
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaInternos} /></TableCell>
                  <TableCell className="text-center"><DeltaBadge value={d.avgDeltaExternos} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Radar chart — Inicial vs Final */}
      {radarData.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Comparación Inicial vs Final por Competencia</h4>
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
          </CardContent>
        </Card>
      )}

      {/* Competency delta bar chart */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Deltas promedio por Competencia</h4>
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
                  <TableCell className="text-center"><DeltaBadge value={c.avgDeltaAuto} /></TableCell>
                  <TableCell className="text-center text-xs">{c.avgInicialObs.toFixed(2)}</TableCell>
                  <TableCell className="text-center text-xs">{c.avgFinalObs.toFixed(2)}</TableCell>
                  <TableCell className="text-center"><DeltaBadge value={c.avgDeltaObs} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          Recalcular
        </Button>
      </div>
    </div>
  );
}
