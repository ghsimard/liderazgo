import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { calcularMelAnalysis, type MelAnalysisData } from "@/utils/reporte360MelCalculator";
import { genderizeRole } from "@/utils/genderizeRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Filter, TrendingUp, TrendingDown, Minus, BarChart3, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DirectivoOption {
  nombre: string;
  institucion: string;
  cargo: string;
  genero: string | null;
  region: string;
  entidad_territorial: string;
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

function MelDetailDialog({ open, onOpenChange, data }: { open: boolean; onOpenChange: (v: boolean) => void; data: MelAnalysisData | null }) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análisis MEL — {data.directivoNombre}</DialogTitle>
          <p className="text-sm text-muted-foreground">{data.institucion}</p>
        </DialogHeader>

        {/* Global summary */}
        <div className="grid grid-cols-2 gap-4 my-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Δ Autoevaluación Global</p>
              <DeltaBadge value={data.globalDeltaAuto} />
              <div className="text-xs text-muted-foreground mt-1">
                {data.inicial?.autoAvg.toFixed(2) ?? "—"} → {data.final?.autoAvg.toFixed(2) ?? "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Δ Observadores Global</p>
              <DeltaBadge value={data.globalDeltaObserver} />
              <div className="text-xs text-muted-foreground mt-1">
                {data.inicial?.observerAvg.toFixed(2) ?? "—"} → {data.final?.observerAvg.toFixed(2) ?? "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Domain deltas */}
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
                <TableCell className="text-center"><DeltaBadge value={d.deltaAuto} /></TableCell>
                <TableCell className="text-center"><DeltaBadge value={d.deltaInternos} /></TableCell>
                <TableCell className="text-center"><DeltaBadge value={d.deltaExternos} /></TableCell>
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
                <TableCell className="text-center"><DeltaBadge value={c.deltaAuto} /></TableCell>
                <TableCell className="text-center text-xs">{c.inicialObserver.toFixed(2)}</TableCell>
                <TableCell className="text-center text-xs">{c.finalObserver.toFixed(2)}</TableCell>
                <TableCell className="text-center"><DeltaBadge value={c.deltaObserver} /></TableCell>
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
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [melData, setMelData] = useState<MelAnalysisData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        toast({ title: "Sin datos", description: "No hay encuestas 360° para este directivo.", variant: "destructive" });
      } else {
        setMelData(data);
        setDialogOpen(true);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setAnalyzing(null);
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
      <div className="bg-accent/50 border border-accent rounded-lg p-4 text-sm text-muted-foreground">
        <p><strong>Análisis MEL</strong> — Monitoring, Evaluation & Learning. Compare les scores 360° entre la phase initiale et finale pour mesurer la progression de chaque directivo.</p>
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

      {/* Directivos list */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {filteredDirectivos.length} directivo(s) {hasFilters ? "filtrado(s)" : "registrado(s)"}
        </p>
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

      <MelDetailDialog open={dialogOpen} onOpenChange={setDialogOpen} data={melData} />
    </div>
  );
}
