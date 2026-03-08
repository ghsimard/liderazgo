import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Plus, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

/* ── Types ──────────────────────────────────────────── */

interface EquipoMember { id?: string; nombre: string; rol: string }

interface AjusteActividad { actividad: string; aciertos: string; desaciertos: string; ajustes: string }

interface SesionesProgramadas {
  coaching_individual: number; coaching_grupal: number; coaching_relacion: number;
  coaching_sombra: number; visita_individual: number; visita_grupal: number;
}

interface AcompanamientoDirectivo {
  cedula: string; nombre: string;
  coaching_individual: number; otras_coaching: number;
  visita_individual: number; visita_grupal: number;
  autoformacion: number; intercambio_pares: number;
  acompanamiento_virtual: number; observacion: string;
}

interface Estrategia { nombre: string; fortalezas: string; dificultades: string }

interface Novedad { nombre: string; institucion: string; novedad: string; fecha: string; soporte: string }

interface InformeData {
  id?: string;
  region: string;
  entidad_territorial: string;
  module_number: number;
  fecha_inicio_intensivo: string;
  fecha_fin_intensivo: string;
  fecha_inicio_interludio: string;
  fecha_fin_interludio: string;
  aprendizajes_intensivo: string;
  ajustes_actividades: AjusteActividad[];
  articulacion_intensivo: string;
  sesiones_programadas: SesionesProgramadas;
  sesiones_realizadas: SesionesProgramadas;
  razones_diferencias: string;
  acompanamiento_descripcion: string;
  acompanamiento_no_cumplido: string;
  acompanamiento_directivos: AcompanamientoDirectivo[];
  estrategias: Estrategia[];
  aprendizajes_interludio: string;
  articulacion_interludio: string;
  contexto_plan_sectorial: string;
  contexto_articulacion: string;
  novedades: Novedad[];
}

const EMPTY_SESIONES: SesionesProgramadas = {
  coaching_individual: 0, coaching_grupal: 0, coaching_relacion: 0,
  coaching_sombra: 0, visita_individual: 0, visita_grupal: 0,
};

const DEFAULT_ESTRATEGIAS: Estrategia[] = [
  { nombre: "Coaching", fortalezas: "", dificultades: "" },
  { nombre: "Visita", fortalezas: "", dificultades: "" },
  { nombre: "Autoformación", fortalezas: "", dificultades: "" },
  { nombre: "Intercambio de pares", fortalezas: "", dificultades: "" },
  { nombre: "Acompañamiento virtual", fortalezas: "", dificultades: "" },
];

const NOVEDAD_OPTIONS = ["Retiro", "Traslado", "Cambio", "Ingreso"];

const MODULES = [1, 2, 3, 4];

