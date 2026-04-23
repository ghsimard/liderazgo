/**
 * Statistics sub-tab for Satisfacciones admin panel.
 * Computes and displays charts/tables matching the report format:
 * 1. Ficha técnica
 * 2. Actividades más valiosas (horizontal bar)
 * 3. Desarrollo / Logros (horizontal bar - % positive)
 * 4. Desempeño equipo / Frecuencia equipo (bar chart)
 * 5. Logística (horizontal bar)
 * 6. Autoevaluación (bar chart)
 * 7. Nivel general de satisfacción
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, BarChart3, Users, TrendingUp } from "lucide-react";
import { FORM_TYPE_LABELS, SATISFACCION_FORMS } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef, SatisfaccionQuestion } from "@/data/satisfaccionData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

const FORM_TYPES = ["asistencia", "interludio", "intensivo"] as const;
const MODULES = [1, 2, 3, 4];

interface ResponseRow {
  id: string;
  form_type: string;
  module_number: number;
  region: string;
  cedula: string;
  respuestas: any;
  created_at: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AdminSatisfaccionStats({ regions }: { regions: string[] }) {
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [filterType, setFilterType] = useState<string>("intensivo");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");

  const fetchResponses = async () => {
    setLoading(true);
    let query = supabase.from("satisfaccion_responses").select("*");
    if (filterType !== "all") query = query.eq("form_type", filterType);
    if (filterModule !== "all") query = query.eq("module_number", parseInt(filterModule));
    if (filterRegion !== "all") query = query.eq("region", filterRegion);
    const { data } = await query;
    setResponses((data || []) as ResponseRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchResponses(); }, [filterType, filterModule, filterRegion]);

  const formDef = SATISFACCION_FORMS[filterType] as SatisfaccionFormDef | undefined;
  const totalResponses = responses.length;

  // ── Compute statistics ──
  const stats = useMemo(() => {
    if (!formDef || totalResponses === 0) return null;

    const result: {
      sections: {
        title: string;
        type: "checkbox" | "grid" | "likert" | "other";
        data: { label: string; value: number; count: number }[];
      }[];
      generalSatisfaction: { label: string; value: number }[];
      overallSatisfaction: number;
    } = { sections: [], generalSatisfaction: [], overallSatisfaction: 0 };

    for (const section of formDef.sections) {
      for (const q of section.questions) {
        if (q.type === "textarea" || q.type === "text" || q.type === "date") continue;

        if (q.type === "checkbox-max3") {
          // Count frequency of each option selected
          const counts: Record<string, number> = {};
          (q.options || []).forEach(o => counts[o.value] = 0);

          for (const r of responses) {
            const val = r.respuestas?.[q.key];
            if (Array.isArray(val)) {
              val.forEach((v: string) => { counts[v] = (counts[v] || 0) + 1; });
            }
          }

          const data = (q.options || [])
            .map(o => ({
              label: o.label,
              value: totalResponses > 0 ? Math.round((counts[o.value] / totalResponses) * 10000) / 100 : 0,
              count: counts[o.value],
            }))
            .sort((a, b) => b.value - a.value);

          result.sections.push({ title: section.title, type: "checkbox", data });
        }

        if (q.type === "radio" || q.type === "likert4") {
          // % positive (value 3 or 4 for likert, or specific values)
          const counts: Record<string, number> = {};
          (q.options || []).forEach(o => counts[o.value] = 0);

          for (const r of responses) {
            const val = r.respuestas?.[q.key];
            if (val !== undefined && val !== null) {
              counts[String(val)] = (counts[String(val)] || 0) + 1;
            }
          }

          if (q.type === "likert4") {
            const positive = (counts["3"] || 0) + (counts["4"] || 0);
            const pct = totalResponses > 0 ? Math.round((positive / totalResponses) * 10000) / 100 : 0;
            result.sections.push({
              title: section.title,
              type: "likert",
              data: [{ label: q.label, value: pct, count: positive }],
            });
          } else {
            const data = (q.options || []).map(o => ({
              label: o.label,
              value: totalResponses > 0 ? Math.round((counts[o.value] / totalResponses) * 10000) / 100 : 0,
              count: counts[o.value],
            }));
            result.sections.push({ title: section.title, type: "other", data });
          }
        }

        if (q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") {
          const data: { label: string; value: number; count: number }[] = [];

          for (const row of (q.rows || [])) {
            let positiveCount = 0;
            let total = 0;

            for (const r of responses) {
              const gridVal = r.respuestas?.[q.key];
              if (gridVal && typeof gridVal === "object") {
                const cellVal = gridVal[row.key];
                if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
                  total++;
                  // Positive: "si" for sino, "frecuentemente"/"siempre" for frequency, "3"/"4" for logistic
                  if (q.type === "grid-sino") {
                    if (cellVal === "si") positiveCount++;
                  } else if (q.type === "grid-frequency") {
                    if (cellVal === "frecuentemente" || cellVal === "siempre" || cellVal === "algunas_veces") positiveCount++;
                  } else if (q.type === "grid-logistic") {
                    if (cellVal === "3" || cellVal === "4") positiveCount++;
                  }
                }
              }
            }

            const pct = total > 0 ? Math.round((positiveCount / total) * 10000) / 100 : 0;
            data.push({ label: row.label, value: pct, count: positiveCount });
          }

          data.sort((a, b) => b.value - a.value);
          result.sections.push({ title: section.title, type: "grid", data });
        }
      }
    }

    // Compute general satisfaction: average of grid sections (excluding checkbox and autoevaluacion)
    const gridSections = result.sections.filter(
      s => s.type === "grid" && !s.title.toLowerCase().includes("autoevaluación") && !s.title.toLowerCase().includes("autoevaluacion")
    );
    if (gridSections.length > 0) {
      let totalPct = 0;
      for (const gs of gridSections) {
        const avg = gs.data.length > 0 ? gs.data.reduce((sum, d) => sum + d.value, 0) / gs.data.length : 0;
        result.generalSatisfaction.push({ label: gs.title, value: Math.round(avg * 100) / 100 });
        totalPct += avg;
      }
      result.overallSatisfaction = Math.round((totalPct / gridSections.length) * 100) / 100;
    }

    // Also include likert sections in general satisfaction
    const likertSections = result.sections.filter(s => s.type === "likert");
    for (const ls of likertSections) {
      if (ls.data.length > 0) {
        const avg = ls.data.reduce((sum, d) => sum + d.value, 0) / ls.data.length;
        result.generalSatisfaction.push({ label: ls.title, value: Math.round(avg * 100) / 100 });
      }
    }

    return result;
  }, [responses, formDef, totalResponses]);

  // ── Merge likert sections with same title ──
  const mergedSections = useMemo(() => {
    if (!stats) return [];
    const merged: typeof stats.sections = [];
    for (const s of stats.sections) {
      const existing = merged.find(m => m.title === s.title && m.type === s.type);
      if (existing && s.type === "likert") {
        existing.data.push(...s.data);
      } else {
        merged.push({ ...s, data: [...s.data] });
      }
    }
    return merged;
  }, [stats]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Tipo de encuesta</Label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
            {FORM_TYPES.map((ft) => <option key={ft} value={ft}>{FORM_TYPE_LABELS[ft]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Módulo</Label>
          <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
            <option value="all">Todos</option>
            {MODULES.map((m) => <option key={m} value={String(m)}>Módulo {m}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Región</Label>
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
            <option value="all">Todas</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Ficha técnica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ficha Técnica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Tipo de encuesta</TableCell>
                <TableCell>{FORM_TYPE_LABELS[filterType]}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Módulo</TableCell>
                <TableCell>{filterModule === "all" ? "Todos" : `Módulo ${filterModule}`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Región</TableCell>
                <TableCell>{filterRegion === "all" ? "Todas" : filterRegion}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total de respuestas</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-sm">{totalResponses}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalResponses === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Sin datos para generar estadísticas</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* General satisfaction — first */}
          {stats && stats.generalSatisfaction.length > 0 && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Nivel General de Satisfacción
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{stats.overallSatisfaction}%</div>
                  <p className="text-sm text-muted-foreground mt-1">Satisfacción general</p>
                </div>
                <div className="space-y-3">
                  {stats.generalSatisfaction.map((gs, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{gs.label}</span>
                        <span className="font-semibold">{gs.value}%</span>
                      </div>
                      <Progress value={gs.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          {mergedSections.map((section, si) => (
            <Card key={si}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {section.type === "checkbox" ? (
                  <HorizontalBarSection data={section.data} suffix="%" totalLabel={`${totalResponses} respuestas`} />
                ) : section.type === "grid" ? (
                  <HorizontalBarSection data={section.data} suffix="%" totalLabel="% respuestas positivas" />
                ) : section.type === "likert" ? (
                  <HorizontalBarSection data={section.data} suffix="%" totalLabel="% respuestas positivas" />
                ) : (
                  <HorizontalBarSection data={section.data} suffix="%" totalLabel="" />
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

/** Horizontal bar chart component used for all sections */
function HorizontalBarSection({
  data,
  suffix,
  totalLabel,
}: {
  data: { label: string; value: number; count: number }[];
  suffix: string;
  totalLabel: string;
}) {
  // Truncate labels for chart display
  const chartData = data.map((d) => ({
    ...d,
    shortLabel: d.label,
  }));

  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-4">
      {totalLabel && <p className="text-xs text-muted-foreground">{totalLabel}</p>}

      {/* Chart */}
      <div style={{ height: Math.max(data.length * 45 + 30, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, Math.ceil(maxVal / 10) * 10]} tickFormatter={(v) => `${v}%`} />
            <YAxis
              type="category"
              dataKey="shortLabel"
              width={220}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value}${suffix}`, "Resultado"]}
              labelFormatter={(label) => {
                const item = chartData.find(d => d.shortLabel === label);
                return item?.label || label;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table below */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Componente</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead className="text-right">Respuestas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((d, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{d.label}</TableCell>
              <TableCell className="text-right font-semibold">{d.value}{suffix}</TableCell>
              <TableCell className="text-right text-muted-foreground">{d.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
