import { useState, useEffect, useMemo } from "react";
import { genderizeRole } from "@/utils/genderizeRole";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { FileText, RefreshCw, Download, Eye, Filter } from "lucide-react";
import { calcularReporte360, type Reporte360Data } from "@/utils/reporte360Calculator";
import { generarReporte360PDF } from "@/utils/reporte360PdfGenerator";
import AdminReporte360Viewer from "./AdminReporte360Viewer";
import AdminEncuestaMonitor from "./AdminEncuestaMonitor";
import { useAppImages } from "@/hooks/useAppImages";
import { MultiSelect } from "@/components/ui/multi-select";
import JSZip from "jszip";

interface DirectivoOption {
  nombre: string;
  institucion: string;
  cargo: string;
  genero: string | null;
  region: string;
  entidad_territorial: string;
  municipio: string;
}

interface AdminReporte360TabProps {
  fase?: "inicial" | "final";
}

export default function AdminReporte360Tab({ fase = "inicial" }: AdminReporte360TabProps) {
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt_white;
  const { toast } = useToast();
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<Reporte360Data | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Multi-select filter state (text-based)
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selMunicipios, setSelMunicipios] = useState<string[]>([]);
  const [selInstituciones, setSelInstituciones] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load fichas with institution join to get municipio name
    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombres_apellidos, nombre_ie, cargo_actual, genero, region, entidad_territorial")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    // Build a map of institution name → municipio name
    const { data: instituciones } = await supabase
      .from("instituciones")
      .select("nombre, municipio_id");
    const { data: municipios } = await supabase
      .from("municipios")
      .select("id, nombre");

    const munMap = new Map((municipios ?? []).map((m) => [m.id, m.nombre]));
    const instMunMap = new Map(
      (instituciones ?? []).map((i) => [i.nombre, munMap.get(i.municipio_id) ?? ""])
    );

    setDirectivos(
      (fichas ?? []).map((f) => ({
        nombre: f.nombres_apellidos,
        institucion: f.nombre_ie,
        cargo: f.cargo_actual,
        genero: f.genero ?? null,
        region: f.region ?? "",
        entidad_territorial: f.entidad_territorial ?? "",
        municipio: instMunMap.get(f.nombre_ie) ?? "",
      }))
    );

    setLoading(false);
  };

  // Clear downstream filters when parent changes
  useEffect(() => { setSelEntidades([]); setSelMunicipios([]); setSelInstituciones([]); }, [selRegions]);
  useEffect(() => { setSelMunicipios([]); setSelInstituciones([]); }, [selEntidades]);
  useEffect(() => { setSelInstituciones([]); }, [selMunicipios]);

  // Derive unique filter options from actual fichas data
  const regionOptions = useMemo(() => {
    const vals = [...new Set(directivos.map((d) => d.region).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos]);

  const entidadOptions = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    const vals = [...new Set(pool.map((d) => d.entidad_territorial).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos, selRegions]);

  const municipioOptions = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    const vals = [...new Set(pool.map((d) => d.municipio).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos, selRegions, selEntidades]);

  const institucionOptions = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    if (selMunicipios.length > 0) pool = pool.filter((d) => selMunicipios.includes(d.municipio));
    const vals = [...new Set(pool.map((d) => d.institucion).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [directivos, selRegions, selEntidades, selMunicipios]);

  // Filtered directivos
  const filteredDirectivos = useMemo(() => {
    let pool = directivos;
    if (selRegions.length > 0) pool = pool.filter((d) => selRegions.includes(d.region));
    if (selEntidades.length > 0) pool = pool.filter((d) => selEntidades.includes(d.entidad_territorial));
    if (selMunicipios.length > 0) pool = pool.filter((d) => selMunicipios.includes(d.municipio));
    if (selInstituciones.length > 0) pool = pool.filter((d) => selInstituciones.includes(d.institucion));
    return pool;
  }, [directivos, selRegions, selEntidades, selMunicipios, selInstituciones]);

  const handleView = async (d: DirectivoOption) => {
    setViewing(d.nombre);
    try {
      const data = await calcularReporte360(d.nombre, d.institucion, fase);
      setViewerData(data);
      setViewerOpen(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setViewing(null);
  };

  const handleGenerate = async (d: DirectivoOption) => {
    setGenerating(d.nombre);
    try {
      const data = await calcularReporte360(d.nombre, d.institucion, fase);
      await generarReporte360PDF(data, { logoRLT, logoCLT, logoCosmo: images.logo_cosmo, coverBg: images.cover_bg, lightbulb: images.lightbulb_icon });
      toast({ title: "Informe generado", description: `PDF descargado para ${d.nombre}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(null);
  };

  const handleBatchExport = async () => {
    if (filteredDirectivos.length === 0) return;
    setBatchGenerating(true);
    try {
      const zip = new JSZip();
      let count = 0;
      for (const d of filteredDirectivos) {
        try {
          const data = await calcularReporte360(d.nombre, d.institucion, fase);
          const blob = await generarReporte360PDF(data, { logoRLT, logoCLT, logoCosmo: images.logo_cosmo, coverBg: images.cover_bg, lightbulb: images.lightbulb_icon }, { returnBlob: true });
          if (blob) {
            zip.file(`Informe_360_${d.nombre.replace(/\s+/g, "_")}.pdf`, blob);
            count++;
          }
        } catch {
          // skip failed
        }
      }
      if (count === 0) {
        toast({ title: "Sin informes", description: "No se pudo generar ningún informe", variant: "destructive" });
        setBatchGenerating(false);
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informes_360_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP descargado", description: `${count} informe(s) generados` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBatchGenerating(false);
  };

  const clearAllFilters = () => {
    setSelRegions([]);
    setSelEntidades([]);
    setSelMunicipios([]);
    setSelInstituciones([]);
  };

  const hasFilters = selRegions.length > 0 || selEntidades.length > 0 || selMunicipios.length > 0 || selInstituciones.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminEncuestaMonitor fase={fase} />

      {/* Cascade filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-auto">
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Región</label>
              <MultiSelect
                options={regionOptions}
                selected={selRegions}
                onChange={setSelRegions}
                placeholder="Todas las regiones"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect
                options={entidadOptions}
                selected={selEntidades}
                onChange={setSelEntidades}
                placeholder="Todas las entidades"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Municipio</label>
              <MultiSelect
                options={municipioOptions}
                selected={selMunicipios}
                onChange={setSelMunicipios}
                placeholder="Todos los municipios"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución</label>
              <MultiSelect
                options={institucionOptions}
                selected={selInstituciones}
                onChange={setSelInstituciones}
                placeholder="Todas las instituciones"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch export */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <Download className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">
            Exportación agrupada ({filteredDirectivos.length} directivo{filteredDirectivos.length !== 1 ? "s" : ""}) :
          </span>
          <Button
            size="sm"
            onClick={handleBatchExport}
            disabled={filteredDirectivos.length === 0 || batchGenerating}
            className="gap-1.5"
          >
            {batchGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {batchGenerating ? "Generando…" : "Generar ZIP"}
          </Button>
        </CardContent>
      </Card>

      {/* Individual reports */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {filteredDirectivos.length} directivo(s) {hasFilters ? "filtrado(s)" : "registrado(s)"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredDirectivos.map((d) => (
            <Card key={d.nombre + d.institucion} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.institucion}</p>
                  <p className="text-xs text-muted-foreground">{genderizeRole(d.cargo, d.genero)} · {d.region}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleView(d)} disabled={viewing === d.nombre} className="gap-1 text-xs">
                    {viewing === d.nombre ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleGenerate(d)} disabled={generating === d.nombre} className="gap-1 text-xs">
                    {generating === d.nombre ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AdminReporte360Viewer open={viewerOpen} onOpenChange={setViewerOpen} data={viewerData} />
    </div>
  );
}
