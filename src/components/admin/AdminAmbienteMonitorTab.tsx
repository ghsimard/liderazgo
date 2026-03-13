import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Mail, Phone, Eye, Search, X } from "lucide-react";
import { useGeographicData } from "@/hooks/useGeographicData";

interface Directivo {
  nombre_ie: string;
  nombres_apellidos: string;
  correo_personal: string;
  correo_institucional: string | null;
  celular_personal: string;
  telefono_ie: string | null;
  prefiere_correo: string;
  cargo_actual: string;
  region: string;
}

interface Submission {
  institucion_educativa: string;
  tipo_formulario: string;
}

function CountBadge({ count }: { count: number }) {
  const variant = count === 0 ? "destructive" : count < 25 ? "secondary" : "default";
  const className = count > 0 && count < 25 ? "bg-amber-500 text-white hover:bg-amber-600 border-transparent" : "";
  return <Badge variant={variant} className={className}>{count}</Badge>;
}

export default function AdminAmbienteMonitorTab() {
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactDialog, setContactDialog] = useState<Directivo | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const { regionNames, getInstitucionesForRegion } = useGeographicData();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [fichasRes, subRes] = await Promise.all([
        supabase.from("fichas_rlt").select("nombre_ie, nombres_apellidos, correo_personal, correo_institucional, celular_personal, telefono_ie, prefiere_correo, cargo_actual, region"),
        supabase.from("encuestas_ambiente_escolar").select("institucion_educativa, tipo_formulario"),
      ]);
      setDirectivos((fichasRes.data as Directivo[]) || []);
      setSubmissions((subRes.data as Submission[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const { rows, totals, filteredRows, filteredTotals } = useMemo(() => {
    const institutions = new Set<string>();
    directivos.forEach((d) => institutions.add(d.nombre_ie));
    submissions.forEach((s) => institutions.add(s.institucion_educativa));

    const countMap: Record<string, { docentes: number; estudiantes: number; acudientes: number }> = {};
    for (const ie of institutions) {
      countMap[ie] = { docentes: 0, estudiantes: 0, acudientes: 0 };
    }
    for (const s of submissions) {
      const key = s.tipo_formulario as keyof (typeof countMap)[string];
      if (countMap[s.institucion_educativa] && key in countMap[s.institucion_educativa]) {
        countMap[s.institucion_educativa][key]++;
      }
    }

    const sorted = Array.from(institutions).sort();
    const allRows = sorted.map((ie) => ({ ie, ...countMap[ie], directivo: directivos.find((d) => d.nombre_ie === ie) }));
    const totalD = sorted.reduce((a, ie) => a + countMap[ie].docentes, 0);
    const totalE = sorted.reduce((a, ie) => a + countMap[ie].estudiantes, 0);
    const totalA = sorted.reduce((a, ie) => a + countMap[ie].acudientes, 0);

    // Apply filters
    let regionInstitutions: string[] | null = null;
    if (filterRegion !== "all") {
      regionInstitutions = getInstitucionesForRegion(filterRegion);
    }

    const filtered = allRows.filter((r) => {
      if (regionInstitutions && !regionInstitutions.includes(r.ie)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!r.ie.toLowerCase().includes(q)) return false;
      }
      if (filterStatus === "sin") return r.docentes + r.estudiantes + r.acudientes === 0;
      if (filterStatus === "pocas") {
        const total = r.docentes + r.estudiantes + r.acudientes;
        return total > 0 && total < 75;
      }
      if (filterStatus === "suficientes") return r.docentes + r.estudiantes + r.acudientes >= 75;
      return true;
    });

    const fD = filtered.reduce((a, r) => a + r.docentes, 0);
    const fE = filtered.reduce((a, r) => a + r.estudiantes, 0);
    const fA = filtered.reduce((a, r) => a + r.acudientes, 0);

    return {
      rows: allRows,
      totals: { docentes: totalD, estudiantes: totalE, acudientes: totalA, total: totalD + totalE + totalA },
      filteredRows: filtered,
      filteredTotals: { docentes: fD, estudiantes: fE, acudientes: fA, total: fD + fE + fA },
    };
  }, [directivos, submissions, filterRegion, searchText, filterStatus, getInstitucionesForRegion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const hasFilters = filterRegion !== "all" || filterStatus !== "all" || searchText !== "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Región" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las regiones</SelectItem>
            {regionNames.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="sin">Sin respuestas</SelectItem>
            <SelectItem value="pocas">Pocas (&lt;75)</SelectItem>
            <SelectItem value="suficientes">Suficientes (75+)</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar institución..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
          {searchText && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchText("")}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {hasFilters && (
          <Button variant="outline" size="sm" onClick={() => { setFilterRegion("all"); setFilterStatus("all"); setSearchText(""); }}>
            <X className="w-3 h-3 mr-1" /> Limpiar filtros
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium">Total: {filteredTotals.total} respuestas{hasFilters ? ` (de ${totals.total})` : ""}</span>
        <span>Docentes: <strong>{filteredTotals.docentes}</strong></span>
        <span>Estudiantes: <strong>{filteredTotals.estudiantes}</strong></span>
        <span>Acudientes: <strong>{filteredTotals.acudientes}</strong></span>
        <span className="ml-auto text-muted-foreground">{filteredRows.length}{hasFilters ? ` de ${rows.length}` : ""} instituciones</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="destructive">0 = Sin respuestas</Badge>
        <Badge className="bg-amber-500 text-white border-transparent">1-24 = Pocas</Badge>
        <Badge>25+ = Suficientes</Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institución</TableHead>
            <TableHead className="text-center w-24">Docentes</TableHead>
            <TableHead className="text-center w-24">Estudiantes</TableHead>
            <TableHead className="text-center w-24">Acudientes</TableHead>
            <TableHead className="text-center w-20">Contacto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No se encontraron instituciones con los filtros seleccionados.
              </TableCell>
            </TableRow>
          ) : filteredRows.map((r) => (
            <TableRow key={r.ie}>
              <TableCell className="font-medium text-sm">{r.ie}</TableCell>
              <TableCell className="text-center"><CountBadge count={r.docentes} /></TableCell>
              <TableCell className="text-center"><CountBadge count={r.estudiantes} /></TableCell>
              <TableCell className="text-center"><CountBadge count={r.acudientes} /></TableCell>
              <TableCell className="text-center">
                {r.directivo ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setContactDialog(r.directivo!)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!contactDialog} onOpenChange={() => setContactDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contacto del Directivo</DialogTitle>
          </DialogHeader>
          {contactDialog && (
            <div className="space-y-3 text-sm">
              <p><strong>{contactDialog.nombres_apellidos}</strong></p>
              <p className="text-muted-foreground">{contactDialog.cargo_actual} — {contactDialog.prefiere_correo === "institucional" ? "Prefiere correo institucional" : "Prefiere correo personal"}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{contactDialog.correo_personal}</span>
                </div>
                {contactDialog.correo_institucional && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{contactDialog.correo_institucional} (inst.)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{contactDialog.celular_personal}</span>
                </div>
                {contactDialog.telefono_ie && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{contactDialog.telefono_ie} (IE)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
