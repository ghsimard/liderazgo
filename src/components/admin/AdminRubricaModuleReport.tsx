import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppImages } from "@/hooks/useAppImages";
import { Search, FileDown, BookOpen, Loader2 } from "lucide-react";
import { generarPDFRubricaModulo, type RubricaModuleReportData } from "@/utils/rubricaModulePdfGenerator";

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
  objective: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  sort_order: number;
  desc_avanzado: string;
  desc_intermedio: string;
  desc_basico: string;
  desc_sin_evidencia: string;
}

interface Evaluacion {
  item_id: string;
  directivo_cedula: string;
  directivo_nivel: string | null;
  directivo_comentario: string | null;
  equipo_nivel: string | null;
  equipo_comentario: string | null;
  acordado_nivel: string | null;
  acordado_comentario: string | null;
}

interface Seguimiento {
  item_id: string;
  nivel: string | null;
  comentario: string | null;
  created_at: string;
}

interface Asignacion {
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
  evaluador_nombre: string;
}

const NIVEL_COLORS: Record<string, string> = {
  avanzado: "bg-emerald-100 text-emerald-800",
  intermedio: "bg-blue-100 text-blue-800",
  basico: "bg-amber-100 text-amber-800",
  sin_evidencia: "bg-red-100 text-red-800",
};

const NIVEL_LABELS: Record<string, string> = {
  avanzado: "Avanzado",
  intermedio: "Intermedio",
  basico: "Básico",
  sin_evidencia: "Sin evidencia",
};

