import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { calcularMelRubricas, NIVEL_LABELS, type MelRubricaData, type DirectivoRubricaResult, type MelRubricaKPIs } from "@/utils/melRubricaCalculator";
import { generarMelRubricasPDF } from "@/utils/melRubricaPdfGenerator";
import { useAppImages } from "@/hooks/useAppImages";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Filter, Target, CheckCircle2, XCircle, BarChart3, Download } from "lucide-react";

interface DirectivoOption {
  nombre: string;
  institucion: string;
  cedula: string;
  region: string;
  entidad_territorial: string;
}

function KpiCard({ title, description, kpi, colorClass }: {
  title: string;
  description: string;
  kpi: MelRubricaKPIs["kpi1"];
  colorClass: string;
}) {
  const metReached = kpi.percentage >= kpi.meta;
  return (
    <Card className={`border-l-4 ${colorClass}`}>
      <CardContent className="p-4 space-y-3">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className={`text-3xl font-bold ${metReached ? "text-emerald-600" : "text-amber-600"}`}>
              {kpi.percentage.toFixed(1)}%
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {kpi.numerator} / {kpi.denominator} rectores
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Meta:</span>
            <span className={`text-sm font-bold ml-1 ${metReached ? "text-emerald-600" : "text-destructive"}`}>
              {kpi.meta}%
            </span>
          </div>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${metReached ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${Math.min(kpi.percentage, 100)}%` }}
          />
          <div
            className="absolute inset-y-0 border-r-2 border-dashed border-foreground/40"
            style={{ left: `${kpi.meta}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-xs text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    avanzado: "bg-emerald-100 text-emerald-800 border-emerald-300",
    intermedio: "bg-blue-100 text-blue-800 border-blue-300",
    basico: "bg-amber-100 text-amber-800 border-amber-300",
    sin_evidencia: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[nivel] || ""}`}>
      {NIVEL_LABELS[nivel] || nivel}
    </Badge>
  );
}

export default function AdminMelRubricasTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [melData, setMelData] = useState<MelRubricaData | null>(null);

  // Filters
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selInstituciones, setSelInstituciones] = useState<string[]>([]);

  useEffect(() => { loadDirectivos(); }, []);
  useEffect(() => { setSelEntidades([]); setSelInstituciones([]); }, [selRegions]);
  useEffect(() => { setSelInstituciones([]); }, [selEntidades]);

  const loadDirectivos = async () => {
    setLoading(true);
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("numero_cedula, nombres_apellidos, nombre_ie, region, entidad_territorial, cargo_actual")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    setDirectivos(
      (fichas ?? []).filter(f => f.numero_cedula).map((f) => ({
        nombre: f.nombres_apellidos,
        institucion: f.nombre_ie,
        cedula: f.numero_cedula!,
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

  const filteredCedulas = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    if (selInstituciones.length > 0) pool = pool.filter((d) => selInstituciones.includes(d.institucion));
    return pool.map((d) => d.cedula);
  }, [directivos, selRegions, selEntidades, selInstituciones]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const data = await calcularMelRubricas(filteredCedulas.length > 0 ? filteredCedulas : undefined);
      // Apply region/ET/institution filter on results too
      let filtered = data.directivos;
      if (selRegions.length > 0) filtered = filtered.filter((d) => selRegions.includes(d.region));
      if (selEntidades.length > 0) filtered = filtered.filter((d) => selEntidades.includes(d.entidadTerritorial));
      if (selInstituciones.length > 0) filtered = filtered.filter((d) => selInstituciones.includes(d.institucion));

      // Recalculate KPIs with filtered set
      const kpi1Eligible = filtered.filter((r) => r.kpi1ModulesCount >= 3);
      const kpi1Pass = kpi1Eligible.filter((r) => r.kpi1Cumple);
      const kpi2aEligible = filtered.filter((r) => r.kpi2aHasMod1);
      const kpi2aPass = kpi2aEligible.filter((r) => r.kpi2aCumple);
      const kpi2bEligible = filtered.filter((r) => r.kpi2bHasMod2);
      const kpi2bPass = kpi2bEligible.filter((r) => r.kpi2bCumple);
      const kpi3Eligible = filtered.filter((r) => r.kpi3HasMod3);
      const kpi3Pass = kpi3Eligible.filter((r) => r.kpi3Cumple);

      setMelData({
        directivos: filtered,
        kpis: {
          kpi1: { numerator: kpi1Pass.length, denominator: kpi1Eligible.length, percentage: kpi1Eligible.length > 0 ? (kpi1Pass.length / kpi1Eligible.length) * 100 : 0, meta: 85 },
          kpi2a: { numerator: kpi2aPass.length, denominator: kpi2aEligible.length, percentage: kpi2aEligible.length > 0 ? (kpi2aPass.length / kpi2aEligible.length) * 100 : 0, meta: 80 },
          kpi2b: { numerator: kpi2bPass.length, denominator: kpi2bEligible.length, percentage: kpi2bEligible.length > 0 ? (kpi2bPass.length / kpi2bEligible.length) * 100 : 0, meta: 80 },
          kpi3: { numerator: kpi3Pass.length, denominator: kpi3Eligible.length, percentage: kpi3Eligible.length > 0 ? (kpi3Pass.length / kpi3Eligible.length) * 100 : 0, meta: 80 },
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCalculating(false);
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
        <p><strong>MEL Rúbricas</strong> — Indicadores de evaluación basados en los niveles de competencia alcanzados en los 4 módulos de rúbrica.</p>
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

      {/* Generate button */}
      {!melData && !calculating && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Target className="w-10 h-10 text-primary mx-auto opacity-60" />
            <div>
              <p className="text-sm font-medium">Indicadores MEL Rúbricas</p>
              <p className="text-xs text-muted-foreground mt-1">
                Calcula los 3 indicadores de evaluación para {filteredCedulas.length} directivo(s).
              </p>
            </div>
            <Button onClick={handleCalculate} disabled={filteredCedulas.length === 0} className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Calcular indicadores
            </Button>
          </CardContent>
        </Card>
      )}

      {calculating && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-sm font-medium text-center">Calculando indicadores…</p>
            <Progress value={50} className="h-2" />
          </CardContent>
        </Card>
      )}

      {melData && !calculating && (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {melData.directivos.length} directivo(s) con datos de rúbricas
            </p>
            <Button variant="ghost" size="sm" onClick={handleCalculate} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              Recalcular
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Indicador 1: Nivel Intermedio/Avanzado"
              description="% de rectores que alcanzan nivel intermedio o avanzado en ≥3 de los 4 módulos"
              kpi={melData.kpis.kpi1}
              colorClass="border-l-yellow-400"
            />
            <KpiCard
              title="Indicador 2a: Autoconocimiento"
              description="% de rectores con nivel avanzado en Módulo 1 (autoconocimiento)"
              kpi={melData.kpis.kpi2a}
              colorClass="border-l-slate-400"
            />
            <KpiCard
              title="Indicador 2b: Comunicación Asertiva"
              description="% de rectores con nivel avanzado en Módulo 2 (comunicación asertiva)"
              kpi={melData.kpis.kpi2b}
              colorClass="border-l-blue-400"
            />
            <KpiCard
              title="Indicador 3: Trabajo Colaborativo"
              description="% de rectores con nivel avanzado en Módulo 3 (trabajo colaborativo)"
              kpi={melData.kpis.kpi3}
              colorClass="border-l-green-400"
            />
          </div>

          {/* Individual results table */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold">Resultados individuales</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Directivo</TableHead>
                      <TableHead>Institución</TableHead>
                      <TableHead className="text-center">Mod. 1</TableHead>
                      <TableHead className="text-center">Mod. 2</TableHead>
                      <TableHead className="text-center">Mod. 3</TableHead>
                      <TableHead className="text-center">Mod. 4</TableHead>
                      <TableHead className="text-center">Ind. 1</TableHead>
                      <TableHead className="text-center">Ind. 2a</TableHead>
                      <TableHead className="text-center">Ind. 2b</TableHead>
                      <TableHead className="text-center">Ind. 3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {melData.directivos.map((d) => (
                      <TableRow key={d.cedula}>
                        <TableCell className="text-sm font-medium">{d.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{d.institucion}</TableCell>
                        {[1, 2, 3, 4].map((mod) => (
                          <TableCell key={mod} className="text-center">
                            <NivelBadge nivel={d.moduleLevels[mod]} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          {d.kpi1ModulesCount >= 3 ? (
                            d.kpi1Cumple ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-destructive mx-auto" />
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.kpi2aHasMod1 ? (
                            d.kpi2aCumple ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-destructive mx-auto" />
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.kpi2bHasMod2 ? (
                            d.kpi2bCumple ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-destructive mx-auto" />
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {d.kpi3HasMod3 ? (
                            d.kpi3Cumple ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" /> : <XCircle className="w-4 h-4 text-destructive mx-auto" />
                          ) : <span className="text-xs text-muted-foreground">N/A</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {melData.directivos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                          No hay datos de rúbricas para los directivos seleccionados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
