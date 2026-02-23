import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Plus, Pencil, Trash2, Save, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const FORM_TYPES = ["docente", "estudiante", "directivo", "acudiente", "autoevaluacion", "administrativo"] as const;
const FORM_TYPE_LABELS: Record<string, string> = {
  docente: "Docente", estudiante: "Estudiante", directivo: "Directivo",
  acudiente: "Acudiente", autoevaluacion: "Autoevaluación", administrativo: "Administrativo",
};

interface Item {
  id: string;
  item_number: number;
  competency_key: string;
  response_type: string;
  sort_order: number;
}

interface ItemText {
  id: string;
  item_id: string;
  form_type: string;
  text: string;
}

interface Competency { id: string; key: string; label: string; domain_id: string; }
interface Domain { id: string; key: string; label: string; }

export default function AdminItemsManager() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [texts, setTexts] = useState<ItemText[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<Item> | null>(null);
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [selectedCompKey, setSelectedCompKey] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<{ texts: number; weights: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [iRes, tRes, cRes, dRes] = await Promise.all([
      supabase.from("items_360").select("*").order("sort_order"),
      supabase.from("item_texts_360").select("*"),
      supabase.from("competencies_360").select("*").order("sort_order"),
      supabase.from("domains_360").select("*").order("sort_order"),
    ]);
    setItems((iRes.data as Item[]) ?? []);
    setTexts((tRes.data as ItemText[]) ?? []);
    setCompetencies((cRes.data as Competency[]) ?? []);
    setDomains((dRes.data as Domain[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const getCompBase = (key: string) => key.replace(/_\d+$/, "");

  // Build competency_key options from existing competencies
  // Each competency can have variants like autoconciencia_1, autoconciencia_2, etc.
  const existingVariants = [...new Set(items.map((i) => i.competency_key))].sort();

  const getNextVariant = (compKey: string) => {
    const existing = items.filter((i) => getCompBase(i.competency_key) === compKey);
    const maxVariant = existing.reduce((m, i) => {
      const match = i.competency_key.match(/_(\d+)$/);
      return match ? Math.max(m, parseInt(match[1])) : m;
    }, 0);
    return `${compKey}_${maxVariant + 1}`;
  };

  const openEdit = (item?: Item) => {
    if (item) {
      setEditItem(item);
      const base = getCompBase(item.competency_key);
      const comp = competencies.find((c) => c.key === base);
      setSelectedCompKey(base);
      setSelectedDomainId(comp?.domain_id ?? "");
      const itemTexts: Record<string, string> = {};
      texts.filter((t) => t.item_id === item.id).forEach((t) => { itemTexts[t.form_type] = t.text; });
      setEditTexts(itemTexts);
    } else {
      const maxNum = items.reduce((m, i) => Math.max(m, i.item_number), 0);
      setEditItem({ item_number: maxNum + 1, competency_key: "", response_type: "frequency", sort_order: maxNum + 1 });
      setSelectedDomainId("");
      setSelectedCompKey("");
      setEditTexts({});
    }
  };

  const handleSave = async () => {
    if (!editItem?.competency_key?.trim() && !selectedCompKey) {
      toast({ title: "Campos requeridos", description: "Seleccione dominio y competencia.", variant: "destructive" });
      return;
    }
    // For new items, generate the competency_key variant
    const finalCompKey = editItem?.id ? editItem.competency_key! : getNextVariant(selectedCompKey);
    setSaving(true);
    try {
      let itemId = editItem.id;
      if (itemId) {
        const { error } = await supabase.from("items_360").update({
          item_number: editItem.item_number!,
          competency_key: finalCompKey,
          response_type: editItem.response_type!,
          sort_order: editItem.sort_order ?? 0,
        }).eq("id", itemId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("items_360").insert({
          item_number: editItem.item_number!,
          competency_key: finalCompKey,
          response_type: editItem.response_type!,
          sort_order: editItem.sort_order ?? items.length + 1,
        }).select("id").single();
        if (error) throw error;
        itemId = data.id;
      }

      // Upsert texts: delete existing then insert
      await supabase.from("item_texts_360").delete().eq("item_id", itemId!);
      const textRows = FORM_TYPES
        .filter((ft) => editTexts[ft]?.trim())
        .map((ft) => ({ item_id: itemId!, form_type: ft, text: editTexts[ft].trim() }));
      if (textRows.length > 0) {
        const { error: tErr } = await supabase.from("item_texts_360").insert(textRows);
        if (tErr) throw tErr;
      }

      toast({ title: editItem.id ? "Ítem actualizado" : "Ítem creado" });
      setEditItem(null);
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
      const item = items.find((i) => i.id === deleteId);
      if (!item) throw new Error("Ítem no encontrado");

      // Capture data for undo before deleting
      const [savedTexts, savedWeights] = await Promise.all([
        supabase.from("item_texts_360").select("*").eq("item_id", deleteId),
        supabase.from("competency_weights").select("*").eq("competency_key", item.competency_key),
      ]);
      const backupTexts = savedTexts.data ?? [];
      const backupWeights = savedWeights.data ?? [];
      const backupItem = { ...item };

      // 1. Delete item texts
      const { error: tErr } = await supabase.from("item_texts_360").delete().eq("item_id", deleteId);
      if (tErr) throw tErr;

      // 2. Delete associated weights
      const { error: wErr } = await supabase.from("competency_weights").delete().eq("competency_key", item.competency_key);
      if (wErr) throw wErr;

      // 3. Delete the item
      const { error } = await supabase.from("items_360").delete().eq("id", deleteId);
      if (error) throw error;

      setDeleteId(null);
      setDeleteCounts(null);
      fetchAll();

      // Save to deleted_records for permanent undo
      await supabase.from("deleted_records").insert({
        record_type: "item",
        record_label: `Ítem ${backupItem.item_number} (${backupItem.competency_key})`,
        deleted_data: { item: backupItem, texts: backupTexts, weights: backupWeights },
      });

      toast({
        title: "Ítem eliminado",
        description: `${backupTexts.length} texto(s) y ${backupWeights.length} peso(s) eliminados. Puede restaurar desde la Papelera.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  const compMap = Object.fromEntries(competencies.map((c) => [c.key, c]));
  const domainMap = Object.fromEntries(domains.map((d) => [d.id, d]));
  const textsForItem = (id: string) => texts.filter((t) => t.item_id === id);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sort_order: i + 1 }));
    setItems(updated);
    try {
      for (const item of updated) {
        await supabase.from("items_360").update({ sort_order: item.sort_order }).eq("id", item.id);
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
        <div>
          <h3 className="font-semibold text-sm">Ítems de los Formularios</h3>
          <p className="text-xs text-muted-foreground mt-1">Cada ítem tiene un texto diferente por tipo de formulario.</p>
        </div>
        <Button size="sm" onClick={() => openEdit()} className="gap-1.5">
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="items">
          {(provided) => (
            <div className="border rounded-lg divide-y" ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((item, index) => {
                const base = getCompBase(item.competency_key);
                const comp = compMap[base];
                const domain = comp ? domainMap[comp.domain_id] : null;
                const itemTexts = textsForItem(item.id);
                const isExpanded = expandedItem === item.id;

                return (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(prov, snapshot) => (
                      <div ref={prov.innerRef} {...prov.draggableProps}>
                        <div className={`flex items-center gap-3 p-3 ${snapshot.isDragging ? "bg-accent shadow-md rounded-lg" : ""}`}>
                          <span {...prov.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground">
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-mono text-muted-foreground w-8 text-center">{item.item_number}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {comp && <span className="text-sm font-medium">{comp.label}</span>}
                              {domain && <span className="text-xs text-primary/70">· {domain.label}</span>}
                            </div>
                            {itemTexts.length > 0 ? (
                              <p className="text-xs text-muted-foreground mt-1 truncate max-w-xl">
                                {itemTexts[0].text}
                              </p>
                            ) : (
                              <p className="text-xs text-destructive italic mt-1">Sin texto</p>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                            setDeleteId(item.id);
                            setDeleteCounts(null);
                            const [tRes, wRes] = await Promise.all([
                              supabase.from("item_texts_360").select("id", { count: "exact", head: true }).eq("item_id", item.id),
                              supabase.from("competency_weights").select("id", { count: "exact", head: true }).eq("competency_key", item.competency_key),
                            ]);
                            setDeleteCounts({ texts: tRes.count ?? 0, weights: wRes.count ?? 0 });
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {isExpanded && (
                          <div className="px-12 pb-3 space-y-2">
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>Clave: <span className="font-mono font-medium">{item.competency_key}</span></span>
                              <span>· {item.response_type === "frequency" ? "Frecuencia" : "Acuerdo"}</span>
                            </div>
                            <div className="space-y-1">
                              {FORM_TYPES.map((ft) => {
                                const t = itemTexts.find((x) => x.form_type === ft);
                                return (
                                  <div key={ft} className="flex gap-2 text-xs">
                                    <span className="font-medium w-28 shrink-0 text-muted-foreground">{FORM_TYPE_LABELS[ft]}:</span>
                                    <span className={t ? "" : "text-destructive italic"}>{t?.text || "Sin texto"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {items.length === 0 && <p className="text-sm text-muted-foreground p-4">Sin ítems configurados.</p>}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit/Create dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Editar" : "Nuevo"} Ítem</DialogTitle>
            <DialogDescription>Configure el ítem y sus textos por formulario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editItem?.id && (
              <div>
                <label className="text-xs font-medium">Número de ítem</label>
                <Input type="number" value={editItem.item_number} disabled className="bg-muted" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Dominio</label>
              <Select value={selectedDomainId} onValueChange={(v) => { setSelectedDomainId(v); setSelectedCompKey(""); }} disabled={!!editItem?.id}>
                <SelectTrigger><SelectValue placeholder="Seleccione dominio" /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Competencia</label>
              <Select value={selectedCompKey} onValueChange={(v) => setSelectedCompKey(v)} disabled={!!editItem?.id || !selectedDomainId}>
                <SelectTrigger><SelectValue placeholder={selectedDomainId ? "Seleccione competencia" : "Primero seleccione dominio"} /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {competencies.filter((c) => c.domain_id === selectedDomainId).map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label} ({c.key})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCompKey && !editItem?.id && (
                <p className="text-xs text-muted-foreground mt-1">Variante generada: <span className="font-mono font-medium">{getNextVariant(selectedCompKey)}</span></p>
              )}
              {editItem?.id && (
                <p className="text-xs text-muted-foreground mt-1">Clave: <span className="font-mono font-medium">{editItem.competency_key}</span></p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium">Tipo de respuesta</label>
              <Select value={editItem?.response_type ?? "frequency"} onValueChange={(v) => setEditItem((p) => ({ ...p, response_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="frequency">Frecuencia (Nunca → Siempre)</SelectItem>
                  <SelectItem value="agreement">Acuerdo (Tot. desacuerdo → Tot. de acuerdo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold mb-2">Textos por formulario</h4>
              <Tabs defaultValue="docente">
                <TabsList className="flex-wrap h-auto gap-1">
                  {FORM_TYPES.map((ft) => (
                    <TabsTrigger key={ft} value={ft} className="text-xs px-2 py-1">
                      {FORM_TYPE_LABELS[ft]}
                      {editTexts[ft]?.trim() ? "" : " ⚠"}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {FORM_TYPES.map((ft) => (
                  <TabsContent key={ft} value={ft}>
                    <Textarea
                      rows={3}
                      value={editTexts[ft] ?? ""}
                      onChange={(e) => setEditTexts((p) => ({ ...p, [ft]: e.target.value }))}
                      placeholder={`Texto del ítem para ${FORM_TYPE_LABELS[ft]}…`}
                      className="text-sm"
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteCounts(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar ítem?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. Se eliminarán los siguientes registros asociados:</DialogDescription>
          </DialogHeader>
          {deleteCounts ? (
            <ul className="text-sm space-y-1 pl-4 list-disc text-muted-foreground">
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
