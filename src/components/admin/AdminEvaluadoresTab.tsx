import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, UserPlus, Search, Users, Link, Eye } from "lucide-react";
import AdminEvalDetailDialog from "./AdminEvalDetailDialog";

interface Evaluador {
  id: string;
  nombre: string;
  cedula: string;
  created_at: string;
}

interface Asignacion {
  id: string;
  evaluador_id: string;
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
  created_at: string;
}

interface Directivo {
  nombres_apellidos: string;
  numero_cedula: string;
  nombre_ie: string;
}

export default function AdminEvaluadoresTab() {
  const { toast } = useToast();
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [directivos, setDirectivos] = useState<Directivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // New evaluador dialog
  const [showNewEval, setShowNewEval] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newCedula, setNewCedula] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign dialog
  const [showAssign, setShowAssign] = useState(false);
  const [assignEvaluadorId, setAssignEvaluadorId] = useState<string | null>(null);
  const [selectedCedulas, setSelectedCedulas] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState("");

  // Detail dialog
  const [detailDirectivo, setDetailDirectivo] = useState<{ cedula: string; nombre: string } | null>(null);
  const [cedulasConEval, setCedulasConEval] = useState<Set<string>>(new Set());
  const [modulosCompletados, setModulosCompletados] = useState<Record<string, { auto: number; equipo: number; acordado: number }>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: evals }, { data: asigs }, { data: dirs }, { data: evalRows }, { data: subDates }] = await Promise.all([
      supabase.from("rubrica_evaluadores").select("*").order("nombre", { ascending: true }),
      supabase.from("rubrica_asignaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("fichas_rlt").select("nombres_apellidos, numero_cedula, nombre_ie")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"])
        .order("nombres_apellidos", { ascending: true }),
      supabase.from("rubrica_evaluaciones").select("directivo_cedula"),
      supabase.from("rubrica_submission_dates").select("directivo_cedula, module_number, submission_type"),
    ]);
    if (evals) setEvaluadores(evals);
    if (asigs) setAsignaciones(asigs);
    if (dirs) setDirectivos(dirs);
    if (evalRows) setCedulasConEval(new Set(evalRows.map((r: any) => r.directivo_cedula)));
    if (subDates) {
      const map: Record<string, { auto: Set<number>; equipo: Set<number>; acordado: Set<number> }> = {};
      for (const sd of subDates as any[]) {
        if (!map[sd.directivo_cedula]) map[sd.directivo_cedula] = { auto: new Set(), equipo: new Set(), acordado: new Set() };
        if (sd.submission_type === "autoevaluacion") map[sd.directivo_cedula].auto.add(sd.module_number);
        else if (sd.submission_type === "evaluacion") map[sd.directivo_cedula].equipo.add(sd.module_number);
        else if (sd.submission_type === "nivel_acordado") map[sd.directivo_cedula].acordado.add(sd.module_number);
      }
      const counts: Record<string, { auto: number; equipo: number; acordado: number }> = {};
      for (const [ced, sets] of Object.entries(map)) {
        counts[ced] = { auto: sets.auto.size, equipo: sets.equipo.size, acordado: sets.acordado.size };
      }
      setModulosCompletados(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateEvaluador = async () => {
    if (!newNombre.trim() || !newCedula.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("rubrica_evaluadores").insert({
      nombre: newNombre.trim(),
      cedula: newCedula.trim(),
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evaluador creado" });
      setShowNewEval(false);
      setNewNombre("");
      setNewCedula("");
      loadData();
    }
  };

  const handleDeleteEvaluador = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar al evaluador "${nombre}" y todas sus asignaciones?`)) return;
    const { error } = await supabase.from("rubrica_evaluadores").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evaluador eliminado" });
      loadData();
    }
  };

  const handleAssign = async () => {
    if (!assignEvaluadorId || selectedCedulas.length === 0) return;

    const rows = selectedCedulas
      .map(ced => {
        const dir = directivos.find(d => d.numero_cedula === ced);
        if (!dir) return null;
        return {
          evaluador_id: assignEvaluadorId,
          directivo_cedula: dir.numero_cedula,
          directivo_nombre: dir.nombres_apellidos,
          institucion: dir.nombre_ie,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return;

    setSaving(true);
    const { error } = await supabase.from("rubrica_asignaciones").insert(rows);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${rows.length} asignación(es) creada(s)` });
      setShowAssign(false);
      setSelectedCedulas([]);
      setAssignSearch("");
      loadData();
    }
  };

  // Available directivos = not already assigned to this evaluador
  const availableDirectivos = assignEvaluadorId
    ? directivos.filter(d => {
        const alreadyAssigned = asignaciones.some(
          a => a.evaluador_id === assignEvaluadorId && a.directivo_cedula === d.numero_cedula
        );
        return !alreadyAssigned && d.numero_cedula;
      })
    : [];

  const filteredAvailable = assignSearch
    ? availableDirectivos.filter(d =>
        d.nombres_apellidos.toLowerCase().includes(assignSearch.toLowerCase()) ||
        d.numero_cedula?.includes(assignSearch) ||
        d.nombre_ie.toLowerCase().includes(assignSearch.toLowerCase())
      )
    : availableDirectivos;

  const handleDeleteAsignacion = async (id: string) => {
    const { error } = await supabase.from("rubrica_asignaciones").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Asignación eliminada" });
      loadData();
    }
  };

  const filtered = search
    ? evaluadores.filter(e =>
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.cedula.includes(search)
      )
    : evaluadores;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar evaluador…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <Button size="sm" onClick={() => setShowNewEval(true)} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Nuevo evaluador
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay evaluadores registrados. Cree uno con el botón "Nuevo evaluador".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(ev => {
            const evAsignaciones = asignaciones.filter(a => a.evaluador_id === ev.id);
            return (
              <Card key={ev.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {ev.nombre}
                      <Badge variant="outline" className="text-xs ml-1">CC: {ev.cedula}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setAssignEvaluadorId(ev.id); setShowAssign(true); }}
                        className="gap-1 text-xs"
                      >
                        <Link className="w-3.5 h-3.5" /> Asignar directivo
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteEvaluador(ev.id, ev.nombre)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {evAsignaciones.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin asignaciones. Use "Asignar directivo" para vincular un rector/a.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Directivo</TableHead>
                          <TableHead className="text-xs">Cédula</TableHead>
                          <TableHead className="text-xs">Institución</TableHead>
                          <TableHead className="text-xs w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evAsignaciones.map(a => (
                          <TableRow
                            key={a.id}
                            className={cedulasConEval.has(a.directivo_cedula) ? "cursor-pointer hover:bg-muted/50" : ""}
                            onClick={() => cedulasConEval.has(a.directivo_cedula) && setDetailDirectivo({ cedula: a.directivo_cedula, nombre: a.directivo_nombre })}
                          >
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {a.directivo_nombre}
                                {(() => {
                                  const m = modulosCompletados[a.directivo_cedula];
                                  if (!m) return null;
                                  return (
                                    <>
                                      {m.auto > 0 && <Badge className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Auto {m.auto}/4</Badge>}
                                      {m.equipo > 0 && <Badge className="text-[10px] bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Equipo {m.equipo}/4</Badge>}
                                      {m.acordado > 0 && <Badge className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Acordado {m.acordado}/4</Badge>}
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{a.directivo_cedula}</TableCell>
                            <TableCell className="text-xs">{a.institucion}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {cedulasConEval.has(a.directivo_cedula) && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-primary"
                                    onClick={(e) => { e.stopPropagation(); setDetailDirectivo({ cedula: a.directivo_cedula, nombre: a.directivo_nombre }); }}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAsignacion(a.id); }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Evaluador Dialog */}
      <Dialog open={showNewEval} onOpenChange={setShowNewEval}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo evaluador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input value={newNombre} onChange={e => setNewNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <Label>Cédula</Label>
              <Input value={newCedula} onChange={e => setNewCedula(e.target.value)} placeholder="Ej: 1234567890" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEval(false)}>Cancelar</Button>
            <Button onClick={handleCreateEvaluador} disabled={saving || !newNombre.trim() || !newCedula.trim()}>
              {saving ? "Guardando…" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Directivo Dialog */}
      <Dialog open={showAssign} onOpenChange={(open) => {
        setShowAssign(open);
        if (!open) { setSelectedCedulas([]); setAssignSearch(""); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Asignar directivos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Evaluador</Label>
              <p className="text-sm text-muted-foreground">
                {evaluadores.find(e => e.id === assignEvaluadorId)?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <Label>Directivos disponibles (Rector/a o Coordinador/a)</Label>
              <Input
                placeholder="Buscar por nombre, cédula o institución…"
                value={assignSearch}
                onChange={e => setAssignSearch(e.target.value)}
                className="mt-1 mb-2"
              />
              {availableDirectivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Todos los directivos ya están asignados a este evaluador.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        setSelectedCedulas(
                          selectedCedulas.length === filteredAvailable.length
                            ? []
                            : filteredAvailable.map(d => d.numero_cedula!)
                        );
                      }}
                    >
                      {selectedCedulas.length === filteredAvailable.length ? "Deseleccionar todo" : "Seleccionar todo"}
                    </button>
                    {selectedCedulas.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{selectedCedulas.length} seleccionado(s)</Badge>
                    )}
                  </div>
                  <div className="max-h-[220px] overflow-y-auto border rounded-md p-1 space-y-0.5">
                    {filteredAvailable.map(d => (
                      <label
                        key={d.numero_cedula}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                      >
                        <Checkbox
                          checked={selectedCedulas.includes(d.numero_cedula!)}
                          onCheckedChange={() => {
                            setSelectedCedulas(prev =>
                              prev.includes(d.numero_cedula!)
                                ? prev.filter(c => c !== d.numero_cedula)
                                : [...prev, d.numero_cedula!]
                            );
                          }}
                        />
                        <span className="truncate flex-1">{d.nombres_apellidos}</span>
                        <span className="text-muted-foreground shrink-0">{d.nombre_ie}</span>
                      </label>
                    ))}
                    {filteredAvailable.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Sin resultados.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving || selectedCedulas.length === 0}>
              {saving ? "Guardando…" : `Asignar (${selectedCedulas.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Detail Dialog */}
      {detailDirectivo && (
        <AdminEvalDetailDialog
          open={!!detailDirectivo}
          onOpenChange={(open) => { if (!open) setDetailDirectivo(null); }}
          directivoCedula={detailDirectivo.cedula}
          directivoNombre={detailDirectivo.nombre}
        />
      )}
    </div>
  );
}
