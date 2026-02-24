import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, Undo2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

interface DeletedRecord {
  id: string;
  record_type: string;
  record_label: string;
  deleted_data: any;
  deleted_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  domain: "Dominio",
  competency: "Competencia",
  item: "Ítem",
  encuesta_360: "Encuesta 360",
};

export default function AdminTrashManager() {
  const { toast } = useToast();
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deleted_records")
      .select("*")
      .order("deleted_at", { ascending: false });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setRecords((data as DeletedRecord[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRestore = async (record: DeletedRecord) => {
    setRestoring(record.id);
    try {
      const d = record.deleted_data;

      if (record.record_type === "domain") {
        await supabase.from("domains_360").insert(d.domain);
        if (d.competencies?.length > 0) await supabase.from("competencies_360").insert(d.competencies);
        if (d.items?.length > 0) await supabase.from("items_360").insert(d.items);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "competency") {
        await supabase.from("competencies_360").insert(d.competency);
        if (d.items?.length > 0) await supabase.from("items_360").insert(d.items);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "item") {
        await supabase.from("items_360").insert(d.item);
        if (d.texts?.length > 0) await supabase.from("item_texts_360").insert(d.texts.map(({ id, ...rest }: any) => rest));
        if (d.weights?.length > 0) await supabase.from("competency_weights").insert(d.weights.map(({ id, ...rest }: any) => rest));
      } else if (record.record_type === "encuesta_360") {
        // Restore the encuesta — re-insert the full row
        const { id, ...rest } = d;
        await supabase.from("encuestas_360").insert([{ id, ...rest }]);
      }

      // Remove from trash
      await supabase.from("deleted_records").delete().eq("id", record.id);
      toast({ title: "Restaurado", description: `${TYPE_LABELS[record.record_type]} "${record.record_label}" restaurado(a) correctamente.` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error al restaurar", description: err.message, variant: "destructive" });
    }
    setRestoring(null);
  };

  const handlePurge = async () => {
    if (!purgeId) return;
    try {
      await supabase.from("deleted_records").delete().eq("id", purgeId);
      toast({ title: "Eliminado permanentemente" });
      setPurgeId(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Papelera</h3>
          <p className="text-xs text-muted-foreground mt-1">Elementos eliminados que pueden ser restaurados.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">La papelera está vacía.</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <Badge variant="outline" className="text-xs shrink-0">{TYPE_LABELS[r.record_type] ?? r.record_type}</Badge>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{r.record_label}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(r.deleted_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={restoring === r.id}
                onClick={() => handleRestore(r)}
              >
                {restoring === r.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Restaurar
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPurgeId(r.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Purge confirm */}
      <Dialog open={!!purgeId} onOpenChange={(o) => !o && setPurgeId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar permanentemente?</DialogTitle>
            <DialogDescription>Esta acción eliminará el registro de la papelera de forma definitiva. No podrá ser restaurado.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handlePurge}>Eliminar definitivamente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
