import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Search,
  Download,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logoRLT from "@/assets/logo_rlt.png";
import type { Tables } from "@/integrations/supabase/types";

type Ficha = Tables<"fichas_rlt">;

const PAGE_SIZE = 20;

const REGIONES = [
  "Quibdó",
  "Oriente",
  "Buenaventura",
  "Tumaco",
  "Costa Caribe",
];

// Columns shown in the table (summary view)
const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-CO");
};

const formatDateTime = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-CO", { timeZone: "America/Bogota" });
};

export default function AdminPage() {
  const { isAdmin, signOut } = useAdminAuth();
  const { toast } = useToast();

  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  // Edit dialog
  const [editFicha, setEditFicha] = useState<Ficha | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    if (isAdmin) fetchFichas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, page, regionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchFichas();
  };

  // ── Export CSV ───────────────────────────────────────────────
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

  // ── Save edit ────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editFicha) return;
    setEditLoading(true);
    const { error } = await supabase
      .from("fichas_rlt")
      .update({
        nombres: editFicha.nombres,
        apellidos: editFicha.apellidos,
        correo_personal: editFicha.correo_personal,
        correo_institucional: editFicha.correo_institucional,
        celular_personal: editFicha.celular_personal,
        cargo_actual: editFicha.cargo_actual,
        nombre_ie: editFicha.nombre_ie,
        region: editFicha.region,
        codigo_dane: editFicha.codigo_dane,
        entidad_territorial: editFicha.entidad_territorial,
      })
      .eq("id", editFicha.id);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ficha actualizada correctamente" });
      setEditFicha(null);
      fetchFichas();
    }
    setEditLoading(false);
  };

  // ── Delete ───────────────────────────────────────────────────
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoRLT} alt="RLT" className="h-9" />
            <div>
              <h1 className="font-semibold text-base leading-tight">Panel de Administración</h1>
              <p className="text-xs text-muted-foreground">{total} ficha{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="w-4 h-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[260px]">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, IE o correo…"
                className="pl-8"
              />
            </div>
            <Button type="submit" size="sm">Buscar</Button>
          </form>
          <select
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setPage(0); }}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">Todas las regiones</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setRegionFilter(""); setPage(0); }} className="gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Limpiar
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-background overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Región</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No se encontraron fichas.
                  </TableCell>
                </TableRow>
              ) : (
                fichas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium whitespace-nowrap">{f.nombres_apellidos}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{f.region}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={f.nombre_ie}>{f.nombre_ie}</TableCell>
                    <TableCell className="text-sm">{f.cargo_actual}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.correo_personal}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(f.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditFicha(f)} title="Editar">
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

        {/* Pagination */}
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editFicha} onOpenChange={(o) => !o && setEditFicha(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar ficha — {editFicha?.nombres_apellidos}</DialogTitle>
          </DialogHeader>
          {editFicha && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              {[
                { key: "nombres", label: "Nombres" },
                { key: "apellidos", label: "Apellidos" },
                { key: "correo_personal", label: "Correo personal" },
                { key: "correo_institucional", label: "Correo institucional" },
                { key: "celular_personal", label: "Celular" },
                { key: "cargo_actual", label: "Cargo actual" },
                { key: "region", label: "Región" },
                { key: "entidad_territorial", label: "Entidad territorial" },
                { key: "codigo_dane", label: "Código DANE" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={(editFicha[key as keyof Ficha] as string) ?? ""}
                    onChange={(e) => setEditFicha({ ...editFicha, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1 sm:col-span-2">
                <Label className="text-xs">Institución Educativa</Label>
                <Textarea
                  value={editFicha.nombre_ie}
                  onChange={(e) => setEditFicha({ ...editFicha, nombre_ie: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFicha(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta ficha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. La ficha será eliminada permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
