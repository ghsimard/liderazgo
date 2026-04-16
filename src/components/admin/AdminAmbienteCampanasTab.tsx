import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Fase = "inicial" | "evolucion";

const FASE_LABEL: Record<Fase, string> = {
  inicial: "Inicial",
  evolucion: "Evolución",
};

interface Cohorte {
  id: string;
  nombre: string;
  entidad_territorial: string;
  year: number;
}

interface Campana {
  id: string;
  cohorte_id: string;
  fase: string; // stored values: 'linea_base' | 'cierre' (DB legacy) — we treat as inicial/evolucion in UI mapping below
  fecha_inicio: string;
  fecha_fin: string;
  nombre: string;
  created_at: string;
}

// Mapping between UI labels and DB values.
// DB CHECK constraint accepts: 'linea_base' | 'cierre'
// UI displays: Inicial / Evolución
const UI_TO_DB: Record<Fase, string> = { inicial: "linea_base", evolucion: "cierre" };
const DB_TO_UI: Record<string, Fase> = { linea_base: "inicial", cierre: "evolucion" };

function getEstado(c: Campana): { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string } {
  const today = new Date().toISOString().slice(0, 10);
  const inicio = c.fecha_inicio;
  const fin = c.fecha_fin;
  const finDate = new Date(fin);
  const threeYears = new Date();
  threeYears.setFullYear(threeYears.getFullYear() - 3);
  if (finDate < threeYears) return { label: "Archivada", variant: "outline" };
  if (today < inicio) return { label: "Programada", variant: "secondary" };
  if (today > fin) return { label: "Cerrada", variant: "outline", className: "border-muted-foreground/40" };
  return { label: "Activa", variant: "default", className: "bg-green-600 hover:bg-green-700 text-white border-transparent" };
}

function fmt(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default function AdminAmbienteCampanasTab() {
  const { toast } = useToast();
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [respuestasCount, setRespuestasCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [filterFase, setFilterFase] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campana | null>(null);
  const [formCohorte, setFormCohorte] = useState("");
  const [formFase, setFormFase] = useState<Fase>("inicial");
  const [formInicio, setFormInicio] = useState("");
  const [formFin, setFormFin] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [cohortesRes, campanasRes] = await Promise.all([
      supabase.from("ae_cohortes").select("id, nombre, entidad_territorial, year").order("year", { ascending: false }).order("nombre"),
      supabase.from("ae_campanas" as any).select("*").order("fecha_inicio", { ascending: false }),
    ]);
    setCohortes((cohortesRes.data as Cohorte[]) || []);
    const camps = (campanasRes.data as any as Campana[]) || [];
    setCampanas(camps);

    // Count responses per campaign with server-side count (avoids 1000-row default limit)
    const counts: Record<string, number> = {};
    await Promise.all(
      camps.map(async (c) => {
        const { count } = await supabase
          .from("encuestas_ambiente_escolar")
          .select("id", { count: "exact", head: true })
          .eq("campana_id", c.id);
        counts[c.id] = count || 0;
      })
    );
    setRespuestasCount(counts);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const cohortesById = useMemo(() => new Map(cohortes.map((c) => [c.id, c])), [cohortes]);

  const filtered = useMemo(() => {
    return campanas.filter((c) => {
      const estado = getEstado(c).label;
      if (!showArchived && estado === "Archivada") return false;
      if (filterFase !== "all" && DB_TO_UI[c.fase] !== filterFase) return false;
      if (filterEstado !== "all" && estado !== filterEstado) return false;
      return true;
    });
  }, [campanas, showArchived, filterFase, filterEstado]);

  function openNew() {
    setEditing(null);
    setFormCohorte("");
    setFormFase("inicial");
    setFormInicio("");
    setFormFin("");
    setDialogOpen(true);
  }

  function openEdit(c: Campana) {
    setEditing(c);
    setFormCohorte(c.cohorte_id);
    setFormFase(DB_TO_UI[c.fase] || "inicial");
    setFormInicio(c.fecha_inicio);
    setFormFin(c.fecha_fin);
    setDialogOpen(true);
  }

  async function save() {
    if (!formCohorte || !formInicio || !formFin) {
      toast({ title: "Campos faltantes", description: "Completa cohorte y fechas.", variant: "destructive" });
      return;
    }
    if (formFin < formInicio) {
      toast({ title: "Fechas inválidas", description: "La fecha de fin debe ser posterior o igual a la de inicio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const cohorte = cohortesById.get(formCohorte);
    const nombre = cohorte ? `${cohorte.nombre} — ${FASE_LABEL[formFase]}` : FASE_LABEL[formFase];
    const payload = {
      cohorte_id: formCohorte,
      fase: UI_TO_DB[formFase],
      fecha_inicio: formInicio,
      fecha_fin: formFin,
      nombre,
    };
    const res = editing
      ? await supabase.from("ae_campanas" as any).update(payload).eq("id", editing.id)
      : await supabase.from("ae_campanas" as any).insert(payload);
    setSaving(false);
    if (res.error) {
      const msg = res.error.message?.includes("unique")
        ? `Ya existe una campaña ${FASE_LABEL[formFase]} para esta cohorte.`
        : res.error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Campaña actualizada" : "Campaña creada" });
    setDialogOpen(false);
    load();
  }

  async function remove(c: Campana) {
    const count = respuestasCount[c.id] || 0;
    if (count > 0) {
      toast({
        title: "No se puede eliminar",
        description: `Esta campaña tiene ${count} respuesta(s) asociada(s). Eliminación bloqueada.`,
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`¿Eliminar la campaña "${c.nombre}"?`)) return;
    const { error } = await supabase.from("ae_campanas" as any).delete().eq("id", c.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Campaña eliminada" });
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Nueva campaña
        </Button>

        <Select value={filterFase} onValueChange={setFilterFase}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fases</SelectItem>
            <SelectItem value="inicial">Inicial</SelectItem>
            <SelectItem value="evolucion">Evolución</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Programada">Programada</SelectItem>
            <SelectItem value="Activa">Activa</SelectItem>
            <SelectItem value="Cerrada">Cerrada</SelectItem>
            <SelectItem value="Archivada">Archivada</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Switch id="show-arch" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-arch" className="text-sm">Mostrar archivadas</Label>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cohorte</TableHead>
            <TableHead>Fase</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-center">Respuestas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No hay campañas {showArchived ? "" : "(activa el toggle para ver las archivadas)"}.
              </TableCell>
            </TableRow>
          ) : filtered.map((c) => {
            const estado = getEstado(c);
            const cohorte = cohortesById.get(c.cohorte_id);
            const count = respuestasCount[c.id] || 0;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{cohorte?.nombre || "—"}</TableCell>
                <TableCell>{FASE_LABEL[DB_TO_UI[c.fase]]}</TableCell>
                <TableCell>{fmt(c.fecha_inicio)}</TableCell>
                <TableCell>{fmt(c.fecha_fin)}</TableCell>
                <TableCell>
                  <Badge variant={estado.variant} className={estado.className}>{estado.label}</Badge>
                </TableCell>
                <TableCell className="text-center">{count}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c)} disabled={count > 0}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Cohorte</Label>
              <Select value={formCohorte} onValueChange={setFormCohorte}>
                <SelectTrigger><SelectValue placeholder="Selecciona una cohorte" /></SelectTrigger>
                <SelectContent>
                  {cohortes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={formFase} onValueChange={(v) => setFormFase(v as Fase)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">Inicial</SelectItem>
                  <SelectItem value="evolucion">Evolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={formInicio} onChange={(e) => setFormInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input type="date" value={formFin} onChange={(e) => setFormFin(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
