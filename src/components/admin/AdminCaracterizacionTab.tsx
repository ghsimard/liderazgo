import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { RefreshCw, X, Users } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList } from "recharts";
import { useGeographicData } from "@/hooks/useGeographicData";
import { genderizeRole } from "@/utils/genderizeRole";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 60% 50%)",
  "hsl(150 50% 45%)",
  "hsl(30 80% 55%)",
  "hsl(0 60% 50%)",
  "hsl(270 50% 55%)",
  "hsl(180 50% 45%)",
];

function getAgeRange(fechaNac: string | null): string {
  if (!fechaNac) return "Sin dato";
  const birth = new Date(fechaNac);
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 30) return "< 30";
  if (age <= 40) return "30–40";
  if (age <= 50) return "41–50";
  if (age <= 60) return "51–60";
  return "60+";
}

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

function distribution(arr: any[], field: string, labelFn?: (v: string) => string): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  arr.forEach((item) => {
    const raw = item[field];
    const val = raw ? String(raw) : "Sin dato";
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name: labelFn ? labelFn(name) : name, value }));
}

function distributionFromArray(arr: any[], field: string): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  arr.forEach((item) => {
    const raw = item[field];
    if (Array.isArray(raw)) {
      raw.forEach((v: string) => { if (v) counts[v] = (counts[v] || 0) + 1; });
    } else if (typeof raw === "string" && raw) {
      raw.split(",").map((s: string) => s.trim()).filter(Boolean).forEach((v: string) => {
        counts[v] = (counts[v] || 0) + 1;
      });
    }
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));
}

