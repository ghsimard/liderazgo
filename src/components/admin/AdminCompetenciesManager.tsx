import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, Pencil, Trash2, Save, GripVertical } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface Domain { id: string; key: string; label: string; sort_order: number; }
interface Competency { id: string; key: string; label: string; domain_id: string; sort_order: number; }

export default function AdminCompetenciesManager() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [editComp, setEditComp] = useState<Partial<Competency> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<{ items: number; texts: number; weights: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      supabase.from("domains_360").select("*").order("sort_order"),
      supabase.from("competencies_360").select("*").order("sort_order"),
    ]);
    setDomains((dRes.data as Domain[]) ?? []);
    setCompetencies((cRes.data as Competency[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!editComp?.key?.trim() || !editComp?.label?.trim() || !editComp?.domain_id) {
      toast({ title: "Campos requeridos", description: "Clave, etiqueta y dominio son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editComp.id) {
        const { error } = await supabase.from("competencies_360").update({
          key: editComp.key, label: editComp.label, domain_id: editComp.domain_id, sort_order: editComp.sort_order ?? 0,
        }).eq("id", editComp.id);
        if (error) throw error;
        toast({ title: "Competencia actualizada" });
      } else {
        const { error } = await supabase.from("competencies_360").insert({
          key: editComp.key, label: editComp.label, domain_id: editComp.domain_id, sort_order: editComp.sort_order ?? competencies.length + 1,
        });
        if (error) throw error;
        toast({ title: "Competencia creada" });
      }
      setEditComp(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const comp = competencies.find((c) => c.id === deleteId);
      if (!comp) throw new Error("Competencia no encontrada");

      // Capture data for undo
      const [bWeights, bItems] = await Promise.all([
        supabase.from("competency_weights").select("*").like("competency_key", `${comp.key}%`),
        supabase.from("items_360").select("*").like("competency_key", `${comp.key}%`),
      ]);
      const backupWeights = bWeights.data ?? [];
      const backupItems = bItems.data ?? [];
      const itemIds = backupItems.map((i) => i.id);
      const bTexts = itemIds.length > 0
        ? await supabase.from("item_texts_360").select("*").in("item_id", itemIds)
        : { data: [] };
      const backupTexts = bTexts.data ?? [];
      const backupComp = { ...comp };

      // Delete cascade
      if (backupWeights.length > 0) {
        const { error } = await supabase.from("competency_weights").delete().like("competency_key", `${comp.key}%`);
        if (error) throw error;
      }
      if (itemIds.length > 0) {
        await supabase.from("item_texts_360").delete().in("item_id", itemIds);
        await supabase.from("items_360").delete().like("competency_key", `${comp.key}%`);
      }
      const { error } = await supabase.from("competencies_360").delete().eq("id", deleteId);
      if (error) throw error;

      setDeleteId(null);
      setDeleteCounts(null);
      fetchAll();

      // Save to deleted_records for permanent undo
      await supabase.from("deleted_records").insert({
        record_type: "competency",
        record_label: backupComp.label,
        deleted_data: { competency: backupComp, items: backupItems, texts: backupTexts, weights: backupWeights },
      });

      toast({
        title: "Competencia eliminada",
        description: `${backupItems.length} ítem(s), ${backupTexts.length} texto(s), ${backupWeights.length} peso(s). Puede restaurar desde la Papelera.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  const domainMap = Object.fromEntries(domains.map((d) => [d.id, d]));

  const grouped = domains.map((d) => ({
    domain: d,
    comps: competencies.filter((c) => c.domain_id === d.id),
  }));

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const domainId = result.source.droppableId;
    const group = grouped.find((g) => g.domain.id === domainId);
    if (!group) return;
    const reordered = Array.from(group.comps);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCompetencies((prev) => prev.map((c) => {
      const u = updated.find((x) => x.id === c.id);
      return u ?? c;
    }));
    try {
      for (const c of updated) {
        await supabase.from("competencies_360").update({ sort_order: c.sort_order }).eq("id", c.id);
      }
      toast({ title: "Orden actualizado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      fetchAll();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Competencias</h3>
        <Button size="sm" onClick={() => setEditComp({ key: "", label: "", domain_id: domains[0]?.id ?? "", sort_order: competencies.length + 1 })} className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="space-y-4">
        {grouped.map(({ domain, comps }) => (
          <div key={domain.id} className="border rounded-lg overflow-hidden">
            <div className="bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">{domain.label}</div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId={domain.id}>
                {(provided) => (
                  <div className="divide-y" ref={provided.innerRef} {...provided.droppableProps}>
                    {comps.map((c, index) => (
                      <Draggable key={c.id} draggableId={c.id} index={index}>
                        {(prov, snapshot) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} className={`flex items-center gap-3 p-3 ${snapshot.isDragging ? "bg-accent shadow-md rounded-lg" : ""}`}>
                            <span {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground">
                              <GripVertical className="w-4 h-4" />
                            </span>
                            <div className="flex-1">
                              <span className="text-sm font-medium">{c.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">({c.key})</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditComp(c)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                              setDeleteId(c.id);
                              setDeleteCounts(null);
                              const [wRes, iRes] = await Promise.all([
                                supabase.from("competency_weights").select("id", { count: "exact", head: true }).like("competency_key", `${c.key}%`),
                                supabase.from("items_360").select("id").like("competency_key", `${c.key}%`),
                              ]);
                              const itemIds = (iRes.data ?? []).map((i) => i.id);
                              const tRes = itemIds.length > 0
                                ? await supabase.from("item_texts_360").select("id", { count: "exact", head: true }).in("item_id", itemIds)
                                : { count: 0 };
                              setDeleteCounts({ items: iRes.data?.length ?? 0, texts: tRes.count ?? 0, weights: wRes.count ?? 0 });
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {comps.length === 0 && <p className="text-sm text-muted-foreground p-3">Sin competencias.</p>}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        ))}
      </div>

      {/* Edit/Create dialog */}
      <Dialog open={!!editComp} onOpenChange={(o) => !o && setEditComp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editComp?.id ? "Editar" : "Nueva"} Competencia</DialogTitle>
            <DialogDescription>Configure la clave, etiqueta y dominio asociado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Clave (interna)</label>
              <Input value={editComp?.key ?? ""} onChange={(e) => setEditComp((p) => ({ ...p, key: e.target.value }))} placeholder="autoconciencia" />
            </div>
            <div>
              <label className="text-xs font-medium">Etiqueta</label>
              <Input value={editComp?.label ?? ""} onChange={(e) => setEditComp((p) => ({ ...p, label: e.target.value }))} placeholder="Autoconciencia" />
            </div>
            <div>
              <label className="text-xs font-medium">Dominio</label>
              <Select value={editComp?.domain_id ?? ""} onValueChange={(v) => setEditComp((p) => ({ ...p, domain_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccione dominio" /></SelectTrigger>
                <SelectContent>
                  {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Orden</label>
              <Input type="number" value={editComp?.sort_order ?? 0} onChange={(e) => setEditComp((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditComp(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteCounts(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar competencia?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. Se eliminarán los siguientes registros asociados:</DialogDescription>
          </DialogHeader>
          {deleteCounts ? (
            <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
              <li><strong>{deleteCounts.items}</strong> ítem(s)</li>
              <li><strong>{deleteCounts.texts}</strong> texto(s) de formulario</li>
              <li><strong>{deleteCounts.weights}</strong> ponderación(es)</li>
            </ul>
          ) : (
            <div className="flex justify-center py-2"><RefreshCw className="animate-spin w-4 h-4 text-muted-foreground" /></div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteCounts(null); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
