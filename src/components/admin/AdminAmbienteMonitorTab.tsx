import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Mail, Phone, Eye, Search, X, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cohorte {
  id: string;
  nombre: string;
  entidad_territorial: string;
  year: number;
}

interface CohorteInstitution {
  cohorte_id: string;
  institucion_educativa: string;
}

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
  cohorte_id: string | null;
}

function CountBadge({ count }: { count: number }) {
  const variant = count === 0 ? "destructive" : count < 25 ? "secondary" : "default";
  const className = count > 0 && count < 25 ? "bg-amber-500 text-white hover:bg-amber-600 border-transparent" : "";
  return <Badge variant={variant} className={className}>{count}</Badge>;
}

export default function AdminAmbienteMonitorTab({ allowedRegions }: { allowedRegions?: string[] } = {}) {
  const { toast } = useToast();
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [cohorteInstitutions, setCohorteInstitutions] = useState<CohorteInstitution[]>([]);
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactDialog, setContactDialog] = useState<Directivo | null>(null);
  const [filterCohorte, setFilterCohorte] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Fetch cohortes, cohorte institutions, fichas in parallel
      const [cohortesRes, instRes, fichasRes] = await Promise.all([
        supabase.from("ae_cohortes").select("id, nombre, entidad_territorial, year").gte("year", 2026).order("year", { ascending: false }).order("nombre"),
        supabase.from("ae_cohorte_instituciones").select("cohorte_id, institucion_educativa"),
        supabase.from("fichas_rlt").select("nombre_ie, nombres_apellidos, correo_personal, correo_institucional, celular_personal, telefono_ie, prefiere_correo, cargo_actual, region"),
      ]);

      // Fetch ALL submissions with pagination
      const allSubmissions: Submission[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let keepGoing = true;
      while (keepGoing) {
        const { data } = await supabase
          .from("encuestas_ambiente_escolar")
          .select("institucion_educativa, tipo_formulario, cohorte_id")
          .range(from, from + PAGE_SIZE - 1);
        if (data && data.length > 0) {
          allSubmissions.push(...(data as Submission[]));
          from += PAGE_SIZE;
          if (data.length < PAGE_SIZE) keepGoing = false;
        } else {
          keepGoing = false;
        }
      }

      const currentCohortes = (cohortesRes.data as Cohorte[]) || [];
      const currentCohorteIds = new Set(currentCohortes.map((c) => c.id));
      const filteredInst = ((instRes.data as CohorteInstitution[]) || []).filter((ci) => currentCohorteIds.has(ci.cohorte_id));
      const filteredSubmissions = allSubmissions.filter((submission) => submission.cohorte_id && currentCohorteIds.has(submission.cohorte_id));

      setCohortes(currentCohortes);
      setCohorteInstitutions(filteredInst);
      setDirectivos((fichasRes.data as Directivo[]) || []);
      setSubmissions(filteredSubmissions);
      setLoading(false);
    }
    load();
  }, []);

  // Filter cohortes by allowedRegions (map region to ET)
  const visibleCohortes = useMemo(() => {
    if (!allowedRegions?.length) return cohortes;
    // Map region names to entidad_territorial for filtering
    const etMap: Record<string, string> = { "Oriente 2026": "Antioquia", "Quibdó 2026": "Quibdó" };
    const allowedETs = allowedRegions.map(r => etMap[r] || r);
    return cohortes.filter(c => allowedETs.includes(c.entidad_territorial));
  }, [cohortes, allowedRegions]);

  // Auto-select if only one cohorte visible
  useEffect(() => {
    if (visibleCohortes.length === 1 && filterCohorte === "all") {
      setFilterCohorte(visibleCohortes[0].id);
    }
  }, [visibleCohortes, filterCohorte]);

  const { rows, totals, filteredRows, filteredTotals } = useMemo(() => {
    // Build institution list only from active cohortes
    const allInstitutions = new Set(cohorteInstitutions.map(ci => ci.institucion_educativa));
    submissions.forEach((s) => {
      if (s.cohorte_id && allInstitutions.has(s.institucion_educativa)) {
        allInstitutions.add(s.institucion_educativa);
      }
    });

    // Count submissions per institution per tipo_formulario
    const countMap: Record<string, { docentes: number; estudiantes: number; acudientes: number; cohorte_ids: Set<string> }> = {};
    for (const ie of allInstitutions) {
      countMap[ie] = { docentes: 0, estudiantes: 0, acudientes: 0, cohorte_ids: new Set() };
    }
    // Map institutions to cohorte_ids
    for (const ci of cohorteInstitutions) {
      if (countMap[ci.institucion_educativa]) {
        countMap[ci.institucion_educativa].cohorte_ids.add(ci.cohorte_id);
      }
    }
    for (const s of submissions) {
      const key = s.tipo_formulario as "docentes" | "estudiantes" | "acudientes";
      if (countMap[s.institucion_educativa] && key in countMap[s.institucion_educativa]) {
        countMap[s.institucion_educativa][key]++;
      }
      if (s.cohorte_id && countMap[s.institucion_educativa]) {
        countMap[s.institucion_educativa].cohorte_ids.add(s.cohorte_id);
      }
    }

    // Helper: match directivo by exact name or by prefix before " - "
    const findDirectivo = (ie: string) => {
      const exact = directivos.find(d => d.nombre_ie === ie);
      if (exact) return exact;
      // ae_cohorte_instituciones may have "IE Name - Municipio" while fichas_rlt has just "IE Name"
      const prefix = ie.includes(" - ") ? ie.split(" - ")[0].trim() : null;
      if (prefix) return directivos.find(d => d.nombre_ie === prefix);
      // Also check if ficha name starts with ie (reverse case)
      return directivos.find(d => d.nombre_ie.startsWith(ie));
    };

    const sorted = Array.from(allInstitutions).sort();
    const allRows = sorted.map(ie => ({
      ie,
      ...countMap[ie],
      directivo: findDirectivo(ie),
    }));

    const totalD = allRows.reduce((a, r) => a + r.docentes, 0);
    const totalE = allRows.reduce((a, r) => a + r.estudiantes, 0);
    const totalA = allRows.reduce((a, r) => a + r.acudientes, 0);

    // Apply filters
    const filtered = allRows.filter(r => {
      // Cohorte filter
      if (filterCohorte !== "all") {
        if (!r.cohorte_ids.has(filterCohorte)) return false;
      }
      // Search filter
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!r.ie.toLowerCase().includes(q)) return false;
      }
      // Status filter
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
  }, [directivos, submissions, cohorteInstitutions, filterCohorte, searchText, filterStatus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const hasFilters = filterCohorte !== "all" || filterStatus !== "all" || searchText !== "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCohorte} onValueChange={setFilterCohorte}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Cohorte" />
          </SelectTrigger>
          <SelectContent>
            {!(visibleCohortes.length === 1) && <SelectItem value="all">Todas las cohortes</SelectItem>}
            {visibleCohortes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
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
          <Button variant="outline" size="sm" onClick={() => { setFilterCohorte("all"); setFilterStatus("all"); setSearchText(""); }}>
            <X className="w-3 h-3 mr-1" /> Limpiar filtros
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const base = window.location.origin;
            const links = [
              `Docentes: ${base}/encuesta-ambiente-docentes`,
              `Estudiantes: ${base}/encuesta-ambiente-estudiantes`,
              `Acudientes: ${base}/encuesta-ambiente-acudientes`,
            ].join("\n");
            navigator.clipboard.writeText(links);
            toast({ title: "Enlaces copiados", description: "Los 3 enlaces han sido copiados al portapapeles." });
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copiar enlaces
        </Button>
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
