import { useState, useEffect, useMemo } from "react";
import { supabase as cloudClient } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, School, Users, GraduationCap, BookOpen, BarChart3 } from "lucide-react";

/* ── Types ────────────────────────────────────────── */

interface Cohorte {
  id: string;
  nombre: string;
  entidad_territorial: string;
  year: number;
  grupo: number;
  is_baseline: boolean;
}

interface CohorteInst {
  cohorte_id: string;
  institucion_educativa: string;
}

interface Submission {
  institucion_educativa: string;
  comunicacion: Record<string, string> | string;
  practicas_pedagogicas: Record<string, string> | string;
  convivencia: Record<string, string> | string;
}

interface AESubmission {
  id: string;
  institucion_educativa: string;
  tipo_formulario: string;
  respuestas: Record<string, string> | string;
  cohorte_id: string | null;
  entidad_territorial: string | null;
}

interface Rector {
  nombre_de_la_institucion_educativa_en_la_actualmente_desempena_: string | null;
  entidad_territorial: string | null;
}

/* ── Helpers ──────────────────────────────────────── */

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

function avgLikertAE(submissions: AESubmission[]): number {
  let total = 0, count = 0;
  for (const s of submissions) {
    const resp = parseJsonb(s.respuestas);
    for (const v of Object.values(resp)) {
      const score = LIKERT_MAP[v];
      if (score) { total += score; count++; }
    }
  }
  return count > 0 ? total / count : 0;
}

async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await cloudClient
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/* ── Component ────────────────────────────────────── */

