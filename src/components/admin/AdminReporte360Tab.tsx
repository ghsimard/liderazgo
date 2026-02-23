import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw, Download } from "lucide-react";
import { calcularReporte360 } from "@/utils/reporte360Calculator";
import { generarReporte360PDF } from "@/utils/reporte360PdfGenerator";
import logoRLT from "@/assets/logo_rlt.png";
import logoCLT from "@/assets/logo_clt_dark.png";
import JSZip from "jszip";

interface DirectivoOption {
  nombre: string;
  institucion: string;
  cargo: string;
  region: string;
}

export default function AdminReporte360Tab() {
  const { toast } = useToast();
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [batchRegion, setBatchRegion] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

  useEffect(() => {
    loadDirectivos();
  }, []);

  const loadDirectivos = async () => {
    setLoading(true);
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombres_apellidos, nombre_ie, cargo_actual, region")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    const list = (fichas ?? []).map((f) => ({
      nombre: f.nombres_apellidos,
      institucion: f.nombre_ie,
      cargo: f.cargo_actual,
      region: f.region,
    }));
    setDirectivos(list);
    setRegions([...new Set(list.map((d) => d.region).filter(Boolean))]);
    setLoading(false);
  };

  const handleGenerate = async (d: DirectivoOption) => {
    setGenerating(d.nombre);
    try {
      const data = await calcularReporte360(d.nombre, d.institucion);
      await generarReporte360PDF(data, { logoRLT, logoCLT });
      toast({ title: "Informe generado", description: `PDF descargado para ${d.nombre}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(null);
  };

  const handleBatchExport = async () => {
    if (!batchRegion) return;
    setBatchGenerating(true);
    try {
      const regionDirectivos = directivos.filter((d) => d.region === batchRegion);
      if (regionDirectivos.length === 0) {
        toast({ title: "Sin directivos", description: "No hay directivos en esta región", variant: "destructive" });
        setBatchGenerating(false);
        return;
      }

      const zip = new JSZip();
      for (const d of regionDirectivos) {
        try {
          const data = await calcularReporte360(d.nombre, d.institucion);
          const blob = await generarReporte360PDF(data, { logoRLT, logoCLT }, { returnBlob: true });
          if (blob) {
            const fileName = `Informe_360_${d.nombre.replace(/\s+/g, "_")}.pdf`;
            zip.file(fileName, blob);
          }
        } catch {
          // Skip failed reports
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informes_360_${batchRegion.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export ZIP téléchargé", description: `${regionDirectivos.length} informe(s) generados` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBatchGenerating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Batch export */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Download className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Export groupé par région :</span>
          <Select value={batchRegion} onValueChange={setBatchRegion}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sélectionner une région" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBatchExport} disabled={!batchRegion || batchGenerating} className="gap-1.5">
            {batchGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {batchGenerating ? "Generando…" : "Generar ZIP"}
          </Button>
        </CardContent>
      </Card>

      {/* Individual reports */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{directivos.length} directivo(s) registrado(s)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {directivos.map((d) => (
            <Card key={d.nombre + d.institucion} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.institucion}</p>
                  <p className="text-xs text-muted-foreground">{d.cargo} · {d.region}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerate(d)}
                  disabled={generating === d.nombre}
                  className="shrink-0 gap-1"
                >
                  {generating === d.nombre ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  PDF
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
