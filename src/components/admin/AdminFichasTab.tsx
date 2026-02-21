import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight, Plus, FileDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { generarPDFFicha } from "@/utils/pdfGenerator";
import logoRLTWhite from "@/assets/logo_rlt_white.jpeg";
import logoCLTWhite from "@/assets/logo_clt_white.jpeg";
import logoCosmoWhite from "@/assets/logo_cosmo_white.png";

type Ficha = Tables<"fichas_rlt">;
const PAGE_SIZE = 20;

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota" });
};

export default function AdminFichasTab() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [regiones, setRegiones] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("regiones").select("nombre").order("nombre").then(({ data }) => {
      setRegiones((data ?? []).map(r => r.nombre));
    });
  }, []);

  const fetchFichas = async () => {
    setLoading(true);
    let query = supabase
      .from("fichas_rlt")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (regionFilter) query = query.eq("region", regionFilter);
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
  };

  useEffect(() => {
    fetchFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, regionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchFichas();
  };

  const exportCSV = async () => {
    let query = supabase.from("fichas_rlt").select("*").order("created_at", { ascending: false });
    if (regionFilter) query = query.eq("region", regionFilter);
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
    const { error } = await supabase.from("fichas_rlt").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ficha eliminada" });
      setDeleteId(null);
      fetchFichas();
    }
    setDeleteLoading(false);
  };

  const handleDownloadPdf = async (f: Ficha) => {
    // Fetch region logo flags
    const { data: regionData } = await supabase
      .from("regiones")
      .select("mostrar_logo_rlt, mostrar_logo_clt")
      .eq("nombre", f.region)
      .maybeSingle();

    const showLogoRlt = regionData?.mostrar_logo_rlt ?? true;
    const showLogoClt = regionData?.mostrar_logo_clt ?? true;

    const datosPDF: Record<string, unknown> = { ...f };
    generarPDFFicha(
      datosPDF,
      { logoRLT: logoRLTWhite, logoCLTDark: logoCLTWhite, logoCosmo: logoCosmoWhite },
      { showLogoRlt, showLogoClt }
    );
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, IE o correo…" className="pl-8" />
          </div>
          <Button type="submit" size="sm">Buscar</Button>
        </form>
        <select
          value={regionFilter}
          onChange={(e) => { setRegionFilter(e.target.value); setPage(0); }}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Todas las regiones</option>
          {regiones.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setSearch(""); setRegionFilter(""); setPage(0); }} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Limpiar
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
              <TableHead>Entidad Territorial</TableHead>
              <TableHead>Institución</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Enviado (COT)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <RefreshCw className="animate-spin w-5 h-5 mx-auto" />
                </TableCell>
              </TableRow>
            ) : fichas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No se encontraron fichas.</TableCell>
              </TableRow>
            ) : (
              fichas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium whitespace-nowrap">{f.nombres_apellidos}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{f.region}</Badge></TableCell>
                  <TableCell className="max-w-[200px] truncate" title={f.nombre_ie}>{f.nombre_ie}</TableCell>
                  <TableCell className="text-sm">{f.cargo_actual}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{f.correo_personal}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(f.created_at)}</TableCell>
                  <TableCell className="text-right">
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ficha?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción es irreversible.</AlertDialogDescription>
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
