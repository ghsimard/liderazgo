import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/utils/dbClient";
import { ArrowRight } from "lucide-react";

interface Evaluador {
  id: string;
  nombre: string;
  cedula: string;
}

interface Asignacion {
  id: string;
  evaluador_id: string;
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceEvaluador: Evaluador;
  evaluadores: Evaluador[];
  asignaciones: Asignacion[];
  onTransferDone: () => void;
}

export default function TransferDirectivosDialog({
  open, onOpenChange, sourceEvaluador, evaluadores, asignaciones, onTransferDone
}: Props) {
  const { toast } = useToast();
  const [targetEvalId, setTargetEvalId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sourceAsignaciones = asignaciones.filter(a => a.evaluador_id === sourceEvaluador.id);
  const otherEvaluadores = evaluadores.filter(e => e.id !== sourceEvaluador.id);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleTransfer = async () => {
    if (!targetEvalId || selectedIds.length === 0) return;

    // Get existing assignments for target to avoid duplicates
    const targetAsignaciones = asignaciones.filter(a => a.evaluador_id === targetEvalId);
    const targetCedulas = new Set(targetAsignaciones.map(a => a.directivo_cedula));

    const toTransfer = sourceAsignaciones.filter(a => selectedIds.includes(a.id));
    const newRows = toTransfer
      .filter(a => !targetCedulas.has(a.directivo_cedula))
      .map(a => ({
        evaluador_id: targetEvalId,
        directivo_cedula: a.directivo_cedula,
        directivo_nombre: a.directivo_nombre,
        institucion: a.institucion,
      }));

    setSaving(true);

    // Insert new assignments for target (skip duplicates)
    if (newRows.length > 0) {
      const { error: insertErr } = await supabase.from("rubrica_asignaciones").insert(newRows);
      if (insertErr) {
        toast({ title: "Error", description: insertErr.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    // Delete old assignments from source
    const { error: deleteErr } = await supabase
      .from("rubrica_asignaciones")
      .delete()
      .in("id", selectedIds);

    setSaving(false);

    if (deleteErr) {
      toast({ title: "Error", description: deleteErr.message, variant: "destructive" });
      return;
    }

    const skipped = toTransfer.length - newRows.length;
    let msg = `${newRows.length} directivo(s) transféré(s)`;
    if (skipped > 0) msg += ` (${skipped} déjà assigné(s), ignoré(s))`;

    toast({ title: "Transfert effectué", description: msg });
    setSelectedIds([]);
    setTargetEvalId("");
    onOpenChange(false);
    onTransferDone();
  };

  const handleClose = (v: boolean) => {
    if (!v) { setSelectedIds([]); setTargetEvalId(""); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transferir directivos
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Source */}
          <div>
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <p className="text-sm font-medium">{sourceEvaluador.nombre} <span className="text-muted-foreground">(CC: {sourceEvaluador.cedula})</span></p>
          </div>

          {/* Target */}
          <div>
            <Label>Hacia</Label>
            <Select value={targetEvalId} onValueChange={setTargetEvalId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar evaluador destino…" />
              </SelectTrigger>
              <SelectContent>
                {otherEvaluadores.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre} (CC: {e.cedula})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Directivos to transfer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Directivos a transferir</Label>
              {sourceAsignaciones.length > 0 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setSelectedIds(
                    selectedIds.length === sourceAsignaciones.length
                      ? []
                      : sourceAsignaciones.map(a => a.id)
                  )}
                >
                  {selectedIds.length === sourceAsignaciones.length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              )}
            </div>
            {sourceAsignaciones.length === 0 ? (
              <p className="text-xs text-muted-foreground">Este evaluador no tiene directivos asignados.</p>
            ) : (
              <div className="max-h-[220px] overflow-y-auto border rounded-md p-1 space-y-0.5">
                {sourceAsignaciones.map(a => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                  >
                    <Checkbox
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={() => toggleSelect(a.id)}
                    />
                    <span className="truncate flex-1">{a.directivo_nombre}</span>
                    <span className="text-muted-foreground shrink-0">{a.institucion}</span>
                  </label>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <Badge variant="secondary" className="text-xs mt-1">{selectedIds.length} seleccionado(s)</Badge>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button
            onClick={handleTransfer}
            disabled={saving || selectedIds.length === 0 || !targetEvalId}
            className="gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            {saving ? "Transfiriendo…" : `Transferir (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
