import { useState, useEffect, useMemo } from "react";
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
  region: string;
}

interface GeoData {
  regiones: { id: string; nombre: string }[];
  entidades: { id: string; nombre: string }[];
  municipios: { id: string; nombre: string; entidad_territorial_id: string }[];
  instituciones: { id: string; nombre: string; municipio_id: string }[];
  regionEntidades: { region_id: string; entidad_territorial_id: string }[];
  regionMunicipios: { region_id: string; municipio_id: string }[];
  regionInstituciones: { region_id: string; institucion_id: string }[];
}

export default function AdminReporte360Tab() {
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

  // Geo data
  const [geo, setGeo] = useState<GeoData>({
    regiones: [], entidades: [], municipios: [], instituciones: [],
    regionEntidades: [], regionMunicipios: [], regionInstituciones: [],
  });

  // Multi-select filter state
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selMunicipios, setSelMunicipios] = useState<string[]>([]);
  const [selInstituciones, setSelInstituciones] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      { data: fichas },
      { data: regiones },
      { data: entidades },
      { data: municipios },
      { data: instituciones },
      { data: regionEntidades },
      { data: regionMunicipios },
      { data: regionInstituciones },
    ] = await Promise.all([
      supabase.from("fichas_rlt").select("nombres_apellidos, nombre_ie, cargo_actual, region").in("cargo_actual", ["Rector/a", "Coordinador/a"]).order("nombres_apellidos"),
      supabase.from("regiones").select("id, nombre").order("nombre"),
      supabase.from("entidades_territoriales").select("id, nombre").order("nombre"),
      supabase.from("municipios").select("id, nombre, entidad_territorial_id").order("nombre"),
      supabase.from("instituciones").select("id, nombre, municipio_id").order("nombre"),
      supabase.from("region_entidades").select("region_id, entidad_territorial_id"),
      supabase.from("region_municipios").select("region_id, municipio_id"),
      supabase.from("region_instituciones").select("region_id, institucion_id"),
    ]);

    setDirectivos((fichas ?? []).map((f) => ({
      nombre: f.nombres_apellidos,
      institucion: f.nombre_ie,
      cargo: f.cargo_actual,
      region: f.region,
    })));

    setGeo({
      regiones: regiones ?? [],
      entidades: entidades ?? [],
      municipios: municipios ?? [],
      instituciones: instituciones ?? [],
      regionEntidades: regionEntidades ?? [],
      regionMunicipios: regionMunicipios ?? [],
      regionInstituciones: regionInstituciones ?? [],
    });

    setLoading(false);
  };

  // Clear downstream filters when parent changes
  useEffect(() => { setSelEntidades([]); setSelMunicipios([]); setSelInstituciones([]); }, [selRegions]);
  useEffect(() => { setSelMunicipios([]); setSelInstituciones([]); }, [selEntidades]);
  useEffect(() => { setSelInstituciones([]); }, [selMunicipios]);

  // Cascade: available entidades based on selected regions
  const availableEntidades = useMemo(() => {
    if (selRegions.length === 0) return geo.entidades;
    const entidadIds = new Set(
      geo.regionEntidades.filter((re) => selRegions.includes(re.region_id)).map((re) => re.entidad_territorial_id)
    );
    return geo.entidades.filter((e) => entidadIds.has(e.id));
  }, [selRegions, geo]);

  // Cascade: available municipios
  const availableMunicipios = useMemo(() => {
    let filtered = geo.municipios;
    if (selEntidades.length > 0) {
      filtered = filtered.filter((m) => selEntidades.includes(m.entidad_territorial_id));
    } else if (selRegions.length > 0) {
      const entidadIds = new Set(availableEntidades.map((e) => e.id));
      filtered = filtered.filter((m) => entidadIds.has(m.entidad_territorial_id));
    }
    return filtered;
  }, [selRegions, selEntidades, availableEntidades, geo]);

  // Cascade: available instituciones
  const availableInstituciones = useMemo(() => {
    let filtered = geo.instituciones;
    if (selMunicipios.length > 0) {
      filtered = filtered.filter((i) => selMunicipios.includes(i.municipio_id));
    } else if (selEntidades.length > 0 || selRegions.length > 0) {
      const munIds = new Set(availableMunicipios.map((m) => m.id));
      filtered = filtered.filter((i) => munIds.has(i.municipio_id));
    }
    return filtered;
  }, [selMunicipios, selEntidades, selRegions, availableMunicipios, geo]);

  // Filtered directivos
  const filteredDirectivos = useMemo(() => {
    // No filters → show all
    if (selRegions.length === 0 && selEntidades.length === 0 && selMunicipios.length === 0 && selInstituciones.length === 0) {
      return directivos;
    }

    // Build set of institution names to keep
    let instNames: Set<string>;

    if (selInstituciones.length > 0) {
      // Explicit institution selection
      const instIds = new Set(selInstituciones);
      instNames = new Set(geo.instituciones.filter((i) => instIds.has(i.id)).map((i) => i.nombre));
    } else {
      // Use cascaded available institutions
      instNames = new Set(availableInstituciones.map((i) => i.nombre));
    }

    // Also filter by region name if regions selected and no deeper filter
    if (selRegions.length > 0 && selEntidades.length === 0 && selMunicipios.length === 0 && selInstituciones.length === 0) {
      const regionNames = new Set(geo.regiones.filter((r) => selRegions.includes(r.id)).map((r) => r.nombre));
      return directivos.filter((d) => regionNames.has(d.region));
    }

    return directivos.filter((d) => instNames.has(d.institucion));
  }, [directivos, selRegions, selEntidades, selMunicipios, selInstituciones, geo, availableInstituciones]);

  const handleView = async (d: DirectivoOption) => {
    setViewing(d.nombre);
    try {
      const data = await calcularReporte360(d.nombre, d.institucion);
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
      const data = await calcularReporte360(d.nombre, d.institucion);
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
          const data = await calcularReporte360(d.nombre, d.institucion);
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
      <AdminEncuestaMonitor />

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
                options={geo.regiones.map((r) => ({ value: r.id, label: r.nombre }))}
                selected={selRegions}
                onChange={setSelRegions}
                placeholder="Todas las regiones"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect
                options={availableEntidades.map((e) => ({ value: e.id, label: e.nombre }))}
                selected={selEntidades}
                onChange={setSelEntidades}
                placeholder="Todas las entidades"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Municipio</label>
              <MultiSelect
                options={availableMunicipios.map((m) => ({ value: m.id, label: m.nombre }))}
                selected={selMunicipios}
                onChange={setSelMunicipios}
                placeholder="Todos los municipios"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución</label>
              <MultiSelect
                options={availableInstituciones.map((i) => ({ value: i.id, label: i.nombre }))}
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
            Export groupé ({filteredDirectivos.length} directivo{filteredDirectivos.length !== 1 ? "s" : ""}) :
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
                  <p className="text-xs text-muted-foreground">{d.cargo} · {d.region}</p>
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
