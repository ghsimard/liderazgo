import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Save, Loader2 } from "lucide-react";

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  sort_order: number;
}

interface Evaluacion {
  id?: string;
  item_id: string;
  directivo_cedula: string;
  directivo_nivel: string | null;
  directivo_comentario: string | null;
  equipo_nivel: string | null;
  equipo_comentario: string | null;
  acordado_nivel: string | null;
  acordado_comentario: string | null;
}

const NIVELES = [
  { value: "avanzado", label: "Avanzado", color: "bg-emerald-100 text-emerald-800" },
  { value: "intermedio", label: "Intermedio", color: "bg-blue-100 text-blue-800" },
  { value: "basico", label: "Básico", color: "bg-amber-100 text-amber-800" },
  { value: "sin_evidencia", label: "Sin evidencia", color: "bg-red-100 text-red-800" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directivoCedula: string;
  directivoNombre: string;
}

export default function AdminEvalDetailDialog({ open, onOpenChange, directivoCedula, directivoNombre }: Props) {
  const { toast } = useToast();
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Evaluacion>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || !directivoCedula) return;
    loadData();
  }, [open, directivoCedula]);

  const loadData = async () => {
    setLoading(true);
    setDirty(false);
    const [{ data: mods }, { data: its }, { data: evals }] = await Promise.all([
      supabase.from("rubrica_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_evaluaciones").select("*").eq("directivo_cedula", directivoCedula),
    ]);
    if (mods) setModules(mods);
    if (its) setItems(its);
    if (evals) {
      const map: Record<string, Evaluacion> = {};
      for (const e of evals) map[e.item_id] = e;
      setEvaluaciones(map);
    }
    setLoading(false);
  };

  const updateField = (itemId: string, field: keyof Evaluacion, value: string) => {
    setDirty(true);
    setEvaluaciones(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_id: itemId,
        directivo_cedula: directivoCedula,
        directivo_nivel: prev[itemId]?.directivo_nivel ?? null,
        directivo_comentario: prev[itemId]?.directivo_comentario ?? null,
        equipo_nivel: prev[itemId]?.equipo_nivel ?? null,
        equipo_comentario: prev[itemId]?.equipo_comentario ?? null,
        acordado_nivel: prev[itemId]?.acordado_nivel ?? null,
        acordado_comentario: prev[itemId]?.acordado_comentario ?? null,
        [field]: value || null,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const ev of Object.values(evaluaciones)) {
        if (!ev.item_id) continue;
        const payload = {
          item_id: ev.item_id,
          directivo_cedula: directivoCedula,
          directivo_nivel: ev.directivo_nivel,
          directivo_comentario: ev.directivo_comentario,
          equipo_nivel: ev.equipo_nivel,
          equipo_comentario: ev.equipo_comentario,
          acordado_nivel: ev.acordado_nivel,
          acordado_comentario: ev.acordado_comentario,
        };

        const { data: existing } = await supabase
          .from("rubrica_evaluaciones")
          .select("id")
          .eq("item_id", ev.item_id)
          .eq("directivo_cedula", directivoCedula)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("rubrica_evaluaciones").update(payload).eq("id", existing.id);
        } else {
          // Only insert if there's at least one value
          const hasValue = ev.directivo_nivel || ev.equipo_nivel || ev.acordado_nivel;
          if (hasValue) {
            await supabase.from("rubrica_evaluaciones").insert(payload);
          }
        }
      }
      setDirty(false);
      toast({ title: "Guardado", description: "Evaluaciones actualizadas correctamente." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const NivelSelector = ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <div className="flex flex-wrap gap-1">
      {NIVELES.map(n => (
        <button
          key={n.value}
          type="button"
          onClick={() => onChange(value === n.value ? null : n.value)}
          className={`px-2 py-0.5 rounded-full border text-[10px] font-medium transition-all ${
            value === n.value ? n.color + " border-current" : "border-muted hover:bg-muted/50"
          }`}
        >
          {n.label}
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5" />
            Evaluaciones — {directivoNombre}
            <Badge variant="outline" className="text-xs ml-2">CC: {directivoCedula}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {modules.map(m => {
              const modItems = items.filter(i => i.module_id === m.id);
              if (modItems.length === 0) return null;

              return (
                <div key={m.id} className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-primary">
                    <BookOpen className="w-4 h-4" />
                    Módulo {m.module_number}: {m.title}
                  </h3>

                  {modItems.map(item => {
                    const ev = evaluaciones[item.id];
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-3 bg-muted/10">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                          <span className="text-xs font-medium">{item.item_label}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Directivo */}
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Directivo</Label>
                            <NivelSelector
                              value={ev?.directivo_nivel || null}
                              onChange={(v) => updateField(item.id, "directivo_nivel", v || "")}
                            />
                            <Textarea
                              value={ev?.directivo_comentario || ""}
                              onChange={e => updateField(item.id, "directivo_comentario", e.target.value)}
                              placeholder="Comentario…"
                              className="text-xs h-16 resize-none"
                            />
                          </div>

                          {/* Equipo */}
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Equipo</Label>
                            <NivelSelector
                              value={ev?.equipo_nivel || null}
                              onChange={(v) => updateField(item.id, "equipo_nivel", v || "")}
                            />
                            <Textarea
                              value={ev?.equipo_comentario || ""}
                              onChange={e => updateField(item.id, "equipo_comentario", e.target.value)}
                              placeholder="Comentario…"
                              className="text-xs h-16 resize-none"
                            />
                          </div>

                          {/* Acordado */}
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Acordado</Label>
                            <NivelSelector
                              value={ev?.acordado_nivel || null}
                              onChange={(v) => updateField(item.id, "acordado_nivel", v || "")}
                            />
                            <Textarea
                              value={ev?.acordado_comentario || ""}
                              onChange={e => updateField(item.id, "acordado_comentario", e.target.value)}
                              placeholder="Comentario…"
                              className="text-xs h-16 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
              <Button onClick={handleSave} disabled={saving || !dirty} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
