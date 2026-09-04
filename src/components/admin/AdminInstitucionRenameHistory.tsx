import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRenameHistory,
  revertRename,
  RenameHistoryEntry,
} from "@/utils/renameInstitucion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileDown, History, RefreshCw, Undo2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatBogota(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminInstitucionRenameHistory({
  isViewer = false,
  onReverted,
}: {
  isViewer?: boolean;
  onReverted?: () => void;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<RenameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revertTarget, setRevertTarget] = useState<RenameHistoryEntry | null>(null);
  const [reverting, setReverting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await fetchRenameHistory());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && !`${e.old_name} ${e.new_name}`.toLowerCase().includes(q)) return false;
      const d = e.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [entries, search, from, to]);

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    const result = await revertRename(revertTarget);
    setReverting(false);
    if (!result.success) {
      toast({ title: "Error al revertir", description: result.errors.join("; "), variant: "destructive" });
      return;
    }
    toast({
      title: "Cambio revertido",
      description: `El nombre volvió a "${revertTarget.old_name}" en todas las secciones.`,
    });
    setRevertTarget(null);
    load();
    onReverted?.();
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(14);
    doc.text("Historial de cambios de nombre de instituciones", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generado: ${formatBogota(new Date().toISOString())} (Bogotá, UTC-5)`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["Fecha", "Nombre anterior", "Nombre nuevo", "Responsable", "Registros", "Estado"]],
      body: filtered.map((e) => [
        formatBogota(e.created_at),
        e.old_name,
        e.new_name,
        e.changed_by_nombre || e.changed_by_cedula || "N/A",
        String(e.total_rows),
        e.status === "revertido" ? "Revertido" : "Aplicado",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 105] },
    });

    doc.save(`historial-cambios-nombre-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Buscar institución</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre anterior o nuevo" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
        <Button variant="outline" onClick={exportPdf} disabled={filtered.length === 0}>
          <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando historial…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" /> Sin cambios de nombre registrados.
        </p>
      ) : (
        <Accordion type="multiple" className="w-full">
          {filtered.map((e) => (
            <AccordionItem key={e.id} value={e.id}>
              <AccordionTrigger className="text-left">
                <div className="flex flex-wrap items-center gap-2 pr-3">
                  <span className="text-xs text-muted-foreground">{formatBogota(e.created_at)}</span>
                  <span className="line-through text-muted-foreground">{e.old_name}</span>
                  <span>→</span>
                  <span className="font-semibold">{e.new_name}</span>
                  <Badge variant={e.status === "revertido" ? "outline" : "secondary"}>
                    {e.status === "revertido" ? "Revertido" : "Aplicado"}
                  </Badge>
                  <Badge variant="outline">{e.total_rows} registros</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm mb-2">
                  Responsable: <strong>{e.changed_by_nombre || e.changed_by_cedula || "N/A"}</strong>
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sección (tabla)</TableHead>
                      <TableHead className="text-right">Registros actualizados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {e.counts.map((c) => (
                      <TableRow key={`${c.table}.${c.column}`}>
                        <TableCell className="font-mono text-xs">{c.table}.{c.column}</TableCell>
                        <TableCell className="text-right">{c.count < 0 ? "Error" : c.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!isViewer && e.status !== "revertido" && (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={() => setRevertTarget(e)}>
                      <Undo2 className="h-4 w-4 mr-2" /> Revertir
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <AlertDialog open={!!revertTarget} onOpenChange={(o) => { if (!o) setRevertTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revertir cambio de nombre</AlertDialogTitle>
            <AlertDialogDescription>
              El nombre "{revertTarget?.new_name}" volverá a "{revertTarget?.old_name}" en todas las secciones
              de la aplicación. Esta acción también queda registrada en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(ev) => { ev.preventDefault(); handleRevert(); }} disabled={reverting}>
              {reverting ? "Revirtiendo…" : "Revertir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
