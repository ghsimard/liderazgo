import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { RefreshCw, Search, ShieldCheck, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isCentroEducativo } from "@/utils/institutionType";

interface Row {
  institucion: string;
  region: string;
  sinEstudiantes: boolean;
  sinAdministrativos: boolean;
  esCentroEducativo: boolean;
  tieneExcepcionManual: boolean;
}

interface Props {
  isViewer?: boolean;
}

export default function AdminExcepciones360Tab({ isViewer = false }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombre_ie, region")
      .order("nombre_ie");
    const { data: exc } = await supabase
      .from("encuesta_360_excepciones")
      .select("institucion, sin_estudiantes, sin_administrativos");

    const excMap = new Map<string, { e: boolean; a: boolean }>();
    (exc ?? []).forEach((x: any) =>
      excMap.set(x.institucion, { e: !!x.sin_estudiantes, a: !!x.sin_administrativos })
    );

    const seen = new Map<string, string>();
    (fichas ?? []).forEach((f: any) => {
      if (f.nombre_ie && !seen.has(f.nombre_ie)) seen.set(f.nombre_ie, f.region ?? "");
    });

    setRows(
      Array.from(seen.entries())
        .map(([institucion, region]) => {
          const exc = excMap.get(institucion);
          const ce = isCentroEducativo(institucion);
          return {
            institucion,
            region,
            // Sin excepción manual, los Centros Educativos quedan exceptuados por defecto.
            sinEstudiantes: exc ? exc.e : ce,
            sinAdministrativos: exc ? exc.a : ce,
            esCentroEducativo: ce,
            tieneExcepcionManual: !!exc,
          };
        })
        .sort((a, b) => a.institucion.localeCompare(b.institucion, "es"))
    );
    setLoading(false);
  };

  const toggle = async (row: Row, field: "sinEstudiantes" | "sinAdministrativos", value: boolean) => {
    setSaving(row.institucion);
    const next = { ...row, [field]: value, tieneExcepcionManual: true };
    const payload = {
      institucion: row.institucion,
      sin_estudiantes: next.sinEstudiantes,
      sin_administrativos: next.sinAdministrativos,
    };
    const { error } = await supabase
      .from("encuesta_360_excepciones")
      .upsert(payload, { onConflict: "institucion" });
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar la excepción.", variant: "destructive" });
    } else {
      setRows((prev) => prev.map((r) => (r.institucion === row.institucion ? next : r)));
    }
    setSaving(null);
  };

  const toggleBoth = async (row: Row) => {
    const target = !(row.sinEstudiantes && row.sinAdministrativos);
    setSaving(row.institucion);
    const next = { ...row, sinEstudiantes: target, sinAdministrativos: target, tieneExcepcionManual: true };
    const payload = {
      institucion: row.institucion,
      sin_estudiantes: target,
      sin_administrativos: target,
    };
    const { error } = await supabase
      .from("encuesta_360_excepciones")
      .upsert(payload, { onConflict: "institucion" });
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar la excepción.", variant: "destructive" });
    } else {
      setRows((prev) => prev.map((r) => (r.institucion === row.institucion ? next : r)));
    }
    setSaving(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.institucion.toLowerCase().includes(q) || r.region.toLowerCase().includes(q));
  }, [rows, search]);

  const activas = rows.filter((r) => r.tieneExcepcionManual).length;

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
            <ShieldCheck className="w-4 h-4 text-primary" />
            Excepciones de mínimos 360°
          </CardTitle>
          <Badge variant="secondary">{activas} institución(es) con excepción</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Marque las instituciones que no cuentan con estudiantes de los grados requeridos o con personal
          administrativo. Esos roles dejarán de exigirse en el estado de recolección. Los Centros Educativos
          aparecen exceptuados por defecto, pero puede desmarcar la casilla para volver a exigir el rol
          (mínimo 1): su elección manual siempre tiene prioridad.
        </p>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar institución o región…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Institución</TableHead>
                <TableHead className="min-w-[120px]">Región</TableHead>
                <TableHead className="text-center whitespace-nowrap">Sin estudiantes</TableHead>
                <TableHead className="text-center whitespace-nowrap">Sin administrativos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Sin resultados
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.institucion}>
                    <TableCell className="text-sm font-medium">
                      {r.institucion}
                      {r.esCentroEducativo && (
                        <Badge variant="outline" className="ml-2 text-[10px]">Centro Educativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.region}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.sinEstudiantes}
                        disabled={isViewer || saving === r.institucion}
                        onCheckedChange={(v) => toggle(r, "sinEstudiantes", !!v)}
                        aria-label={`Sin estudiantes en ${r.institucion}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.sinAdministrativos}
                        disabled={isViewer || saving === r.institucion}
                        onCheckedChange={(v) => toggle(r, "sinAdministrativos", !!v)}
                        aria-label={`Sin administrativos en ${r.institucion}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} institución(es) mostrada(s)</p>
      </CardContent>
    </Card>
  );
}
