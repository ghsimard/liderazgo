import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Plus, Trash2, FileText, Search, ArrowLeft, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAppImages } from "@/hooks/useAppImages";

/* ── Types ──────────────────────────────────────────── */

interface EquipoMember { id?: string; nombre: string; rol: string }
interface AjusteActividad { actividad: string; aciertos: string; desaciertos: string; ajustes: string }
interface DirectivoEval {
  id?: string;
  directivo_cedula: string;
  module_number: number;
  informe_id?: string;
  reto_estrategico: string;
  razon_sin_reto: string;
  avances_pedagogica: string;
  retos_pedagogica: string;
  avances_administrativa: string;
  retos_administrativa: string;
  avances_personal: string;
  retos_personal: string;
}
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

interface EvaluadorInfo { id: string; nombre: string; cedula: string }
interface AsignacionGroup { region: string; entidades: string[]; directivos: { cedula: string; nombre: string; ie: string }[] }

export default function InformeModulo() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_noletters;
  const logoCLT = images.logo_clt_noletters;

  // Auth
  const hasStoredCedula = !!sessionStorage.getItem("user_cedula");
  const [cedula, setCedula] = useState(sessionStorage.getItem("user_cedula") || "");
  const [searching, setSearching] = useState(false);
  const [evaluador, setEvaluador] = useState<EvaluadorInfo | null>(null);
  const autoSearchDone = useRef(false);

  // Groups (ET groupings from assigned directivos)
  const [groups, setGroups] = useState<AsignacionGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AsignacionGroup | null>(null);
  const [selectedModule, setSelectedModule] = useState<number>(1);

  // Form
  const [data, setData] = useState<InformeData | null>(null);
  const [equipo, setEquipo] = useState<EquipoMember[]>([]);
  const [directivoEvals, setDirectivoEvals] = useState<DirectivoEval[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-search on mount if cédula stored
  useEffect(() => {
    if (hasStoredCedula && !autoSearchDone.current) {
      autoSearchDone.current = true;
      handleSearch(cedula);
    }
  }, []);

  const handleSearch = async (overrideCedula?: string) => {
    const searchCedula = (overrideCedula || cedula).trim();
    if (!searchCedula) return;
    setSearching(true);

    try {
      const { data: evaluadores } = await supabase
        .from("rubrica_evaluadores")
        .select("id, nombre, cedula")
        .eq("cedula", searchCedula);

      if (!evaluadores || evaluadores.length === 0) {
        toast({ title: "No encontrado", description: "No se encontró un evaluador con esa cédula.", variant: "destructive" });
        return;
      }

      const ev = evaluadores[0];
      setEvaluador(ev);
      sessionStorage.setItem("user_cedula", searchCedula);

      // Load assigned directivos and group by region + ET
      const { data: assigns } = await supabase
        .from("rubrica_asignaciones")
        .select("directivo_cedula, directivo_nombre, institucion")
        .eq("evaluador_id", ev.id);

      if (!assigns || assigns.length === 0) {
        toast({ title: "Sin asignaciones", description: "No tiene directivos asignados.", variant: "destructive" });
        return;
      }

      // Get ficha data for each directivo to know region/ET
      const cedulas = assigns.map(a => a.directivo_cedula);
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("numero_cedula, nombres_apellidos, nombre_ie, region, entidad_territorial")
        .in("numero_cedula", cedulas);

      // Group by region
      const groupMap = new Map<string, AsignacionGroup>();
      (fichas || []).forEach(f => {
        const key = f.region;
        if (!groupMap.has(key)) {
          groupMap.set(key, { region: f.region, entidades: [], directivos: [] });
        }
        const grp = groupMap.get(key)!;
        if (f.entidad_territorial && !grp.entidades.includes(f.entidad_territorial)) {
          grp.entidades.push(f.entidad_territorial);
        }
        grp.directivos.push({ cedula: f.numero_cedula, nombre: f.nombres_apellidos, ie: f.nombre_ie });
      });

      const grps = Array.from(groupMap.values()).sort((a, b) => a.region.localeCompare(b.region));
      setGroups(grps);

      if (grps.length === 1) {
        selectGroup(grps[0]);
      }
    } finally {
      setSearching(false);
    }
  };

  const selectGroup = (group: AsignacionGroup) => {
    setSelectedGroup(group);
    loadInforme(group.region, group.entidades.join(", "), selectedModule, group.directivos);
  };

  useEffect(() => {
    if (selectedGroup) {
      loadInforme(selectedGroup.region, selectedGroup.entidades.join(", "), selectedModule, selectedGroup.directivos);
    }
  }, [selectedModule]);

  const loadInforme = async (region: string, et: string, moduleNum: number, directivos: { cedula: string; nombre: string; ie: string }[]) => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("informe_modulo")
      .select("*")
      .eq("region", region)
      .eq("module_number", moduleNum)
      .limit(1);

    if (rows && rows.length > 0) {
      const row = rows[0];
      setData({
        id: row.id, region: row.region, entidad_territorial: row.entidad_territorial,
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
      const { data: equipoRows } = await supabase.from("informe_modulo_equipo").select("*").eq("informe_id", row.id);
      setEquipo(equipoRows || []);
      // Load directivo evaluations
      await loadDirectivoEvals(moduleNum, directivos);
    } else {
      setData({
        region, entidad_territorial: et, module_number: moduleNum,
        fecha_inicio_intensivo: "", fecha_fin_intensivo: "",
        fecha_inicio_interludio: "", fecha_fin_interludio: "",
        aprendizajes_intensivo: "", ajustes_actividades: [],
        articulacion_intensivo: "",
        sesiones_programadas: { ...EMPTY_SESIONES }, sesiones_realizadas: { ...EMPTY_SESIONES },
        razones_diferencias: "", acompanamiento_descripcion: "", acompanamiento_no_cumplido: "",
        acompanamiento_directivos: directivos.map(d => ({
          cedula: d.cedula, nombre: d.nombre,
          coaching_individual: 0, otras_coaching: 0, visita_individual: 0, visita_grupal: 0,
          autoformacion: 0, intercambio_pares: 0, acompanamiento_virtual: 0, observacion: "",
        })),
        estrategias: [...DEFAULT_ESTRATEGIAS],
        aprendizajes_interludio: "", articulacion_interludio: "",
        contexto_plan_sectorial: "", contexto_articulacion: "",
        novedades: [],
      });
      setEquipo([{ nombre: "", rol: "" }]);
      // Load directivo evaluations for new informe
      await loadDirectivoEvals(moduleNum, directivos);
    }
    setDirty(false);
    setLoading(false);
  };

  const loadDirectivoEvals = async (moduleNum: number, directivos: { cedula: string; nombre: string; ie: string }[]) => {
    const cedulas = directivos.map(d => d.cedula);
    const { data: rows } = await supabase
      .from("informe_directivo")
      .select("*")
      .eq("module_number", moduleNum)
      .in("directivo_cedula", cedulas);

    const evalsMap = new Map<string, any>();
    (rows || []).forEach(r => evalsMap.set(r.directivo_cedula, r));

    const evals: DirectivoEval[] = directivos.map(d => {
      const existing = evalsMap.get(d.cedula);
      return existing ? {
        id: existing.id,
        directivo_cedula: existing.directivo_cedula,
        module_number: existing.module_number,
        informe_id: existing.informe_id,
        reto_estrategico: existing.reto_estrategico || "",
        razon_sin_reto: existing.razon_sin_reto || "",
        avances_pedagogica: existing.avances_pedagogica || "",
        retos_pedagogica: existing.retos_pedagogica || "",
        avances_administrativa: existing.avances_administrativa || "",
        retos_administrativa: existing.retos_administrativa || "",
        avances_personal: existing.avances_personal || "",
        retos_personal: existing.retos_personal || "",
      } : {
        directivo_cedula: d.cedula,
        module_number: moduleNum,
        reto_estrategico: "", razon_sin_reto: "",
        avances_pedagogica: "", retos_pedagogica: "",
        avances_administrativa: "", retos_administrativa: "",
        avances_personal: "", retos_personal: "",
      };
    });
    setDirectivoEvals(evals);
  };

  const updateDirectivoEval = (index: number, field: keyof DirectivoEval, value: string) => {
    setDirectivoEvals(prev => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [field]: value };
      return arr;
    });
    setDirty(true);
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
        region: data.region, entidad_territorial: data.entidad_territorial, module_number: data.module_number,
        fecha_inicio_intensivo: data.fecha_inicio_intensivo || null, fecha_fin_intensivo: data.fecha_fin_intensivo || null,
        fecha_inicio_interludio: data.fecha_inicio_interludio || null, fecha_fin_interludio: data.fecha_fin_interludio || null,
        aprendizajes_intensivo: data.aprendizajes_intensivo, ajustes_actividades: data.ajustes_actividades,
        articulacion_intensivo: data.articulacion_intensivo,
        sesiones_programadas: data.sesiones_programadas, sesiones_realizadas: data.sesiones_realizadas,
        razones_diferencias: data.razones_diferencias, acompanamiento_descripcion: data.acompanamiento_descripcion,
        acompanamiento_no_cumplido: data.acompanamiento_no_cumplido, acompanamiento_directivos: data.acompanamiento_directivos,
        estrategias: data.estrategias, aprendizajes_interludio: data.aprendizajes_interludio,
        articulacion_interludio: data.articulacion_interludio, contexto_plan_sectorial: data.contexto_plan_sectorial,
        contexto_articulacion: data.contexto_articulacion, novedades: data.novedades,
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

      if (informeId) {
        await supabase.from("informe_modulo_equipo").delete().eq("informe_id", informeId);
        const validEquipo = equipo.filter(e => e.nombre.trim());
        if (validEquipo.length > 0) {
          await supabase.from("informe_modulo_equipo").insert(
            validEquipo.map(e => ({ informe_id: informeId, nombre: e.nombre, rol: e.rol }))
          );
        }
      }

      // Save directivo evaluations
      for (const ev of directivoEvals) {
        const evPayload = {
          directivo_cedula: ev.directivo_cedula,
          module_number: data.module_number,
          informe_id: informeId || null,
          reto_estrategico: ev.reto_estrategico,
          razon_sin_reto: ev.razon_sin_reto,
          avances_pedagogica: ev.avances_pedagogica,
          retos_pedagogica: ev.retos_pedagogica,
          avances_administrativa: ev.avances_administrativa,
          retos_administrativa: ev.retos_administrativa,
          avances_personal: ev.avances_personal,
          retos_personal: ev.retos_personal,
        };
        if (ev.id) {
          await supabase.from("informe_directivo").update(evPayload).eq("id", ev.id);
        } else {
          const { data: inserted } = await supabase.from("informe_directivo").insert(evPayload).select("id").single();
          if (inserted) ev.id = inserted.id;
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

  const handleLogout = () => {
    sessionStorage.removeItem("user_cedula");
    setEvaluador(null);
    setCedula("");
    setGroups([]);
    setSelectedGroup(null);
    setData(null);
  };

  /* ── Login Screen ──────────────────────────────────── */
  if (!evaluador) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center gap-3 mb-2">
              {logoRLT && <img src={logoRLT} alt="RLT" className="h-10 w-auto" />}
              {logoCLT && <img src={logoCLT} alt="CLT" className="h-10 w-auto" />}
            </div>
            <CardTitle className="text-lg">Informe de Módulo</CardTitle>
            <p className="text-sm text-muted-foreground">Ingrese su cédula para acceder al formulario.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Número de cédula"
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={() => handleSearch()} disabled={searching || !cedula.trim()}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Group Selector ────────────────────────────────── */
  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Informe de Módulo</h1>
              <p className="text-sm text-muted-foreground">Bienvenido/a, {evaluador.nombre}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>Cerrar sesión</Button>
          </div>
          <p className="text-sm text-muted-foreground">Seleccione la Región para la cual desea diligenciar el informe:</p>
          {groups.map((g, i) => (
            <Card key={i} className="cursor-pointer hover:border-primary transition-colors" onClick={() => selectGroup(g)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Región {g.region}</p>
                  <p className="text-xs text-muted-foreground">{g.entidades.join(", ")} — {g.directivos.length} directivo(s)</p>
                </div>
                <Badge variant="secondary"><Users className="w-3.5 h-3.5 mr-1" />{g.directivos.length}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ── Form ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedGroup(null); setData(null); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Informe de Módulo — Región {selectedGroup.region}</h1>
              <p className="text-xs text-muted-foreground">{selectedGroup.entidades.join(", ")} · {evaluador.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(Number(v))}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map(m => <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
        ) : !data ? null : (
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
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Nombre</TableHead>
                      <TableHead className="text-xs">Rol en el equipo</TableHead>
                      <TableHead className="text-xs w-[50px]" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {equipo.map((m, i) => (
                        <TableRow key={i}>
                          <TableCell><Input value={m.nombre} onChange={e => { const arr = [...equipo]; arr[i] = { ...arr[i], nombre: e.target.value }; setEquipo(arr); setDirty(true); }} className="h-8 text-xs" placeholder="Nombre completo" /></TableCell>
                          <TableCell><Input value={m.rol} onChange={e => { const arr = [...equipo]; arr[i] = { ...arr[i], rol: e.target.value }; setEquipo(arr); setDirty(true); }} className="h-8 text-xs" placeholder="Rol" /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEquipo(equipo.filter((_, j) => j !== i)); setDirty(true); }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => { setEquipo([...equipo, { nombre: "", rol: "" }]); setDirty(true); }}><Plus className="w-3.5 h-3.5" /> Agregar integrante</Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. DESARROLLO DEL INTENSIVO */}
            <Card>
              <CardHeader><CardTitle className="text-sm">2. Desarrollo del Intensivo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-muted-foreground">Fecha de inicio</Label><Input type="date" value={data.fecha_inicio_intensivo} onChange={e => update("fecha_inicio_intensivo", e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Fecha de finalización</Label><Input type="date" value={data.fecha_fin_intensivo} onChange={e => update("fecha_fin_intensivo", e.target.value)} className="mt-1" /></div>
                </div>
                <div>
                  <Label className="text-xs font-medium">2.1. Aprendizajes del intensivo</Label>
                  <p className="text-[11px] text-muted-foreground mb-1">Identifique los aprendizajes del grupo de directivos docentes en el intensivo.</p>
                  <Textarea value={data.aprendizajes_intensivo} onChange={e => update("aprendizajes_intensivo", e.target.value)} rows={4} />
                </div>
                <div>
                  <Label className="text-xs font-medium">2.2. Ajuste a las actividades del intensivo</Label>
                  <Table className="mt-2">
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Actividad</TableHead>
                      <TableHead className="text-xs">Aciertos</TableHead>
                      <TableHead className="text-xs">Desaciertos</TableHead>
                      <TableHead className="text-xs">Ajustes realizados</TableHead>
                      <TableHead className="text-xs w-[50px]" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {data.ajustes_actividades.map((a, i) => (
                        <TableRow key={i}>
                          {(["actividad", "aciertos", "desaciertos", "ajustes"] as const).map(field => (
                            <TableCell key={field}><Textarea value={a[field]} onChange={e => { const arr = [...data.ajustes_actividades]; arr[i] = { ...arr[i], [field]: e.target.value }; update("ajustes_actividades", arr); }} className="text-xs min-h-[60px]" /></TableCell>
                          ))}
                          <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => update("ajustes_actividades", data.ajustes_actividades.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => update("ajustes_actividades", [...data.ajustes_actividades, { actividad: "", aciertos: "", desaciertos: "", ajustes: "" }])}><Plus className="w-3.5 h-3.5" /> Agregar actividad</Button>
                </div>
                <div>
                  <Label className="text-xs font-medium">2.3. Articulación con otros actores</Label>
                  <Textarea value={data.articulacion_intensivo} onChange={e => update("articulacion_intensivo", e.target.value)} rows={4} />
                </div>
              </CardContent>
            </Card>

            {/* 3. DESARROLLO DEL INTERLUDIO */}
            <Card>
              <CardHeader><CardTitle className="text-sm">3. Desarrollo del Interludio</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs text-muted-foreground">Fecha de inicio</Label><Input type="date" value={data.fecha_inicio_interludio} onChange={e => update("fecha_inicio_interludio", e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Fecha de finalización</Label><Input type="date" value={data.fecha_fin_interludio} onChange={e => update("fecha_fin_interludio", e.target.value)} className="mt-1" /></div>
                </div>
                {/* 3.1 Sesiones */}
                <div>
                  <Label className="text-xs font-medium">3.1. Sesiones programadas y realizadas</Label>
                  <div className="overflow-x-auto mt-2">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-xs" />
                        <TableHead className="text-xs text-center">Coach. ind.</TableHead>
                        <TableHead className="text-xs text-center">Coach. grupal</TableHead>
                        <TableHead className="text-xs text-center">Coach. relación</TableHead>
                        <TableHead className="text-xs text-center">Coach. sombra</TableHead>
                        <TableHead className="text-xs text-center">Total coaching</TableHead>
                        <TableHead className="text-xs text-center">Visita ind.</TableHead>
                        <TableHead className="text-xs text-center">Visita grupal</TableHead>
                        <TableHead className="text-xs text-center">Total visitas</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(["sesiones_programadas", "sesiones_realizadas"] as const).map(rowKey => {
                          const s = data[rowKey];
                          const totalC = s.coaching_individual + s.coaching_grupal + s.coaching_relacion + s.coaching_sombra;
                          const totalV = s.visita_individual + s.visita_grupal;
                          return (
                            <TableRow key={rowKey}>
                              <TableCell className="text-xs font-medium whitespace-nowrap">{rowKey === "sesiones_programadas" ? "# Programadas" : "# Realizadas"}</TableCell>
                              {(["coaching_individual", "coaching_grupal", "coaching_relacion", "coaching_sombra"] as const).map(col => (
                                <TableCell key={col} className="text-center"><Input type="number" min={0} value={s[col]} onChange={e => update(rowKey, { ...s, [col]: Number(e.target.value) || 0 })} className="h-7 text-xs w-16 mx-auto text-center" /></TableCell>
                              ))}
                              <TableCell className="text-center text-xs font-medium">{totalC}</TableCell>
                              {(["visita_individual", "visita_grupal"] as const).map(col => (
                                <TableCell key={col} className="text-center"><Input type="number" min={0} value={s[col]} onChange={e => update(rowKey, { ...s, [col]: Number(e.target.value) || 0 })} className="h-7 text-xs w-16 mx-auto text-center" /></TableCell>
                              ))}
                              <TableCell className="text-center text-xs font-medium">{totalV}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <Label className="text-xs text-muted-foreground mt-3 block">Razones de las diferencias</Label>
                  <Textarea value={data.razones_diferencias} onChange={e => update("razones_diferencias", e.target.value)} rows={3} className="mt-1" />
                </div>
                {/* 3.2 Acompañamiento */}
                <div>
                  <Label className="text-xs font-medium">3.2. Acompañamiento</Label>
                  <Textarea value={data.acompanamiento_descripcion} onChange={e => update("acompanamiento_descripcion", e.target.value)} rows={3} className="mt-1" placeholder="Describa el desarrollo del grupo..." />
                  <Label className="text-xs text-muted-foreground mt-3 block">Cuando no se cumplieron los objetivos</Label>
                  <Textarea value={data.acompanamiento_no_cumplido} onChange={e => update("acompanamiento_no_cumplido", e.target.value)} rows={3} className="mt-1" />
                  {/* Directivos table */}
                  <Label className="text-xs text-muted-foreground mt-3 block">Registro por directivo</Label>
                  <div className="overflow-x-auto mt-1">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-[10px] min-w-[140px]">Directivo</TableHead>
                        <TableHead className="text-[10px] text-center">Coach. Ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Otras coach.</TableHead>
                        <TableHead className="text-[10px] text-center">Visita ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Visita gr.</TableHead>
                        <TableHead className="text-[10px] text-center">Autoform.</TableHead>
                        <TableHead className="text-[10px] text-center">Int. pares</TableHead>
                        <TableHead className="text-[10px] text-center">Acomp. virtual</TableHead>
                        <TableHead className="text-[10px] min-w-[140px]">Observación</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {data.acompanamiento_directivos.map((ad, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{ad.nombre}</TableCell>
                            {(["coaching_individual", "otras_coaching", "visita_individual", "visita_grupal", "autoformacion", "intercambio_pares", "acompanamiento_virtual"] as const).map(col => (
                              <TableCell key={col} className="text-center"><Input type="number" min={0} value={ad[col]} onChange={e => { const arr = [...data.acompanamiento_directivos]; arr[i] = { ...arr[i], [col]: Number(e.target.value) || 0 }; update("acompanamiento_directivos", arr); }} className="h-7 text-xs w-14 mx-auto text-center" /></TableCell>
                            ))}
                            <TableCell><Input value={ad.observacion} onChange={e => { const arr = [...data.acompanamiento_directivos]; arr[i] = { ...arr[i], observacion: e.target.value }; update("acompanamiento_directivos", arr); }} className="h-7 text-xs" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Estrategias */}
                  <Label className="text-xs text-muted-foreground mt-3 block">Estrategias</Label>
                  <Table className="mt-1">
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Estrategia</TableHead>
                      <TableHead className="text-xs">Potenciar fortalezas</TableHead>
                      <TableHead className="text-xs">Superar dificultades</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {data.estrategias.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-medium">{e.nombre}</TableCell>
                          <TableCell><Textarea value={e.fortalezas} onChange={ev => { const arr = [...data.estrategias]; arr[i] = { ...arr[i], fortalezas: ev.target.value }; update("estrategias", arr); }} className="text-xs min-h-[50px]" /></TableCell>
                          <TableCell><Textarea value={e.dificultades} onChange={ev => { const arr = [...data.estrategias]; arr[i] = { ...arr[i], dificultades: ev.target.value }; update("estrategias", arr); }} className="text-xs min-h-[50px]" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <Label className="text-xs font-medium">3.3. Aprendizajes del interludio</Label>
                  <Textarea value={data.aprendizajes_interludio} onChange={e => update("aprendizajes_interludio", e.target.value)} rows={4} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">3.4. Articulación con otros actores en el interludio</Label>
                  <Textarea value={data.articulacion_interludio} onChange={e => update("articulacion_interludio", e.target.value)} rows={4} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* 4. CONTEXTO */}
            <Card>
              <CardHeader><CardTitle className="text-sm">4. Reconocimiento del contexto de política educativa</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Estrategia del Plan Sectorial</Label>
                  <Textarea value={data.contexto_plan_sectorial} onChange={e => update("contexto_plan_sectorial", e.target.value)} rows={4} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Articulación con programas o proyectos</Label>
                  <Textarea value={data.contexto_articulacion} onChange={e => update("contexto_articulacion", e.target.value)} rows={4} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* 5. NOVEDADES */}
            <Card>
              <CardHeader><CardTitle className="text-sm">5. Novedades</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Nombre Directivo</TableHead>
                    <TableHead className="text-xs">Institución Educativa</TableHead>
                    <TableHead className="text-xs">Novedad</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Soporte</TableHead>
                    <TableHead className="text-xs w-[50px]" />
                  </TableRow></TableHeader>
                  <TableBody>
                    {data.novedades.map((n, i) => (
                      <TableRow key={i}>
                        <TableCell><Input value={n.nombre} onChange={e => { const arr = [...data.novedades]; arr[i] = { ...arr[i], nombre: e.target.value }; update("novedades", arr); }} className="h-7 text-xs" /></TableCell>
                        <TableCell><Input value={n.institucion} onChange={e => { const arr = [...data.novedades]; arr[i] = { ...arr[i], institucion: e.target.value }; update("novedades", arr); }} className="h-7 text-xs" /></TableCell>
                        <TableCell>
                          <Select value={n.novedad || "none"} onValueChange={v => { const arr = [...data.novedades]; arr[i] = { ...arr[i], novedad: v === "none" ? "" : v }; update("novedades", arr); }}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent><SelectItem value="none">—</SelectItem>{NOVEDAD_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="date" value={n.fecha} onChange={e => { const arr = [...data.novedades]; arr[i] = { ...arr[i], fecha: e.target.value }; update("novedades", arr); }} className="h-7 text-xs" /></TableCell>
                        <TableCell><Input value={n.soporte} onChange={e => { const arr = [...data.novedades]; arr[i] = { ...arr[i], soporte: e.target.value }; update("novedades", arr); }} className="h-7 text-xs" /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => update("novedades", data.novedades.filter((_, j) => j !== i))}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => update("novedades", [...data.novedades, { nombre: "", institucion: "", novedad: "", fecha: "", soporte: "" }])}><Plus className="w-3.5 h-3.5" /> Agregar novedad</Button>
              </CardContent>
            </Card>

            {/* 6. EVALUACIÓN INDIVIDUAL (DD) */}
            <Card>
              <CardHeader><CardTitle className="text-sm">6. Evaluación Individual (DD)</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {directivoEvals.map((ev, i) => {
                  const dirInfo = selectedGroup.directivos.find(d => d.cedula === ev.directivo_cedula);
                  return (
                    <div key={ev.directivo_cedula} className="border rounded-lg p-4 space-y-4 bg-muted/10">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">CC: {ev.directivo_cedula}</Badge>
                        <span className="text-sm font-medium">{dirInfo?.nombre || ev.directivo_cedula}</span>
                        {dirInfo?.ie && <span className="text-xs text-muted-foreground">— {dirInfo.ie}</span>}
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Reto estratégico</Label>
                        <Textarea value={ev.reto_estrategico} onChange={e => updateDirectivoEval(i, "reto_estrategico", e.target.value)} rows={3} className="mt-1" placeholder="Describa el reto estratégico del directivo…" />
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Razón si no tiene reto</Label>
                        <Textarea value={ev.razon_sin_reto} onChange={e => updateDirectivoEval(i, "razon_sin_reto", e.target.value)} rows={2} className="mt-1" placeholder="Si no aplica, indique la razón…" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Gestión Pedagógica */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-primary">Gestión Pedagógica</Label>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Avances</Label>
                            <Textarea value={ev.avances_pedagogica} onChange={e => updateDirectivoEval(i, "avances_pedagogica", e.target.value)} rows={3} className="text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Retos</Label>
                            <Textarea value={ev.retos_pedagogica} onChange={e => updateDirectivoEval(i, "retos_pedagogica", e.target.value)} rows={3} className="text-xs" />
                          </div>
                        </div>

                        {/* Gestión Administrativa */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-primary">Gestión Administrativa</Label>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Avances</Label>
                            <Textarea value={ev.avances_administrativa} onChange={e => updateDirectivoEval(i, "avances_administrativa", e.target.value)} rows={3} className="text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Retos</Label>
                            <Textarea value={ev.retos_administrativa} onChange={e => updateDirectivoEval(i, "retos_administrativa", e.target.value)} rows={3} className="text-xs" />
                          </div>
                        </div>

                        {/* Gestión Personal */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-primary">Gestión Personal</Label>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Avances</Label>
                            <Textarea value={ev.avances_personal} onChange={e => updateDirectivoEval(i, "avances_personal", e.target.value)} rows={3} className="text-xs" />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Retos</Label>
                            <Textarea value={ev.retos_personal} onChange={e => updateDirectivoEval(i, "retos_personal", e.target.value)} rows={3} className="text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {directivoEvals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay directivos asignados para esta región.</p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pb-8">
              <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar informe
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
