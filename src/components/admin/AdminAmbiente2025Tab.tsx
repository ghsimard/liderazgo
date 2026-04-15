import { useState, useEffect, useMemo } from "react";
import { supabase as cloudClient } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, School, Users, GraduationCap, BookOpen } from "lucide-react";

interface Submission {
  institucion_educativa: string;
  comunicacion: Record<string, string> | string;
  practicas_pedagogicas: Record<string, string> | string;
  convivencia: Record<string, string> | string;
}

interface Rector {
  nombre_de_la_institucion_educativa_en_la_actualmente_desempena_: string | null;
  entidad_territorial: string | null;
}

const LIKERT_MAP: Record<string, number> = {
  "Siempre": 5,
  "Casi siempre": 4,
  "A veces": 3,
  "Casi nunca": 2,
  "Nunca": 1,
};

function parseJsonb(val: unknown): Record<string, string> {
  if (!val) return {};
  if (typeof val === "object" && val !== null) return val as Record<string, string>;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return {};
}

function avgLikert(submissions: Submission[], field: "comunicacion" | "practicas_pedagogicas" | "convivencia"): number {
  let total = 0, count = 0;
  for (const s of submissions) {
    const obj = parseJsonb(s[field]);
    for (const v of Object.values(obj)) {
      const score = LIKERT_MAP[v];
      if (score) { total += score; count++; }
    }
  }
  return count > 0 ? total / count : 0;
}

export default function AdminAmbiente2025Tab() {
  const [loading, setLoading] = useState(true);
  
  const [rectores, setRectores] = useState<Rector[]>([]);
  const [docentes, setDocentes] = useState<Submission[]>([]);
  const [estudiantes, setEstudiantes] = useState<Submission[]>([]);
  const [acudientes, setAcudientes] = useState<Submission[]>([]);
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [entidades, setEntidades] = useState<string[]>([]);
  const [filterET, setFilterET] = useState<string>("__all__");
  const [filterIE, setFilterIE] = useState<string>("__all__");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [r, d, e, a] = await Promise.all([
      cloudClient.from("ae_rectores_2025").select("nombre_de_la_institucion_educativa_en_la_actualmente_desempena_, entidad_territorial"),
      cloudClient.from("ae_docentes_submissions_2025").select("institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
      cloudClient.from("ae_estudiantes_submissions_2025").select("institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
      cloudClient.from("ae_acudientes_submissions_2025").select("institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
    ]);

    const rectData = (r.data || []) as Rector[];
    setRectores(rectData);

    const dData = (d.data || []) as Submission[];
    const eData = (e.data || []) as Submission[];
    const aData = (a.data || []) as Submission[];
    setDocentes(dData);
    setEstudiantes(eData);
    setAcudientes(aData);

    // Collect unique entidades territoriales
    const allETs = new Set<string>();
    rectData.forEach(r => r.entidad_territorial && allETs.add(r.entidad_territorial));
    setEntidades([...allETs].sort());

    const allIEs = new Set<string>();
    rectData.forEach(r => r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ && allIEs.add(r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_));
    dData.forEach(s => allIEs.add(s.institucion_educativa));
    eData.forEach(s => allIEs.add(s.institucion_educativa));
    aData.forEach(s => allIEs.add(s.institucion_educativa));
    setInstituciones([...allIEs].sort());
    setLoading(false);
  };

  // Get IEs belonging to the selected ET (from rectores mapping)
  const iesForET = useMemo(() => {
    if (filterET === "__all__") return null;
    const ies = new Set<string>();
    rectores.forEach(r => {
      if (r.entidad_territorial === filterET && r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_) {
        ies.add(r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_);
      }
    });
    return ies;
  }, [rectores, filterET]);

  // Filtered IE list for dropdown
  const filteredInstituciones = useMemo(() => {
    if (!iesForET) return instituciones;
    return instituciones.filter(ie => iesForET.has(ie));
  }, [instituciones, iesForET]);

  // Reset IE filter when ET changes and selected IE is not in new list
  useEffect(() => {
    if (filterIE !== "__all__" && iesForET && !iesForET.has(filterIE)) {
      setFilterIE("__all__");
    }
  }, [filterET]);

  const rectoresCount = useMemo(() => {
    let list = rectores;
    if (filterET !== "__all__") list = list.filter(r => r.entidad_territorial === filterET);
    if (filterIE !== "__all__") list = list.filter(r => r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ === filterIE);
    return list.length;
  }, [rectores, filterET, filterIE]);

  const filtered = useMemo(() => {
    const filter = (arr: Submission[]) => {
      let result = arr;
      if (iesForET) result = result.filter(s => iesForET.has(s.institucion_educativa));
      if (filterIE !== "__all__") result = result.filter(s => s.institucion_educativa === filterIE);
      return result;
    };
    return {
      docentes: filter(docentes),
      estudiantes: filter(estudiantes),
      acudientes: filter(acudientes),
    };
  }, [docentes, estudiantes, acudientes, filterIE, iesForET]);

  const categories: ("comunicacion" | "practicas_pedagogicas" | "convivencia")[] = [
    "comunicacion", "practicas_pedagogicas", "convivencia"
  ];
  const catLabels: Record<string, string> = {
    comunicacion: "Comunicación",
    practicas_pedagogicas: "Prácticas Pedagógicas",
    convivencia: "Convivencia",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Línea Base 2025</h3>
          <p className="text-sm text-muted-foreground">Datos importados de la aplicación RLT-Stats (Ambiente Escolar anterior)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterET} onValueChange={(v) => { setFilterET(v); }}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filtrar por entidad territorial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las entidades</SelectItem>
              {entidades.map(et => (
                <SelectItem key={et} value={et}>{et}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterIE} onValueChange={setFilterIE}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder="Filtrar por institución" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las instituciones</SelectItem>
              {filteredInstituciones.map(ie => (
                <SelectItem key={ie} value={ie}>{ie}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2"><School className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{rectoresCount}</p>
              <p className="text-xs text-muted-foreground">Rectores / IE</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2"><BookOpen className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.docentes.length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Docentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2"><GraduationCap className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.estudiantes.length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Estudiantes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2"><Users className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{filtered.acudientes.length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Acudientes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Averages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promedios Likert por categoría y tipo de encuestado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Docentes</TableHead>
                <TableHead className="text-center">Estudiantes</TableHead>
                <TableHead className="text-center">Acudientes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(cat => {
                const dAvg = avgLikert(filtered.docentes, cat);
                const eAvg = avgLikert(filtered.estudiantes, cat);
                const aAvg = avgLikert(filtered.acudientes, cat);
                return (
                  <TableRow key={cat}>
                    <TableCell className="font-medium">{catLabels[cat]}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={dAvg >= 4 ? "default" : dAvg >= 3 ? "secondary" : "destructive"}>
                        {dAvg.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={eAvg >= 4 ? "default" : eAvg >= 3 ? "secondary" : "destructive"}>
                        {eAvg.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={aAvg >= 4 ? "default" : aAvg >= 3 ? "secondary" : "destructive"}>
                        {aAvg.toFixed(2)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-3">Escala: 1 (Nunca) — 5 (Siempre)</p>
        </CardContent>
      </Card>
    </div>
  );
}
