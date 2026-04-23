/**
 * Statistics view for "Asistencia" — based on `informe_asistencia` table
 * (NOT on satisfaccion_responses, which doesn't track physical attendance).
 *
 * Indicators:
 * 1. Ficha técnica
 * 2. Tasa de asistencia global (% sessions presentes)
 * 3. Asistencia por día (AM / PM)
 * 4. Asistencia por región (when filterRegion === 'all')
 * 5. Razones de inasistencia
 * 6. Lista de directivos con baja asistencia (<80%)
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Users, TrendingUp, CalendarCheck, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DAYS = [1, 2, 3, 4, 5];

interface Props {
  filterModule: string;       // "all" | "1" | "2" | "3" | "4"
  filterRegion: string;       // "all" | <region>
  allowedRegions?: string[];  // operator restriction
}

interface AsistenciaRow {
  directivo_cedula: string;
  module_number: number;
  dia: number;
  session_am: boolean;
  session_pm: boolean;
  razon_inasistencia: string | null;
}

interface Directivo {
  numero_cedula: string;
  nombres_apellidos: string;
  nombre_ie: string;
  region: string;
}

export default function AdminAsistenciaStats({ filterModule, filterRegion, allowedRegions }: Props) {
  const [loading, setLoading] = useState(true);
  const [asistencia, setAsistencia] = useState<AsistenciaRow[]>([]);
  const [directivos, setDirectivos] = useState<Directivo[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Load directivos (filter by Rector/a + Coordinador/a)
      const { data: dirData } = await supabase
        .from("fichas_rlt")
        .select("numero_cedula, nombres_apellidos, nombre_ie, region")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);

      // Load asistencia
      let q = supabase.from("informe_asistencia").select("*");
      if (filterModule !== "all") q = q.eq("module_number", parseInt(filterModule));
      const { data: asisData } = await q;

      setDirectivos((dirData || []).filter((d: any) => d.numero_cedula) as Directivo[]);
      setAsistencia((asisData || []) as AsistenciaRow[]);
      setLoading(false);
    })();
  }, [filterModule]);

  // Apply region filter and operator restriction in-memory
  const directivosFiltered = useMemo(() => {
    return directivos.filter(d => {
      if (allowedRegions && allowedRegions.length > 0 && !allowedRegions.includes(d.region)) return false;
      if (filterRegion !== "all" && d.region !== filterRegion) return false;
      return true;
    });
  }, [directivos, filterRegion, allowedRegions]);

  const cedulasFiltered = useMemo(() => new Set(directivosFiltered.map(d => d.numero_cedula)), [directivosFiltered]);

  const asistenciaFiltered = useMemo(
    () => asistencia.filter(a => cedulasFiltered.has(a.directivo_cedula)),
    [asistencia, cedulasFiltered]
  );

  // ── Aggregations ──
  const stats = useMemo(() => {
    const totalDirectivos = directivosFiltered.length;
    const moduleCount = filterModule === "all" ? 4 : 1;
    const expectedSessions = totalDirectivos * 5 * 2 * moduleCount; // dirs × 5 days × 2 sessions × modules

    let presentSessions = 0;
    asistenciaFiltered.forEach(a => {
      if (a.session_am) presentSessions++;
      if (a.session_pm) presentSessions++;
    });

    const globalRate = expectedSessions > 0
      ? Math.round((presentSessions / expectedSessions) * 10000) / 100
      : 0;

    // Asistencia por día
    const byDay = DAYS.map(dia => {
      const rows = asistenciaFiltered.filter(a => a.dia === dia);
      const expectedAM = totalDirectivos * moduleCount;
      const expectedPM = totalDirectivos * moduleCount;
      const presentAM = rows.filter(r => r.session_am).length;
      const presentPM = rows.filter(r => r.session_pm).length;
      return {
        label: `Día ${dia}`,
        AM: expectedAM > 0 ? Math.round((presentAM / expectedAM) * 10000) / 100 : 0,
        PM: expectedPM > 0 ? Math.round((presentPM / expectedPM) * 10000) / 100 : 0,
        countAM: presentAM,
        countPM: presentPM,
      };
    });

    // Asistencia por región (only meaningful when not filtered)
    const byRegion: { label: string; value: number; count: number }[] = [];
    if (filterRegion === "all") {
      const regionMap = new Map<string, { dirs: number; present: number }>();
      directivosFiltered.forEach(d => {
        const existing = regionMap.get(d.region) || { dirs: 0, present: 0 };
        existing.dirs++;
        regionMap.set(d.region, existing);
      });
      asistenciaFiltered.forEach(a => {
        const dir = directivosFiltered.find(d => d.numero_cedula === a.directivo_cedula);
        if (!dir) return;
        const existing = regionMap.get(dir.region);
        if (!existing) return;
        if (a.session_am) existing.present++;
        if (a.session_pm) existing.present++;
      });
      regionMap.forEach((v, region) => {
        const expected = v.dirs * 5 * 2 * moduleCount;
        const pct = expected > 0 ? Math.round((v.present / expected) * 10000) / 100 : 0;
        byRegion.push({ label: region, value: pct, count: v.present });
      });
      byRegion.sort((a, b) => b.value - a.value);
    }

    // Razones de inasistencia
    const razonCounts: Record<string, number> = {};
    asistenciaFiltered.forEach(a => {
      const presentBoth = a.session_am && a.session_pm;
      if (!presentBoth && a.razon_inasistencia && a.razon_inasistencia.trim()) {
        razonCounts[a.razon_inasistencia] = (razonCounts[a.razon_inasistencia] || 0) + 1;
      }
    });
    const razones = Object.entries(razonCounts)
      .map(([label, count]) => ({ label, value: count, count }))
      .sort((a, b) => b.value - a.value);

    // Directivos con baja asistencia (<80%)
    const expectedPerDir = 5 * 2 * moduleCount;
    const directivosLowAttendance = directivosFiltered.map(d => {
      const rows = asistenciaFiltered.filter(a => a.directivo_cedula === d.numero_cedula);
      let present = 0;
      rows.forEach(r => {
        if (r.session_am) present++;
        if (r.session_pm) present++;
      });
      const pct = expectedPerDir > 0 ? Math.round((present / expectedPerDir) * 10000) / 100 : 0;
      return { ...d, present, expected: expectedPerDir, pct };
    })
    .filter(d => d.pct < 80)
    .sort((a, b) => a.pct - b.pct);

    return {
      totalDirectivos,
      expectedSessions,
      presentSessions,
      globalRate,
      byDay,
      byRegion,
      razones,
      directivosLowAttendance,
      moduleCount,
    };
  }, [asistenciaFiltered, directivosFiltered, filterModule, filterRegion]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Ficha técnica */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Ficha Técnica — Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Módulo</TableCell>
                <TableCell>{filterModule === "all" ? "Todos (1-4)" : `Módulo ${filterModule}`}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Región</TableCell>
                <TableCell>{filterRegion === "all" ? "Todas" : filterRegion}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total directivos esperados</TableCell>
                <TableCell><Badge variant="secondary">{stats.totalDirectivos}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total sesiones esperadas</TableCell>
                <TableCell><Badge variant="secondary">{stats.expectedSessions}</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">Total sesiones registradas como presentes</TableCell>
                <TableCell><Badge variant="secondary">{stats.presentSessions}</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">
            Cálculo: Directivos (Rector/a + Coordinador/a) × 5 días × 2 sesiones (AM + PM) × {stats.moduleCount} {stats.moduleCount === 1 ? "módulo" : "módulos"}.
          </p>
        </CardContent>
      </Card>

      {stats.expectedSessions === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Sin directivos para los filtros seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tasa global */}
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tasa de Asistencia Global
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{stats.globalRate}%</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.presentSessions} de {stats.expectedSessions} sesiones registradas como presentes
                </p>
              </div>
              <Progress value={stats.globalRate} className="h-2" />
            </CardContent>
          </Card>

          {/* Asistencia por día */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Asistencia por Día (AM / PM)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byDay} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Bar dataKey="AM" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="AM" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 600 }} />
                    </Bar>
                    <Bar dataKey="PM" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      <LabelList dataKey="PM" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead className="text-right">AM</TableHead>
                    <TableHead className="text-right">PM</TableHead>
                    <TableHead className="text-right">Presentes AM / PM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byDay.map((d) => (
                    <TableRow key={d.label}>
                      <TableCell className="text-sm">{d.label}</TableCell>
                      <TableCell className="text-right font-semibold">{d.AM}%</TableCell>
                      <TableCell className="text-right font-semibold">{d.PM}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.countAM} / {d.countPM}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Asistencia por región */}
          {filterRegion === "all" && stats.byRegion.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Asistencia por Región
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar data={stats.byRegion} suffix="%" />
              </CardContent>
            </Card>
          )}

          {/* Razones de inasistencia */}
          {stats.razones.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Razones de Inasistencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBar data={stats.razones} suffix="" countLabel="ocurrencias" />
              </CardContent>
            </Card>
          )}

          {/* Directivos con baja asistencia */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Directivos con baja asistencia ({"<"} 80%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.directivosLowAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sin directivos por debajo del umbral del 80%.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Institución</TableHead>
                      <TableHead>Región</TableHead>
                      <TableHead className="text-right">Presentes / Esperados</TableHead>
                      <TableHead className="text-right">% Asistencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.directivosLowAttendance.map(d => (
                      <TableRow key={d.numero_cedula}>
                        <TableCell className="font-mono text-xs">{d.numero_cedula}</TableCell>
                        <TableCell className="text-sm">{d.nombres_apellidos}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.nombre_ie}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.region}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{d.present} / {d.expected}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <Badge variant={d.pct < 50 ? "destructive" : "secondary"}>{d.pct}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function HorizontalBar({
  data,
  suffix,
  countLabel = "respuestas",
}: {
  data: { label: string; value: number; count: number }[];
  suffix: string;
  countLabel?: string;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-4">
      <div style={{ height: Math.max(data.length * 45 + 30, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, suffix === "%" ? 100 : Math.ceil(maxVal * 1.1)]} tickFormatter={(v) => `${v}${suffix}`} />
            <YAxis type="category" dataKey="label" width={220} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}${suffix}`} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}${suffix}`} style={{ fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Componente</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead className="text-right capitalize">{countLabel}</TableHead>
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