export default function AdminInformeModuloForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Filters
  const [regiones, setRegiones] = useState<string[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedET, setSelectedET] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<number>(1);

  // Directivos for the ET (for acompañamiento table)
  const [directivosET, setDirectivosET] = useState<{ cedula: string; nombre: string; ie: string }[]>([]);

  // Form data
  const [data, setData] = useState<InformeData | null>(null);
  const [equipo, setEquipo] = useState<EquipoMember[]>([]);

  // Load regions & ETs from fichas
  useEffect(() => {
    (async () => {
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("region, entidad_territorial")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas) {
        const regs = [...new Set(fichas.map((f: any) => f.region).filter(Boolean))].sort() as string[];
        setRegiones(regs);
      }
      setLoading(false);
    })();
  }, []);

  // Filter ETs by region
  useEffect(() => {
    if (!selectedRegion) { setEntidades([]); return; }
    (async () => {
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("entidad_territorial")
        .eq("region", selectedRegion)
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas) {
        const ets = [...new Set(fichas.map((f: any) => f.entidad_territorial).filter(Boolean))].sort() as string[];
        setEntidades(ets);
      }
    })();
  }, [selectedRegion]);

  // Load informe when filters change
  useEffect(() => {
    if (!selectedRegion || !selectedET) return;
    loadInforme();
    loadDirectivosET();
  }, [selectedRegion, selectedET, selectedModule]);

  const loadDirectivosET = async () => {
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("numero_cedula, nombres_apellidos, nombre_ie")
      .eq("region", selectedRegion)
      .eq("entidad_territorial", selectedET)
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");
    if (fichas) {
      setDirectivosET(fichas.map((f: any) => ({ cedula: f.numero_cedula, nombre: f.nombres_apellidos, ie: f.nombre_ie })));
    }
  };

  const loadInforme = async () => {
    const { data: rows } = await supabase
      .from("informe_modulo")
      .select("*")
      .eq("region", selectedRegion)
      .eq("entidad_territorial", selectedET)
      .eq("module_number", selectedModule)
      .limit(1);

    if (rows && rows.length > 0) {
      const row = rows[0];
      setData({
        id: row.id,
        region: row.region,
        entidad_territorial: row.entidad_territorial,
        module_number: row.module_number,
        fecha_inicio_intensivo: row.fecha_inicio_intensivo || "",
        fecha_fin_intensivo: row.fecha_fin_intensivo || "",
        fecha_inicio_interludio: row.fecha_inicio_interludio || "",
        fecha_fin_interludio: row.fecha_fin_interludio || "",
        aprendizajes_intensivo: row.aprendizajes_intensivo || "",
        ajustes_actividades: (row.ajustes_actividades as AjusteActividad[]) || [],
        articulacion_intensivo: row.articulacion_intensivo || "",
        sesiones_programadas: (row.sesiones_programadas as SesionesProgramadas) || { ...EMPTY_SESIONES },
        sesiones_realizadas: (row.sesiones_realizadas as SesionesProgramadas) || { ...EMPTY_SESIONES },
        razones_diferencias: row.razones_diferencias || "",
        acompanamiento_descripcion: row.acompanamiento_descripcion || "",
        acompanamiento_no_cumplido: row.acompanamiento_no_cumplido || "",
        acompanamiento_directivos: (row.acompanamiento_directivos as AcompanamientoDirectivo[]) || [],
        estrategias: (row.estrategias as Estrategia[]) || [...DEFAULT_ESTRATEGIAS],
        aprendizajes_interludio: row.aprendizajes_interludio || "",
        articulacion_interludio: row.articulacion_interludio || "",
        contexto_plan_sectorial: row.contexto_plan_sectorial || "",
        contexto_articulacion: row.contexto_articulacion || "",
        novedades: (row.novedades as Novedad[]) || [],
      });

      // Load equipo
      const { data: equipoRows } = await supabase
        .from("informe_modulo_equipo")
        .select("*")
        .eq("informe_id", row.id);
      setEquipo(equipoRows || []);
    } else {
      // Initialize empty
      setData({
        region: selectedRegion,
        entidad_territorial: selectedET,
        module_number: selectedModule,
        fecha_inicio_intensivo: "",
        fecha_fin_intensivo: "",
        fecha_inicio_interludio: "",
        fecha_fin_interludio: "",
        aprendizajes_intensivo: "",
        ajustes_actividades: [],
        articulacion_intensivo: "",
        sesiones_programadas: { ...EMPTY_SESIONES },
        sesiones_realizadas: { ...EMPTY_SESIONES },
        razones_diferencias: "",
        acompanamiento_descripcion: "",
        acompanamiento_no_cumplido: "",
        acompanamiento_directivos: directivosET.map(d => ({
          cedula: d.cedula, nombre: d.nombre,
          coaching_individual: 0, otras_coaching: 0,
          visita_individual: 0, visita_grupal: 0,
          autoformacion: 0, intercambio_pares: 0,
          acompanamiento_virtual: 0, observacion: "",
        })),
        estrategias: [...DEFAULT_ESTRATEGIAS],
        aprendizajes_interludio: "",
        articulacion_interludio: "",
        contexto_plan_sectorial: "",
        contexto_articulacion: "",
        novedades: [],
      });
      setEquipo([{ nombre: "", rol: "" }]);
    }
    setDirty(false);
  };

  const update = <K extends keyof InformeData>(key: K, val: InformeData[K]) => {
    setData(prev => prev ? { ...prev, [key]: val } : prev);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const payload = {
        region: data.region,
        entidad_territorial: data.entidad_territorial,
        module_number: data.module_number,
        fecha_inicio_intensivo: data.fecha_inicio_intensivo || null,
        fecha_fin_intensivo: data.fecha_fin_intensivo || null,
        fecha_inicio_interludio: data.fecha_inicio_interludio || null,
        fecha_fin_interludio: data.fecha_fin_interludio || null,
        aprendizajes_intensivo: data.aprendizajes_intensivo,
        ajustes_actividades: data.ajustes_actividades,
        articulacion_intensivo: data.articulacion_intensivo,
        sesiones_programadas: data.sesiones_programadas,
        sesiones_realizadas: data.sesiones_realizadas,
        razones_diferencias: data.razones_diferencias,
        acompanamiento_descripcion: data.acompanamiento_descripcion,
        acompanamiento_no_cumplido: data.acompanamiento_no_cumplido,
        acompanamiento_directivos: data.acompanamiento_directivos,
        estrategias: data.estrategias,
        aprendizajes_interludio: data.aprendizajes_interludio,
        articulacion_interludio: data.articulacion_interludio,
        contexto_plan_sectorial: data.contexto_plan_sectorial,
        contexto_articulacion: data.contexto_articulacion,
        novedades: data.novedades,
      };

      let informeId = data.id;

      if (data.id) {
        const { error } = await supabase.from("informe_modulo").update(payload).eq("id", data.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("informe_modulo").insert(payload).select("id").single();
        if (error) throw error;
        informeId = inserted.id;
        setData(prev => prev ? { ...prev, id: informeId } : prev);
      }

      // Save equipo
      if (informeId) {
        await supabase.from("informe_modulo_equipo").delete().eq("informe_id", informeId);
        const validEquipo = equipo.filter(e => e.nombre.trim());
        if (validEquipo.length > 0) {
          await supabase.from("informe_modulo_equipo").insert(
            validEquipo.map(e => ({ informe_id: informeId, nombre: e.nombre, rol: e.rol }))
          );
        }
      }

      toast({ title: "Guardado", description: "El informe se ha guardado correctamente." });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Region / ET / Module selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map(m => <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={v => { setSelectedRegion(v); setSelectedET(""); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Región" /></SelectTrigger>
              <SelectContent>
                {regiones.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedET} onValueChange={setSelectedET} disabled={!selectedRegion}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Entidad Territorial" /></SelectTrigger>
              <SelectContent>
                {entidades.map(et => <SelectItem key={et} value={et}>{et}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              {data?.id && <Badge variant="secondary">Guardado</Badge>}
              <Button onClick={handleSave} disabled={saving || !dirty || !selectedET} size="sm" className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedET ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Seleccione una región y una entidad territorial para comenzar.
        </CardContent></Card>
      ) : !data ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
      ) : (
        <>
          {/* 1. IDENTIFICACIÓN */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> 1. Identificación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Región</Label><Input value={data.region} disabled className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Entidad Territorial</Label><Input value={data.entidad_territorial} disabled className="mt-1" /></div>
              </div>

              <div>
                <Label className="text-xs font-medium">Integrantes del equipo local</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Rol en el equipo</TableHead>
                      <TableHead className="text-xs w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipo.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={m.nombre} onChange={e => {
                            const arr = [...equipo]; arr[i] = { ...arr[i], nombre: e.target.value }; setEquipo(arr); setDirty(true);
                          }} className="h-8 text-xs" placeholder="Nombre completo" />
                        </TableCell>
                        <TableCell>
                          <Input value={m.rol} onChange={e => {
                            const arr = [...equipo]; arr[i] = { ...arr[i], rol: e.target.value }; setEquipo(arr); setDirty(true);
                          }} className="h-8 text-xs" placeholder="Rol" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setEquipo(equipo.filter((_, j) => j !== i)); setDirty(true);
                          }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => { setEquipo([...equipo, { nombre: "", rol: "" }]); setDirty(true); }}>
                  <Plus className="w-3.5 h-3.5" /> Agregar integrante
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. DESARROLLO DEL INTENSIVO */}
          <Card>
            <CardHeader><CardTitle className="text-sm">2. Desarrollo del Intensivo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Fecha de inicio</Label>
                  <Input type="date" value={data.fecha_inicio_intensivo} onChange={e => update("fecha_inicio_intensivo", e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Fecha de finalización</Label>
                  <Input type="date" value={data.fecha_fin_intensivo} onChange={e => update("fecha_fin_intensivo", e.target.value)} className="mt-1" /></div>
              </div>

              <div>
                <Label className="text-xs font-medium">2.1. Aprendizajes del intensivo</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Identifique los aprendizajes del grupo de directivos docentes en el intensivo.</p>
                <Textarea value={data.aprendizajes_intensivo} onChange={e => update("aprendizajes_intensivo", e.target.value)} rows={4} />
              </div>

              {/* 2.2 Ajustes */}
              <div>
                <Label className="text-xs font-medium">2.2. Ajuste a las actividades del intensivo</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Describa aquellas actividades que tuvieron que ser ajustadas.</p>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Actividad</TableHead>
                      <TableHead className="text-xs">Aciertos</TableHead>
                      <TableHead className="text-xs">Desaciertos</TableHead>
                      <TableHead className="text-xs">Ajustes realizados</TableHead>
                      <TableHead className="text-xs w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ajustes_actividades.map((a, i) => (
                      <TableRow key={i}>
                        {(["actividad", "aciertos", "desaciertos", "ajustes"] as const).map(field => (
                          <TableCell key={field}>
                            <Textarea value={a[field]} onChange={e => {
                              const arr = [...data.ajustes_actividades]; arr[i] = { ...arr[i], [field]: e.target.value };
                              update("ajustes_actividades", arr);
                            }} className="text-xs min-h-[60px]" />
                          </TableCell>
                        ))}
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            update("ajustes_actividades", data.ajustes_actividades.filter((_, j) => j !== i));
                          }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => {
                  update("ajustes_actividades", [...data.ajustes_actividades, { actividad: "", aciertos: "", desaciertos: "", ajustes: "" }]);
                }}><Plus className="w-3.5 h-3.5" /> Agregar actividad</Button>
              </div>

              {/* 2.3 Articulación */}
              <div>
                <Label className="text-xs font-medium">2.3. Articulación con otros actores</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Describa cómo se articulan actores como el MEN, la Secretaría de Educación, Universidades o aliados.</p>
                <Textarea value={data.articulacion_intensivo} onChange={e => update("articulacion_intensivo", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* 3. DESARROLLO DEL INTERLUDIO */}
          <Card>
            <CardHeader><CardTitle className="text-sm">3. Desarrollo del Interludio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Fecha de inicio</Label>
                  <Input type="date" value={data.fecha_inicio_interludio} onChange={e => update("fecha_inicio_interludio", e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Fecha de finalización</Label>
                  <Input type="date" value={data.fecha_fin_interludio} onChange={e => update("fecha_fin_interludio", e.target.value)} className="mt-1" /></div>
              </div>

              {/* 3.1 Sesiones */}
              <div>
                <Label className="text-xs font-medium">3.1. Sesiones programadas y realizadas</Label>
                <div className="overflow-x-auto mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs" />
                        <TableHead className="text-xs text-center">Coaching individual</TableHead>
                        <TableHead className="text-xs text-center">Coaching grupal</TableHead>
                        <TableHead className="text-xs text-center">Coaching relación</TableHead>
                        <TableHead className="text-xs text-center">Coaching sombra</TableHead>
                        <TableHead className="text-xs text-center">Total coaching</TableHead>
                        <TableHead className="text-xs text-center">Visita individual</TableHead>
                        <TableHead className="text-xs text-center">Visita grupal</TableHead>
                        <TableHead className="text-xs text-center">Total visitas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(["sesiones_programadas", "sesiones_realizadas"] as const).map(rowKey => {
                        const s = data[rowKey];
                        const totalCoaching = s.coaching_individual + s.coaching_grupal + s.coaching_relacion + s.coaching_sombra;
                        const totalVisitas = s.visita_individual + s.visita_grupal;
                        return (
                          <TableRow key={rowKey}>
                            <TableCell className="text-xs font-medium whitespace-nowrap">
                              {rowKey === "sesiones_programadas" ? "# Programadas" : "# Realizadas"}
                            </TableCell>
                            {(["coaching_individual", "coaching_grupal", "coaching_relacion", "coaching_sombra"] as const).map(col => (
                              <TableCell key={col} className="text-center">
                                <Input type="number" min={0} value={s[col]} onChange={e => {
                                  update(rowKey, { ...s, [col]: Number(e.target.value) || 0 });
                                }} className="h-7 text-xs w-16 mx-auto text-center" />
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-xs font-medium">{totalCoaching}</TableCell>
                            {(["visita_individual", "visita_grupal"] as const).map(col => (
                              <TableCell key={col} className="text-center">
                                <Input type="number" min={0} value={s[col]} onChange={e => {
                                  update(rowKey, { ...s, [col]: Number(e.target.value) || 0 });
                                }} className="h-7 text-xs w-16 mx-auto text-center" />
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-xs font-medium">{totalVisitas}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Razones de las diferencias entre lo programado y lo realizado</Label>
                  <Textarea value={data.razones_diferencias} onChange={e => update("razones_diferencias", e.target.value)} rows={3} className="mt-1" />
                </div>
              </div>

              {/* 3.2 Acompañamiento */}
              <div>
                <Label className="text-xs font-medium">3.2. Acompañamiento</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Describa el desarrollo del grupo en relación con los objetivos trazados para el interludio.</p>
                <Textarea value={data.acompanamiento_descripcion} onChange={e => update("acompanamiento_descripcion", e.target.value)} rows={3} />

                <p className="text-[11px] text-muted-foreground mt-3 mb-1">Explique qué sucedió cuando no se cumplieron los objetivos.</p>
                <Textarea value={data.acompanamiento_no_cumplido} onChange={e => update("acompanamiento_no_cumplido", e.target.value)} rows={3} />

                {/* Directivos table */}
                <Label className="text-xs text-muted-foreground mt-3 block">Registro de sesiones por directivo</Label>
                <div className="overflow-x-auto mt-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] min-w-[150px]">Directivo</TableHead>
                        <TableHead className="text-[10px] text-center">Coach. Ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Otras coach.</TableHead>
                        <TableHead className="text-[10px] text-center">Visita ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Visita gr.</TableHead>
                        <TableHead className="text-[10px] text-center">Autoform.</TableHead>
                        <TableHead className="text-[10px] text-center">Int. pares</TableHead>
                        <TableHead className="text-[10px] text-center">Acomp. virtual</TableHead>
                        <TableHead className="text-[10px] min-w-[150px]">Observación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.acompanamiento_directivos.map((ad, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{ad.nombre}</TableCell>
                          {(["coaching_individual", "otras_coaching", "visita_individual", "visita_grupal", "autoformacion", "intercambio_pares", "acompanamiento_virtual"] as const).map(col => (
                            <TableCell key={col} className="text-center">
                              <Input type="number" min={0} value={ad[col]} onChange={e => {
                                const arr = [...data.acompanamiento_directivos];
                                arr[i] = { ...arr[i], [col]: Number(e.target.value) || 0 };
                                update("acompanamiento_directivos", arr);
                              }} className="h-7 text-xs w-14 mx-auto text-center" />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Input value={ad.observacion} onChange={e => {
                              const arr = [...data.acompanamiento_directivos];
                              arr[i] = { ...arr[i], observacion: e.target.value };
                              update("acompanamiento_directivos", arr);
                            }} className="h-7 text-xs" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Estrategias */}
                <Label className="text-xs text-muted-foreground mt-3 block">Acciones para potenciar fortalezas y superar dificultades</Label>
                <Table className="mt-1">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Estrategia</TableHead>
                      <TableHead className="text-xs">Acciones para potenciar fortalezas</TableHead>
                      <TableHead className="text-xs">Acciones para superar dificultades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.estrategias.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-medium">{e.nombre}</TableCell>
                        <TableCell>
                          <Textarea value={e.fortalezas} onChange={ev => {
                            const arr = [...data.estrategias]; arr[i] = { ...arr[i], fortalezas: ev.target.value };
                            update("estrategias", arr);
                          }} className="text-xs min-h-[50px]" />
                        </TableCell>
                        <TableCell>
                          <Textarea value={e.dificultades} onChange={ev => {
                            const arr = [...data.estrategias]; arr[i] = { ...arr[i], dificultades: ev.target.value };
                            update("estrategias", arr);
                          }} className="text-xs min-h-[50px]" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 3.3 Aprendizajes interludio */}
              <div>
                <Label className="text-xs font-medium">3.3. Aprendizajes del interludio</Label>
                <Textarea value={data.aprendizajes_interludio} onChange={e => update("aprendizajes_interludio", e.target.value)} rows={4} className="mt-1" />
              </div>

              {/* 3.4 Articulación interludio */}
              <div>
                <Label className="text-xs font-medium">3.4. Articulación con otros actores en el interludio</Label>
                <Textarea value={data.articulacion_interludio} onChange={e => update("articulacion_interludio", e.target.value)} rows={4} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* 4. CONTEXTO DE POLÍTICA EDUCATIVA */}
          <Card>
            <CardHeader><CardTitle className="text-sm">4. Reconocimiento del contexto de política educativa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Estrategia del Plan Sectorial de Educación</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Indique la estrategia del Plan Sectorial o Plan de desarrollo de la que hace parte la implementación del Programa RLT.</p>
                <Textarea value={data.contexto_plan_sectorial} onChange={e => update("contexto_plan_sectorial", e.target.value)} rows={4} />
              </div>
              <div>
                <Label className="text-xs font-medium">Articulación con programas o proyectos</Label>
                <p className="text-[11px] text-muted-foreground mb-1">Indique con qué Programas, Proyectos o Iniciativas está articulado el Programa RLT y cómo funcionó esta articulación durante este módulo.</p>
                <Textarea value={data.contexto_articulacion} onChange={e => update("contexto_articulacion", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* 5. NOVEDADES */}
          <Card>
            <CardHeader><CardTitle className="text-sm">5. Novedades</CardTitle></CardHeader>
            <CardContent>
              <p className="text-[11px] text-muted-foreground mb-2">Indique los retiros, traslados, cambios o ingresos de directivos docentes durante el módulo.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nombre Directivo</TableHead>
                    <TableHead className="text-xs">Institución Educativa</TableHead>
                    <TableHead className="text-xs">Novedad</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Soporte</TableHead>
                    <TableHead className="text-xs w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.novedades.map((n, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input value={n.nombre} onChange={e => {
                          const arr = [...data.novedades]; arr[i] = { ...arr[i], nombre: e.target.value };
                          update("novedades", arr);
                        }} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Input value={n.institucion} onChange={e => {
                          const arr = [...data.novedades]; arr[i] = { ...arr[i], institucion: e.target.value };
                          update("novedades", arr);
                        }} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Select value={n.novedad || "none"} onValueChange={v => {
                          const arr = [...data.novedades]; arr[i] = { ...arr[i], novedad: v === "none" ? "" : v };
                          update("novedades", arr);
                        }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {NOVEDAD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={n.fecha} onChange={e => {
                          const arr = [...data.novedades]; arr[i] = { ...arr[i], fecha: e.target.value };
                          update("novedades", arr);
                        }} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Input value={n.soporte} onChange={e => {
                          const arr = [...data.novedades]; arr[i] = { ...arr[i], soporte: e.target.value };
                          update("novedades", arr);
                        }} className="h-7 text-xs" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          update("novedades", data.novedades.filter((_, j) => j !== i));
                        }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => {
                update("novedades", [...data.novedades, { nombre: "", institucion: "", novedad: "", fecha: "", soporte: "" }]);
              }}><Plus className="w-3.5 h-3.5" /> Agregar novedad</Button>
            </CardContent>
          </Card>

          {/* Bottom save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar informe
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
