import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, RefreshCw, ChevronDown, ChevronRight, School, Clock, CheckCircle2, Mail, Search, Link2, LogIn, Columns3, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  token: string;
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
  email_destinatario: string;
  tipo_formulario: string;
  fase: string;
  sent_at: string;
  last_reminder_at: string | null;
  responded_at: string | null;
  access_count: number;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  autoevaluacion: "Autoevaluación",
  docente: "Docente",
  directivo: "Directivo Par",
  administrativo: "Administrativo",
  estudiante: "Estudiante",
  acudiente: "Acudiente",
};

const FORM_TYPE_COLORS: Record<string, string> = {
  autoevaluacion: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  docente: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  directivo: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  administrativo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  estudiante: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  acudiente: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

const INTERNAL_EMAILS = ["acceso-directo", "enlace-copiado"];

const ACTION_LABELS: Record<string, { label: string; icon: "link" | "login" }> = {
  "acceso-directo": { label: "Acceso directo", icon: "login" },
  "enlace-copiado": { label: "Enlace copiado", icon: "link" },
};

type ColumnKey = "destinatario" | "tipo" | "accion" | "fase" | "accesos" | "enviada" | "estado";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "destinatario", label: "Destinatario" },
  { key: "tipo", label: "Tipo" },
  { key: "accion", label: "Acción" },
  { key: "fase", label: "Fase" },
  { key: "accesos", label: "Accesos" },
  { key: "enviada", label: "Enviada" },
  { key: "estado", label: "Estado" },
];

type SortKey = "destinatario" | "tipo" | "accion" | "fase" | "accesos" | "enviada" | "estado";
type SortDir = "asc" | "desc";

function getActionType(email: string): string {
  if (email === "acceso-directo") return "acceso-directo";
  if (email === "enlace-copiado") return "enlace-copiado";
  return "invitacion";
}

function getSortValue(inv: Invitation, key: SortKey): string | number {
  switch (key) {
    case "destinatario": return inv.email_destinatario.toLowerCase();
    case "tipo": return inv.tipo_formulario;
    case "accion": return getActionType(inv.email_destinatario);
    case "fase": return inv.fase;
    case "accesos": return inv.access_count;
    case "enviada": return inv.sent_at;
    case "estado": return inv.responded_at ? `0_${inv.responded_at}` : "1_pendiente";
    default: return "";
  }
}

