import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Loader2, BarChart3, Sparkles, RefreshCw } from "lucide-react";

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
  objective: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  sort_order: number;
}

interface Evaluacion {
  item_id: string;
  directivo_cedula: string;
  acordado_nivel: string | null;
}

interface ItemDistribution {
  itemLabel: string;
  itemType: string;
  avanzado: number;
  intermedio: number;
  basico: number;
  sinEvidencia: number;
  total: number;
}

const NIVEL_COLORS = {
  avanzado: "#059669",
  intermedio: "#2563eb",
  basico: "#d97706",
  sinEvidencia: "#dc2626",
};

const NIVEL_LABELS: Record<string, string> = {
  avanzado: "Avanzado",
  intermedio: "Intermedio",
  basico: "Básico",
  sinEvidencia: "Sin evidencia",
};

export default function AdminRubricaRegionalReport() {
  const { toast } = useToast();
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: mods }, { data: its }, { data: evals }] = await Promise.all([
      supabase.from("rubrica_modules").select("id, module_number, title, objective").order("sort_order", { ascending: true }),
      supabase.from("rubrica_items").select("id, module_id, item_type, item_label, sort_order").order("sort_order", { ascending: true }),
      supabase.from("rubrica_evaluaciones").select("item_id, directivo_cedula, acordado_nivel"),
    ]);
    if (mods) setModules(mods);
    if (its) setItems(its);
    if (evals) setEvaluaciones(evals);
    setLoading(false);
  };

  // Compute distributions per module
  const moduleDistributions = useMemo(() => {
    const result: Record<string, ItemDistribution[]> = {};

    for (const mod of modules) {
      const modItems = items.filter(i => i.module_id === mod.id);
      const distributions: ItemDistribution[] = [];

      for (const item of modItems) {
        const itemEvals = evaluaciones.filter(e => e.item_id === item.id && e.acordado_nivel);
        const total = itemEvals.length;
        if (total === 0) {
          distributions.push({
            itemLabel: item.item_label,
            itemType: item.item_type,
            avanzado: 0, intermedio: 0, basico: 0, sinEvidencia: 0, total: 0,
          });
          continue;
        }

        const counts = { avanzado: 0, intermedio: 0, basico: 0, sin_evidencia: 0 };
        for (const ev of itemEvals) {
          const n = ev.acordado_nivel as string;
          if (n in counts) counts[n as keyof typeof counts]++;
        }

        distributions.push({
          itemLabel: item.item_label,
          itemType: item.item_type,
          avanzado: Math.round((counts.avanzado / total) * 100),
          intermedio: Math.round((counts.intermedio / total) * 100),
          basico: Math.round((counts.basico / total) * 100),
          sinEvidencia: Math.round((counts.sin_evidencia / total) * 100),
          total,
        });
      }

      result[mod.id] = distributions;
    }

    return result;
  }, [modules, items, evaluaciones]);

  // Global stats
  const globalStats = useMemo(() => {
    const withAcordado = evaluaciones.filter(e => e.acordado_nivel);
    const totalEvals = withAcordado.length;
    const avanzadoCount = withAcordado.filter(e => e.acordado_nivel === "avanzado").length;
    const uniqueDirectivos = new Set(withAcordado.map(e => e.directivo_cedula)).size;
    return {
      totalEvals,
      avanzadoRate: totalEvals > 0 ? Math.round((avanzadoCount / totalEvals) * 100) : 0,
      uniqueDirectivos,
    };
  }, [evaluaciones]);

  const handleGenerateAnalysis = async (mod: RubricaModule) => {
    const dist = moduleDistributions[mod.id];
    if (!dist || dist.every(d => d.total === 0)) {
      toast({ title: "Sin datos", description: "No hay evaluaciones con nivel acordado para este módulo.", variant: "destructive" });
      return;
    }

    setLoadingAnalysis(mod.id);
    const bodyPayload = {
      moduleTitle: mod.title,
      moduleNumber: mod.module_number,
      moduleObjective: mod.objective,
      distribution: dist.map(d => ({
        itemLabel: d.itemLabel,
        itemType: d.itemType,
        avanzado: d.avanzado,
        intermedio: d.intermedio,
        basico: d.basico,
        sinEvidencia: d.sinEvidencia,
        total: d.total,
      })),
    };

    try {
      const USE_EXPRESS = !!import.meta.env.VITE_API_URL;
      let analysis = "";

      if (USE_EXPRESS) {
        const result = await apiFetch<{ analysis: string }>("/api/rubrica-analysis", {
          method: "POST",
          body: bodyPayload,
        });
        if (result.error) throw new Error(result.error);
        analysis = result.data?.analysis || "";
      } else {
        const { data, error } = await supabase.functions.invoke("rubrica-analysis", {
          body: bodyPayload,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        analysis = data.analysis;
      }

      setAnalyses(prev => ({ ...prev, [mod.id]: analysis }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingAnalysis(null);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando datos…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Informe Regional — Rúbricas</h3>
          <p className="text-sm text-muted-foreground">
            Distribución agregada de niveles por módulo (nivel acordado)
          </p>
        </div>
        <div className="flex gap-3">
          <Badge variant="secondary" className="text-xs">{globalStats.uniqueDirectivos} directivos</Badge>
          <Badge variant="secondary" className="text-xs">{globalStats.totalEvals} evaluaciones</Badge>
          <Badge className="text-xs bg-emerald-100 text-emerald-800">{globalStats.avanzadoRate}% Avanzado</Badge>
        </div>
      </div>

      {modules.map(mod => {
        const dist = moduleDistributions[mod.id];
        if (!dist) return null;
        const hasData = dist.some(d => d.total > 0);

        // Chart data: one bar group per item
        const chartData = dist.map(d => ({
          name: d.itemLabel.length > 25 ? d.itemLabel.substring(0, 22) + "…" : d.itemLabel,
          Avanzado: d.avanzado,
          Intermedio: d.intermedio,
          Básico: d.basico,
          "Sin evidencia": d.sinEvidencia,
        }));

        return (
          <Card key={mod.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Módulo {mod.module_number}: {mod.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Objetivo:</strong> {mod.objective}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasData ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay evaluaciones con nivel acordado para este módulo.
                </p>
              ) : (
                <>
                  {/* Distribution table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Ítem</TableHead>
                        <TableHead className="text-xs text-center">n</TableHead>
                        <TableHead className="text-xs text-center text-emerald-700">Avanzado</TableHead>
                        <TableHead className="text-xs text-center text-blue-700">Intermedio</TableHead>
                        <TableHead className="text-xs text-center text-amber-700">Básico</TableHead>
                        <TableHead className="text-xs text-center text-red-700">Sin evidencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dist.map((d, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] mr-1">{d.itemType}</Badge>
                            {d.itemLabel}
                          </TableCell>
                          <TableCell className="text-xs text-center font-medium">{d.total}</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-emerald-700">{d.avanzado}%</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-blue-700">{d.intermedio}%</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-amber-700">{d.basico}%</TableCell>
                          <TableCell className="text-xs text-center font-semibold text-red-700">{d.sinEvidencia}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Bar chart */}
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          angle={-30}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Avanzado" fill={NIVEL_COLORS.avanzado} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Intermedio" fill={NIVEL_COLORS.intermedio} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Básico" fill={NIVEL_COLORS.basico} radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Sin evidencia" fill={NIVEL_COLORS.sinEvidencia} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Analysis */}
                  <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Análisis interpretativo</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateAnalysis(mod)}
                        disabled={loadingAnalysis === mod.id}
                        className="gap-1.5 text-xs"
                      >
                        {loadingAnalysis === mod.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : analyses[mod.id] ? (
                          <RefreshCw className="w-3.5 h-3.5" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {analyses[mod.id] ? "Regenerar" : "Generar análisis"}
                      </Button>
                    </div>
                    {analyses[mod.id] ? (
                      <textarea
                        className="w-full min-h-[120px] text-sm text-muted-foreground leading-relaxed bg-transparent border border-input rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        value={analyses[mod.id]}
                        onChange={(e) => setAnalyses(prev => ({ ...prev, [mod.id]: e.target.value }))}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Haga clic en "Generar análisis" para obtener una interpretación automática de los resultados.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