export default function AdminRubricaModuleReport() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selection state
  const [selectedCedula, setSelectedCedula] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Submission dates for filtering completed modules
  const [submissionDates, setSubmissionDates] = useState<Record<string, Set<number>>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    const [{ data: mods }, { data: its }, { data: asigs }, { data: evalores }, { data: subDates }] = await Promise.all([
      supabase.from("rubrica_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_asignaciones").select("directivo_cedula, directivo_nombre, institucion, evaluador_id"),
      supabase.from("rubrica_evaluadores").select("id, nombre"),
      supabase.from("rubrica_submission_dates").select("directivo_cedula, module_number, submission_type"),
    ]);
    if (mods) setModules(mods);
    if (its) setItems(its);
    if (asigs) {
      // Build evaluador lookup
      const evalMap = new Map<string, string>();
      if (evalores) {
        for (const ev of evalores as any[]) evalMap.set(ev.id, ev.nombre);
      }
      // Deduplicate by cedula
      const unique = new Map<string, Asignacion>();
      for (const a of asigs as any[]) {
        const evalNombre = evalMap.get(a.evaluador_id) || "";
        unique.set(a.directivo_cedula, {
          directivo_cedula: a.directivo_cedula,
          directivo_nombre: a.directivo_nombre,
          institucion: a.institucion,
          evaluador_nombre: evalNombre,
        });
      }
      setAsignaciones(Array.from(unique.values()));
    }
    if (subDates) {
      const map: Record<string, Set<number>> = {};
      for (const sd of subDates as any[]) {
        if (sd.submission_type === "nivel_acordado") {
          if (!map[sd.directivo_cedula]) map[sd.directivo_cedula] = new Set();
          map[sd.directivo_cedula].add(sd.module_number);
        }
      }
      setSubmissionDates(map);
    }
    setLoading(false);
  };

  const handleSelectDirectivo = async (cedula: string) => {
    setSelectedCedula(cedula);
    setSelectedModuleId("");
    setEvaluaciones([]);
    setSeguimientos([]);
  };

  const handleSelectModule = async (moduleId: string) => {
    if (!selectedCedula) return;
    setSelectedModuleId(moduleId);
    setLoadingDetail(true);

    const [{ data: evals }, { data: segs }] = await Promise.all([
      supabase.from("rubrica_evaluaciones").select("*").eq("directivo_cedula", selectedCedula),
      supabase.from("rubrica_seguimientos").select("*").eq("directivo_cedula", selectedCedula).order("created_at", { ascending: true }),
    ]);

    if (evals) setEvaluaciones(evals as Evaluacion[]);
    if (segs) setSeguimientos(segs as Seguimiento[]);
    setLoadingDetail(false);
  };

  const getReportData = async (moduleId: string): Promise<RubricaModuleReportData | null> => {
    const mod = modules.find(m => m.id === moduleId);
    const directivo = asignaciones.find(a => a.directivo_cedula === selectedCedula);
    if (!mod || !directivo) return null;

    const modItems = items.filter(i => i.module_id === moduleId);
    const reportItems = modItems.map(item => {
      const ev = evaluaciones.find(e => e.item_id === item.id);
      return {
        itemType: item.item_type,
        itemLabel: item.item_label,
        descAvanzado: item.desc_avanzado || "",
        descIntermedio: item.desc_intermedio || "",
        descBasico: item.desc_basico || "",
        descSinEvidencia: item.desc_sin_evidencia || "",
        directivoNivel: ev?.directivo_nivel || null,
        directivoComentario: ev?.directivo_comentario || null,
        equipoNivel: ev?.equipo_nivel || null,
        equipoComentario: ev?.equipo_comentario || null,
        acordadoNivel: ev?.acordado_nivel || null,
        acordadoComentario: ev?.acordado_comentario || null,
      };
    });

    const modSeguimientos = seguimientos
      .filter(s => modItems.some(i => i.id === s.item_id))
      .map(s => {
        const item = modItems.find(i => i.id === s.item_id);
        return {
          itemLabel: item?.item_label || "",
          nivel: s.nivel,
          comentario: s.comentario,
          fecha: s.created_at,
        };
      });

    // Fetch genero from fichas_rlt
    const { data: fichaRows } = await supabase
      .from("fichas_rlt")
      .select("genero")
      .eq("numero_cedula", directivo.directivo_cedula)
      .limit(1);

    return {
      directivoNombre: directivo.directivo_nombre,
      directivoCedula: directivo.directivo_cedula,
      institucion: directivo.institucion,
      genero: fichaRows?.[0]?.genero ?? null,
      evaluadorNombre: directivo.evaluador_nombre || undefined,
      moduleNumber: mod.module_number,
      moduleTitle: mod.title,
      moduleObjective: mod.objective,
      items: reportItems,
      seguimientos: modSeguimientos.length > 0 ? modSeguimientos : undefined,
    };
  };

  const handleDownloadPdf = async () => {
    if (!selectedModuleId) return;
    const reportData = await getReportData(selectedModuleId);
    if (!reportData) return;

    setGeneratingPdf(true);
    try {
      await generarPDFRubricaModulo(reportData, {
        logoRLT: images.logo_rlt_white,
        logoCosmo: images.logo_cosmo,
      });
      toast({ title: "PDF descargado" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const searchLower = search.toLowerCase();
  const filteredAsignaciones = search
    ? asignaciones.filter(a =>
        a.directivo_nombre.toLowerCase().includes(searchLower) ||
        a.directivo_cedula.includes(search) ||
        a.institucion.toLowerCase().includes(searchLower)
      )
    : asignaciones;

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const selectedDirectivo = asignaciones.find(a => a.directivo_cedula === selectedCedula);

  // Get completed module numbers for selected directivo
  const completedModules = selectedCedula ? (submissionDates[selectedCedula] || new Set()) : new Set<number>();

  const NivelBadge = ({ nivel }: { nivel: string | null }) => {
    if (!nivel) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <Badge className={`text-xs ${NIVEL_COLORS[nivel] || ""}`}>
        {NIVEL_LABELS[nivel] || nivel}
      </Badge>
    );
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Seleccione un directivo y un módulo para consultar el informe detallado de rúbrica.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Directivo list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Directivos</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredAsignaciones.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay directivos con asignaciones.</p>
            ) : (
              filteredAsignaciones.map(a => (
                <button
                  key={a.directivo_cedula}
                  onClick={() => handleSelectDirectivo(a.directivo_cedula)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                    selectedCedula === a.directivo_cedula ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{a.directivo_nombre}</div>
                  <div className="text-muted-foreground">CC: {a.directivo_cedula} — {a.institucion}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Module selection + report */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Informe por módulo
              </CardTitle>
              {selectedModuleId && evaluaciones.length > 0 && (
                <Button size="sm" onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-1.5">
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  Descargar PDF
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedCedula ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Seleccione un directivo.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Select value={selectedModuleId} onValueChange={handleSelectModule}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Seleccione un módulo…" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            Módulo {m.module_number}: {m.title}
                            {completedModules.has(m.module_number) && (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-800 ml-1">Completado</Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loadingDetail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedModule ? (
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Objetivo:</span> {selectedModule.objective}
                      </p>
                    </div>

                    {/* Items detail */}
                    {items.filter(i => i.module_id === selectedModuleId).map(item => {
                      const ev = evaluaciones.find(e => e.item_id === item.id);
                      const itemSegs = seguimientos.filter(s => s.item_id === item.id);

                      return (
                        <div key={item.id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                            <span className="text-xs font-medium">{item.item_label}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Autoevaluación */}
                            <div className="space-y-1 bg-amber-50/50 rounded p-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Autoevaluación</p>
                              <NivelBadge nivel={ev?.directivo_nivel || null} />
                              <p className="text-xs text-muted-foreground">{ev?.directivo_comentario || "Sin comentario"}</p>
                            </div>

                            {/* Equipo */}
                            <div className="space-y-1 bg-blue-50/50 rounded p-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Evaluación equipo</p>
                              <NivelBadge nivel={ev?.equipo_nivel || null} />
                              <p className="text-xs text-muted-foreground">{ev?.equipo_comentario || "Sin comentario"}</p>
                            </div>

                            {/* Acordado */}
                            <div className="space-y-1 bg-emerald-50/50 rounded p-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nivel acordado</p>
                              <NivelBadge nivel={ev?.acordado_nivel || null} />
                              <p className="text-xs text-muted-foreground">{ev?.acordado_comentario || "Sin comentario"}</p>
                            </div>
                          </div>

                          {/* Seguimientos */}
                          {itemSegs.length > 0 && (
                            <div className="border-t pt-2 mt-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Seguimientos</p>
                              {itemSegs.map((seg, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs py-1">
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {new Date(seg.created_at).toLocaleDateString("es-CO")}
                                  </Badge>
                                  <NivelBadge nivel={seg.nivel} />
                                  <span className="text-muted-foreground">{seg.comentario}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">Seleccione un módulo.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
