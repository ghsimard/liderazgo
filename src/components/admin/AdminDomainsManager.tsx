import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, Pencil, Trash2, Save, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface Domain {
  id: string;
  key: string;
  label: string;
  sort_order: number;
}

interface Competency { id: string; key: string; label: string; domain_id: string; sort_order: number; }

export default function AdminDomainsManager() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDomain, setEditDomain] = useState<Partial<Domain> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<{ competencies: number; items: number; texts: number; weights: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [dRes, cRes] = await Promise.all([
      supabase.from("domains_360").select("*").order("sort_order"),
      supabase.from("competencies_360").select("*").order("sort_order"),
    ]);
    if (dRes.error) {
      toast({ title: "Error", description: dRes.error.message, variant: "destructive" });
    } else {
      setDomains((dRes.data as Domain[]) ?? []);
    }
    setCompetencies((cRes.data as Competency[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!editDomain?.key?.trim() || !editDomain?.label?.trim()) {
      toast({ title: "Campos requeridos", description: "Clave y etiqueta son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editDomain.id) {
        const { error } = await supabase.from("domains_360").update({
          key: editDomain.key,
          label: editDomain.label,
          sort_order: editDomain.sort_order ?? 0,
        }).eq("id", editDomain.id);
        if (error) throw error;
        toast({ title: "Dominio actualizado" });
      } else {
        const { error } = await supabase.from("domains_360").insert({
          key: editDomain.key,
          label: editDomain.label,
          sort_order: editDomain.sort_order ?? domains.length + 1,
        });
        if (error) throw error;
        toast({ title: "Dominio creado" });
      }
      setEditDomain(null);
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
      const domain = domains.find((d) => d.id === deleteId);
      if (!domain) throw new Error("Dominio no encontrado");

      // Capture all data for undo
      const { data: comps } = await supabase.from("competencies_360").select("*").eq("domain_id", deleteId);
      const backupComps = comps ?? [];
      const compKeys = backupComps.map((c) => c.key);

      let backupItems: any[] = [], backupTexts: any[] = [], backupWeights: any[] = [];
      for (const key of compKeys) {
        const [wRes, iRes] = await Promise.all([
          supabase.from("competency_weights").select("*").like("competency_key", `${key}%`),
          supabase.from("items_360").select("*").like("competency_key", `${key}%`),
        ]);
        backupWeights.push(...(wRes.data ?? []));
        const matchedItems = iRes.data ?? [];
        backupItems.push(...matchedItems);
        if (matchedItems.length > 0) {
          const tRes = await supabase.from("item_texts_360").select("*").in("item_id", matchedItems.map((i) => i.id));
          backupTexts.push(...(tRes.data ?? []));
        }
      }
      const backupDomain = { ...domain };

      // Delete cascade
      for (const key of compKeys) {
        await supabase.from("competency_weights").delete().like("competency_key", `${key}%`);
        const { data: mItems } = await supabase.from("items_360").select("id").like("competency_key", `${key}%`);
        if (mItems && mItems.length > 0) {
          await supabase.from("item_texts_360").delete().in("item_id", mItems.map((i) => i.id));
          await supabase.from("items_360").delete().like("competency_key", `${key}%`);
        }
      }
      if (backupComps.length > 0) await supabase.from("competencies_360").delete().eq("domain_id", deleteId);
      const { error } = await supabase.from("domains_360").delete().eq("id", deleteId);
      if (error) throw error;

      setDeleteId(null);
      setDeleteCounts(null);
      fetchAll();

      // Save to deleted_records for permanent undo
      await supabase.from("deleted_records").insert({
        record_type: "domain",
        record_label: backupDomain.label,
        deleted_data: { domain: backupDomain, competencies: backupComps, items: backupItems, texts: backupTexts, weights: backupWeights },
      });

      toast({
        title: "Dominio eliminado",
        description: `${backupComps.length} comp., ${backupItems.length} ítem(s), ${backupTexts.length} texto(s), ${backupWeights.length} peso(s). Puede restaurar desde la Papelera.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = Array.from(domains);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updated = reordered.map((d, i) => ({ ...d, sort_order: i + 1 }));
    setDomains(updated);
    try {
      for (const d of updated) {
        await supabase.from("domains_360").update({ sort_order: d.sort_order }).eq("id", d.id);
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
        <h3 className="font-semibold text-sm">Dominios de Gestión</h3>
        <Button size="sm" onClick={() => setEditDomain({ key: "", label: "", sort_order: domains.length + 1 })} className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="domains">
          {(provided) => (
            <div className="border rounded-lg divide-y" ref={provided.innerRef} {...provided.droppableProps}>
              {domains.map((d, index) => (
                <Draggable key={d.id} draggableId={d.id} index={index}>
                  {(prov, snapshot) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}>
                      <div className={`flex items-center gap-3 p-3 ${snapshot.isDragging ? "bg-accent shadow-md rounded-lg" : ""}`}>
                        <span {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{d.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">({d.key})</span>
                          <span className="text-xs text-muted-foreground ml-2">· {competencies.filter((c) => c.domain_id === d.id).length} competencia(s)</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}>
                          {expandedId === d.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDomain(d)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                          setDeleteId(d.id);
                          setDeleteCounts(null);
                          const { data: comps } = await supabase.from("competencies_360").select("key").eq("domain_id", d.id);
                          const compKeys = (comps ?? []).map((c) => c.key);
                          let totalItems = 0, totalTexts = 0, totalWeights = 0;
                          for (const key of compKeys) {
                            const [wRes, iRes] = await Promise.all([
                              supabase.from("competency_weights").select("id", { count: "exact", head: true }).like("competency_key", `${key}%`),
                              supabase.from("items_360").select("id").like("competency_key", `${key}%`),
                            ]);
                            totalWeights += wRes.count ?? 0;
                            const itemIds = (iRes.data ?? []).map((i) => i.id);
                            totalItems += itemIds.length;
                            if (itemIds.length > 0) {
                              const tRes = await supabase.from("item_texts_360").select("id", { count: "exact", head: true }).in("item_id", itemIds);
                              totalTexts += tRes.count ?? 0;
                            }
                          }
                          setDeleteCounts({ competencies: compKeys.length, items: totalItems, texts: totalTexts, weights: totalWeights });
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {expandedId === d.id && (
                        <div className="px-10 pb-3 space-y-1">
                          {competencies.filter((c) => c.domain_id === d.id).map((c) => (
                            <div key={c.id} className="flex items-center gap-2 text-xs py-1">
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{c.label}</span>
                              <span className="text-muted-foreground">({c.key})</span>
                            </div>
                          ))}
                          {competencies.filter((c) => c.domain_id === d.id).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">Sin competencias</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {domains.length === 0 && <p className="text-sm text-muted-foreground p-4">Sin dominios configurados.</p>}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit/Create dialog */}
      <Dialog open={!!editDomain} onOpenChange={(o) => !o && setEditDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDomain?.id ? "Editar" : "Nuevo"} Dominio</DialogTitle>
            <DialogDescription>Configure la clave interna y la etiqueta visible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Clave (interna)</label>
              <Input value={editDomain?.key ?? ""} onChange={(e) => setEditDomain((p) => ({ ...p, key: e.target.value }))} placeholder="gestion_personal" />
            </div>
            <div>
              <label className="text-xs font-medium">Etiqueta</label>
              <Input value={editDomain?.label ?? ""} onChange={(e) => setEditDomain((p) => ({ ...p, label: e.target.value }))} placeholder="Gestión Personal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDomain(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteCounts(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar dominio?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. Se eliminarán los siguientes registros asociados:</DialogDescription>
          </DialogHeader>
          {deleteCounts ? (
            <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
              <li><strong>{deleteCounts.competencies}</strong> competencia(s)</li>
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
