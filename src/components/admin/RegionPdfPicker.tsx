import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Region {
  id: string;
  nombre: string;
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

interface RegionPdfPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (flags: { showLogoRlt: boolean; showLogoClt: boolean }) => void;
  loading?: boolean;
}

export default function RegionPdfPicker({ open, onOpenChange, onConfirm, loading }: RegionPdfPickerProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    supabase
      .from("regiones")
      .select("id, nombre, mostrar_logo_rlt, mostrar_logo_clt")
      .order("nombre")
      .then(({ data }) => {
        setRegions(data ?? []);
        if (data && data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }
        setFetching(false);
      });
  }, [open]);

  const selected = regions.find((r) => r.id === selectedId);

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      showLogoRlt: selected.mostrar_logo_rlt,
      showLogoClt: selected.mostrar_logo_clt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Seleccionar región</DialogTitle>
          <DialogDescription>
            La región determina los logos que aparecerán en el encabezado del PDF.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar región…" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Logo RLT: {selected.mostrar_logo_rlt ? "✅ Sí" : "❌ No"}</p>
                <p>Logo CLT: {selected.mostrar_logo_clt ? "✅ Sí" : "❌ No"}</p>
              </div>
            )}

            <Button onClick={handleConfirm} disabled={!selected || loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generando…
                </>
              ) : (
                "Descargar PDF"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
