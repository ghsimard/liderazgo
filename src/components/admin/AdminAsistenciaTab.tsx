import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Filter, CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

export default function AdminAsistenciaTab({ allowedRegions }: { allowedRegions?: string[] }) {
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [allRegiones, setAllRegiones] = useState<string[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [asistencia, setAsistencia] = useState<Map<string, AsistenciaRow>>(new Map());
  const [selectedModule, setSelectedModule] = useState<number | "all">(1);
  const [selectedRegion, setSelectedRegion] = useState<string>(allowedRegions?.length === 1 ? allowedRegions[0] : "all");
  const [selectedET, setSelectedET] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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
      setAllRegiones(regs);
      setEntidades(ets);
      if (allowedRegions?.length === 1) setSelectedRegion(allowedRegions[0]);
    }
    setLoading(false);
  };

  const loadAsistencia = async () => {
    let query = supabase.from("informe_asistencia").select("*");
    if (selectedModule !== "all") {
      query = query.eq("module_number", selectedModule);
    }
    const { data } = await query;

    const map = new Map<string, AsistenciaRow>();
    if (data) {
      data.forEach(row => {
        const key = selectedModule === "all"
          ? `${row.directivo_cedula}-${row.module_number}-${row.dia}`
          : `${row.directivo_cedula}-${row.dia}`;
        map.set(key, row as AsistenciaRow);
      });
    }
    setAsistencia(map);
  };

  const saveRow = async (row: AsistenciaRow) => {
    const { error } = await supabase
      .from("informe_asistencia")
      .upsert(
        {
          directivo_cedula: row.directivo_cedula,
          module_number: row.module_number,
          dia: row.dia,
          session_am: row.session_am,
          session_pm: row.session_pm,
          razon_inasistencia: row.razon_inasistencia || null,
          observaciones: row.observaciones || null,
        },
        { onConflict: "directivo_cedula,module_number,dia" }
      );
    if (error) {
      toast.error("Error al guardar asistencia");
    }
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

  const filteredEntidades = selectedRegion === "all"
    ? entidades
    : [...new Set(directivos.filter(d => d.region === selectedRegion).map(d => d.entidad_territorial).filter(Boolean) as string[])].sort();

  const getKey = (cedula: string, dia: number) => `${cedula}-${dia}`;

  const toggleDay = (cedula: string, dia: number) => {
    if (selectedModule === "all") return;
    const key = getKey(cedula, dia);
    const existing = asistencia.get(key) || {
      directivo_cedula: cedula,
      module_number: selectedModule as number,
      dia,
      session_am: false,
      session_pm: false,
      razon_inasistencia: "",
      observaciones: "",
    };
    const isPresent = !existing.session_am;
    const updated = { ...existing, session_am: isPresent, session_pm: isPresent };
    const newMap = new Map(asistencia);
    newMap.set(key, updated);
    setAsistencia(newMap);
    saveRow(updated);
  };

  const updateField = (cedula: string, dia: number, field: "razon_inasistencia" | "observaciones", value: string) => {
    if (selectedModule === "all") return;
    const key = getKey(cedula, dia);
    const existing = asistencia.get(key) || {
      directivo_cedula: cedula,
      module_number: selectedModule as number,
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
    if (field === "razon_inasistencia") {
      saveRow(updated);
    }
  };

  const handleObservacionesBlur = (cedula: string, dia: number) => {
    const key = getKey(cedula, dia);
    const row = asistencia.get(key);
    if (row) saveRow(row);
  };

  const calculateRate = (cedula: string): number => {
    if (selectedModule === "all") {
      let attended = 0;
      const total = MODULES.length * DAYS.length;
      MODULES.forEach(mod => {
        DAYS.forEach(dia => {
          const row = asistencia.get(`${cedula}-${mod}-${dia}`);
          if (row?.session_am) attended++;
        });
      });
      return total > 0 ? Math.round((attended / total) * 100) : 0;
    }
    let attended = 0;
    DAYS.forEach(dia => {
      const row = asistencia.get(getKey(cedula, dia));
      if (row?.session_am) attended++;
    });
    return DAYS.length > 0 ? Math.round((attended / DAYS.length) * 100) : 0;
  };

  // Stats
  const totalFiltered = filteredDirectivos.length;
  const dayCols = selectedModule === "all"
    ? MODULES.flatMap(mod => DAYS.map(dia => ({ mod, dia, label: `M${mod}D${dia}` })))
    : DAYS.map(dia => ({ mod: selectedModule as number, dia, label: `Día ${dia}` }));

  const attendanceByCol = dayCols.map(col => {
    let count = 0;
    filteredDirectivos.forEach(d => {
      const key = selectedModule === "all"
        ? `${d.numero_cedula}-${col.mod}-${col.dia}`
        : getKey(d.numero_cedula, col.dia);
      const row = asistencia.get(key);
      if (row?.session_am) count++;
    });
    return { ...col, count };
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
              <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(v === "all" ? "all" : Number(v))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los módulos</SelectItem>
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
                {!(allowedRegions?.length === 1) && <SelectItem value="all">Todas las regiones</SelectItem>}
                {(allowedRegions?.length ? allRegiones.filter(r => allowedRegions.includes(r)) : allRegiones).map(r => (
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />
            Asistencia {selectedModule === "all" ? "— Todos los módulos" : `— Módulo ${selectedModule}`}
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
                {selectedModule === "all" ? (
                  MODULES.map(mod => (
                    DAYS.map(dia => (
                      <TableHead key={`${mod}-${dia}`} className="text-xs text-center min-w-[50px]">
                        M{mod}D{dia}
                      </TableHead>
                    ))
                  ))
                ) : (
                  DAYS.map(dia => (
                    <TableHead key={dia} className="text-xs text-center min-w-[50px]">
                      Día {dia}
                    </TableHead>
                  ))
                )}
                <TableHead className="text-xs text-center min-w-[60px]">Tasa</TableHead>
                <TableHead className="text-xs min-w-[150px]">Razón inasistencia</TableHead>
                <TableHead className="text-xs min-w-[150px]">Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDirectivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4 + (selectedModule === "all" ? MODULES.length * DAYS.length : DAYS.length) + 4} className="text-center text-sm text-muted-foreground py-8">
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
                      {selectedModule === "all" ? (
                        MODULES.map(mod =>
                          DAYS.map(dia => {
                            const row = asistencia.get(`${d.numero_cedula}-${mod}-${dia}`);
                            return (
                              <TableCell key={`${mod}-${dia}`} className="text-center px-1">
                                <Checkbox checked={row?.session_am || false} disabled />
                              </TableCell>
                            );
                          })
                        )
                      ) : (
                        DAYS.map(dia => {
                          const row = asistencia.get(getKey(d.numero_cedula, dia));
                          return (
                            <TableCell key={`${dia}`} className="text-center px-1">
                              <Checkbox
                                checked={row?.session_am || false}
                                onCheckedChange={() => toggleDay(d.numero_cedula, dia)}
                              />
                            </TableCell>
                          );
                        })
                      )}
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
                      {selectedModule === "all" ? (
                        <>
                          <TableCell className="text-xs text-muted-foreground">—</TableCell>
                          <TableCell className="text-xs text-muted-foreground">—</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <Select
                              value={firstDayRow?.razon_inasistencia || "none"}
                              onValueChange={v => updateField(d.numero_cedula, 1, "razon_inasistencia", v === "none" ? "" : v)}
                            >
                              <SelectTrigger className="h-7 text-xs min-w-[180px]">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {RAZONES_INASISTENCIA.map(r => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={firstDayRow?.observaciones || ""}
                              onChange={e => updateField(d.numero_cedula, 1, "observaciones", e.target.value)}
                              onBlur={() => handleObservacionesBlur(d.numero_cedula, 1)}
                              className="h-7 text-xs"
                              placeholder="—"
                            />
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              )}
              {/* Summary row */}
              {filteredDirectivos.length > 0 && (
                <>
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={4} className="text-xs">
                      Asistentes por día
                    </TableCell>
                    {attendanceByCol.map((col, i) => (
                      <TableCell key={`sum-${i}`} className="text-center text-xs">{col.count}</TableCell>
                    ))}
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={4} className="text-xs font-medium">
                      Tasa de asistencia del grupo
                    </TableCell>
                    {attendanceByCol.map((col, i) => {
                      const rate = totalFiltered > 0 ? Math.round((col.count / totalFiltered) * 100) : 0;
                      return (
                        <TableCell key={`rate-${i}`} className="text-center text-xs">{rate}%</TableCell>
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
