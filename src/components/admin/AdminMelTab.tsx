import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { calcularMelAnalysis, type MelAnalysisData } from "@/utils/reporte360MelCalculator";
import { genderizeRole } from "@/utils/genderizeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Filter, TrendingUp, TrendingDown, Minus, BarChart3, Eye, Download, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { useAppImages } from "@/hooks/useAppImages";
import { generarMelPDF } from "@/utils/reporte360MelPdfGenerator";
import { Progress } from "@/components/ui/progress";
import JSZip from "jszip";
import AdminMelGlobalReport from "./AdminMelGlobalReport";

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

function calcPct(initial: number, delta: number): number | null {
  if (initial === 0) return null;
  return (delta / initial) * 100;
}

function MelDetailDialog({ open, onOpenChange, data, images, regionName }: { open: boolean; onOpenChange: (v: boolean) => void; data: MelAnalysisData | null; images: Record<string, string>; regionName?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [logoConfig, setLogoConfig] = useState<{ showRLT: boolean; showCLT: boolean }>({ showRLT: true, showCLT: true });

  useEffect(() => {
    const fetch = async () => {
      if (!regionName) { setLogoConfig({ showRLT: true, showCLT: true }); return; }
      const { data: r } = await supabase.from("regiones").select("mostrar_logo_rlt, mostrar_logo_clt").eq("nombre", regionName).maybeSingle();
      setLogoConfig(r ? { showRLT: r.mostrar_logo_rlt, showCLT: r.mostrar_logo_clt } : { showRLT: true, showCLT: true });
    };
    if (open) fetch();
  }, [regionName, open]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await generarMelPDF(data, {
        logoRLT: images.logo_rlt_white || images.logo_rlt,
        logoCLT: images.logo_clt || images.logo_clt_white,
        showRLT: logoConfig.showRLT,
        showCLT: logoConfig.showCLT,
      });
    } catch (err: any) {
      console.error("PDF generation error:", err);
    }
    setDownloading(false);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <div>
            <DialogTitle>Análisis MEL — {data.directivoNombre}</DialogTitle>
            <p className="text-sm text-muted-foreground">{data.institucion}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloading} className="gap-1.5 shrink-0">
            {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </Button>
        </DialogHeader>

        {/* Global summary */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Δ Autoevaluación Global</p>
              <DeltaBadge value={data.globalDeltaAuto} pct={calcPct(data.inicial?.autoAvg ?? 0, data.globalDeltaAuto)} />
              <div className="text-xs text-muted-foreground mt-1">
                {data.inicial?.autoAvg.toFixed(2) ?? "—"} → {data.final?.autoAvg.toFixed(2) ?? "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Δ Observadores Global</p>
              <DeltaBadge value={data.globalDeltaObserver} pct={calcPct(data.inicial?.observerAvg ?? 0, data.globalDeltaObserver)} />
              <div className="text-xs text-muted-foreground mt-1">
                {data.inicial?.observerAvg.toFixed(2) ?? "—"} → {data.final?.observerAvg.toFixed(2) ?? "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Note: validation criterion */}
        {data.hasInicial && data.hasFinal && (
          <div className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm ${
            data.globalDeltaAuto >= 0.5 ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}>
            <span className="font-semibold">{data.globalDeltaAuto >= 0.5 ? "" : ""}</span>
            <span>
              {data.globalDeltaAuto >= 0.5
                ? "✓ Cumple criterio MEL (ΔP ≥ 0,5 puntos en evaluación)."
                : "✗ No cumple criterio MEL (ΔP < 0,5 puntos en evaluación)."}
            </span>
          </div>
        )}

        {/* MEL Indicator: increment per domain */}
        {data.hasInicial && data.hasFinal && (
          <Card className="my-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Indicador: Incremento por Gestión</h4>
                  <p className="text-xs text-muted-foreground">Progresión del puntaje promedio (auto) por dominio</p>
                </div>
              </div>
              <div className="grid gap-2">
                {data.domainDeltas.map((d) => {
                  const hasIncrement = d.deltaAuto > 0;
                  return (
                    <div key={d.domain} className="flex items-center gap-3 rounded-md border p-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasIncrement ? "bg-emerald-500" : "bg-destructive"}`} />
                      <span className="text-xs font-medium flex-1">{d.domainLabel}</span>
                      <DeltaBadge value={d.deltaAuto} pct={calcPct(d.inicialAuto, d.deltaAuto)} />
                      <span className={`text-xs font-bold ${hasIncrement ? "text-emerald-600" : "text-destructive"}`}>
                        {hasIncrement ? "✓ Incremento" : "✗ Sin incremento"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {data.domainDeltas.filter(d => d.deltaAuto > 0).length} / {data.domainDeltas.length} dominios con incremento positivo
              </p>
            </CardContent>
          </Card>
        )}

        {/* Observer indicators (internos / externos) */}
        {data.hasInicial && data.hasFinal && [
          { title: "Internos (Pares, Docentes, Administrativos)", getter: (d: typeof data.domainDeltas[0]) => d.deltaInternos, initialGetter: (d: typeof data.domainDeltas[0]) => d.inicialInternos },
          { title: "Externos (Estudiantes, Acudientes)", getter: (d: typeof data.domainDeltas[0]) => d.deltaExternos, initialGetter: (d: typeof data.domainDeltas[0]) => d.inicialExternos },
        ].map((section) => (
          <Card key={section.title} className="my-2">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Indicador: {section.title}</h4>
                  <p className="text-xs text-muted-foreground">Progresión según observadores por dominio</p>
                </div>
                
              </div>
              <div className="grid gap-2">
                {data.domainDeltas.map((d) => {
                  const delta = section.getter(d);
                  const hasInc = delta > 0;
                  return (
                    <div key={d.domain} className="flex items-center gap-3 rounded-md border p-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasInc ? "bg-emerald-500" : "bg-destructive"}`} />
                      <span className="text-xs font-medium flex-1">{d.domainLabel}</span>
                      <DeltaBadge value={delta} pct={calcPct(section.initialGetter(d), delta)} />
                      <span className={`text-xs font-bold ${hasInc ? "text-emerald-600" : "text-destructive"}`}>
                        {hasInc ? "✓" : "✗"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {data.domainDeltas.filter(d => section.getter(d) > 0).length} / {data.domainDeltas.length} dominios con incremento
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Domain delta bar chart */}
        {data.hasInicial && data.hasFinal && (() => {
          const domainChartData = data.domainDeltas.map((d) => ({
            name: d.domainLabel.length > 25 ? d.domainLabel.substring(0, 23) + "…" : d.domainLabel,
            "Δ Auto": +d.deltaAuto.toFixed(2),
            "Δ Internos": +d.deltaInternos.toFixed(2),
            "Δ Externos": +d.deltaExternos.toFixed(2),
          }));
          return (
            <Card className="my-4">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Progresión por Dominio</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={domainChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Δ Auto" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="Δ Internos" fill="hsl(var(--muted-foreground))" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="Δ Externos" fill="hsl(160, 60%, 45%)" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })()}

        {/* Radar chart: competency initial vs final */}
        {data.hasInicial && data.hasFinal && data.competencyDeltas.length > 0 && (() => {
          const radarData = data.competencyDeltas.map((c) => ({
            competency: c.competencyLabel,
            "Inicial Auto": +c.inicialAuto.toFixed(2),
            "Final Auto": +c.finalAuto.toFixed(2),
            "Inicial Obs.": +c.inicialObserver.toFixed(2),
            "Final Obs.": +c.finalObserver.toFixed(2),
          }));
          return (
            <Card className="my-4">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold">Comparación Inicial vs Final por Competencia</h4>
                <ResponsiveContainer width="100%" height={450}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="60%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 8, fill: "hsl(var(--foreground))" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 9 }} />
                    <Radar name="Inicial Auto" dataKey="Inicial Auto" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.1} strokeWidth={2} strokeDasharray="6 3" />
                    <Radar name="Final Auto" dataKey="Final Auto" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Radar name="Inicial Obs." dataKey="Inicial Obs." stroke="hsl(160, 60%, 45%)" fill="hsl(160, 60%, 45%)" fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 3" />
                    <Radar name="Final Obs." dataKey="Final Obs." stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.12} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })()}

        {/* Domain deltas table */}
        <h4 className="text-sm font-semibold mb-2">Deltas por Dominio</h4>
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
            {data.domainDeltas.map((d) => (
              <TableRow key={d.domain}>
                <TableCell className="text-sm font-medium">{d.domainLabel}</TableCell>
                <TableCell className="text-center"><DeltaBadge value={d.deltaAuto} pct={calcPct(d.inicialAuto, d.deltaAuto)} /></TableCell>
                <TableCell className="text-center"><DeltaBadge value={d.deltaInternos} pct={calcPct(d.inicialInternos, d.deltaInternos)} /></TableCell>
                <TableCell className="text-center"><DeltaBadge value={d.deltaExternos} pct={calcPct(d.inicialExternos, d.deltaExternos)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Competency deltas */}
        <h4 className="text-sm font-semibold mb-2 mt-4">Deltas por Competencia</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competencia</TableHead>
              <TableHead className="text-center">Inicial Auto</TableHead>
              <TableHead className="text-center">Final Auto</TableHead>
              <TableHead className="text-center">Δ Auto</TableHead>
              <TableHead className="text-center">Inicial Obs.</TableHead>
              <TableHead className="text-center">Final Obs.</TableHead>
              <TableHead className="text-center">Δ Obs.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.competencyDeltas.map((c) => (
              <TableRow key={c.competency}>
                <TableCell className="text-sm">{c.competencyLabel}</TableCell>
                <TableCell className="text-center text-xs">{c.inicialAuto.toFixed(2)}</TableCell>
                <TableCell className="text-center text-xs">{c.finalAuto.toFixed(2)}</TableCell>
                <TableCell className="text-center"><DeltaBadge value={c.deltaAuto} pct={calcPct(c.inicialAuto, c.deltaAuto)} /></TableCell>
                <TableCell className="text-center text-xs">{c.inicialObserver.toFixed(2)}</TableCell>
                <TableCell className="text-center text-xs">{c.finalObserver.toFixed(2)}</TableCell>
                <TableCell className="text-center"><DeltaBadge value={c.deltaObserver} pct={calcPct(c.inicialObserver, c.deltaObserver)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminMelTab() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [melData, setMelData] = useState<MelAnalysisData | null>(null);
  const [melRegion, setMelRegion] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<"individual" | "global">("individual");

  // Filters
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selInstituciones, setSelInstituciones] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setSelEntidades([]); setSelInstituciones([]); }, [selRegions]);
  useEffect(() => { setSelInstituciones([]); }, [selEntidades]);

  const loadData = async () => {
    setLoading(true);
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombres_apellidos, nombre_ie, cargo_actual, genero, region, entidad_territorial")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    setDirectivos(
      (fichas ?? []).map((f) => ({
        nombre: f.nombres_apellidos,
        institucion: f.nombre_ie,
        cargo: f.cargo_actual,
        genero: f.genero ?? null,
        region: f.region ?? "",
        entidad_territorial: f.entidad_territorial ?? "",
      }))
    );
    setLoading(false);
  };

  const regionOptions = useMemo(() => {
    const vals = [...new Set(directivos.map((d) => d.region).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos]);

  const entidadOptions = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    const vals = [...new Set(pool.map((d) => d.entidad_territorial).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos, selRegions]);

  const institucionOptions = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    const vals = [...new Set(pool.map((d) => d.institucion).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos, selRegions, selEntidades]);

  const filteredDirectivos = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    if (selInstituciones.length > 0) pool = pool.filter((d) => selInstituciones.includes(d.institucion));
    return pool;
  }, [directivos, selRegions, selEntidades, selInstituciones]);

  const handleAnalyze = async (d: DirectivoOption) => {
    setAnalyzing(d.nombre);
    try {
      const data = await calcularMelAnalysis(d.nombre, d.institucion);
      if (!data.hasInicial && !data.hasFinal) {
        toast({ title: "Sin datos", description: "No hay encuestas 360° para este par.", variant: "destructive" });
      } else {
        setMelData(data);
        setMelRegion(d.region);
        setDialogOpen(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setAnalyzing(null);
  };

  const handleBulkExport = async () => {
    if (filteredDirectivos.length === 0) return;
    setBulkExporting(true);
    setBulkProgress({ current: 0, total: filteredDirectivos.length });
    const zip = new JSZip();
    const baseLogos = {
      logoRLT: images.logo_rlt_white || images.logo_rlt,
      logoCLT: images.logo_clt || images.logo_clt_white,
    };

    // Pre-fetch region logo configs
    const uniqueRegions = [...new Set(filteredDirectivos.map(d => d.region).filter(Boolean))];
    const regionConfigs = new Map<string, { showRLT: boolean; showCLT: boolean }>();
    for (const rName of uniqueRegions) {
      const { data: r } = await supabase.from("regiones").select("mostrar_logo_rlt, mostrar_logo_clt").eq("nombre", rName).maybeSingle();
      regionConfigs.set(rName, r ? { showRLT: r.mostrar_logo_rlt, showCLT: r.mostrar_logo_clt } : { showRLT: true, showCLT: true });
    }

    let generated = 0;

    for (const d of filteredDirectivos) {
      try {
        const data = await calcularMelAnalysis(d.nombre, d.institucion);
        const rc = regionConfigs.get(d.region) || { showRLT: true, showCLT: true };
        if (data.hasInicial || data.hasFinal) {
          const blob = await generarMelPDF(data, { ...baseLogos, ...rc }, { returnBlob: true });
          if (blob) {
            const safeName = d.nombre.replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, "").replace(/\s+/g, "_");
            zip.file(`MEL_${safeName}.pdf`, blob);
            generated++;
          }
        }
      } catch (err) {
        console.warn(`MEL skip ${d.nombre}:`, err);
      }
      setBulkProgress((p) => ({ ...p, current: p.current + 1 }));
    }

    if (generated === 0) {
      toast({ title: "Sin datos", description: "Ningún par tiene datos MEL disponibles.", variant: "destructive" });
    } else {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const regionLabel = selRegions.length === 1 ? selRegions[0].replace(/\s+/g, "_") : "Seleccion";
      a.download = `MEL_${regionLabel}_${generated}informes.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP descargado", description: `${generated} informe(s) MEL exportado(s).` });
    }
    setBulkExporting(false);
  };

  const hasFilters = selRegions.length > 0 || selEntidades.length > 0 || selInstituciones.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="bg-accent/50 border border-accent rounded-lg p-4 text-sm text-muted-foreground flex-1">
          <p><strong>Análisis MEL</strong> — Monitoring, Evaluation & Learning. Compara los puntajes 360° entre la fase inicial y final para medir la progresión.</p>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode("individual")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "individual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Individual
        </button>
        <button
          onClick={() => setViewMode("global")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "global" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Informe global
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <button onClick={() => { setSelRegions([]); setSelEntidades([]); setSelInstituciones([]); }} className="text-xs text-muted-foreground hover:text-foreground underline ml-auto">
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Región</label>
              <MultiSelect options={regionOptions} selected={selRegions} onChange={setSelRegions} placeholder="Todas las regiones" className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect options={entidadOptions} selected={selEntidades} onChange={setSelEntidades} placeholder="Todas las entidades" className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución</label>
              <MultiSelect options={institucionOptions} selected={selInstituciones} onChange={setSelInstituciones} placeholder="Todas las instituciones" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "global" ? (
        <AdminMelGlobalReport directivos={filteredDirectivos} filterLabel={selRegions.length > 0 ? selRegions.join(", ") : undefined} selectedRegions={selRegions} />
      ) : (
        <>
          {/* Bulk export + Directivos list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredDirectivos.length} directivo(s) {hasFilters ? "filtrado(s)" : "registrado(s)"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                disabled={bulkExporting || filteredDirectivos.length === 0}
                className="gap-1.5"
              >
                {bulkExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                Exportar ZIP ({filteredDirectivos.length})
              </Button>
            </div>
            {bulkExporting && (
              <div className="space-y-1">
                <Progress value={(bulkProgress.current / bulkProgress.total) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {bulkProgress.current} / {bulkProgress.total} directivo(s) procesado(s)…
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDirectivos.map((d) => (
                <Card key={d.nombre + d.institucion} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.institucion}</p>
                      <p className="text-xs text-muted-foreground">{genderizeRole(d.cargo, d.genero)} · {d.region}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyze(d)}
                      disabled={analyzing === d.nombre}
                      className="gap-1 text-xs shrink-0"
                    >
                      {analyzing === d.nombre ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      Analizar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <MelDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} data={melData} images={images} regionName={melRegion} />
        </>
      )}
    </div>
  );
}
