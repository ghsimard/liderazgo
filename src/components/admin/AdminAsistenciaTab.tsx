import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, Filter, CalendarCheck, Loader2 } from "lucide-react";

interface Directivo {
  numero_cedula: string;
  nombres_apellidos: string;
  nombre_ie: string;
  codigo_dane: string | null;
  region: string;
  entidad_territorial: string | null;
}

interface AsistenciaRow {
  id?: string;
  directivo_cedula: string;
  module_number: number;
  dia: number;
  session_am: boolean;
  session_pm: boolean;
  razon_inasistencia: string;
  observaciones: string;
}

const MODULES = [1, 2, 3, 4];
const DAYS = [1, 2, 3, 4, 5];
const RAZONES_INASISTENCIA = [
  "Diligencias de salud",
  "Diligencias de la Secretaría de Educación",
  "Diligencias MEN u otras instituciones",
  "Situaciones personales",
  "Situaciones institucionales que requerían su presencia",
  "Otras",
];

export default function AdminAsistenciaTab() {
  const { toast } = useToast();
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [regiones, setRegiones] = useState<string[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [asistencia, setAsistencia] = useState<Map<string, AsistenciaRow>>(new Map());
  const [selectedModule, setSelectedModule] = useState<number>(1);
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedET, setSelectedET] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadDirectivos();
  }, []);

  useEffect(() => {
    loadAsistencia();
  }, [selectedModule]);

  const loadDirectivos = async () => {
    const { data } = await supabase
      .from("fichas_rlt")
      .select("numero_cedula, nombres_apellidos, nombre_ie, codigo_dane, region, entidad_territorial")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    if (data) {
      setDirectivos(data.filter(d => d.numero_cedula));
      const regs = [...new Set(data.map(d => d.region).filter(Boolean))] as string[];
      const ets = [...new Set(data.map(d => d.entidad_territorial).filter(Boolean))] as string[];
      setRegiones(regs);
      setEntidades(ets);
    }
    setLoading(false);
  };

  const loadAsistencia = async () => {
    const { data } = await supabase
      .from("informe_asistencia")
      .select("*")
      .eq("module_number", selectedModule);

    const map = new Map<string, AsistenciaRow>();
    if (data) {
      data.forEach(row => {
        map.set(`${row.directivo_cedula}-${row.dia}`, row as AsistenciaRow);
      });
    }
    setAsistencia(map);
    setDirty(false);
  };

  const filteredDirectivos = directivos.filter(d => {
    if (selectedRegion !== "all" && d.region !== selectedRegion) return false;
    if (selectedET !== "all" && d.entidad_territorial !== selectedET) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        d.nombres_apellidos.toLowerCase().includes(term) ||
        (d.numero_cedula || "").includes(term) ||
        d.nombre_ie.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Filter entidades based on selected region
  const filteredEntidades = selectedRegion === "all"
    ? entidades
    : [...new Set(directivos.filter(d => d.region === selectedRegion).map(d => d.entidad_territorial).filter(Boolean) as string[])].sort();

  const getKey = (cedula: string, dia: number) => `${cedula}-${dia}`;

  const toggleAttendance = (cedula: string, dia: number, field: "session_am" | "session_pm") => {
    const key = getKey(cedula, dia);
    const existing = asistencia.get(key) || {
      directivo_cedula: cedula,
      module_number: selectedModule,
      dia,
      session_am: false,
      session_pm: false,
      razon_inasistencia: "",
      observaciones: "",
    };
    const updated = { ...existing, [field]: !existing[field] };
    const newMap = new Map(asistencia);
    newMap.set(key, updated);
    setAsistencia(newMap);
    setDirty(true);
  };

  const updateField = (cedula: string, dia: number, field: "razon_inasistencia" | "observaciones", value: string) => {
    const key = getKey(cedula, dia);
    const existing = asistencia.get(key) || {
      directivo_cedula: cedula,
      module_number: selectedModule,
      dia,
      session_am: false,
      session_pm: false,
      razon_inasistencia: "",
      observaciones: "",
    };
    const updated = { ...existing, [field]: value };
    const newMap = new Map(asistencia);
    newMap.set(key, updated);
    setAsistencia(newMap);
    setDirty(true);
  };

  const calculateRate = (cedula: string): number => {
    let attended = 0;
    let total = DAYS.length * 2;
    DAYS.forEach(dia => {
      const row = asistencia.get(getKey(cedula, dia));
      if (row?.session_am) attended++;
      if (row?.session_pm) attended++;
    });
    return total > 0 ? Math.round((attended / total) * 100) : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = Array.from(asistencia.values()).filter(
        r => r.session_am || r.session_pm || r.razon_inasistencia || r.observaciones
      );

      // Upsert all rows
      const { error } = await supabase
        .from("informe_asistencia")
        .upsert(
          rows.map(r => ({
            directivo_cedula: r.directivo_cedula,
            module_number: r.module_number,
            dia: r.dia,
            session_am: r.session_am,
            session_pm: r.session_pm,
            razon_inasistencia: r.razon_inasistencia || null,
            observaciones: r.observaciones || null,
          })),
          { onConflict: "directivo_cedula,module_number,dia" }
        );

      if (error) throw error;
      toast({ title: "Guardado", description: "La asistencia se ha guardado correctamente." });
      setDirty(false);
      await loadAsistencia();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const totalFiltered = filteredDirectivos.length;
  const attendanceByDay = DAYS.map(dia => {
    let amCount = 0, pmCount = 0;
    filteredDirectivos.forEach(d => {
      const row = asistencia.get(getKey(d.numero_cedula, dia));
      if (row?.session_am) amCount++;
      if (row?.session_pm) pmCount++;
    });
    return { dia, amCount, pmCount };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map(m => (
                    <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedRegion} onValueChange={v => { setSelectedRegion(v); setSelectedET("all"); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las regiones</SelectItem>
                {regiones.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedET} onValueChange={setSelectedET}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Entidad Territorial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ET</SelectItem>
                {filteredEntidades.map(et => (
                  <SelectItem key={et} value={et}>{et}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula o IE…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="secondary">{totalFiltered} directivos</Badge>
              <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />
            Asistencia — Módulo {selectedModule}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sticky left-0 bg-background z-10 min-w-[50px]">N°</TableHead>
                <TableHead className="text-xs sticky left-[50px] bg-background z-10 min-w-[200px]">Directivo</TableHead>
                <TableHead className="text-xs min-w-[150px]">IE</TableHead>
                <TableHead className="text-xs min-w-[100px]">DANE</TableHead>
                {DAYS.map(dia => (
                  <TableHead key={dia} className="text-xs text-center" colSpan={2}>
                    Día {dia}
                  </TableHead>
                ))}
                <TableHead className="text-xs text-center min-w-[60px]">Tasa</TableHead>
                <TableHead className="text-xs min-w-[150px]">Razón inasistencia</TableHead>
                <TableHead className="text-xs min-w-[150px]">Observaciones</TableHead>
              </TableRow>
              <TableRow>
                <TableHead />
                <TableHead />
                <TableHead />
                <TableHead />
                {DAYS.map(dia => (
                  <>
                    <TableHead key={`${dia}-am`} className="text-[10px] text-center px-1">a.m.</TableHead>
                    <TableHead key={`${dia}-pm`} className="text-[10px] text-center px-1">p.m.</TableHead>
                  </>
                ))}
                <TableHead />
                <TableHead />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDirectivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + DAYS.length * 2 + 3} className="text-center text-sm text-muted-foreground py-8">
                    No hay directivos que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDirectivos.map((d, idx) => {
                  const rate = calculateRate(d.numero_cedula);
                  // For razón/observaciones, use day 1 as representative (aggregate)
                  const firstDayRow = asistencia.get(getKey(d.numero_cedula, 1));
                  return (
                    <TableRow key={d.numero_cedula}>
                      <TableCell className="text-xs sticky left-0 bg-background z-10">{idx + 1}</TableCell>
                      <TableCell className="text-xs sticky left-[50px] bg-background z-10 font-medium">
                        {d.nombres_apellidos}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[200px]">{d.nombre_ie}</TableCell>
                      <TableCell className="text-xs">{d.codigo_dane || "—"}</TableCell>
                      {DAYS.map(dia => {
                        const row = asistencia.get(getKey(d.numero_cedula, dia));
                        return (
                          <>
                            <TableCell key={`${dia}-am`} className="text-center px-1">
                              <Checkbox
                                checked={row?.session_am || false}
                                onCheckedChange={() => toggleAttendance(d.numero_cedula, dia, "session_am")}
                              />
                            </TableCell>
                            <TableCell key={`${dia}-pm`} className="text-center px-1">
                              <Checkbox
                                checked={row?.session_pm || false}
                                onCheckedChange={() => toggleAttendance(d.numero_cedula, dia, "session_pm")}
                              />
                            </TableCell>
                          </>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            rate === 100
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : rate >= 80
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : rate >= 50
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {rate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={firstDayRow?.razon_inasistencia || ""}
                          onChange={e => updateField(d.numero_cedula, 1, "razon_inasistencia", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={firstDayRow?.observaciones || ""}
                          onChange={e => updateField(d.numero_cedula, 1, "observaciones", e.target.value)}
                          className="h-7 text-xs"
                          placeholder="—"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              {/* Summary row */}
              {filteredDirectivos.length > 0 && (
                <>
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={4} className="text-xs">
                      Asistentes por jornada
                    </TableCell>
                    {attendanceByDay.map(({ dia, amCount, pmCount }) => (
                      <>
                        <TableCell key={`sum-${dia}-am`} className="text-center text-xs">{amCount}</TableCell>
                        <TableCell key={`sum-${dia}-pm`} className="text-center text-xs">{pmCount}</TableCell>
                      </>
                    ))}
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="text-xs font-medium">
                      Tasa de asistencia del grupo
                    </TableCell>
                    {attendanceByDay.map(({ dia, amCount, pmCount }) => {
                      const amRate = totalFiltered > 0 ? Math.round((amCount / totalFiltered) * 100) : 0;
                      const pmRate = totalFiltered > 0 ? Math.round((pmCount / totalFiltered) * 100) : 0;
                      return (
                        <>
                          <TableCell key={`rate-${dia}-am`} className="text-center text-xs">{amRate}%</TableCell>
                          <TableCell key={`rate-${dia}-pm`} className="text-center text-xs">{pmRate}%</TableCell>
                        </>
                      );
                    })}
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
