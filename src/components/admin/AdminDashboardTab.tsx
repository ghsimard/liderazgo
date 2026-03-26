import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { useGeographicData } from "@/hooks/useGeographicData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, FileText, Gauge, ClipboardCheck, School, ThumbsUp, FileBarChart, CalendarCheck, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { SATISFACCION_FORMS } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef } from "@/data/satisfaccionData";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 60% 50%)",
  "hsl(150 50% 45%)",
  "hsl(30 80% 55%)",
  "hsl(0 60% 50%)",
];

interface Filters {
  region: string;
  entidad: string[];
  municipio: string[];
  institucion: string[];
  directivo: string[];
  modulo: string;
}

const EMPTY_FILTERS: Filters = { region: "", entidad: [], municipio: [], institucion: [], directivo: [], modulo: "" };

export default function AdminDashboardTab() {
  const geo = useGeographicData();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);

  // Raw data
  const [fichas, setFichas] = useState<any[]>([]);
  const [encuestas360, setEncuestas360] = useState<any[]>([]);
  const [rubricaSeg, setRubricaSeg] = useState<any[]>([]);
  const [ambienteEsc, setAmbienteEsc] = useState<any[]>([]);
  const [satisfaccion, setSatisfaccion] = useState<any[]>([]);
  const [informes, setInformes] = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [modules, setModules] = useState<{ module_number: number; title: string }[]>([]);

  // Fetch all data
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [fRes, eRes, rRes, aRes, sRes, iRes, atRes, mRes] = await Promise.all([
        supabase.from("fichas_rlt").select("id, region, cargo_actual, nombre_ie, numero_cedula, nombres_apellidos"),
        supabase.from("encuestas_360").select("id, fase, tipo_formulario, institucion_educativa, cedula_directivo"),
        supabase.from("rubrica_seguimientos").select("id, module_number, nivel, directivo_cedula"),
        supabase.from("encuestas_ambiente_escolar").select("id, tipo_formulario, institucion_educativa"),
        supabase.from("satisfaccion_responses").select("id, form_type, module_number, region, respuestas"),
        supabase.from("informe_modulo").select("id, module_number, region, entidad_territorial"),
        supabase.from("informe_asistencia").select("id, module_number, session_am, session_pm, directivo_cedula, dia"),
        supabase.from("rubrica_modules").select("module_number, title").order("sort_order"),
      ]);
      setFichas(fRes.data ?? []);
      setEncuestas360(eRes.data ?? []);
      setRubricaSeg(rRes.data ?? []);
      setAmbienteEsc(aRes.data ?? []);
      setSatisfaccion(sRes.data ?? []);
      setInformes(iRes.data ?? []);
      setAsistencia(atRes.data ?? []);
      setModules(mRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  // Set of institutions that have at least one ficha
  const institucionesConFicha = useMemo(() => {
    return new Set(fichas.map((f) => f.nombre_ie).filter(Boolean));
  }, [fichas]);

  // Set of regions that have at least one ficha
  const regionesConFicha = useMemo(() => {
    return new Set(fichas.map((f) => f.region).filter(Boolean));
  }, [fichas]);

  // Filtered region options
  const regionOptions = useMemo(() => {
    return geo.regionNames.filter((r) => regionesConFicha.has(r));
  }, [geo.regionNames, regionesConFicha]);

  // ── All ET/municipios/institutions across all regions (for "Todos") ──
  const allRegionEntidades = useMemo(() => {
    const set = new Set<string>();
    geo.regionNames.forEach((r) => geo.getEntidadesForRegion(r).forEach((e) => set.add(e)));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [geo]);

  const allRegionMunicipios = useMemo(() => {
    const set = new Set<string>();
    geo.regionNames.forEach((r) => geo.getMunicipiosForRegion(r).forEach((m) => set.add(m)));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [geo]);

  const allRegionInstituciones = useMemo(() => {
    const set = new Set<string>();
    geo.regionNames.forEach((r) => geo.getInstitucionesForRegion(r).forEach((i) => set.add(i)));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [geo]);

  // ── Cascading filter options ──
  // ET: only those with at least one institution that has a ficha
  const entidadOptions = useMemo(() => {
    const base = filters.region ? geo.getEntidadesForRegion(filters.region) : allRegionEntidades;
    return base.filter((ent) => {
      const munis = geo.getMunicipiosForEntidad(ent);
      return munis.some((mun) =>
        geo.getInstitucionesForMunicipioByEntidad(ent, mun).some((inst) => institucionesConFicha.has(inst))
      );
    });
  }, [filters.region, geo, allRegionEntidades, institucionesConFicha]);

  const municipioOptions = useMemo(() => {
    let munis: string[];
    if (filters.entidad.length > 0) {
      const set = new Set<string>();
      filters.entidad.forEach((e) => geo.getMunicipiosForEntidad(e).forEach((m) => set.add(m)));
      munis = [...set];
    } else if (filters.region) {
      munis = geo.getMunicipiosForRegion(filters.region);
    } else {
      munis = allRegionMunicipios;
    }
    const entPool = filters.entidad.length > 0 ? filters.entidad : entidadOptions;
    return munis.filter((mun) => {
      for (const ent of entPool) {
        const insts = geo.getInstitucionesForMunicipioByEntidad(ent, mun);
        if (insts.some((inst) => institucionesConFicha.has(inst))) return true;
      }
      return false;
    }).sort((a, b) => a.localeCompare(b, "es"));
  }, [filters.region, filters.entidad, geo, allRegionMunicipios, entidadOptions, institucionesConFicha]);

  // Institución: only those with a ficha
  const institucionOptions = useMemo(() => {
    let base: string[];
    if (filters.municipio.length > 0) {
      const entPool = filters.entidad.length > 0 ? filters.entidad : entidadOptions;
      const set = new Set<string>();
      for (const mun of filters.municipio) {
        for (const ent of entPool) {
          geo.getInstitucionesForMunicipioByEntidad(ent, mun).forEach((i) => set.add(i));
        }
      }
      base = [...set];
    } else if (filters.entidad.length > 0) {
      const set = new Set<string>();
      for (const ent of filters.entidad) {
        const munis = geo.getMunicipiosForEntidad(ent);
        for (const mun of munis) {
          geo.getInstitucionesForMunicipioByEntidad(ent, mun).forEach((i) => set.add(i));
        }
      }
      base = [...set];
    } else if (filters.region) {
      base = geo.getInstitucionesForRegion(filters.region);
    } else {
      base = allRegionInstituciones;
    }
    return base.filter((inst) => institucionesConFicha.has(inst)).sort((a, b) => a.localeCompare(b, "es"));
  }, [filters.region, filters.entidad, filters.municipio, geo, entidadOptions, allRegionInstituciones, institucionesConFicha]);

  // Módulo: only modules that have rubrica or satisfaccion data
  const moduleOptions = useMemo(() => {
    const modsWithData = new Set<number>();
    rubricaSeg.forEach((r) => modsWithData.add(r.module_number));
    satisfaccion.forEach((s) => modsWithData.add(s.module_number));
    informes.forEach((i) => modsWithData.add(i.module_number));
    asistencia.forEach((a) => modsWithData.add(a.module_number));
    return modules.filter((m) => modsWithData.has(m.module_number));
  }, [modules, rubricaSeg, satisfaccion, informes, asistencia]);

  // ── Resolved institution set for filtering data ──
  const resolvedInstitutions = useMemo<string[] | null>(() => {
    if (filters.institucion.length > 0) return filters.institucion;
    if (filters.municipio.length > 0 || filters.entidad.length > 0) return institucionOptions;
    if (filters.region) return geo.getInstitucionesForRegion(filters.region);
    return null; // no geo filter → all data
  }, [filters.institucion, filters.municipio, filters.entidad, filters.region, institucionOptions, geo]);

  // ── Directivo options (from fichas filtered by resolved institutions) ──
  const directivoOptions = useMemo(() => {
    let pool = fichas.filter((f) => ["Rector/a", "Coordinador/a"].includes(f.cargo_actual) && f.numero_cedula);
    if (resolvedInstitutions) pool = pool.filter((f) => resolvedInstitutions.includes(f.nombre_ie));
    return pool
      .map((f) => ({ value: f.numero_cedula as string, label: f.nombres_apellidos }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [fichas, resolvedInstitutions]);

  // Filter helpers
  const filterByInst = (rows: any[], instField: string) => {
    if (!resolvedInstitutions) return rows;
    return rows.filter((x) => resolvedInstitutions.includes(x[instField]));
  };

  // Resolved directivo cédulas
  const resolvedCedulas = useMemo<Set<string> | null>(() => {
    if (filters.directivo.length > 0) return new Set(filters.directivo);
    return null;
  }, [filters.directivo]);

  // Filtered datasets
  const filteredFichas = useMemo(() => {
    let r = fichas;
    if (filters.region) r = r.filter((f) => f.region === filters.region);
    if (resolvedInstitutions) r = r.filter((f) => resolvedInstitutions.includes(f.nombre_ie));
    if (resolvedCedulas) r = r.filter((f) => resolvedCedulas.has(f.numero_cedula));
    return r;
  }, [fichas, filters.region, resolvedInstitutions, resolvedCedulas]);

  const filtered360 = useMemo(() => {
    let r = filterByInst(encuestas360, "institucion_educativa");
    if (resolvedCedulas) r = r.filter((e) => resolvedCedulas.has(e.cedula_directivo));
    return r;
  }, [encuestas360, resolvedInstitutions, resolvedCedulas]);

  const filteredRubrica = useMemo(() => {
    let r = rubricaSeg;
    if (filters.modulo) r = r.filter((x) => String(x.module_number) === filters.modulo);
    if (resolvedCedulas) r = r.filter((x) => resolvedCedulas.has(x.directivo_cedula));
    return r;
  }, [rubricaSeg, filters.modulo, resolvedCedulas]);

  const filteredAmbiente = useMemo(() => filterByInst(ambienteEsc, "institucion_educativa"), [ambienteEsc, resolvedInstitutions]);

  const filteredSatisfaccion = useMemo(() => {
    let r = satisfaccion;
    if (filters.region) r = r.filter((x) => x.region === filters.region);
    if (filters.modulo) r = r.filter((x) => String(x.module_number) === filters.modulo);
    return r;
  }, [satisfaccion, filters.region, filters.modulo]);

  const filteredInformes = useMemo(() => {
    let r = informes;
    if (filters.region) r = r.filter((x) => x.region === filters.region);
    if (filters.modulo) r = r.filter((x) => String(x.module_number) === filters.modulo);
    return r;
  }, [informes, filters.region, filters.modulo]);

  const filteredAsistencia = useMemo(() => {
    let r = asistencia;
    if (filters.modulo) r = r.filter((x) => String(x.module_number) === filters.modulo);
    if (resolvedCedulas) {
      r = r.filter((x) => resolvedCedulas.has(x.directivo_cedula));
    } else if (resolvedInstitutions) {
      const ceds = new Set(fichas.filter((f) => resolvedInstitutions.includes(f.nombre_ie)).map((f) => f.numero_cedula));
      r = r.filter((x) => ceds.has(x.directivo_cedula));
    }
    return r;
  }, [asistencia, filters.modulo, resolvedInstitutions, resolvedCedulas, fichas]);

  // ── Stats calculations ──

  // Fichas
  const fichasTotal = filteredFichas.length;
  const fichasByCargo = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFichas.forEach((f) => { counts[f.cargo_actual] = (counts[f.cargo_actual] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredFichas]);

  // 360
  const entrada360 = filtered360.filter((e) => e.fase === "inicial").length;
  const salida360 = filtered360.filter((e) => e.fase === "final").length;
  const by360Type = useMemo(() => {
    const counts: Record<string, { entrada: number; salida: number }> = {};
    filtered360.forEach((e) => {
      const t = e.tipo_formulario;
      if (!counts[t]) counts[t] = { entrada: 0, salida: 0 };
      counts[t][e.fase === "inicial" ? "entrada" : "salida"]++;
    });
    return Object.entries(counts).map(([name, v]) => ({ name: capitalize(name), ...v }));
  }, [filtered360]);

  // Rúbricas
  const rubricaByNivel = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRubrica.forEach((r) => { const n = r.nivel || "sin_evidencia"; counts[n] = (counts[n] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: capitalize(name.replace("_", " ")), value }));
  }, [filteredRubrica]);

  // Ambiente
  const ambienteByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAmbiente.forEach((a) => { counts[a.tipo_formulario] = (counts[a.tipo_formulario] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: capitalize(name), value }));
  }, [filteredAmbiente]);

  // Satisfacción — nivel general
  const satByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSatisfaccion.forEach((s) => { counts[s.form_type] = (counts[s.form_type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: capitalize(name), value }));
  }, [filteredSatisfaccion]);

  // Compute overall satisfaction % from grid/likert questions
  const satisfactionLevel = useMemo(() => {
    if (filteredSatisfaccion.length === 0) return null;

    // Group by form_type
    const byType: Record<string, any[]> = {};
    filteredSatisfaccion.forEach((s) => {
      if (!byType[s.form_type]) byType[s.form_type] = [];
      byType[s.form_type].push(s);
    });

    const typeAverages: { label: string; value: number }[] = [];

    for (const [formType, rows] of Object.entries(byType)) {
      const formDef = SATISFACCION_FORMS[formType] as SatisfaccionFormDef | undefined;
      if (!formDef) continue;

      const gridAvgs: number[] = [];

      for (const section of formDef.sections) {
        for (const q of section.questions) {
          if (q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") {
            if (section.title.toLowerCase().includes("autoevaluación") || section.title.toLowerCase().includes("autoevaluacion")) continue;

            const rowPcts: number[] = [];
            for (const row of (q.rows || [])) {
              let positiveCount = 0;
              let total = 0;
              for (const r of rows) {
                const gridVal = r.respuestas?.[q.key];
                if (gridVal && typeof gridVal === "object") {
                  const cellVal = gridVal[row.key];
                  if (cellVal !== undefined && cellVal !== null && cellVal !== "") {
                    total++;
                    if (q.type === "grid-sino" && cellVal === "si") positiveCount++;
                    else if (q.type === "grid-frequency" && (cellVal === "frecuentemente" || cellVal === "siempre" || cellVal === "algunas_veces")) positiveCount++;
                    else if (q.type === "grid-logistic" && (cellVal === "3" || cellVal === "4")) positiveCount++;
                  }
                }
              }
              if (total > 0) rowPcts.push((positiveCount / total) * 100);
            }
            if (rowPcts.length > 0) {
              gridAvgs.push(rowPcts.reduce((a, b) => a + b, 0) / rowPcts.length);
            }
          }
        }
      }

      if (gridAvgs.length > 0) {
        const avg = Math.round((gridAvgs.reduce((a, b) => a + b, 0) / gridAvgs.length) * 100) / 100;
        typeAverages.push({ label: capitalize(formType), value: avg });
      }
    }

    if (typeAverages.length === 0) return null;

    const overall = Math.round((typeAverages.reduce((a, b) => a + b.value, 0) / typeAverages.length) * 100) / 100;
    return { overall, byType: typeAverages };
  }, [filteredSatisfaccion]);

  // Asistencia
  // Total directivos (Rector/a + Coordinador/a) as denominator
  const totalDirectivos = useMemo(() => {
    const ceds = new Set<string>();
    filteredFichas
      .filter((f) => ["Rector/a", "Coordinador/a"].includes(f.cargo_actual))
      .forEach((f) => { if (f.numero_cedula) ceds.add(f.numero_cedula); });
    return ceds.size;
  }, [filteredFichas]);

  const asistenciaByDay = useMemo(() => {
    if (!totalDirectivos) return [];
    const days: Record<number, number> = {};
    filteredAsistencia.forEach((a) => {
      if (a.session_am) days[a.dia] = (days[a.dia] || 0) + 1;
    });
    return Object.entries(days)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dia, present]) => ({
        name: `Día ${dia}`,
        rate: Math.round((present / totalDirectivos) * 100),
        present,
        total: totalDirectivos,
      }));
  }, [filteredAsistencia, totalDirectivos]);

  const asistenciaStats = useMemo(() => {
    if (!totalDirectivos) return { total: 0, present: 0, rate: 0 };
    const present = filteredAsistencia.filter((a) => a.session_am).length;
    const numDays = new Set(filteredAsistencia.map((a) => a.dia)).size;
    const expectedTotal = totalDirectivos * numDays;
    return { total: totalDirectivos, present, rate: expectedTotal ? Math.round((present / expectedTotal) * 100) : 0 };
  }, [filteredAsistencia, totalDirectivos]);

  const hasFilters = filters.region || filters.modulo || filters.entidad.length > 0 || filters.municipio.length > 0 || filters.institucion.length > 0 || filters.directivo.length > 0;

  if (loading || geo.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Filters bar ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <FilterSelect label="Región" value={filters.region} options={regionOptions}
              onChange={(v) => setFilters({ ...EMPTY_FILTERS, region: v })} />
            <MultiFilterSelect label="Entidad Territorial" selected={filters.entidad} options={entidadOptions}
              onChange={(v) => setFilters((f) => ({ ...f, entidad: v, municipio: [], institucion: [] }))} />
            <MultiFilterSelect label="Municipio" selected={filters.municipio} options={municipioOptions}
              onChange={(v) => setFilters((f) => ({ ...f, municipio: v, institucion: [] }))} />
            <MultiFilterSelect label="Institución" selected={filters.institucion} options={institucionOptions}
              onChange={(v) => setFilters((f) => ({ ...f, institucion: v, directivo: [] }))} />
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">Directivo</label>
              <MultiSelect options={directivoOptions} selected={filters.directivo} onChange={(v) => setFilters((f) => ({ ...f, directivo: v }))} placeholder="Todos" className="h-9 text-sm" />
            </div>
            <FilterSelect label="Módulo" value={filters.modulo}
              options={moduleOptions.map((m) => String(m.module_number))}
              labels={moduleOptions.map((m) => `Módulo ${m.module_number}`)}
              onChange={(v) => setFilters((f) => ({ ...f, modulo: v }))} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)} className="gap-1.5 text-destructive">
                <X className="w-4 h-4" /> Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Fichas */}
        <KpiCard icon={FileText} title="Fichas de Información" value={fichasTotal} color="text-blue-600">
          {fichasByCargo.length > 0 && <MiniPie data={fichasByCargo} />}
        </KpiCard>

        {/* 360 */}
        <KpiCard icon={Gauge} title="Encuesta 360°" value={entrada360 + salida360} subtitle={`Entrada: ${entrada360} · Salida: ${salida360}`} color="text-violet-600">
          {by360Type.length > 0 && (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={by360Type} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="entrada" fill="hsl(var(--primary))" name="Entrada" radius={[2, 2, 0, 0]} />
                <Bar dataKey="salida" fill="hsl(210 60% 50%)" name="Salida" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </KpiCard>

        {/* Rúbricas */}
        <KpiCard icon={ClipboardCheck} title="Rúbricas (Seguimiento)" value={filteredRubrica.length} color="text-emerald-600">
          {rubricaByNivel.length > 0 && <MiniPie data={rubricaByNivel} />}
        </KpiCard>

        {/* Ambiente Escolar */}
        <KpiCard icon={School} title="Ambiente Escolar" value={filteredAmbiente.length} color="text-amber-600">
          {ambienteByType.length > 0 && <MiniPie data={ambienteByType} />}
        </KpiCard>

        {/* Satisfacción */}
        <KpiCard icon={ThumbsUp} title="Satisfacción" value={filteredSatisfaccion.length} color="text-pink-600">
          {satByType.length > 0 && <MiniPie data={satByType} />}
        </KpiCard>

        {/* Informe de Módulo */}
        <KpiCard icon={FileBarChart} title="Informes de Módulo" value={filteredInformes.length} color="text-indigo-600" />

        {/* Asistencia */}
        <KpiCard icon={CalendarCheck} title="Asistencia" value={`${asistenciaStats.total} directivos`} subtitle={`Presentes: ${asistenciaStats.present} registros · Tasa global: ${asistenciaStats.rate}%`} color="text-teal-600">
          {asistenciaByDay.length > 0 && (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={asistenciaByDay} margin={{ top: 18, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 110]} unit="%" ticks={[0, 25, 50, 75, 100]} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" name="Presencia" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </KpiCard>
      </div>
    </div>
  );
}

// ── Helpers ──

function MultiFilterSelect({ label, selected, options, onChange, disabled }: {
  label: string; selected: string[]; options: string[];
  onChange: (v: string[]) => void; disabled?: boolean;
}) {
  const opts = options.map((o) => ({ value: o, label: o }));
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <MultiSelect options={opts} selected={selected} onChange={onChange} placeholder="Todos" disabled={disabled} className="h-9 text-sm" />
    </div>
  );
}


function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function FilterSelect({ label, value, options, labels, onChange, disabled }: {
  label: string; value: string; options: string[]; labels?: string[];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)} disabled={disabled}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos</SelectItem>
          {options.map((o, i) => (
            <SelectItem key={o} value={o}>{labels ? labels[i] : o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, subtitle, color, children }: {
  icon: React.ElementType; title: string; value: string | number;
  subtitle?: string; color?: string; children?: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg bg-muted p-2 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

function MiniPie({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <ResponsiveContainer width={80} height={80}>
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={35} innerRadius={18} strokeWidth={1}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-0.5 text-[11px]">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-muted-foreground">{d.name}: <span className="font-medium text-foreground">{d.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
