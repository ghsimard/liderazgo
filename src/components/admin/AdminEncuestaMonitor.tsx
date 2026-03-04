import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle2, Search } from "lucide-react";

/** Required counts per tipo_formulario */
const ROLE_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  autoevaluacion: { min: 1, max: 1, label: "Autoevaluación" },
  directivo: { min: 2, max: 2, label: "Coordinador/a" },
  docente: { min: 2, max: 2, label: "Docente" },
  administrativo: { min: 2, max: 2, label: "Administrativo" },
  estudiante: { min: 1, max: 1, label: "Estudiante" },
  acudiente: { min: 1, max: 1, label: "Acudiente" },
};

const ROLE_KEYS = Object.keys(ROLE_LIMITS);

interface DirectivoRow {
  nombre: string;
  institucion: string;
  region: string;
  counts: Record<string, number>;
  incomplete: boolean;
}

interface AdminEncuestaMonitorProps {
  fase?: "inicial" | "final";
}

export default function AdminEncuestaMonitor({ fase = "inicial" }: AdminEncuestaMonitorProps) {
  const [rows, setRows] = useState<DirectivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "complete">("incomplete");

  useEffect(() => {
    loadData();
  }, [fase]);

  const loadData = async () => {
    setLoading(true);

    // Get all directivos from fichas
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombres_apellidos, nombre_ie, region")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    // Get all encuestas grouped
    const { data: encuestas } = await supabase
      .from("encuestas_360")
      .select("tipo_formulario, institucion_educativa, nombre_directivo, nombre_completo")
      .eq("fase", fase);

    const directivoList = (fichas ?? []).map((f) => ({
      nombre: f.nombres_apellidos,
      institucion: f.nombre_ie,
      region: f.region,
    }));

    // Count per directivo per role
    const result: DirectivoRow[] = directivoList.map((d) => {
      const counts: Record<string, number> = {};
      ROLE_KEYS.forEach((k) => { counts[k] = 0; });

      (encuestas ?? []).forEach((e) => {
        if (e.tipo_formulario === "autoevaluacion") {
          if (e.nombre_completo === d.nombre && e.institucion_educativa === d.institucion) {
            counts.autoevaluacion++;
          }
        } else {
          if (e.nombre_directivo === d.nombre && e.institucion_educativa === d.institucion) {
            counts[e.tipo_formulario] = (counts[e.tipo_formulario] || 0) + 1;
          }
        }
      });

      const incomplete = ROLE_KEYS.some((k) => counts[k] < ROLE_LIMITS[k].min);
      return { ...d, counts, incomplete };
    });

    setRows(result);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filterMode === "incomplete") list = list.filter((r) => r.incomplete);
    if (filterMode === "complete") list = list.filter((r) => !r.incomplete);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.nombre.toLowerCase().includes(q) || r.institucion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filterMode, search]);

  const incompleteCount = rows.filter((r) => r.incomplete).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Estado de recolección por directivo
          </CardTitle>
          <Badge variant={incompleteCount > 0 ? "destructive" : "secondary"}>
            {incompleteCount} incompleto(s) / {rows.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar directivo o IE…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incomplete">Solo incompletos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="complete">Solo completos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Directivo</TableHead>
                <TableHead className="min-w-[150px]">Institución</TableHead>
                {ROLE_KEYS.map((k) => (
                  <TableHead key={k} className="text-center text-xs whitespace-nowrap">
                    {ROLE_LIMITS[k].label}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      min {ROLE_LIMITS[k].min}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={ROLE_KEYS.length + 3} className="text-center text-muted-foreground py-8">
                    {filterMode === "incomplete"
                      ? "✅ Todos los directivos tienen el mínimo requerido"
                      : "Sin resultados"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.nombre + r.institucion}>
                    <TableCell className="font-medium text-sm">{r.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.institucion}</TableCell>
                    {ROLE_KEYS.map((k) => {
                      const count = r.counts[k] || 0;
                      const min = ROLE_LIMITS[k].min;
                      const ok = count >= min;
                      return (
                        <TableCell key={k} className="text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                              ok
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : count > 0
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {count}/{min}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {r.incomplete ? (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mx-auto" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} directivo(s) mostrado(s)
        </p>
      </CardContent>
    </Card>
  );
}
