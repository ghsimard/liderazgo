import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, AlertTriangle, CheckCircle2, Search, Eye, EyeOff } from "lucide-react";

/** Required counts per tipo_formulario */
const ROLE_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  autoevaluacion: { min: 1, max: 1, label: "Autoevaluación" },
  directivo: { min: 2, max: 2, label: "Directivo Par" },
  docente: { min: 2, max: 2, label: "Docente" },
  administrativo: { min: 2, max: 2, label: "Administrativo" },
  estudiante: { min: 1, max: 1, label: "Estudiante" },
  acudiente: { min: 1, max: 1, label: "Acudiente" },
};

const ROLE_KEYS = Object.keys(ROLE_LIMITS);

interface VisibilityRow {
  fase: string;
  scope_type: string;
  scope_value: string;
  is_active: boolean;
}

function resolveVisibility(
  fase: string,
  cedula: string | null,
  ie: string,
  region: string,
  visRows: VisibilityRow[]
): boolean {
  const faseRows = visRows.filter((r) => r.fase === fase);
  if (cedula) {
    const d = faseRows.find((r) => r.scope_type === "directivo" && r.scope_value === cedula);
    if (d) return d.is_active;
  }
  const inst = faseRows.find((r) => r.scope_type === "institucion" && r.scope_value === ie);
  if (inst) return inst.is_active;
  const reg = faseRows.find((r) => r.scope_type === "region" && r.scope_value === region);
  return reg?.is_active ?? false;
}

interface DirectivoRow {
  nombre: string;
  institucion: string;
  region: string;
  cedula: string | null;
  counts: Record<string, number>;
  incomplete: boolean;
  visible: boolean;
}

interface AdminEncuestaMonitorProps {
  fase?: "inicial" | "final";
}

export default function AdminEncuestaMonitor({ fase = "inicial" }: AdminEncuestaMonitorProps) {
  const [rows, setRows] = useState<DirectivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "complete" | "no_visible">("all");

  useEffect(() => {
    loadData();
  }, [fase]);

  const loadData = async () => {
    setLoading(true);

    const [{ data: fichas }, { data: encuestas }, { data: visRows }] = await Promise.all([
      supabase
        .from("fichas_rlt")
        .select("nombres_apellidos, nombre_ie, region, numero_cedula")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"])
        .order("nombres_apellidos"),
      supabase
        .from("encuestas_360")
        .select("tipo_formulario, institucion_educativa, nombre_directivo, nombre_completo")
        .eq("fase", fase),
      supabase.from("encuesta_360_visibility").select("fase, scope_type, scope_value, is_active"),
    ]);

    const visibility = (visRows ?? []) as VisibilityRow[];

    const directivoList = (fichas ?? []).map((f) => ({
      nombre: f.nombres_apellidos,
      institucion: f.nombre_ie,
      region: f.region,
      cedula: f.numero_cedula,
    }));

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
      const visible = resolveVisibility(fase, d.cedula, d.institucion, d.region, visibility);
      return { ...d, counts, incomplete, visible };
    });

    setRows(result);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filterMode === "incomplete") list = list.filter((r) => r.incomplete);
    if (filterMode === "complete") list = list.filter((r) => !r.incomplete);
    if (filterMode === "no_visible") list = list.filter((r) => !r.visible);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.nombre.toLowerCase().includes(q) || r.institucion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filterMode, search]);

  const incompleteCount = rows.filter((r) => r.incomplete).length;
  const hiddenCount = rows.filter((r) => !r.visible).length;

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
            Estado de recolección por par
          </CardTitle>
          <div className="flex items-center gap-2">
            {hiddenCount > 0 && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <EyeOff className="w-3 h-3" />
                {hiddenCount} no visible(s)
              </Badge>
            )}
            <Badge variant={incompleteCount > 0 ? "destructive" : "secondary"}>
              {incompleteCount} incompleto(s) / {rows.length} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar par o IE…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="incomplete">Solo incompletos</SelectItem>
              <SelectItem value="complete">Solo completos</SelectItem>
              <SelectItem value="no_visible">No visibles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Par</TableHead>
                <TableHead className="min-w-[150px]">Institución</TableHead>
                {ROLE_KEYS.map((k) => (
                  <TableHead key={k} className="text-center text-xs whitespace-nowrap">
                    {ROLE_LIMITS[k].label}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      min {ROLE_LIMITS[k].min}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Visible</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={ROLE_KEYS.length + 4} className="text-center text-muted-foreground py-8">
                    {filterMode === "incomplete"
                      ? "✅ Todos los pares tienen el mínimo requerido"
                      : filterMode === "no_visible"
                        ? "✅ Todos los pares son visibles"
                        : "Sin resultados"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.nombre + r.institucion} className={!r.visible ? "opacity-60" : ""}>
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {r.visible ? (
                              <Eye className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-destructive mx-auto" />
                            )}
                          </TooltipTrigger>
                          <TooltipContent>
                            {r.visible
                              ? "Encuesta visible para este directivo"
                              : "No visible — el directivo no ve el botón en su panel"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
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
          {filtered.length} par(es) mostrado(s)
        </p>
      </CardContent>
    </Card>
  );
}
