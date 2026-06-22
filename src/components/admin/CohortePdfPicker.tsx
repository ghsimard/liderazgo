import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/utils/dbClient";

interface Cohorte {
  id: string;
  nombre: string;
  year: number;
}

interface Region {
  nombre: string;
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (result: { cohorteId: string; cohorteNombre: string; showLogoRlt: boolean; showLogoClt: boolean }) => void;
  loading?: boolean;
  initialCohorteId?: string;
}

export default function CohortePdfPicker({ open, onOpenChange, onConfirm, loading, initialCohorteId }: Props) {
  const [cohortes, setCohortes] = useState<Cohorte[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    Promise.all([
      supabase.from("ae_cohortes").select("id, nombre, year").order("year", { ascending: false }).order("nombre"),
      supabase.from("regiones").select("nombre, mostrar_logo_rlt, mostrar_logo_clt"),
    ]).then(([cRes, rRes]) => {
      const cList = (cRes.data as Cohorte[]) || [];
      setCohortes(cList);
      setRegions((rRes.data as Region[]) || []);
      if (cList.length > 0) {
        setSelectedId(initialCohorteId && cList.some(c => c.id === initialCohorteId) ? initialCohorteId : cList[0].id);
      }
      setFetching(false);
    });
  }, [open, initialCohorteId]);

  const selected = cohortes.find((c) => c.id === selectedId);
  const matchedRegion = selected ? regions.find(r => r.nombre === selected.nombre) : undefined;
  const showLogoRlt = matchedRegion ? matchedRegion.mostrar_logo_rlt : true;
  const showLogoClt = matchedRegion ? matchedRegion.mostrar_logo_clt : true;

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      cohorteId: selected.id,
      cohorteNombre: selected.nombre,
      showLogoRlt,
      showLogoClt,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Seleccionar cohorte</DialogTitle>
          <DialogDescription>
            El PDF se generará con las instituciones de la cohorte seleccionada. Los logos se determinan según la región asociada.
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
                <SelectValue placeholder="Seleccionar cohorte…" />
              </SelectTrigger>
              <SelectContent>
                {cohortes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Logo RLT: {showLogoRlt ? "✅ Sí" : "❌ No"}</p>
                <p>Logo CLT: {showLogoClt ? "✅ Sí" : "❌ No"}</p>
                {!matchedRegion && (
                  <p className="text-amber-600">Sin región asociada — se incluirán ambos logos por defecto.</p>
                )}
              </div>
            )}

            <Button autoFocus onClick={handleConfirm} disabled={!selected || loading} className="w-full">
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
