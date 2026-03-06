import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Filter, TrendingUp, TrendingDown, Minus, Download, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Types ──

interface DirectivoInfo {
  nombre: string;
  cedula: string;
  institucion: string;
  cargo: string;
  genero: string | null;
  region: string;
  entidad_territorial: string;
}

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  sort_order: number;
}

interface EvalRow {
  item_id: string;
  directivo_cedula: string;
  directivo_nivel: string | null;
  equipo_nivel: string | null;
  acordado_nivel: string | null;
}

interface SeguimientoRow {
  item_id: string;
  directivo_cedula: string;
  nivel: string | null;
  module_number: number;
  created_at: string;
}

const NIVEL_MAP: Record<string, number> = {
  sin_evidencia: 1,
  basico: 2,
  intermedio: 3,
  avanzado: 4,
};

const NIVEL_LABELS: Record<string, string> = {
  sin_evidencia: "Sin evidencia",
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const NIVEL_COLORS: Record<string, string> = {
  sin_evidencia: "bg-destructive text-destructive-foreground",
  basico: "bg-amber-500 text-white",
  intermedio: "bg-blue-500 text-white",
  avanzado: "bg-emerald-600 text-white",
};

function nivelToNum(nivel: string | null): number | null {
  if (!nivel) return null;
  return NIVEL_MAP[nivel] ?? null;
}

function numToLabel(n: number): string {
  const entry = Object.entries(NIVEL_MAP).find(([, v]) => v === n);
  return entry ? NIVEL_LABELS[entry[0]] : String(n);
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

// ── Report labels ──

const REPORT_LABELS = [
  { key: "1", label: "Rapport 1", subtitle: "Rúbrica Módulo 1 + 360° Inicial" },
  { key: "2", label: "Rapport 2", subtitle: "Rúbrica Módulo 2" },
  { key: "3", label: "Rapport 3", subtitle: "Rúbrica Módulo 3" },
  { key: "4", label: "Rapport 4", subtitle: "Rúbrica Módulo 4 + 360° Final" },
];

// ── Compute effective level per item per directivo ──
// Priority: most recent seguimiento > acordado > equipo > directivo
function getEffectiveLevel(
  directivoCedula: string,
  itemId: string,
  moduleNumber: number,
  evaluaciones: EvalRow[],
  seguimientos: SeguimientoRow[]
): string | null {
  // Check seguimiento first (most recent)
  const segs = seguimientos
    .filter(s => s.directivo_cedula === directivoCedula && s.item_id === itemId && s.module_number === moduleNumber && s.nivel)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (segs.length > 0 && segs[0].nivel) return segs[0].nivel;

  // Then acordado
  const eval_ = evaluaciones.find(e => e.directivo_cedula === directivoCedula && e.item_id === itemId);
  if (eval_?.acordado_nivel) return eval_.acordado_nivel;
  if (eval_?.equipo_nivel) return eval_.equipo_nivel;
  if (eval_?.directivo_nivel) return eval_.directivo_nivel;
  return null;
}

// ── Compute progression data for a module ──
interface ModuleProgression {
  moduleNumber: number;
  moduleTitle: string;
  directivoScores: {
    cedula: string;
    nombre: string;
    institucion: string;
    autoAvg: number;
    acordadoAvg: number;
    seguimientoAvg: number;
    deltaAutoToAcordado: number;
    deltaAcordadoToSeguimiento: number;
    itemCount: number;
  }[];
  globalAutoAvg: number;
  globalAcordadoAvg: number;
  globalSeguimientoAvg: number;
  distribution: { level: string; count: number; pct: number }[];
}

function computeModuleProgression(
  moduleNumber: number,
  moduleTitle: string,
  moduleId: string,
  items: RubricaItem[],
  evaluaciones: EvalRow[],
  seguimientos: SeguimientoRow[],
  directivos: DirectivoInfo[]
): ModuleProgression {
  const moduleItems = items.filter(i => i.module_id === moduleId);
  const directivoScores: ModuleProgression["directivoScores"] = [];

  // Distribution counters
  const distMap: Record<string, number> = { avanzado: 0, intermedio: 0, basico: 0, sin_evidencia: 0 };
  let totalLevels = 0;

  for (const d of directivos) {
    let autoSum = 0, autoCount = 0;
    let acordadoSum = 0, acordadoCount = 0;
    let segSum = 0, segCount = 0;

    for (const item of moduleItems) {
      const eval_ = evaluaciones.find(e => e.directivo_cedula === d.cedula && e.item_id === item.id);

      // Auto
      const autoN = nivelToNum(eval_?.directivo_nivel ?? null);
      if (autoN !== null) { autoSum += autoN; autoCount++; }

      // Acordado
      const acordadoN = nivelToNum(eval_?.acordado_nivel ?? null);
      if (acordadoN !== null) { acordadoSum += acordadoN; acordadoCount++; }

      // Effective level (for seguimiento / distribution)
      const effective = getEffectiveLevel(d.cedula, item.id, moduleNumber, evaluaciones, seguimientos);
      const effectiveN = nivelToNum(effective);
      if (effectiveN !== null) { segSum += effectiveN; segCount++; }

      // Distribution
      if (effective) { distMap[effective] = (distMap[effective] || 0) + 1; totalLevels++; }
    }

    if (autoCount > 0 || acordadoCount > 0 || segCount > 0) {
      const autoAvg = autoCount > 0 ? autoSum / autoCount : 0;
      const acordadoAvg = acordadoCount > 0 ? acordadoSum / acordadoCount : 0;
      const seguimientoAvg = segCount > 0 ? segSum / segCount : 0;
      directivoScores.push({
        cedula: d.cedula,
        nombre: d.nombre,
        institucion: d.institucion,
        autoAvg,
        acordadoAvg,
        seguimientoAvg,
        deltaAutoToAcordado: acordadoAvg - autoAvg,
        deltaAcordadoToSeguimiento: seguimientoAvg - acordadoAvg,
        itemCount: moduleItems.length,
      });
    }
  }

  const n = directivoScores.length || 1;
  const distribution = Object.entries(distMap).map(([level, count]) => ({
    level,
    count,
    pct: totalLevels > 0 ? (count / totalLevels) * 100 : 0,
  }));

  return {
    moduleNumber,
    moduleTitle,
    directivoScores,
    globalAutoAvg: directivoScores.reduce((s, d) => s + d.autoAvg, 0) / n,
    globalAcordadoAvg: directivoScores.reduce((s, d) => s + d.acordadoAvg, 0) / n,
    globalSeguimientoAvg: directivoScores.reduce((s, d) => s + d.seguimientoAvg, 0) / n,
    distribution,
  };
}

// ── Main Component ──

interface AdminMelRubricasTabProps {
  selRegions: string[];
  selEntidades: string[];
  selInstituciones: string[];
}

export default function AdminMelRubricasTab({ selRegions, selEntidades, selInstituciones }: AdminMelRubricasTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [directivos, setDirectivos] = useState<DirectivoInfo[]>([]);
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvalRow[]>([]);
  const [seguimientos, setSeguimientos] = useState<SeguimientoRow[]>([]);
  const [activeReport, setActiveReport] = useState("1");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [fichasRes, modsRes, itemsRes, evalsRes, segsRes] = await Promise.all([
      supabase.from("fichas_rlt")
        .select("nombres_apellidos, numero_cedula, nombre_ie, cargo_actual, genero, region, entidad_territorial")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]),
      supabase.from("rubrica_modules").select("id, module_number, title").order("sort_order"),
      supabase.from("rubrica_items").select("id, module_id, item_type, item_label, sort_order").order("sort_order"),
      supabase.from("rubrica_evaluaciones").select("item_id, directivo_cedula, directivo_nivel, equipo_nivel, acordado_nivel"),
      supabase.from("rubrica_seguimientos").select("item_id, directivo_cedula, nivel, module_number, created_at"),
    ]);

    setDirectivos((fichasRes.data ?? []).map(f => ({
      nombre: f.nombres_apellidos,
      cedula: f.numero_cedula ?? "",
      institucion: f.nombre_ie,
      cargo: f.cargo_actual,
      genero: f.genero ?? null,
      region: f.region ?? "",
      entidad_territorial: f.entidad_territorial ?? "",
    })).filter(d => d.cedula));

    setModules(modsRes.data ?? []);
    setItems(itemsRes.data ?? []);
    setEvaluaciones(evalsRes.data ?? []);
    setSeguimientos(segsRes.data ?? []);
    setLoading(false);
  };

  const filteredDirectivos = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter(d => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter(d => selEntidades.includes(d.entidad_territorial));
    if (selInstituciones.length > 0) pool = pool.filter(d => selInstituciones.includes(d.institucion));
    return pool;
  }, [directivos, selRegions, selEntidades, selInstituciones]);

  const moduleProgressions = useMemo(() => {
    return modules.map(m => computeModuleProgression(
      m.module_number, m.title, m.id, items, evaluaciones, seguimientos, filteredDirectivos
    ));
  }, [modules, items, evaluaciones, seguimientos, filteredDirectivos]);

  const getModuleForReport = (reportKey: string): ModuleProgression | null => {
    const modNum = parseInt(reportKey);
    return moduleProgressions.find(m => m.moduleNumber === modNum) ?? null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  const currentModule = getModuleForReport(activeReport);
  const reportInfo = REPORT_LABELS.find(r => r.key === activeReport)!;
  const has360 = activeReport === "1" || activeReport === "4";

  return (
    <div className="space-y-6">
      <div className="bg-accent/50 border border-accent rounded-lg p-4 text-sm text-muted-foreground">
        <p><strong>MEL Rúbricas</strong> — Progression des niveaux de compétence à travers les 4 modules de la rúbrica. Analyse l'évolution entre l'autoevaluación, le niveau acordado et le seguimiento.</p>
      </div>

      {/* Report selector */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="flex-wrap h-auto gap-1">
          {REPORT_LABELS.map(r => (
            <TabsTrigger key={r.key} value={r.key} className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORT_LABELS.map(r => (
          <TabsContent key={r.key} value={r.key}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">{r.label}: {r.subtitle}</h3>
                  <p className="text-xs text-muted-foreground">{filteredDirectivos.length} directivo(s) filtrado(s)</p>
                </div>
              </div>

              {currentModule && currentModule.directivoScores.length > 0 ? (
                <ReportContent
                  module={currentModule}
                  has360={r.key === "1" || r.key === "4"}
                  fase360={r.key === "1" ? "inicial" : "final"}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <p>Sin datos de rúbrica para el módulo {r.key} con los filtros seleccionados.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// ── Report Content ──

function ReportContent({ module, has360, fase360 }: { module: ModuleProgression; has360: boolean; fase360: string }) {
  const chartData = module.distribution
    .filter(d => d.count > 0)
    .map(d => ({
      name: NIVEL_LABELS[d.level] || d.level,
      Cantidad: d.count,
      Porcentaje: +d.pct.toFixed(1),
    }));

  const barColors: Record<string, string> = {
    "Avanzado": "#059669",
    "Intermedio": "#2563eb",
    "Básico": "#d97706",
    "Sin evidencia": "#dc2626",
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Promedio Autoevaluación</p>
            <p className="text-2xl font-bold">{module.globalAutoAvg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Escala 1-4</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Promedio Acordado</p>
            <p className="text-2xl font-bold">{module.globalAcordadoAvg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Escala 1-4</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Promedio Seguimiento</p>
            <p className="text-2xl font-bold">{module.globalSeguimientoAvg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Escala 1-4</p>
          </CardContent>
        </Card>
      </div>

      {/* Progression indicator */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-semibold">Progression Auto → Acordado → Seguimiento</h4>
          <p className="text-xs text-muted-foreground">
            Δ Auto→Acordado: <DeltaBadge value={module.globalAcordadoAvg - module.globalAutoAvg} />
            {" · "}
            Δ Acordado→Seguimiento: <DeltaBadge value={module.globalSeguimientoAvg - module.globalAcordadoAvg} />
          </p>
        </CardContent>
      </Card>

      {/* Distribution chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">Distribución de Niveles — Módulo {module.moduleNumber}</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="Cantidad"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                  label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Directivo table */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">Detalle por Directivo — Módulo {module.moduleNumber}: {module.moduleTitle}</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Directivo</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead className="text-center">Auto (prom.)</TableHead>
                  <TableHead className="text-center">Acordado (prom.)</TableHead>
                  <TableHead className="text-center">Seguimiento (prom.)</TableHead>
                  <TableHead className="text-center">Δ Auto→Acord.</TableHead>
                  <TableHead className="text-center">Δ Acord.→Seg.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {module.directivoScores.map(d => (
                  <TableRow key={d.cedula}>
                    <TableCell className="text-sm font-medium">{d.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.institucion}</TableCell>
                    <TableCell className="text-center text-xs">{d.autoAvg.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-xs">{d.acordadoAvg.toFixed(2)}</TableCell>
                    <TableCell className="text-center text-xs">{d.seguimientoAvg.toFixed(2)}</TableCell>
                    <TableCell className="text-center"><DeltaBadge value={d.deltaAutoToAcordado} /></TableCell>
                    <TableCell className="text-center"><DeltaBadge value={d.deltaAcordadoToSeguimiento} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 360° section placeholder for reports 1 and 4 */}
      {has360 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Sección 360° ({fase360 === "inicial" ? "Inicial" : "Final"})</p>
            <p className="text-xs">Los datos de la encuesta 360° {fase360} se integrarán aquí. Consulte la pestaña MEL 360° para el análisis detallado.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
