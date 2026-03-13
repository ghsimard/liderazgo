import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppImages } from "@/hooks/useAppImages";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  generarPDFInformeModulo,
  type InformeModuloPdfData,
  type DirectivoEvalPdfData,
  type InformePdfLogos,
} from "@/utils/informeModuloPdfGenerator";

const MODULES = [1, 2, 3, 4];

export default function AdminInformeReportTab() {
  const { toast } = useToast();
  const { images } = useAppImages();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Filters
  const [regiones, setRegiones] = useState<{ id: string; nombre: string; mostrar_logo_rlt: boolean; mostrar_logo_clt: boolean }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [includeInforme, setIncludeInforme] = useState(true);
  const [includeEvaluacion, setIncludeEvaluacion] = useState(true);

  // Data counts
  const [informeCount, setInformeCount] = useState(0);
  const [evalCount, setEvalCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: regs } = await supabase.from("regiones").select("id, nombre, mostrar_logo_rlt, mostrar_logo_clt").order("nombre");
      setRegiones(regs || []);
      setLoading(false);
    })();
  }, []);

  // Preview counts when filters change
  useEffect(() => {
    if (!selectedRegion || selectedModules.length === 0) {
      setInformeCount(0);
      setEvalCount(0);
      return;
    }
    (async () => {
      const moduleNums = selectedModules.map(Number);
      const regionObj = regiones.find(r => r.nombre === selectedRegion);
      if (!regionObj) return;

      const { count: ic } = await supabase
        .from("informe_modulo")
        .select("id", { count: "exact", head: true })
        .eq("region", selectedRegion)
        .in("module_number", moduleNums);
      setInformeCount(ic || 0);

      // Count evaluaciones for directivos in this region
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("numero_cedula")
        .eq("region", selectedRegion)
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      if (fichas && fichas.length > 0) {
        const cedulas = fichas.map(f => f.numero_cedula).filter(Boolean) as string[];
        const { count: ec } = await supabase
          .from("informe_directivo")
          .select("id", { count: "exact", head: true })
          .in("module_number", moduleNums)
          .in("directivo_cedula", cedulas);
        setEvalCount(ec || 0);
      } else {
        setEvalCount(0);
      }
    })();
  }, [selectedRegion, selectedModules, regiones]);

  const handleGenerate = async () => {
    if (!selectedRegion || selectedModules.length === 0) {
      toast({ title: "Seleccione filtros", description: "Debe seleccionar una región y al menos un módulo.", variant: "destructive" });
      return;
    }
    if (!includeInforme && !includeEvaluacion) {
      toast({ title: "Seleccione contenido", description: "Debe incluir al menos Informe o Evaluación.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const moduleNums = selectedModules.map(Number);
      const regionObj = regiones.find(r => r.nombre === selectedRegion);

      let informes: InformeModuloPdfData[] = [];
      let equipoMap: Record<string, { nombre: string; rol: string }[]> = {};
      let evaluaciones: DirectivoEvalPdfData[] = [];

      if (includeInforme) {
        const { data: rows } = await supabase
          .from("informe_modulo")
          .select("*")
          .eq("region", selectedRegion)
          .in("module_number", moduleNums)
          .order("module_number");

        informes = (rows || []).map(r => ({
          region: r.region,
          entidad_territorial: r.entidad_territorial,
          module_number: r.module_number,
          fecha_inicio_intensivo: r.fecha_inicio_intensivo || "",
          fecha_fin_intensivo: r.fecha_fin_intensivo || "",
          fecha_inicio_interludio: r.fecha_inicio_interludio || "",
          fecha_fin_interludio: r.fecha_fin_interludio || "",
          aprendizajes_intensivo: r.aprendizajes_intensivo || "",
          ajustes_actividades: (r.ajustes_actividades as any[]) || [],
          articulacion_intensivo: r.articulacion_intensivo || "",
          sesiones_programadas: (r.sesiones_programadas as any) || {},
          sesiones_realizadas: (r.sesiones_realizadas as any) || {},
          razones_diferencias: r.razones_diferencias || "",
          acompanamiento_descripcion: r.acompanamiento_descripcion || "",
          acompanamiento_no_cumplido: r.acompanamiento_no_cumplido || "",
          acompanamiento_directivos: (r.acompanamiento_directivos as any[]) || [],
          estrategias: (r.estrategias as any[]) || [],
          aprendizajes_interludio: r.aprendizajes_interludio || "",
          articulacion_interludio: r.articulacion_interludio || "",
          contexto_plan_sectorial: r.contexto_plan_sectorial || "",
          contexto_articulacion: r.contexto_articulacion || "",
          novedades: (r.novedades as any[]) || [],
        }));

        // Load equipo for each informe
        for (const inf of rows || []) {
          const { data: eq } = await supabase.from("informe_modulo_equipo").select("nombre, rol").eq("informe_id", inf.id);
          equipoMap[`${inf.region}_${inf.module_number}`] = eq || [];
        }
      }

      if (includeEvaluacion) {
        // Get directivos in this region
        const { data: fichas } = await supabase
          .from("fichas_rlt")
          .select("numero_cedula, nombres_apellidos, nombre_ie")
          .eq("region", selectedRegion)
          .in("cargo_actual", ["Rector/a", "Coordinador/a"]);

        if (fichas && fichas.length > 0) {
          const cedulas = fichas.map(f => f.numero_cedula).filter(Boolean) as string[];
          const fichaMap = new Map(fichas.map(f => [f.numero_cedula, f as { numero_cedula: string; nombres_apellidos: string; nombre_ie: string }]));

          const { data: evals } = await supabase
            .from("informe_directivo")
            .select("*")
            .in("module_number", moduleNums)
            .in("directivo_cedula", cedulas)
            .order("module_number");

          evaluaciones = (evals || []).map(e => {
            const ficha = fichaMap.get(e.directivo_cedula) as { numero_cedula: string; nombres_apellidos: string; nombre_ie: string } | undefined;
            return {
              directivo_cedula: e.directivo_cedula,
              directivo_nombre: ficha?.nombres_apellidos || e.directivo_cedula,
              institucion: ficha?.nombre_ie || "",
              reto_estrategico: e.reto_estrategico || "",
              razon_sin_reto: e.razon_sin_reto || "",
              avances_personal: e.avances_personal || "",
              retos_personal: e.retos_personal || "",
              avances_pedagogica: e.avances_pedagogica || "",
              retos_pedagogica: e.retos_pedagogica || "",
              avances_administrativa: e.avances_administrativa || "",
              retos_administrativa: e.retos_administrativa || "",
            };
          });
        }
      }

      if (informes.length === 0 && evaluaciones.length === 0) {
        toast({ title: "Sin datos", description: "No se encontraron datos para los filtros seleccionados.", variant: "destructive" });
        setGenerating(false);
        return;
      }

      // If no informes but we need a region reference for the PDF
      if (informes.length === 0 && evaluaciones.length > 0) {
        informes = [{ region: selectedRegion, entidad_territorial: "", module_number: moduleNums[0] } as any];
      }

      const pdfLogos = getPdfLogoSources(images);
      const logos: InformePdfLogos = {
        logoRLT: pdfLogos.logoRLT,
        logoCLT: pdfLogos.logoCLT,
        logoCosmo: pdfLogos.logoCosmo,
        showLogoRLT: regionObj?.mostrar_logo_rlt ?? true,
        showLogoCLT: regionObj?.mostrar_logo_clt ?? true,
      };

      await generarPDFInformeModulo(informes, equipoMap, evaluaciones, logos, {
        includeInforme,
        includeEvaluacion,
      });

      toast({ title: "PDF generado", description: "El informe se ha descargado correctamente." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Generar Reporte PDF</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Región</Label>
              <Select value={selectedRegion} onValueChange={v => setSelectedRegion(v)}>
                <SelectTrigger><SelectValue placeholder="Seleccione una región" /></SelectTrigger>
                <SelectContent>
                  {regiones.map(r => <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Módulo(s)</Label>
              <MultiSelect
                options={MODULES.map(m => ({ value: String(m), label: `Módulo ${m}` }))}
                selected={selectedModules}
                onChange={setSelectedModules}
                placeholder="Seleccione módulo(s)"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={includeInforme} onCheckedChange={v => setIncludeInforme(!!v)} />
              <span className="text-sm">Informe de Módulo</span>
              {informeCount > 0 && <Badge variant="secondary" className="text-[10px]">{informeCount}</Badge>}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={includeEvaluacion} onCheckedChange={v => setIncludeEvaluacion(!!v)} />
              <span className="text-sm">Evaluación Individual</span>
              {evalCount > 0 && <Badge variant="secondary" className="text-[10px]">{evalCount}</Badge>}
            </label>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedRegion || selectedModules.length === 0 || (!includeInforme && !includeEvaluacion)}
            className="gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? "Generando PDF…" : "Descargar PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
