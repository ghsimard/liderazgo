import { useEffect, useState, useMemo, useCallback } from "react";
import { genderizeRole } from "@/utils/genderizeRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight, Plus, FileDown, Files, Filter } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { generarPDFFicha } from "@/utils/pdfGenerator";
import { MultiSelect } from "@/components/ui/multi-select";
import JSZip from "jszip";
import { useAppImages } from "@/hooks/useAppImages";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";

type Ficha = Tables<"fichas_rlt">;
const PAGE_SIZE = 20;

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota" });
};

interface FichaFilterData {
  region: string;
  entidad_territorial: string;
  municipio: string;
  institucion: string;
}

export default function AdminFichasTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { images } = useAppImages();

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter data derived from fichas
  const [filterData, setFilterData] = useState<FichaFilterData[]>([]);

  // Multi-select filter state
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selMunicipios, setSelMunicipios] = useState<string[]>([]);
  const [selInstituciones, setSelInstituciones] = useState<string[]>([]);

  // Load filter options from fichas data
  useEffect(() => {
    const loadFilterData = async () => {
      const { data: allFichas } = await supabase
        .from("fichas_rlt")
        .select("region, entidad_territorial, nombre_ie");

      const { data: instituciones } = await supabase.from("instituciones").select("nombre, municipio_id");
      const { data: municipios } = await supabase.from("municipios").select("id, nombre");

      const munMap = new Map((municipios ?? []).map((m) => [m.id, m.nombre]));
      const instMunMap = new Map((instituciones ?? []).map((i) => [i.nombre, munMap.get(i.municipio_id) ?? ""]));

      setFilterData(
        (allFichas ?? []).map((f) => ({
          region: f.region ?? "",
          entidad_territorial: f.entidad_territorial ?? "",
          municipio: instMunMap.get(f.nombre_ie) ?? "",
          institucion: f.nombre_ie ?? "",
        }))
      );
    };
    loadFilterData();
  }, []);

  // Clear downstream filters
  useEffect(() => { setSelEntidades([]); setSelMunicipios([]); setSelInstituciones([]); }, [selRegions]);
  useEffect(() => { setSelMunicipios([]); setSelInstituciones([]); }, [selEntidades]);
  useEffect(() => { setSelInstituciones([]); }, [selMunicipios]);

  // Cascade filter options
  const regionOptions = useMemo(() => {
    const vals = [...new Set(filterData.map((d) => d.region).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [filterData]);

  const entidadOptions = useMemo(() => {
    let pool = filterData;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    const vals = [...new Set(pool.map((d) => d.entidad_territorial).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [filterData, selRegions]);

  const municipioOptions = useMemo(() => {
    let pool = filterData;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    const vals = [...new Set(pool.map((d) => d.municipio).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [filterData, selRegions, selEntidades]);

  const institucionOptions = useMemo(() => {
    let pool = filterData;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    if (selMunicipios.length > 0) pool = pool.filter((d) => selMunicipios.includes(d.municipio));
    const vals = [...new Set(pool.map((d) => d.institucion).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [filterData, selRegions, selEntidades, selMunicipios]);

  // Build set of matching institution names for DB query
  const activeInstFilter = useMemo(() => {
    if (selInstituciones.length > 0) return selInstituciones;
    if (selMunicipios.length > 0) return institucionOptions.map((o) => o.value);
    if (selEntidades.length > 0) return institucionOptions.map((o) => o.value);
    return null; // no institution-level filter
  }, [selInstituciones, selMunicipios, selEntidades, institucionOptions]);

  const hasFilters = selRegions.length > 0 || selEntidades.length > 0 || selMunicipios.length > 0 || selInstituciones.length > 0;

  const fetchFichas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("fichas_rlt")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    // Apply region filter (multiple)
    if (selRegions.length > 0 && !activeInstFilter) {
      query = query.in("region", selRegions);
    }

    // Apply institution filter (derived from cascade)
    if (activeInstFilter && activeInstFilter.length > 0) {
      query = query.in("nombre_ie", activeInstFilter);
    }

    if (search) {
      query = query.or(
        `nombres_apellidos.ilike.%${search}%,nombre_ie.ilike.%${search}%,correo_personal.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) {
      toast({ title: "Error al cargar fichas", variant: "destructive" });
    } else {
      setFichas(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, selRegions, activeInstFilter, search, toast]);

  useEffect(() => {
    fetchFichas();
  }, [fetchFichas]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selRegions, selEntidades, selMunicipios, selInstituciones]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchFichas();
  };

  const exportCSV = async () => {
    let query = supabase.from("fichas_rlt").select("*").order("created_at", { ascending: false });
    if (selRegions.length > 0 && !activeInstFilter) query = query.in("region", selRegions);
    if (activeInstFilter && activeInstFilter.length > 0) query = query.in("nombre_ie", activeInstFilter);
    if (search) query = query.or(`nombres_apellidos.ilike.%${search}%,nombre_ie.ilike.%${search}%,correo_personal.ilike.%${search}%`);

    const { data, error } = await query;
    if (error || !data?.length) {
      toast({ title: "No hay datos para exportar", variant: "destructive" });
      return;
    }

    const headers = Object.keys(data[0]) as (keyof Ficha)[];
    const rows = data.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return "";
        if (Array.isArray(v)) return (v as string[]).join("|");
        return String(v).replace(/"/g, '""');
      })
    );

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichas_rlt_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);

    const ficha = fichas.find((f) => f.id === deleteId);
    if (ficha) {
      const nombre = ficha.nombres_apellidos;
      const ie = ficha.nombre_ie;
      const cedula = ficha.numero_cedula;

      // Fetch related encuestas
      const { data: relatedEncuestas } = await supabase
        .from("encuestas_360")
        .select("*")
        .eq("institucion_educativa", ie)
        .or(`nombre_directivo.eq.${nombre},and(nombre_completo.eq.${nombre},tipo_formulario.eq.autoevaluacion)`);

      // Fetch related rubrica data by cedula
      let relatedEvaluaciones: any[] = [];
      let relatedAsignaciones: any[] = [];
      let relatedSubmissionDates: any[] = [];
      let relatedSeguimientos: any[] = [];

      if (cedula) {
        const [evalRes, asigRes, subRes, segRes] = await Promise.all([
          supabase.from("rubrica_evaluaciones").select("*").eq("directivo_cedula", cedula),
          supabase.from("rubrica_asignaciones").select("*").eq("directivo_cedula", cedula),
          supabase.from("rubrica_submission_dates").select("*").eq("directivo_cedula", cedula),
          supabase.from("rubrica_seguimientos").select("*").eq("directivo_cedula", cedula),
        ]);
        relatedEvaluaciones = evalRes.data ?? [];
        relatedAsignaciones = asigRes.data ?? [];
        relatedSubmissionDates = subRes.data ?? [];
        relatedSeguimientos = segRes.data ?? [];
      }

      // Save everything to trash
      await supabase.from("deleted_records").insert([{
        record_type: "ficha_rlt",
        record_label: `${nombre} — ${ie}`,
        deleted_data: {
          ficha,
          encuestas: relatedEncuestas ?? [],
          rubrica_evaluaciones: relatedEvaluaciones,
          rubrica_asignaciones: relatedAsignaciones,
          rubrica_submission_dates: relatedSubmissionDates,
          rubrica_seguimientos: relatedSeguimientos,
        } as any,
      }]);

      // Delete related encuestas
      await supabase.from("encuestas_360").delete().eq("nombre_directivo", nombre).eq("institucion_educativa", ie);
      await supabase.from("encuestas_360").delete().eq("nombre_completo", nombre).eq("institucion_educativa", ie).eq("tipo_formulario", "autoevaluacion");

      // Delete related rubrica data
      if (cedula) {
        await Promise.all([
          supabase.from("rubrica_evaluaciones").delete().eq("directivo_cedula", cedula),
          supabase.from("rubrica_submission_dates").delete().eq("directivo_cedula", cedula),
          supabase.from("rubrica_seguimientos").delete().eq("directivo_cedula", cedula),
          supabase.from("rubrica_asignaciones").delete().eq("directivo_cedula", cedula),
        ]);
      }
    }

    const { error } = await supabase.from("fichas_rlt").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ficha eliminada", description: "Se puede restaurar desde la Papelera." });
      setDeleteId(null);
      fetchFichas();
    }
    setDeleteLoading(false);
  };

  const handleDownloadPdf = async (f: Ficha) => {
    const cargo = (f.cargo_actual ?? "").toLowerCase();
    const isRector = cargo.includes("rector");
    const isCoordinador = cargo.includes("coordinador");
    const datosPDF: Record<string, unknown> = { ...f };
    const pdfLogos = getPdfLogoSources(images);
    generarPDFFicha(datosPDF, { logoRLT: pdfLogos.logoRLT, logoCLTDark: pdfLogos.logoCLT, logoCosmo: pdfLogos.logoCosmo }, { showLogoRlt: isRector, showLogoClt: isCoordinador });
  };

  const [batchLoading, setBatchLoading] = useState(false);

  const handleBatchPdf = async () => {
    if (!hasFilters) {
      toast({ title: "Seleccione al menos un filtro", variant: "destructive" });
      return;
    }
    setBatchLoading(true);
    try {
      let query = supabase.from("fichas_rlt").select("*").order("nombres_apellidos");
      if (selRegions.length > 0 && !activeInstFilter) query = query.in("region", selRegions);
      if (activeInstFilter && activeInstFilter.length > 0) query = query.in("nombre_ie", activeInstFilter);
      if (search) query = query.or(`nombres_apellidos.ilike.%${search}%,nombre_ie.ilike.%${search}%,correo_personal.ilike.%${search}%`);

      const { data, error } = await query;
      if (error || !data?.length) {
        toast({ title: "No hay fichas para estos filtros", variant: "destructive" });
        setBatchLoading(false);
        return;
      }

      const zip = new JSZip();
      for (const f of data) {
        const cargo = (f.cargo_actual ?? "").toLowerCase();
        const isRector = cargo.includes("rector");
        const isCoordinador = cargo.includes("coordinador");
        const datosPDF: Record<string, unknown> = { ...f };
        const pdfLogos = getPdfLogoSources(images);
        const blob = await generarPDFFicha(datosPDF, { logoRLT: pdfLogos.logoRLT, logoCLTDark: pdfLogos.logoCLT, logoCosmo: pdfLogos.logoCosmo }, { showLogoRlt: isRector, showLogoClt: isCoordinador }, { returnBlob: true });
        if (blob) {
          const fileName = `Ficha_${String(f.apellidos ?? f.nombres ?? "ficha").replace(/\s+/g, "_")}_${String(f.nombres ?? "").replace(/\s+/g, "_")}.pdf`;
          zip.file(fileName, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fichas_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `${data.length} PDF(s) empaquetado(s) en ZIP` });
    } catch {
      toast({ title: "Error al generar PDFs", variant: "destructive" });
    }
    setBatchLoading(false);
  };

  const clearAllFilters = () => {
    setSelRegions([]);
    setSelEntidades([]);
    setSelMunicipios([]);
    setSelInstituciones([]);
    setSearch("");
    setPage(0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Cascade filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-auto">
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Región</label>
              <MultiSelect options={regionOptions} selected={selRegions} onChange={setSelRegions} placeholder="Todas las regiones" className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect options={entidadOptions} selected={selEntidades} onChange={setSelEntidades} placeholder="Todas las entidades" className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Municipio</label>
              <MultiSelect options={municipioOptions} selected={selMunicipios} onChange={setSelMunicipios} placeholder="Todos los municipios" className="w-full" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución</label>
              <MultiSelect options={institucionOptions} selected={selInstituciones} onChange={setSelInstituciones} placeholder="Todas las instituciones" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, IE o correo…" className="pl-8" />
          </div>
          <Button type="submit" size="sm">Buscar</Button>
        </form>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleBatchPdf} disabled={batchLoading || !hasFilters} className="gap-1.5">
          <Files className="w-4 h-4" /> {batchLoading ? "Generando…" : "PDFs filtrados"}
        </Button>
        <Button size="sm" onClick={() => navigate("/admin/ficha/new")} className="gap-1.5">
          <Plus className="w-4 h-4" /> Crear ficha
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Región</TableHead>
              <TableHead>Institución</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Cédula</TableHead>
              <TableHead>Enviado (COT)</TableHead>
              <TableHead>Modificado (COT)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <RefreshCw className="animate-spin w-5 h-5 mx-auto" />
                </TableCell>
              </TableRow>
            ) : fichas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No se encontraron fichas.</TableCell>
              </TableRow>
            ) : (
              fichas.map((f) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/ficha/${f.id}`)}>
                  <TableCell className="font-medium whitespace-nowrap">{f.nombres_apellidos}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{f.region}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate" title={f.nombre_ie}>{f.nombre_ie}</TableCell>
                  <TableCell className="text-sm">{genderizeRole(f.cargo_actual, f.genero)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.numero_cedula || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(f.created_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime((f as any).updated_at)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(f)} title="Descargar PDF">
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/ficha/${f.id}`)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(f.id)} title="Eliminar" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalPages > 1 ? `Página ${page + 1} de ${totalPages} — ` : ""}
          <strong className="text-foreground">{total}</strong> ficha{total !== 1 ? "s" : ""}
          {hasFilters || search ? " (filtradas)" : ""}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ficha?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará la ficha y todas las encuestas 360° asociadas. Podrá restaurarla desde la Papelera.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
