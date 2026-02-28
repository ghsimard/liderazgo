import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, UserPlus, Search, Users, Link } from "lucide-react";

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
  const [selectedDirectivoCedula, setSelectedDirectivoCedula] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: evals }, { data: asigs }, { data: dirs }] = await Promise.all([
      supabase.from("rubrica_evaluadores").select("*").order("nombre", { ascending: true }),
      supabase.from("rubrica_asignaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("fichas_rlt").select("nombres_apellidos, numero_cedula, nombre_ie")
        .in("cargo_actual", ["Rector/a", "Coordinador/a"])
        .order("nombres_apellidos", { ascending: true }),
    ]);
    if (evals) setEvaluadores(evals);
    if (asigs) setAsignaciones(asigs);
    if (dirs) setDirectivos(dirs);
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
    if (!assignEvaluadorId || !selectedDirectivoCedula) return;
    const dir = directivos.find(d => d.numero_cedula === selectedDirectivoCedula);
    if (!dir) return;

    // Check if already assigned
    const existing = asignaciones.find(
      a => a.evaluador_id === assignEvaluadorId && a.directivo_cedula === selectedDirectivoCedula
    );
    if (existing) {
      toast({ title: "Ya existe", description: "Esta asignación ya existe.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("rubrica_asignaciones").insert({
      evaluador_id: assignEvaluadorId,
      directivo_cedula: dir.numero_cedula,
      directivo_nombre: dir.nombres_apellidos,
      institucion: dir.nombre_ie,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Asignación creada" });
      setShowAssign(false);
      setSelectedDirectivoCedula("");
      loadData();
    }
  };

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
                          <TableRow key={a.id}>
                            <TableCell className="text-xs">{a.directivo_nombre}</TableCell>
                            <TableCell className="text-xs">{a.directivo_cedula}</TableCell>
                            <TableCell className="text-xs">{a.institucion}</TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteAsignacion(a.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar directivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Evaluador</Label>
              <p className="text-sm text-muted-foreground">
                {evaluadores.find(e => e.id === assignEvaluadorId)?.nombre ?? "—"}
              </p>
            </div>
            <div>
              <Label>Directivo (Rector/a o Coordinador/a)</Label>
              {directivos.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay directivos en fichas RLT.</p>
              ) : (
                <Select value={selectedDirectivoCedula} onValueChange={setSelectedDirectivoCedula}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar directivo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {directivos.map(d => (
                      <SelectItem key={d.numero_cedula} value={d.numero_cedula || ""}>
                        {d.nombres_apellidos} — {d.nombre_ie}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving || !selectedDirectivoCedula}>
              {saving ? "Guardando…" : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