export default function AdminAmbiente2025Tab() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"baseline" | "encuestas">("baseline");

  // Reference data
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [cohorteInst, setCohorteInst] = useState<CohorteInst[]>([]);

  // 2025 baseline submissions
  const [rectores, setRectores] = useState<Rector[]>([]);
  const [docentes, setDocentes] = useState<Submission[]>([]);
  const [estudiantes, setEstudiantes] = useState<Submission[]>([]);
  const [acudientes, setAcudientes] = useState<Submission[]>([]);

  // encuestas_ambiente_escolar (original format)
  const [aeSubmissions, setAeSubmissions] = useState<AESubmission[]>([]);

  // Filters
  const [filterCohorte, setFilterCohorte] = useState<string>("__all__");
  const [filterIE, setFilterIE] = useState<string>("__all__");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [cohData, ciData, rectData, dData, eData, aData, aeData] = await Promise.all([
      fetchAll<Cohorte>("ae_cohortes", "id, nombre, entidad_territorial, year, grupo, is_baseline"),
      fetchAll<CohorteInst>("ae_cohorte_instituciones", "cohorte_id, institucion_educativa"),
      fetchAll<Rector>("ae_rectores_2025", "nombre_de_la_institucion_educativa_en_la_actualmente_desempena_, entidad_territorial"),
      fetchAll<Submission>("ae_docentes_submissions_2025", "institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
      fetchAll<Submission>("ae_estudiantes_submissions_2025", "institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
      fetchAll<Submission>("ae_acudientes_submissions_2025", "institucion_educativa, comunicacion, practicas_pedagogicas, convivencia"),
      fetchAll<AESubmission>("encuestas_ambiente_escolar", "id, institucion_educativa, tipo_formulario, respuestas, cohorte_id, entidad_territorial"),
    ]);

    setCohortes(cohData);
    setCohorteInst(ciData);
    setRectores(rectData);
    setDocentes(dData);
    setEstudiantes(eData);
    setAcudientes(aData);
    setAeSubmissions(aeData);
    setLoading(false);
  };

  // Derive IEs for the selected cohorte
  const iesForCohorte = useMemo(() => {
    if (filterCohorte === "__all__") return null;
    const ies = new Set<string>();
    cohorteInst
      .filter(ci => ci.cohorte_id === filterCohorte)
      .forEach(ci => ies.add(ci.institucion_educativa));
    return ies;
  }, [cohorteInst, filterCohorte]);

  // All IEs across both data sources
  const allInstituciones = useMemo(() => {
    const set = new Set<string>();
    rectores.forEach(r => r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ && set.add(r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_));
    docentes.forEach(s => set.add(s.institucion_educativa));
    estudiantes.forEach(s => set.add(s.institucion_educativa));
    acudientes.forEach(s => set.add(s.institucion_educativa));
    aeSubmissions.forEach(s => set.add(s.institucion_educativa));
    return [...set].sort();
  }, [rectores, docentes, estudiantes, acudientes, aeSubmissions]);

  const filteredInstituciones = useMemo(() => {
    if (!iesForCohorte) return allInstituciones;
    return allInstituciones.filter(ie => iesForCohorte.has(ie));
  }, [allInstituciones, iesForCohorte]);

  // Reset IE when cohorte changes
  useEffect(() => {
    if (filterIE !== "__all__" && iesForCohorte && !iesForCohorte.has(filterIE)) {
      setFilterIE("__all__");
    }
  }, [filterCohorte]);

  // Filter helper
  const matchIE = (ie: string) => {
    if (iesForCohorte && !iesForCohorte.has(ie)) return false;
    if (filterIE !== "__all__" && ie !== filterIE) return false;
    return true;
  };

  // Filtered baseline data
  const filteredBaseline = useMemo(() => ({
    rectores: rectores.filter(r => matchIE(r.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ || "")),
    docentes: docentes.filter(s => matchIE(s.institucion_educativa)),
    estudiantes: estudiantes.filter(s => matchIE(s.institucion_educativa)),
    acudientes: acudientes.filter(s => matchIE(s.institucion_educativa)),
  }), [rectores, docentes, estudiantes, acudientes, filterIE, iesForCohorte]);

  // Filtered encuestas_ambiente_escolar
  const filteredAE = useMemo(() => {
    let list = aeSubmissions;
    if (filterCohorte !== "__all__") {
      list = list.filter(s => s.cohorte_id === filterCohorte);
    }
    if (filterIE !== "__all__") {
      list = list.filter(s => s.institucion_educativa === filterIE);
    } else if (iesForCohorte) {
      list = list.filter(s => iesForCohorte.has(s.institucion_educativa));
    }
    return {
      docentes: list.filter(s => s.tipo_formulario === "docentes"),
      estudiantes: list.filter(s => s.tipo_formulario === "estudiantes"),
      acudientes: list.filter(s => s.tipo_formulario === "acudientes"),
    };
  }, [aeSubmissions, filterCohorte, filterIE, iesForCohorte]);

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

  const selectedCohorte = cohortes.find(c => c.id === filterCohorte);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Ambiente Escolar 2025</h3>
          <p className="text-sm text-muted-foreground">
            {cohortes.length} cohorte{cohortes.length !== 1 ? "s" : ""} configurada{cohortes.length !== 1 ? "s" : ""}
            {selectedCohorte && <> — <span className="font-medium">{selectedCohorte.nombre}</span> ({selectedCohorte.entidad_territorial})</>}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterCohorte} onValueChange={setFilterCohorte}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filtrar por cohorte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las cohortes</SelectItem>
              {cohortes.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre} ({cohorteInst.filter(ci => ci.cohorte_id === c.id).length} IE)
                </SelectItem>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "baseline" | "encuestas")}>
        <TabsList>
          <TabsTrigger value="baseline" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Línea Base 2025
          </TabsTrigger>
          <TabsTrigger value="encuestas" className="gap-1.5">
            <BookOpen className="w-4 h-4" />
            Encuestas AE
          </TabsTrigger>
        </TabsList>

        {/* ── Baseline 2025 Tab ───────────────────────── */}
        <TabsContent value="baseline" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Datos importados de la aplicación RLT-Stats (tablas ae_*_submissions_2025)
          </p>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><School className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredBaseline.rectores.length}</p>
                  <p className="text-xs text-muted-foreground">Rectores / IE</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2"><BookOpen className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredBaseline.docentes.length.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Docentes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2"><GraduationCap className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredBaseline.estudiantes.length.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Estudiantes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2"><Users className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredBaseline.acudientes.length.toLocaleString()}</p>
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
                    const dAvg = avgLikert(filteredBaseline.docentes, cat);
                    const eAvg = avgLikert(filteredBaseline.estudiantes, cat);
                    const aAvg = avgLikert(filteredBaseline.acudientes, cat);
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
        </TabsContent>

        {/* ── Encuestas AE Tab ────────────────────────── */}
        <TabsContent value="encuestas" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Encuestas de ambiente escolar (tabla encuestas_ambiente_escolar) — {aeSubmissions.length.toLocaleString()} registros totales
          </p>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold">
                    {(filteredAE.docentes.length + filteredAE.estudiantes.length + filteredAE.acudientes.length).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Total encuestas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2"><BookOpen className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredAE.docentes.length.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Docentes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2"><GraduationCap className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredAE.estudiantes.length.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Estudiantes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2"><Users className="w-5 h-5 text-purple-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{filteredAE.acudientes.length.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Acudientes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AE Averages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Promedio Likert general por tipo de encuestado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Registros</TableHead>
                    <TableHead className="text-center">Promedio general</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {([
                    { label: "Docentes", data: filteredAE.docentes },
                    { label: "Estudiantes", data: filteredAE.estudiantes },
                    { label: "Acudientes", data: filteredAE.acudientes },
                  ] as { label: string; data: AESubmission[] }[]).map(row => {
                    const avg = avgLikertAE(row.data);
                    return (
                      <TableRow key={row.label}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-center">{row.data.length.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={avg >= 4 ? "default" : avg >= 3 ? "secondary" : "destructive"}>
                            {avg > 0 ? avg.toFixed(2) : "—"}
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

          {/* Cohorte summary */}
          {cohortes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen por cohorte</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cohorte</TableHead>
                      <TableHead className="text-center">ET</TableHead>
                      <TableHead className="text-center">IE</TableHead>
                      <TableHead className="text-center">Encuestas</TableHead>
                      <TableHead className="text-center">Línea base</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortes.map(c => {
                      const ieCount = cohorteInst.filter(ci => ci.cohorte_id === c.id).length;
                      const aeCount = aeSubmissions.filter(s => s.cohorte_id === c.id).length;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.nombre}</TableCell>
                          <TableCell className="text-center">{c.entidad_territorial}</TableCell>
                          <TableCell className="text-center">{ieCount}</TableCell>
                          <TableCell className="text-center">{aeCount.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={c.is_baseline ? "default" : "secondary"}>
                              {c.is_baseline ? "Sí" : "No"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
