import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, Search, RefreshCw, Loader2, Trash2, ChevronLeft, ChevronRight,
  LogIn, LogOut, FileText, ClipboardCheck, Send, Star, MessageSquare, Eye, Activity,
} from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  cedula: string;
  action_type: string;
  action_detail: string | null;
  page_path: string | null;
  created_at: string;
}

const ACTION_TYPES = [
  { value: "all", label: "Todos" },
  { value: "login", label: "Identificación" },
  { value: "logout", label: "Cierre de sesión" },
  { value: "page_view", label: "Vista de página" },
  { value: "ficha_submit", label: "Envío de ficha" },
  { value: "ficha_update", label: "Actualización de ficha" },
  { value: "ficha_view", label: "Consulta de ficha" },
  { value: "encuesta_submit", label: "Envío de encuesta" },
  { value: "rubrica_access", label: "Acceso rúbrica" },
  { value: "rubrica_submit", label: "Envío rúbrica" },
  { value: "contact_submit", label: "Mensaje de contacto" },
  { value: "review_submit", label: "Evaluación del sitio" },
];

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  page_view: Eye,
  ficha_submit: FileText,
  ficha_update: FileText,
  ficha_view: Eye,
  encuesta_submit: Send,
  rubrica_access: ClipboardCheck,
  rubrica_submit: ClipboardCheck,
  contact_submit: MessageSquare,
  review_submit: Star,
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  logout: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  page_view: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  ficha_submit: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  ficha_update: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ficha_view: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  encuesta_submit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  rubrica_access: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  rubrica_submit: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  contact_submit: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  review_submit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const PURGE_OPTIONS = [
  { value: "30", label: "más de 30 días" },
  { value: "60", label: "más de 60 días" },
  { value: "90", label: "más de 90 días" },
  { value: "180", label: "más de 180 días" },
  { value: "all", label: "todos los registros" },
];

const PAGE_SIZE = 50;

export default function AdminActivityLogTab({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [purging, setPurging] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgeDays, setPurgeDays] = useState("90");

  // Filters
  const [cedulaFilter, setCedulaFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("user_activity_log")
        .select("id,cedula,action_type,action_detail,page_path,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (cedulaFilter.trim()) {
        q = q.ilike("cedula", `%${cedulaFilter.trim()}%`);
      }
      if (actionFilter !== "all") {
        q = q.eq("action_type", actionFilter);
      }
      if (dateFrom) {
        q = q.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        q = q.lte("created_at", endOfDay.toISOString());
      }

      const { data, error, count } = await q;
      if (error) throw error;
      setLogs((data as ActivityLog[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  const handleClear = () => {
    setCedulaFilter("");
    setActionFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
    setTimeout(fetchLogs, 0);
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      let q = supabase.from("user_activity_log").delete();

      if (purgeDays === "all") {
        // Delete all — need a filter, use created_at <= now
        q = q.lte("created_at", new Date().toISOString());
      } else {
        const cutoff = subDays(new Date(), parseInt(purgeDays));
        q = q.lt("created_at", cutoff.toISOString());
      }

      const { error } = await q;
      if (error) throw error;

      toast.success(
        purgeDays === "all"
          ? "Todos los registros fueron eliminados."
          : `Registros de más de ${purgeDays} días eliminados.`
      );
      setShowPurgeDialog(false);
      setPage(0);
      fetchLogs();
    } catch (err: any) {
      console.error("Purge error:", err);
      toast.error("Error al purgar los registros: " + (err.message || "Error desconocido"));
    } finally {
      setPurging(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getActionLabel = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type)?.label ?? type;
  };

  // Stats
  const stats = useMemo(() => {
    const uniqueCedulas = new Set(logs.map(l => l.cedula)).size;
    return { uniqueCedulas, total: totalCount };
  }, [logs, totalCount]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Registro de Actividad</h3>
          <p className="text-sm text-muted-foreground">
            {stats.total} registros · {stats.uniqueCedulas} cédulas en esta página
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowPurgeDialog(true)}
              className="gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Purgar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cédula</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cédula..."
                  value={cedulaFilter}
                  onChange={(e) => setCedulaFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8 w-48"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo de acción</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Fecha inicio"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fecha fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleSearch} size="sm" className="gap-1.5">
              <Search className="w-4 h-4" /> Buscar
            </Button>
            <Button onClick={handleClear} variant="ghost" size="sm" className="gap-1.5">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No se encontraron registros de actividad.</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Fecha</TableHead>
                  <TableHead className="w-32">Cédula</TableHead>
                  <TableHead className="w-44">Acción</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="w-36">Página</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const Icon = ACTION_ICONS[log.action_type] ?? Activity;
                  const colorClass = ACTION_COLORS[log.action_type] ?? "bg-muted text-muted-foreground";
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs tabular-nums">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.cedula}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn("gap-1 font-normal", colorClass)}>
                          <Icon className="w-3 h-3" />
                          {getActionLabel(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.action_detail || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.page_path || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Purge Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purgar registros de actividad</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Seleccione qué registros desea eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Select value={purgeDays} onValueChange={setPurgeDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PURGE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handlePurge(); }}
              disabled={purging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {purging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Purgar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