export default function AdminCaracterizacionTab() {
  const geo = useGeographicData();
  const [fichas, setFichas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [region, setRegion] = useState("");
  const [entidad, setEntidad] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("fichas_rlt")
        .select("region, genero, fecha_nacimiento, enfermedad_base, discapacidad, tipo_formacion, titulo_especializacion, titulo_maestria, titulo_doctorado, cargo_actual, tipo_vinculacion, estatuto, zona_sede, jornadas, grupos_etnicos, num_docentes, num_coordinadores, num_orientadores, num_administrativos, estudiantes_preescolar, estudiantes_primaria, estudiantes_basica_secundaria, estudiantes_media, estudiantes_ciclo_complementario, nombre_ie, entidad_territorial");
      setFichas(data ?? []);
      setLoading(false);
    })();
  }, []);

  const regionOptions = useMemo(() => [...new Set(fichas.map((f) => f.region).filter(Boolean))].sort(), [fichas]);

  const entidadOptions = useMemo(() => {
    let pool = fichas;
    if (region) pool = pool.filter((f) => f.region === region);
    return [...new Set(pool.map((f) => f.entidad_territorial).filter(Boolean))].sort();
  }, [fichas, region]);

  const filtered = useMemo(() => {
    let r = fichas;
    if (region) r = r.filter((f) => f.region === region);
    if (entidad.length > 0) r = r.filter((f) => entidad.includes(f.entidad_territorial));
    return r;
  }, [fichas, region, entidad]);

  const total = filtered.length;
  const hasFilters = region || entidad.length > 0;

  // Distributions
  const generoData = useMemo(() => distribution(filtered, "genero"), [filtered]);
  const ageData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((f) => { const r = getAgeRange(f.fecha_nacimiento); counts[r] = (counts[r] || 0) + 1; });
    const order = ["< 30", "30–40", "41–50", "51–60", "60+", "Sin dato"];
    return order.filter((k) => counts[k]).map((name) => ({ name, value: counts[name] }));
  }, [filtered]);

  const cargoData = useMemo(() => distribution(filtered, "cargo_actual", (v) => genderizeRole(v, null) || v), [filtered]);
  const enfermedadSi = useMemo(() => filtered.filter((f) => f.enfermedad_base === "Sí").length, [filtered]);
  const discapacidadSi = useMemo(() => filtered.filter((f) => f.discapacidad === "Sí").length, [filtered]);
  const formacionData = useMemo(() => distribution(filtered, "tipo_formacion"), [filtered]);
  const especCount = useMemo(() => filtered.filter((f) => f.titulo_especializacion && f.titulo_especializacion.trim()).length, [filtered]);
  const maestriaCount = useMemo(() => filtered.filter((f) => f.titulo_maestria && f.titulo_maestria.trim()).length, [filtered]);
  const doctoradoCount = useMemo(() => filtered.filter((f) => f.titulo_doctorado && f.titulo_doctorado.trim()).length, [filtered]);
  const vinculacionData = useMemo(() => distribution(filtered, "tipo_vinculacion"), [filtered]);
  const estatutoData = useMemo(() => distribution(filtered, "estatuto"), [filtered]);
  const zonaData = useMemo(() => distribution(filtered, "zona_sede"), [filtered]);
  const jornadaData = useMemo(() => distributionFromArray(filtered, "jornadas"), [filtered]);
  const etnicoData = useMemo(() => distributionFromArray(filtered, "grupos_etnicos"), [filtered]);

  // IE por municipio - use entidad_territorial as proxy
  const ieByMunicipio = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    filtered.forEach((f) => {
      const et = f.entidad_territorial || "Sin dato";
      if (!map[et]) map[et] = new Set();
      if (f.nombre_ie) map[et].add(f.nombre_ie);
    });
    return Object.entries(map)
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Totals
  const personalTotal = useMemo(() => {
    let d = 0, c = 0, o = 0, a = 0;
    filtered.forEach((f) => {
      d += f.num_docentes || 0;
      c += f.num_coordinadores || 0;
      o += f.num_orientadores || 0;
      a += f.num_administrativos || 0;
    });
    return { docentes: d, coordinadores: c, orientadores: o, administrativos: a, total: d + c + o + a };
  }, [filtered]);

  const estudiantesTotal = useMemo(() => {
    let pre = 0, pri = 0, sec = 0, med = 0, comp = 0;
    filtered.forEach((f) => {
      pre += f.estudiantes_preescolar || 0;
      pri += f.estudiantes_primaria || 0;
      sec += f.estudiantes_basica_secundaria || 0;
      med += f.estudiantes_media || 0;
      comp += f.estudiantes_ciclo_complementario || 0;
    });
    return { preescolar: pre, primaria: pri, secundaria: sec, media: med, complementario: comp, total: pre + pri + sec + med + comp };
  }, [filtered]);

  if (loading || geo.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">Región</label>
              <Select value={region || "__all__"} onValueChange={(v) => { setRegion(v === "__all__" ? "" : v); setEntidad([]); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {regionOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-medium text-muted-foreground">Entidad Territorial</label>
              <MultiSelect
                options={entidadOptions.map((e) => ({ value: e, label: e }))}
                selected={entidad}
                onChange={setEntidad}
                placeholder="Todas"
                className="h-9 text-sm"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setRegion(""); setEntidad([]); }} className="gap-1.5 text-destructive">
                <X className="w-4 h-4" /> Limpiar
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span><strong className="text-foreground">{total}</strong> fichas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SectionCard title="Género">
          <MiniPie data={generoData} total={total} />
        </SectionCard>

        <SectionCard title="Rango de Edades">
          {ageData.length > 0 && (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={ageData} margin={{ top: 18, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v} (${pct(v, total)}%)`, "Fichas"]} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Cargo (Rol)">
          <MiniPie data={cargoData} total={total} />
        </SectionCard>

        <SectionCard title="Enfermedad de Base">
          <BinaryBar label="Sí" count={enfermedadSi} total={total} />
        </SectionCard>

        <SectionCard title="Discapacidad">
          <BinaryBar label="Sí" count={discapacidadSi} total={total} />
        </SectionCard>

        <SectionCard title="Tipo de Formación">
          <MiniPie data={formacionData} total={total} />
        </SectionCard>

        <SectionCard title="Formación Avanzada">
          <div className="space-y-3 mt-2">
            <PercentBar label="Especialización" count={especCount} total={total} />
            <PercentBar label="Maestría" count={maestriaCount} total={total} />
            <PercentBar label="Doctorado" count={doctoradoCount} total={total} />
          </div>
        </SectionCard>

        <SectionCard title="Tipo de Vinculación">
          <MiniPie data={vinculacionData} total={total} />
        </SectionCard>

        <SectionCard title="Estatuto">
          <MiniPie data={estatutoData} total={total} />
        </SectionCard>

        <SectionCard title="Zona Sede Principal">
          <MiniPie data={zonaData} total={total} />
        </SectionCard>

        <SectionCard title="Jornadas">
          <MiniPie data={jornadaData} total={total} showPercent={false} />
        </SectionCard>

        <SectionCard title="Grupos Étnicos">
          {etnicoData.length > 0 ? (
            <MiniPie data={etnicoData} total={total} showPercent={false} />
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Sin datos</p>
          )}
        </SectionCard>

        {/* IE por Entidad Territorial */}
        <SectionCard title="Instituciones por Entidad Territorial">
          <div className="max-h-[200px] overflow-y-auto mt-2 space-y-1">
            {ieByMunicipio.map((item) => (
              <div key={item.name} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate mr-2">{item.name}</span>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Personal IE */}
        <SectionCard title="Total Personal de las IE">
          <div className="mt-2 space-y-1.5 text-xs">
            <StatRow label="Docentes" value={personalTotal.docentes} />
            <StatRow label="Coordinadores" value={personalTotal.coordinadores} />
            <StatRow label="Orientadores" value={personalTotal.orientadores} />
            <StatRow label="Administrativos" value={personalTotal.administrativos} />
            <div className="border-t pt-1 mt-1">
              <StatRow label="Total" value={personalTotal.total} bold />
            </div>
          </div>
        </SectionCard>

        {/* Estudiantes */}
        <SectionCard title="Total Estudiantes por Nivel">
          <div className="mt-2 space-y-1.5 text-xs">
            <StatRow label="Preescolar" value={estudiantesTotal.preescolar} />
            <StatRow label="Primaria" value={estudiantesTotal.primaria} />
            <StatRow label="Básica Secundaria" value={estudiantesTotal.secundaria} />
            <StatRow label="Media" value={estudiantesTotal.media} />
            <StatRow label="Ciclo Complementario" value={estudiantesTotal.complementario} />
            <div className="border-t pt-1 mt-1">
              <StatRow label="Total" value={estudiantesTotal.total} bold />
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function MiniPie({ data, total, showPercent = true }: { data: { name: string; value: number }[]; total: number; showPercent?: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <ResponsiveContainer width={90} height={90}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={38} innerRadius={20} strokeWidth={1}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-0.5 text-[11px] overflow-hidden">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-muted-foreground truncate">
              {d.name}: <span className="font-medium text-foreground">{d.value}</span>
              {showPercent && total > 0 && <span className="text-muted-foreground"> ({pct(d.value, total)}%)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BinaryBar({ label, count, total }: { label: string; count: number; total: number }) {
  const p = pct(count, total);
  return (
    <div className="mt-3 space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{count} / {total} ({p}%)</span>
      </div>
      <Progress value={p} className="h-2" />
    </div>
  );
}

function PercentBar({ label, count, total }: { label: string; count: number; total: number }) {
  const p = pct(count, total);
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{count} ({p}%)</span>
      </div>
      <Progress value={p} className="h-1.5" />
    </div>
  );
}

function StatRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value.toLocaleString("es-CO")}</span>
    </div>
  );
}
