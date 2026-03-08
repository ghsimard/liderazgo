import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface EquipoMember { nombre: string; rol: string }
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

const EMPTY_SESIONES: SesionesProgramadas = {
  coaching_individual: 0, coaching_grupal: 0, coaching_relacion: 0,
  coaching_sombra: 0, visita_individual: 0, visita_grupal: 0,
};
const MODULES = [1, 2, 3, 4];

export default function AdminInformeModuloForm() {
  const [loading, setLoading] = useState(true);
  const [regiones, setRegiones] = useState<string[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedET, setSelectedET] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [equipo, setEquipo] = useState<EquipoMember[]>([]);

  useEffect(() => {
    (async () => {
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("region, entidad_territorial")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas) {
        setRegiones([...new Set(fichas.map((f: any) => f.region).filter(Boolean))].sort() as string[]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedRegion) { setEntidades([]); return; }
    (async () => {
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("entidad_territorial")
        .eq("region", selectedRegion)
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas) {
        setEntidades([...new Set(fichas.map((f: any) => f.entidad_territorial).filter(Boolean))].sort() as string[]);
      }
    })();
  }, [selectedRegion]);

  useEffect(() => {
    if (selectedRegion && selectedET) loadInforme();
  }, [selectedRegion, selectedET, selectedModule]);

  const loadInforme = async () => {
    const { data: rows } = await supabase
      .from("informe_modulo").select("*")
      .eq("region", selectedRegion).eq("entidad_territorial", selectedET).eq("module_number", selectedModule).limit(1);

    if (rows && rows.length > 0) {
      setData(rows[0]);
      const { data: eq } = await supabase.from("informe_modulo_equipo").select("*").eq("informe_id", rows[0].id);
      setEquipo(eq || []);
    } else {
      setData(null);
      setEquipo([]);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedModule)} onValueChange={v => setSelectedModule(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>{MODULES.map(m => <SelectItem key={m} value={String(m)}>Módulo {m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedRegion} onValueChange={v => { setSelectedRegion(v); setSelectedET(""); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Región" /></SelectTrigger>
              <SelectContent>{regiones.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedET} onValueChange={setSelectedET} disabled={!selectedRegion}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Entidad Territorial" /></SelectTrigger>
              <SelectContent>{entidades.map(et => <SelectItem key={et} value={et}>{et}</SelectItem>)}</SelectContent>
            </Select>
            <Badge variant="outline" className="gap-1.5 ml-auto"><Eye className="w-3.5 h-3.5" /> Solo lectura</Badge>
          </div>
        </CardContent>
      </Card>

      {!selectedET ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Seleccione una región y una entidad territorial para consultar el informe.</CardContent></Card>
      ) : !data ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No se encontró un informe para esta combinación.</CardContent></Card>
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
              {equipo.length > 0 && (
                <div>
                  <Label className="text-xs font-medium">Integrantes del equipo local</Label>
                  <Table className="mt-2">
                    <TableHeader><TableRow><TableHead className="text-xs">Nombre</TableHead><TableHead className="text-xs">Rol</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {equipo.map((m, i) => (
                        <TableRow key={i}><TableCell className="text-xs">{m.nombre}</TableCell><TableCell className="text-xs">{m.rol}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. INTENSIVO */}
          <Card>
            <CardHeader><CardTitle className="text-sm">2. Desarrollo del Intensivo</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Fecha inicio</Label><Input value={data.fecha_inicio_intensivo || "—"} disabled className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Fecha fin</Label><Input value={data.fecha_fin_intensivo || "—"} disabled className="mt-1" /></div>
              </div>
              <ReadOnlyField label="2.1. Aprendizajes del intensivo" value={data.aprendizajes_intensivo} />
              {(data.ajustes_actividades as AjusteActividad[])?.length > 0 && (
                <div>
                  <Label className="text-xs font-medium">2.2. Ajustes a las actividades</Label>
                  <Table className="mt-2">
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Actividad</TableHead><TableHead className="text-xs">Aciertos</TableHead>
                      <TableHead className="text-xs">Desaciertos</TableHead><TableHead className="text-xs">Ajustes</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(data.ajustes_actividades as AjusteActividad[]).map((a, i) => (
                        <TableRow key={i}><TableCell className="text-xs">{a.actividad}</TableCell><TableCell className="text-xs">{a.aciertos}</TableCell><TableCell className="text-xs">{a.desaciertos}</TableCell><TableCell className="text-xs">{a.ajustes}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ReadOnlyField label="2.3. Articulación con otros actores" value={data.articulacion_intensivo} />
            </CardContent>
          </Card>

          {/* 3. INTERLUDIO */}
          <Card>
            <CardHeader><CardTitle className="text-sm">3. Desarrollo del Interludio</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Fecha inicio</Label><Input value={data.fecha_inicio_interludio || "—"} disabled className="mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Fecha fin</Label><Input value={data.fecha_fin_interludio || "—"} disabled className="mt-1" /></div>
              </div>
              {/* Sesiones table */}
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
                      <TableHead className="text-xs text-center">Total</TableHead>
                      <TableHead className="text-xs text-center">Visita ind.</TableHead>
                      <TableHead className="text-xs text-center">Visita grupal</TableHead>
                      <TableHead className="text-xs text-center">Total</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(["sesiones_programadas", "sesiones_realizadas"] as const).map(key => {
                        const s = (data[key] as SesionesProgramadas) || EMPTY_SESIONES;
                        return (
                          <TableRow key={key}>
                            <TableCell className="text-xs font-medium">{key === "sesiones_programadas" ? "Programadas" : "Realizadas"}</TableCell>
                            <TableCell className="text-xs text-center">{s.coaching_individual}</TableCell>
                            <TableCell className="text-xs text-center">{s.coaching_grupal}</TableCell>
                            <TableCell className="text-xs text-center">{s.coaching_relacion}</TableCell>
                            <TableCell className="text-xs text-center">{s.coaching_sombra}</TableCell>
                            <TableCell className="text-xs text-center font-medium">{s.coaching_individual + s.coaching_grupal + s.coaching_relacion + s.coaching_sombra}</TableCell>
                            <TableCell className="text-xs text-center">{s.visita_individual}</TableCell>
                            <TableCell className="text-xs text-center">{s.visita_grupal}</TableCell>
                            <TableCell className="text-xs text-center font-medium">{s.visita_individual + s.visita_grupal}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <ReadOnlyField label="Razones de las diferencias" value={data.razones_diferencias} />
              <ReadOnlyField label="3.2. Acompañamiento — Descripción" value={data.acompanamiento_descripcion} />
              <ReadOnlyField label="Objetivos no cumplidos" value={data.acompanamiento_no_cumplido} />
              {(data.acompanamiento_directivos as AcompanamientoDirectivo[])?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Registro por directivo</Label>
                  <div className="overflow-x-auto mt-1">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="text-[10px]">Directivo</TableHead>
                        <TableHead className="text-[10px] text-center">Coach. Ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Otras</TableHead>
                        <TableHead className="text-[10px] text-center">Vis. ind.</TableHead>
                        <TableHead className="text-[10px] text-center">Vis. gr.</TableHead>
                        <TableHead className="text-[10px] text-center">Autoform.</TableHead>
                        <TableHead className="text-[10px] text-center">Int. pares</TableHead>
                        <TableHead className="text-[10px] text-center">Acomp. virt.</TableHead>
                        <TableHead className="text-[10px]">Obs.</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(data.acompanamiento_directivos as AcompanamientoDirectivo[]).map((ad, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{ad.nombre}</TableCell>
                            <TableCell className="text-xs text-center">{ad.coaching_individual}</TableCell>
                            <TableCell className="text-xs text-center">{ad.otras_coaching}</TableCell>
                            <TableCell className="text-xs text-center">{ad.visita_individual}</TableCell>
                            <TableCell className="text-xs text-center">{ad.visita_grupal}</TableCell>
                            <TableCell className="text-xs text-center">{ad.autoformacion}</TableCell>
                            <TableCell className="text-xs text-center">{ad.intercambio_pares}</TableCell>
                            <TableCell className="text-xs text-center">{ad.acompanamiento_virtual}</TableCell>
                            <TableCell className="text-xs">{ad.observacion || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {(data.estrategias as Estrategia[])?.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Estrategias</Label>
                  <Table className="mt-1">
                    <TableHeader><TableRow>
                      <TableHead className="text-xs">Estrategia</TableHead><TableHead className="text-xs">Fortalezas</TableHead><TableHead className="text-xs">Dificultades</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(data.estrategias as Estrategia[]).map((e, i) => (
                        <TableRow key={i}><TableCell className="text-xs font-medium">{e.nombre}</TableCell><TableCell className="text-xs">{e.fortalezas || "—"}</TableCell><TableCell className="text-xs">{e.dificultades || "—"}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <ReadOnlyField label="3.3. Aprendizajes del interludio" value={data.aprendizajes_interludio} />
              <ReadOnlyField label="3.4. Articulación interludio" value={data.articulacion_interludio} />
            </CardContent>
          </Card>

          {/* 4. CONTEXTO */}
          <Card>
            <CardHeader><CardTitle className="text-sm">4. Contexto de política educativa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ReadOnlyField label="Plan Sectorial" value={data.contexto_plan_sectorial} />
              <ReadOnlyField label="Articulación con programas" value={data.contexto_articulacion} />
            </CardContent>
          </Card>

          {/* 5. NOVEDADES */}
          {(data.novedades as Novedad[])?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">5. Novedades</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Nombre</TableHead><TableHead className="text-xs">IE</TableHead>
                    <TableHead className="text-xs">Novedad</TableHead><TableHead className="text-xs">Fecha</TableHead><TableHead className="text-xs">Soporte</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.novedades as Novedad[]).map((n, i) => (
                      <TableRow key={i}><TableCell className="text-xs">{n.nombre}</TableCell><TableCell className="text-xs">{n.institucion}</TableCell><TableCell className="text-xs">{n.novedad}</TableCell><TableCell className="text-xs">{n.fecha}</TableCell><TableCell className="text-xs">{n.soporte}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="mt-1 p-3 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}