export default function AdminInvitacionesTab() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [faseFilter, setFaseFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [actionFilter, setActionFilter] = useState<string>("todos");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(new Set(ALL_COLUMNS.map(c => c.key)));
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("encuesta_invitaciones")
      .select("*")
      .order("sent_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setInvitations(data ?? []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("encuesta_invitaciones").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Invitación eliminada" });
      setDeleteTarget(null);
      loadInvitations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const handleBulkDelete = async () => {
    if (filtered.length === 0) return;
    setBulkDeleting(true);
    try {
      const ids = filtered.map(inv => inv.id);
      // Delete in batches of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error } = await supabase.from("encuesta_invitaciones").delete().in("id", batch);
        if (error) throw error;
      }
      toast({ title: `${ids.length} invitación(es) eliminada(s)` });
      setShowBulkDelete(false);
      loadInvitations();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBulkDeleting(false);
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCol = (key: ColumnKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortKey(null); setSortDir("asc"); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const filtered = useMemo(() => {
    let result = [...invitations];

    if (faseFilter !== "todas") result = result.filter((inv) => inv.fase === faseFilter);
    if (statusFilter === "pendientes") result = result.filter((inv) => !inv.responded_at);
    else if (statusFilter === "respondidas") result = result.filter((inv) => !!inv.responded_at);
    if (typeFilter !== "todos") result = result.filter((inv) => inv.tipo_formulario === typeFilter);
    if (actionFilter !== "todos") result = result.filter((inv) => getActionType(inv.email_destinatario) === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.directivo_nombre.toLowerCase().includes(q) ||
          inv.institucion.toLowerCase().includes(q) ||
          inv.email_destinatario.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [invitations, faseFilter, statusFilter, typeFilter, actionFilter, search, sortKey, sortDir]);

  // Group by directivo
  const grouped = useMemo(() => {
    const map: Record<string, { nombre: string; cedula: string; institucion: string; invitations: Invitation[] }> = {};
    filtered.forEach((inv) => {
      const key = `${inv.directivo_cedula}__${inv.institucion}`;
      if (!map[key]) {
        map[key] = { nombre: inv.directivo_nombre, cedula: inv.directivo_cedula, institucion: inv.institucion, invitations: [] };
      }
      map[key].invitations.push(inv);
    });
    return Object.entries(map)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [filtered]);

  const totalReal = invitations.length;
  const totalResponded = invitations.filter((inv) => inv.responded_at).length;
  const totalPending = totalReal - totalResponded;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  const show = (col: ColumnKey) => visibleCols.has(col);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm px-3 py-1">
          {totalReal} invitación(es)
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 text-emerald-700 border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {totalResponded} respondida(s)
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1 text-amber-700 border-amber-300">
          <Clock className="w-3.5 h-3.5 mr-1" /> {totalPending} pendiente(s)
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={faseFilter} onValueChange={setFaseFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las fases</SelectItem>
            <SelectItem value="inicial">Inicial</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendientes">Pendientes</SelectItem>
            <SelectItem value="respondidas">Respondidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Tipo formulario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {Object.entries(FORM_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las acciones</SelectItem>
            <SelectItem value="invitacion">Invitación</SelectItem>
            <SelectItem value="acceso-directo">Acceso directo</SelectItem>
            <SelectItem value="enlace-copiado">Enlace copiado</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar directivo, institución, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        {/* Column visibility */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Columns3 className="w-3.5 h-3.5" /> Columnas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            {ALL_COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-2 py-1 px-1 hover:bg-muted/50 rounded cursor-pointer text-sm">
                <Checkbox
                  checked={visibleCols.has(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                />
                {col.label}
              </label>
            ))}
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2 ml-auto">
          {filtered.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)} className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Borrar todo ({filtered.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadInvitations} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} registro(s) en {grouped.length} par(es)
      </p>

      <div className="space-y-2">
        {grouped.map((group) => {
          const isOpen = expanded.has(group.key);
          const respondedCount = group.invitations.filter((i) => i.responded_at).length;
          const pendingCount = group.invitations.length - respondedCount;

          return (
            <Card key={group.key}>
              <CardHeader
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(group.key)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium">{group.nombre}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <School className="w-3 h-3" /> {group.institucion}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {respondedCount > 0 && (
                      <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300">
                        {respondedCount} ✓
                      </Badge>
                    )}
                    {pendingCount > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                        {pendingCount} pendiente(s)
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">{group.invitations.length}</Badge>
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30 text-left">
                          {show("destinatario") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("destinatario")}>Destinatario <SortIcon col="destinatario" /></th>}
                          {show("tipo") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("tipo")}>Tipo <SortIcon col="tipo" /></th>}
                          {show("accion") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("accion")}>Acción <SortIcon col="accion" /></th>}
                          {show("fase") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("fase")}>Fase <SortIcon col="fase" /></th>}
                          {show("accesos") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap text-center" onClick={() => handleSort("accesos")}>Accesos <SortIcon col="accesos" /></th>}
                          {show("enviada") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("enviada")}>Enviada <SortIcon col="enviada" /></th>}
                          {show("estado") && <th className="px-3 py-1.5 font-medium cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort("estado")}>Estado <SortIcon col="estado" /></th>}
                          <th className="px-3 py-1.5 font-medium w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.invitations.map((inv) => {
                          const isResponded = !!inv.responded_at;
                          const isInternal = INTERNAL_EMAILS.includes(inv.email_destinatario);
                          const actionInfo = ACTION_LABELS[inv.email_destinatario];
                          return (
                            <tr key={inv.id} className={`border-t ${isResponded ? "bg-emerald-50/50" : ""}`}>
                              {show("destinatario") && (
                                <td className="px-3 py-2">
                                  {isInternal ? (
                                    <span className="text-xs text-muted-foreground italic">—</span>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <span className="truncate max-w-[200px]">{inv.email_destinatario}</span>
                                    </div>
                                  )}
                                </td>
                              )}
                              {show("tipo") && (
                                <td className="px-3 py-2">
                                  <Badge variant="secondary" className={`text-xs ${FORM_TYPE_COLORS[inv.tipo_formulario] ?? ""}`}>
                                    {FORM_TYPE_LABELS[inv.tipo_formulario] ?? inv.tipo_formulario}
                                  </Badge>
                                </td>
                              )}
                              {show("accion") && (
                                <td className="px-3 py-2">
                                  {actionInfo ? (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      {actionInfo.icon === "login" ? <LogIn className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                                      {actionInfo.label}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Mail className="w-3 h-3" /> Invitación
                                    </Badge>
                                  )}
                                </td>
                              )}
                              {show("fase") && (
                                <td className="px-3 py-2">
                                  <Badge variant="outline" className="text-xs capitalize">{inv.fase}</Badge>
                                </td>
                              )}
                              {show("accesos") && (
                                <td className="px-3 py-2 text-center">
                                  {inv.access_count > 0 ? (
                                    <Badge variant="secondary" className="text-xs">{inv.access_count}×</Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">0</span>
                                  )}
                                </td>
                              )}
                              {show("enviada") && (
                                <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                                  {new Date(inv.sent_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}{" "}
                                  {new Date(inv.sent_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                                </td>
                              )}
                              {show("estado") && (
                                <td className="px-3 py-2">
                                  {isResponded ? (
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      {new Date(inv.responded_at!).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" /> Pendiente
                                    </span>
                                  )}
                                </td>
                              )}
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(inv)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se encontraron invitaciones.</p>
        )}
      </div>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta invitación?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="text-sm space-y-1">
              <p><strong>Destinatario:</strong> {deleteTarget.email_destinatario}</p>
              <p><strong>Tipo:</strong> {FORM_TYPE_LABELS[deleteTarget.tipo_formulario] ?? deleteTarget.tipo_formulario}</p>
              <p><strong>Directivo:</strong> {deleteTarget.directivo_nombre}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={showBulkDelete} onOpenChange={(o) => { if (!o) setShowBulkDelete(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {filtered.length} invitación(es)?</DialogTitle>
            <DialogDescription>
              Se eliminarán todas las invitaciones que coinciden con los filtros actuales. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Eliminar {filtered.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
