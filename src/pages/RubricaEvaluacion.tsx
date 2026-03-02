import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAppImages } from "@/hooks/useAppImages";
import { Search, CheckCircle, BookOpen, Target, FileText, Users, Lock, ArrowLeft, ArrowUp, History, Clock, FileDown, Loader2, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { generarPDFRubricaModulo, type RubricaModuleReportData } from "@/utils/rubricaModulePdfGenerator";
import PostSubmitReviewModal from "@/components/PostSubmitReviewModal";
import { genderizeRole } from "@/utils/genderizeRole";

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
  desc_avanzado: string;
  desc_intermedio: string;
  desc_basico: string;
  desc_sin_evidencia: string;
  sort_order: number;
}

interface Evaluacion {
  item_id: string;
  directivo_nivel: string | null;
  directivo_comentario: string | null;
  equipo_nivel: string | null;
  equipo_comentario: string | null;
  acordado_nivel: string | null;
  acordado_comentario: string | null;
}

interface Seguimiento {
  id: string;
  item_id: string;
  directivo_cedula: string;
  module_number: number;
  nivel: string | null;
  comentario: string | null;
  created_at: string;
}

interface Asignacion {
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
}

const NIVELES = [
  { value: "avanzado", label: "Avanzado", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "intermedio", label: "Intermedio", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "basico", label: "Básico", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "sin_evidencia", label: "Sin evidencia", color: "bg-red-100 text-red-800 border-red-300" },
];

// Nivel ranking: higher index = higher level
const NIVEL_RANK: Record<string, number> = {
  sin_evidencia: 0,
  basico: 1,
  intermedio: 2,
  avanzado: 3,
};

type DetectedRole = "directivo" | "evaluador" | null;

export default function RubricaEvaluacion() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_noletters;
  const logoCLT = images.logo_clt_noletters;

  const hasStoredCedula = !!sessionStorage.getItem("user_cedula");
  const [cedula, setCedula] = useState(sessionStorage.getItem("user_cedula") || "");
  const [searching, setSearching] = useState(hasStoredCedula);
  const [detectedRole, setDetectedRole] = useState<DetectedRole>(null);
  const [userName, setUserName] = useState("");
  const autoSearchDone = useRef(false);

  // Directivo state
  const [directivoInfo, setDirectivoInfo] = useState<{ nombre: string; cedula: string; institucion: string; genero?: string | null } | null>(null);
  const [directivoReadOnly, setDirectivoReadOnly] = useState(false);
  const [assignedEvaluadorNombre, setAssignedEvaluadorNombre] = useState<string | null>(null);

  // Evaluador state
  const [evaluadorId, setEvaluadorId] = useState<string>("");
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [selectedDirectivo, setSelectedDirectivo] = useState<Asignacion | null>(null);

  // Shared form state
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Evaluacion>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeModule, setActiveModule] = useState<string>("");
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Submission dates tracking: key = "module_number:submission_type" → submitted_at
  const [submissionDates, setSubmissionDates] = useState<Record<string, string>>({});

  // Seguimiento state
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  // Pending seguimiento edits: key = item_id → { nivel, comentario }
  const [pendingSeguimientos, setPendingSeguimientos] = useState<Record<string, { nivel: string; comentario: string }>>({});
  const [savingSeguimiento, setSavingSeguimiento] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showInlineReport, setShowInlineReport] = useState<string | null>(null); // module id

  // The active role for saving (directivo or equipo)
  const role: "directivo" | "equipo" = detectedRole === "directivo" ? "directivo" : "equipo";

  // Load modules & items
  useEffect(() => {
    (async () => {
      const { data: mods } = await supabase.from("rubrica_modules").select("*").order("sort_order", { ascending: true });
      const { data: its } = await supabase.from("rubrica_items").select("*").order("sort_order", { ascending: true });
      if (mods) setModules(mods);
      if (its) setItems(its);
      if (mods?.length) setActiveModule(mods[0].id);
    })();
  }, []);

  const loadSubmissionDates = async (directivoCedula: string) => {
    const { data } = await supabase
      .from("rubrica_submission_dates")
      .select("*")
      .eq("directivo_cedula", directivoCedula);
    const map: Record<string, string> = {};
    if (data) {
      for (const d of data) {
        map[`${d.module_number}:${d.submission_type}`] = d.submitted_at;
      }
    }
    setSubmissionDates(map);
    return map;
  };

  const hasSubmission = (moduleNumber: number, type: string) => {
    return !!submissionDates[`${moduleNumber}:${type}`];
  };

  const loadEvaluaciones = async (directivoCedula: string) => {
    const { data: evals } = await supabase
      .from("rubrica_evaluaciones")
      .select("*")
      .eq("directivo_cedula", directivoCedula);
    if (evals) {
      const map: Record<string, Evaluacion> = {};
      for (const e of evals) {
        map[e.item_id] = e;
      }
      setEvaluaciones(map);
      return map;
    }
    return {};
  };

  const loadSeguimientos = async (directivoCedula: string) => {
    const { data } = await supabase
      .from("rubrica_seguimientos")
      .select("*")
      .eq("directivo_cedula", directivoCedula)
      .order("created_at", { ascending: true });
    if (data) {
      setSeguimientos(data as Seguimiento[]);
    }
  };

  // Get the evaluator's current working module number (highest module where they are actively working)
  const getEvaluadorCurrentWorkingModuleNumber = (): number => {
    if (role !== "equipo" || modules.length === 0) return 1;
    // Find the highest module where evaluator has access (autoev done) and hasn't fully completed
    let currentWorking = 1;
    for (const m of modules) {
      const autoevDone = hasSubmission(m.module_number, "autoevaluacion");
      if (!autoevDone) break;
      currentWorking = m.module_number;
    }
    return currentWorking;
  };

  // Get the current "effective" nivel for an item considering seguimientos
  const getEffectiveNivel = (itemId: string): string | null => {
    // Start from the acordado_nivel in evaluaciones
    const ev = evaluaciones[itemId];
    let currentNivel = ev?.acordado_nivel || ev?.equipo_nivel || null;
    
    // Apply seguimientos in chronological order
    const itemSeguimientos = seguimientos
      .filter(s => s.item_id === itemId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    for (const seg of itemSeguimientos) {
      if (seg.nivel) {
        currentNivel = seg.nivel;
      }
    }
    return currentNivel;
  };

  // Get the minimum allowed nivel for an item (the acordado_nivel — can never go below this)
  const getMinNivel = (itemId: string): string | null => {
    const ev = evaluaciones[itemId];
    return ev?.acordado_nivel || null;
  };

  // Check if a nivel selection is allowed (must be >= acordado_nivel)
  const isNivelAllowed = (itemId: string, candidateNivel: string): boolean => {
    const minNivel = getMinNivel(itemId);
    if (!minNivel) return true; // No acordado yet, any level allowed
    return NIVEL_RANK[candidateNivel] >= NIVEL_RANK[minNivel];
  };

  const handleSearch = async (overrideCedula?: string) => {
    const searchCedula = (overrideCedula || cedula).trim();
    if (!searchCedula) return;
    setSearching(true);
    setCedula(searchCedula);
    setSearching(true);
    try {
      // 1. Use RPC to check role and get ficha data (bypasses RLS)
      const [{ data: roleData }, { data: fichaRaw }, { data: evaluadores }] = await Promise.all([
        supabase.rpc("check_cedula_role", { p_cedula: searchCedula }),
        supabase.rpc("get_ficha_by_cedula", { p_cedula: searchCedula }),
        supabase.from("rubrica_evaluadores").select("id, nombre, cedula").eq("cedula", searchCedula),
      ]);

      const roleInfo = roleData as { exists_ficha: boolean; is_directivo: boolean; is_evaluador: boolean; cargo_actual: string | null; nombre: string | null; genero: string | null } | null;
      const fichaData = fichaRaw as Record<string, any> | null;
      const isDirectivo = roleInfo?.is_directivo && fichaData;
      const isEvaluador = evaluadores && evaluadores.length > 0;

      if (isDirectivo && !isEvaluador) {
        // Pure directivo — use fichaData from RPC
        setDetectedRole("directivo");
        setUserName(fichaData.nombres_apellidos);
        setDirectivoInfo({ nombre: fichaData.nombres_apellidos, cedula: fichaData.numero_cedula, institucion: fichaData.nombre_ie, genero: fichaData.genero });

        const evMap = await loadEvaluaciones(fichaData.numero_cedula);
        await loadSubmissionDates(fichaData.numero_cedula);
        await loadSeguimientos(fichaData.numero_cedula);

        // Load assigned evaluator name for this directivo
        const { data: asigData } = await supabase
          .from("rubrica_asignaciones")
          .select("evaluador_id")
          .eq("directivo_cedula", fichaData.numero_cedula)
          .limit(1);
        if (asigData && asigData.length > 0) {
          const { data: evalData } = await supabase
            .from("rubrica_evaluadores")
            .select("nombre")
            .eq("id", asigData[0].evaluador_id)
            .single();
          if (evalData) setAssignedEvaluadorNombre(evalData.nombre);
        }
        // Check if directivo already submitted (has at least one directivo_nivel)
        const hasSubmitted = Object.values(evMap).some(e => e.directivo_nivel);
        setDirectivoReadOnly(hasSubmitted);

      } else if (isEvaluador) {
        // Evaluador — load assigned directivos
        const ev = evaluadores[0];
        setDetectedRole("evaluador");
        setUserName(ev.nombre);
        setEvaluadorId(ev.id);

        const { data: assigns } = await supabase
          .from("rubrica_asignaciones")
          .select("directivo_cedula, directivo_nombre, institucion")
          .eq("evaluador_id", ev.id);

        if (assigns && assigns.length > 0) {
          setAsignaciones(assigns);
        } else {
          toast({ title: "Sin asignaciones", description: "No tiene directivos asignados para evaluar.", variant: "destructive" });
        }

      } else {
        toast({ title: "No encontrado", description: "No se encontró un directivo ni evaluador con esa cédula.", variant: "destructive" });
      }
    } finally {
      setSearching(false);
    }
  };

  // Auto-search when arriving with cedula stored in sessionStorage
  useEffect(() => {
    if (autoSearchDone.current) return;
    const storedCedula = sessionStorage.getItem("user_cedula");
    if (storedCedula && !detectedRole) {
      autoSearchDone.current = true;
      handleSearch(storedCedula);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectDirectivo = async (asig: Asignacion) => {
    setSelectedDirectivo(asig);
    // Fetch genero for this directivo via RPC (bypasses RLS)
    const { data: fichaRaw } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: asig.directivo_cedula });
    const fichaRow = fichaRaw as Record<string, any> | null;
    setDirectivoInfo({ nombre: asig.directivo_nombre, cedula: asig.directivo_cedula, institucion: asig.institucion, genero: fichaRow?.genero ?? null });
    await loadEvaluaciones(asig.directivo_cedula);
    await loadSubmissionDates(asig.directivo_cedula);
    await loadSeguimientos(asig.directivo_cedula);
  };

  const handleBack = () => {
    if (selectedDirectivo && detectedRole === "evaluador") {
      setSelectedDirectivo(null);
      setDirectivoInfo(null);
      setEvaluaciones({});
      setSubmissionDates({});
      setSeguimientos([]);
      setPendingSeguimientos({});
    } else {
      setCedula("");
      setDetectedRole(null);
      setUserName("");
      setDirectivoInfo(null);
      setDirectivoReadOnly(false);
      setAssignedEvaluadorNombre(null);
      setEvaluadorId("");
      setAsignaciones([]);
      setSelectedDirectivo(null);
      setEvaluaciones({});
      setSubmissionDates({});
      setSeguimientos([]);
      setPendingSeguimientos({});
    }
  };

  const updateEval = (itemId: string, field: keyof Evaluacion, value: string) => {
    setEvaluaciones(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_id: itemId,
        directivo_nivel: prev[itemId]?.directivo_nivel ?? null,
        directivo_comentario: prev[itemId]?.directivo_comentario ?? null,
        equipo_nivel: prev[itemId]?.equipo_nivel ?? null,
        equipo_comentario: prev[itemId]?.equipo_comentario ?? null,
        acordado_nivel: prev[itemId]?.acordado_nivel ?? null,
        acordado_comentario: prev[itemId]?.acordado_comentario ?? null,
        [field]: value,
      },
    }));
  };

  // Determine current step for evaluador on the active module
  const getEvaluadorStep = (moduleNumber: number): "evaluacion" | "nivel_acordado" | "completed" => {
    const evalSubmitted = hasSubmission(moduleNumber, "evaluacion");
    const acordadoSubmitted = hasSubmission(moduleNumber, "nivel_acordado");
    if (acordadoSubmitted) return "completed";
    if (evalSubmitted) return "nivel_acordado";
    return "evaluacion";
  };

  const handleSave = async () => {
    if (!directivoInfo) return;
    setSaving(true);
    try {
      const currentModule = modules.find(m => m.id === activeModule);
      if (!currentModule) return;

      const moduleItems = items.filter(i => i.module_id === activeModule);
      const evaluadorStep = role === "equipo" ? getEvaluadorStep(currentModule.module_number) : null;

      // Validate: all items must have nivel and comment
      const missing: string[] = [];
      for (const item of moduleItems) {
        const ev = evaluaciones[item.id];
        if (role === "directivo") {
          if (!ev?.directivo_nivel) missing.push(`${item.item_label}: nivel`);
          if (!ev?.directivo_comentario?.trim()) missing.push(`${item.item_label}: comentario`);
        } else if (evaluadorStep === "evaluacion") {
          if (!ev?.equipo_nivel) missing.push(`${item.item_label}: nivel`);
          if (!ev?.equipo_comentario?.trim()) missing.push(`${item.item_label}: comentario`);
        } else if (evaluadorStep === "nivel_acordado") {
          if (!ev?.acordado_nivel) missing.push(`${item.item_label}: nivel acordado`);
          if (!ev?.acordado_comentario?.trim()) missing.push(`${item.item_label}: comentario acordado`);
        }
      }
      if (missing.length > 0) {
        toast({
          title: "Campos incompletos",
          description: `Faltan campos obligatorios:\n${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` y ${missing.length - 5} más` : ""}`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      for (const item of moduleItems) {
        const ev = evaluaciones[item.id];
        if (!ev) continue;

        const payload: any = {
          item_id: ev.item_id,
          directivo_cedula: directivoInfo.cedula,
        };

        // Only include the fields relevant to the current step
        if (role === "directivo") {
          payload.directivo_nivel = ev.directivo_nivel;
          payload.directivo_comentario = ev.directivo_comentario;
        } else if (evaluadorStep === "evaluacion") {
          payload.equipo_nivel = ev.equipo_nivel;
          payload.equipo_comentario = ev.equipo_comentario;
        } else if (evaluadorStep === "nivel_acordado") {
          payload.acordado_nivel = ev.acordado_nivel;
          payload.acordado_comentario = ev.acordado_comentario;
        }

        const { data: existing } = await supabase
          .from("rubrica_evaluaciones")
          .select("id")
          .eq("item_id", ev.item_id)
          .eq("directivo_cedula", directivoInfo.cedula)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("rubrica_evaluaciones").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("rubrica_evaluaciones").insert(payload);
        }
      }

      // Record submission date
      let submissionType: string;
      if (role === "directivo") {
        submissionType = "autoevaluacion";
      } else {
        submissionType = evaluadorStep === "nivel_acordado" ? "nivel_acordado" : "evaluacion";
      }

      await supabase
        .from("rubrica_submission_dates")
        .upsert({
          directivo_cedula: directivoInfo.cedula,
          module_number: currentModule.module_number,
          submission_type: submissionType,
          submitted_at: new Date().toISOString(),
        }, { onConflict: "directivo_cedula,module_number,submission_type" });

      // Update local submission dates
      setSubmissionDates(prev => ({
        ...prev,
        [`${currentModule.module_number}:${submissionType}`]: new Date().toISOString(),
      }));

      toast({ title: "Guardado exitoso", description: "Las evaluaciones han sido guardadas." });
      setSubmitted(true);
      setShowReviewModal(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Save a single seguimiento for one item
  const handleSaveSeguimiento = async (itemId: string) => {
    if (!directivoInfo) return;
    const pending = pendingSeguimientos[itemId];
    if (!pending) return;

    if (!pending.nivel) {
      toast({ title: "Nivel requerido", description: "Debe seleccionar un nivel.", variant: "destructive" });
      return;
    }
    if (!pending.comentario?.trim()) {
      toast({ title: "Comentario requerido", description: "Debe ingresar un comentario para justificar el cambio.", variant: "destructive" });
      return;
    }

    // Validate: can't lower below acordado
    if (!isNivelAllowed(itemId, pending.nivel)) {
      toast({ title: "Nivel no permitido", description: "No puede establecer un nivel inferior al nivel acordado.", variant: "destructive" });
      return;
    }

    // Validate: must be higher than current effective nivel
    const effectiveNivel = getEffectiveNivel(itemId);
    if (effectiveNivel && NIVEL_RANK[pending.nivel] <= NIVEL_RANK[effectiveNivel]) {
      toast({ title: "Nivel no permitido", description: "Solo puede subir el nivel, no mantenerlo igual o bajarlo.", variant: "destructive" });
      return;
    }

    setSavingSeguimiento(true);
    try {
      const currentWorkingModule = getEvaluadorCurrentWorkingModuleNumber();

      const { error } = await supabase.from("rubrica_seguimientos").insert({
        item_id: itemId,
        directivo_cedula: directivoInfo.cedula,
        module_number: currentWorkingModule,
        nivel: pending.nivel,
        comentario: pending.comentario,
      });

      if (error) throw error;

      // Reload seguimientos
      await loadSeguimientos(directivoInfo.cedula);

      // Clear pending
      setPendingSeguimientos(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      toast({ title: "Seguimiento guardado", description: `Nivel actualizado. Cambio registrado en el Módulo ${currentWorkingModule}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSeguimiento(false);
    }
  };

  const handleDownloadModulePdf = async (moduleId: string) => {
    if (!directivoInfo) return;
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;

    setGeneratingPdf(true);
    try {
      const modItems = items.filter(i => i.module_id === moduleId);
      const reportItems = modItems.map(item => {
        const ev = evaluaciones[item.id];
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

      const modSegs = seguimientos
        .filter(s => modItems.some(i => i.id === s.item_id))
        .map(s => ({
          itemLabel: modItems.find(i => i.id === s.item_id)?.item_label || "",
          nivel: s.nivel,
          comentario: s.comentario,
          fecha: s.created_at,
        }));

      const reportData: RubricaModuleReportData = {
        directivoNombre: directivoInfo.nombre,
        directivoCedula: directivoInfo.cedula,
        institucion: directivoInfo.institucion,
        genero: directivoInfo.genero,
        evaluadorNombre: assignedEvaluadorNombre || (detectedRole === "evaluador" ? userName : undefined) || undefined,
        moduleNumber: mod.module_number,
        moduleTitle: mod.title,
        moduleObjective: mod.objective,
        items: reportItems,
        seguimientos: modSegs.length > 0 ? modSegs : undefined,
      };

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

  const getDescForNivel = (item: RubricaItem, nivel: string) => {
    switch (nivel) {
      case "avanzado": return item.desc_avanzado;
      case "intermedio": return item.desc_intermedio;
      case "basico": return item.desc_basico;
      case "sin_evidencia": return item.desc_sin_evidencia;
      default: return "";
    }
  };

  const nivelField = role === "directivo" ? "directivo_nivel" : "equipo_nivel";
  const comentarioField = role === "directivo" ? "directivo_comentario" : "equipo_comentario";
  // Per-module read-only for directivo (only modules with submitted autoevaluación are locked)
  const isDirectivoModuleReadOnly = (moduleNumber: number) =>
    detectedRole === "directivo" && hasSubmission(moduleNumber, "autoevaluacion");

  // Show form when we have a directivoInfo selected (either as directivo or evaluador who picked one)
  const showForm = directivoInfo !== null && (detectedRole === "directivo" || selectedDirectivo !== null);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold">¡Evaluación guardada!</h2>
            <p className="text-muted-foreground text-sm">Las respuestas han sido registradas correctamente.</p>
            <Button onClick={() => {
              setSubmitted(false);
              if (detectedRole === "evaluador") {
                setSelectedDirectivo(null);
                setDirectivoInfo(null);
                setEvaluaciones({});
                setSubmissionDates({});
                setSeguimientos([]);
                setPendingSeguimientos({});
              } else {
                setCedula("");
                setDetectedRole(null);
                setUserName("");
                setDirectivoInfo(null);
                setDirectivoReadOnly(false);
                setEvaluaciones({});
                setSubmissionDates({});
                setSeguimientos([]);
                setPendingSeguimientos({});
              }
            }}>
              {detectedRole === "evaluador" ? `Evaluar ${genderizeRole("otro directivo", directivoInfo?.genero).toLowerCase()}` : "Nueva evaluación"}
            </Button>
          </CardContent>
        </Card>
        <PostSubmitReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          nombre={directivoInfo?.nombre || userName || ""}
          tipoFormulario="rubrica_evaluacion"
        />
      </div>
    );
  }

  // Render seguimiento section for a completed module item (evaluator only)
  const renderSeguimientoSection = (item: RubricaItem, moduleNumber: number) => {
    const currentWorkingModule = getEvaluadorCurrentWorkingModuleNumber();
    // Only show seguimiento if evaluator is on a module higher than this one
    if (currentWorkingModule <= moduleNumber) return null;
    // Only for completed modules (nivel acordado submitted)
    if (!hasSubmission(moduleNumber, "nivel_acordado")) return null;

    const effectiveNivel = getEffectiveNivel(item.id);
    const minNivel = getMinNivel(item.id);
    const itemSeguimientos = seguimientos
      .filter(s => s.item_id === item.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const pending = pendingSeguimientos[item.id];
    const isEditing = !!pending;
    
    // Can't upgrade further if already at avanzado
    const isAtMax = effectiveNivel === "avanzado";

    return (
      <div className="border-t-2 border-dashed border-primary/30 pt-4 mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-primary">Seguimiento</p>
          <Badge variant="outline" className="text-xs">
            Nivel actual: {NIVELES.find(n => n.value === effectiveNivel)?.label || "—"}
          </Badge>
        </div>

        {/* History of past seguimientos */}
        {itemSeguimientos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <History className="w-3.5 h-3.5" />
              <span className="font-medium">Historial de cambios:</span>
            </div>
            {itemSeguimientos.map((seg) => (
              <div key={seg.id} className="bg-muted/30 rounded-lg p-2.5 text-xs space-y-1 border-l-2 border-primary/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {NIVELES.find(n => n.value === seg.nivel)?.label}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Módulo {seg.module_number} — {new Date(seg.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                {seg.comentario && <p className="italic text-muted-foreground">{seg.comentario}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Upgrade form */}
        {!isAtMax && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setPendingSeguimientos(prev => ({
              ...prev,
              [item.id]: { nivel: "", comentario: "" },
            }))}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Subir nivel
          </Button>
        )}

        {isAtMax && !isEditing && (
          <p className="text-xs text-muted-foreground italic">Nivel máximo alcanzado (Avanzado).</p>
        )}

        {isEditing && (
          <div className="space-y-3 bg-primary/5 rounded-lg p-3 border border-primary/20">
            <p className="text-xs font-medium text-primary">
              Cambio desde Módulo {currentWorkingModule}
            </p>
            <RadioGroup
              value={pending.nivel}
              onValueChange={(v) => setPendingSeguimientos(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], nivel: v },
              }))}
              className="flex flex-wrap gap-2"
            >
              {NIVELES.map(n => {
                const allowed = isNivelAllowed(item.id, n.value);
                const isHigher = effectiveNivel ? NIVEL_RANK[n.value] > NIVEL_RANK[effectiveNivel] : true;
                const disabled = !allowed || !isHigher;
                return (
                  <label
                    key={n.value}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
                      pending.nivel === n.value
                        ? n.color
                        : disabled
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    <RadioGroupItem value={n.value} className="w-3 h-3" disabled={disabled} />
                    {n.label}
                  </label>
                );
              })}
            </RadioGroup>
            <div>
              <Label className="text-xs text-muted-foreground">
                Justificación del cambio <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={pending.comentario}
                onChange={e => setPendingSeguimientos(prev => ({
                  ...prev,
                  [item.id]: { ...prev[item.id], comentario: e.target.value },
                }))}
                placeholder="Explique la raison du changement de niveau…"
                className="text-sm mt-1"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSaveSeguimiento(item.id)}
                disabled={savingSeguimiento}
                className="gap-1 text-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {savingSeguimiento ? "Guardando…" : "Guardar seguimiento"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPendingSeguimientos(prev => {
                  const next = { ...prev };
                  delete next[item.id];
                  return next;
                })}
                className="text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoRLT} alt="RLT" className="h-10" />
          <img src={logoCLT} alt="CLT" className="h-10" />
          <div>
            <h1 className="font-semibold text-lg">Rúbrica de Evaluación por Módulo</h1>
            <p className="text-sm text-primary-foreground/70">Programa de Liderazgo Directivo</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Cédula input */}
        {!detectedRole && searching && hasStoredCedula && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {!detectedRole && !(searching && hasStoredCedula) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-5 h-5" /> Identificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Ingrese su número de cédula</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="Número de cédula"
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={() => handleSearch()} disabled={searching}>
                    {searching ? "Buscando…" : "Ingresar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  El sistema detectará automáticamente si usted es directivo o evaluador.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2a: Evaluador — select directivo */}
        {detectedRole === "evaluador" && !selectedDirectivo && (
          <>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">{userName}</p>
                      <p className="text-sm text-muted-foreground">{genderizeRole("Evaluador", directivoInfo?.genero)} — Equipo local</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
                    <ArrowLeft className="w-4 h-4" /> Cambiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{`Seleccione ${genderizeRole("el directivo", null).toLowerCase()} a evaluar`}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {asignaciones.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tiene directivos asignados.</p>
                )}
                {asignaciones.map(a => (
                  <button
                    key={a.directivo_cedula}
                    onClick={() => handleSelectDirectivo(a)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{a.directivo_nombre}</p>
                      <p className="text-xs text-muted-foreground">CC: {a.directivo_cedula} — {a.institucion}</p>
                    </div>
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 2b/3: Form view */}
        {showForm && (
          <>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${detectedRole === "directivo" ? "bg-primary/10" : "bg-blue-100"}`}>
                      {detectedRole === "directivo" ? <FileText className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{directivoInfo!.nombre}</p>
                      <p className="text-sm text-muted-foreground">CC: {directivoInfo!.cedula} — {directivoInfo!.institucion}</p>
                      {detectedRole === "directivo" && assignedEvaluadorNombre && (
                        <p className="text-xs text-muted-foreground">{genderizeRole("Evaluador", directivoInfo?.genero)} asignado: <span className="font-medium text-foreground">{assignedEvaluadorNombre}</span></p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detectedRole === "directivo" && (() => {
                      const activeMod = modules.find(mod => mod.id === activeModule);
                      return activeMod && isDirectivoModuleReadOnly(activeMod.module_number) ? (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="w-3 h-3" /> Solo lectura
                        </Badge>
                      ) : null;
                    })()}
                    <Badge variant={detectedRole === "directivo" ? "default" : "outline"}>
                      {detectedRole === "directivo" ? "Autoevaluación" : `${genderizeRole("Evaluador", directivoInfo?.genero)}: ${userName}`}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
                      <ArrowLeft className="w-4 h-4" /> Volver
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Module Tabs */}
            <Tabs value={activeModule} onValueChange={setActiveModule}>
              <TooltipProvider delayDuration={200}>
              <TabsList className="flex-wrap h-auto gap-1">
                {modules.map((m, idx) => {
                  // Sequential lock: previous module must be completed before accessing the next
                  const prevModuleNumber = idx > 0 ? modules[idx - 1].module_number : null;
                  const prevModuleDone = prevModuleNumber === null || hasSubmission(prevModuleNumber, "nivel_acordado");
                  const evalBlocked = role === "equipo" && !hasSubmission(m.module_number, "autoevaluacion");
                  const blocked = !prevModuleDone || evalBlocked;

                  // Build lock reason message
                  let lockReason = "";
                  if (blocked) {
                    if (!prevModuleDone && prevModuleNumber !== null) {
                      if (role === "directivo") {
                        lockReason = `El evaluador debe completar el nivel acordado del Módulo ${prevModuleNumber} antes de poder acceder a este módulo.`;
                      } else {
                        lockReason = `Se debe completar el nivel acordado del Módulo ${prevModuleNumber} antes de avanzar.`;
                      }
                    } else if (evalBlocked) {
                      lockReason = `${genderizeRole("El directivo", directivoInfo?.genero)} aún no ha completado la autoevaluación de este módulo.`;
                    }
                  }

                  const trigger = (
                    <TabsTrigger
                      key={m.id}
                      value={m.id}
                      disabled={blocked}
                      className={`gap-1 text-xs sm:text-sm ${blocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {blocked ? <Lock className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                      Módulo {m.module_number}
                    </TabsTrigger>
                  );

                  if (blocked && lockReason) {
                    return (
                      <Tooltip key={m.id}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">{trigger}</span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[250px] text-center text-xs">
                          <p>{lockReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return trigger;
                })}
              </TabsList>
              </TooltipProvider>

              {modules.map(m => {
                const moduleItems = items.filter(i => i.module_id === m.id);
                const autoevDone = hasSubmission(m.module_number, "autoevaluacion");
                const evaluadorBlocked = role === "equipo" && !autoevDone;
                const evaluadorStep = role === "equipo" ? getEvaluadorStep(m.module_number) : null;
                const isEvalReadOnly = role === "equipo" && (evaluadorStep === "nivel_acordado" || evaluadorStep === "completed");
                const isAcordadoReadOnly = role === "equipo" && evaluadorStep === "completed";
                const isModuleReadOnly = isDirectivoModuleReadOnly(m.module_number);
                const isModuleFullyReadOnly = isModuleReadOnly || (role === "equipo" && evaluadorStep === "completed");

                return (
                  <TabsContent key={m.id} value={m.id} className="space-y-4 mt-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4 pb-4">
                        <h3 className="font-semibold text-base">{m.title}</h3>
                        <div className="flex items-start gap-2 mt-2">
                          <Target className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <p className="text-sm text-muted-foreground"><strong>Objetivo:</strong> {m.objective}</p>
                        </div>
                        {/* Show submission status badges */}
                        {role === "equipo" && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {hasSubmission(m.module_number, "autoevaluacion") && (
                              <Badge variant="secondary" className="text-xs gap-1"><CheckCircle className="w-3 h-3" /> Autoevaluación</Badge>
                            )}
                            {hasSubmission(m.module_number, "evaluacion") && (
                              <Badge variant="secondary" className="text-xs gap-1"><CheckCircle className="w-3 h-3" /> Evaluación</Badge>
                            )}
                            {hasSubmission(m.module_number, "nivel_acordado") && (
                              <Badge variant="secondary" className="text-xs gap-1"><CheckCircle className="w-3 h-3" /> Nivel acordado</Badge>
                            )}
                          </div>
                        )}
                        {/* PDF download button when module is completed */}
                        {hasSubmission(m.module_number, "nivel_acordado") && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant={showInlineReport === m.id ? "default" : "outline"}
                              onClick={() => setShowInlineReport(showInlineReport === m.id ? null : m.id)}
                              className="gap-1.5 text-xs"
                            >
                              {showInlineReport === m.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {showInlineReport === m.id ? "Ocultar informe" : "Ver informe"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadModulePdf(m.id)}
                              disabled={generatingPdf}
                              className="gap-1.5 text-xs"
                            >
                              {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                              Descargar PDF
                            </Button>
                          </div>
                        )}

                        {/* Inline report view */}
                        {showInlineReport === m.id && (
                          <div className="mt-4 space-y-4 border-t pt-4">
                            <h4 className="text-sm font-semibold">Informe detallado — Módulo {m.module_number}</h4>
                            {items.filter(i => i.module_id === m.id).map(item => {
                              const ev = evaluaciones[item.id];
                              const itemSegs = seguimientos.filter(s => s.item_id === item.id);
                              return (
                                <div key={item.id} className="border rounded-lg p-3 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">{item.item_type}</Badge>
                                    <span className="text-xs font-medium">{item.item_label}</span>
                                  </div>
                                  <p className="text-[11px] italic text-muted-foreground">{item.desc_avanzado}</p>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Autoevaluación */}
                                    <div className="space-y-1 bg-amber-50/50 dark:bg-amber-950/20 rounded p-2">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Autoevaluación</p>
                                      {ev?.directivo_nivel ? (
                                        <Badge className={`text-xs ${NIVELES.find(n => n.value === ev.directivo_nivel)?.color || ""}`}>
                                          {NIVELES.find(n => n.value === ev.directivo_nivel)?.label}
                                        </Badge>
                                      ) : <span className="text-xs text-muted-foreground">—</span>}
                                      <p className="text-xs text-muted-foreground">{ev?.directivo_comentario || "Sin comentario"}</p>
                                    </div>

                                    {/* Equipo */}
                                    <div className="space-y-1 bg-blue-50/50 dark:bg-blue-950/20 rounded p-2">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Evaluación equipo</p>
                                      {ev?.equipo_nivel ? (
                                        <Badge className={`text-xs ${NIVELES.find(n => n.value === ev.equipo_nivel)?.color || ""}`}>
                                          {NIVELES.find(n => n.value === ev.equipo_nivel)?.label}
                                        </Badge>
                                      ) : <span className="text-xs text-muted-foreground">—</span>}
                                      <p className="text-xs text-muted-foreground">{ev?.equipo_comentario || "Sin comentario"}</p>
                                    </div>

                                    {/* Acordado */}
                                    <div className="space-y-1 bg-emerald-50/50 dark:bg-emerald-950/20 rounded p-2">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nivel acordado</p>
                                      {ev?.acordado_nivel ? (
                                        <Badge className={`text-xs ${NIVELES.find(n => n.value === ev.acordado_nivel)?.color || ""}`}>
                                          {NIVELES.find(n => n.value === ev.acordado_nivel)?.label}
                                        </Badge>
                                      ) : <span className="text-xs text-muted-foreground">—</span>}
                                      <p className="text-xs text-muted-foreground">{ev?.acordado_comentario || "Sin comentario"}</p>
                                    </div>
                                  </div>

                                  {/* Seguimientos */}
                                  {itemSegs.length > 0 && (
                                    <div className="border-t pt-2">
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Seguimientos</p>
                                      {itemSegs.map((seg, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs py-1">
                                          <Badge variant="outline" className="text-[10px] shrink-0">
                                            {new Date(seg.created_at).toLocaleDateString("es-CO")}
                                          </Badge>
                                          {seg.nivel && (
                                            <Badge className={`text-[10px] ${NIVELES.find(n => n.value === seg.nivel)?.color || ""}`}>
                                              {NIVELES.find(n => n.value === seg.nivel)?.label}
                                            </Badge>
                                          )}
                                          <span className="text-muted-foreground">{seg.comentario}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {evaluadorBlocked && (
                      <Card className="border-amber-300 bg-amber-50">
                        <CardContent className="pt-6 pb-6 text-center space-y-2">
                          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                          <p className="font-medium text-sm">Módulo no disponible</p>
                          <p className="text-xs text-muted-foreground">
                            El directivo aún no ha completado su autoevaluación para este módulo. 
                            Podrá evaluar una vez que la autoevaluación haya sido enviada.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {!evaluadorBlocked && moduleItems.map(item => {
                      const ev = evaluaciones[item.id];
                      const selectedNivel = (role === "directivo" ? ev?.directivo_nivel : ev?.equipo_nivel) || "";
                      const comment = (role === "directivo" ? ev?.directivo_comentario : ev?.equipo_comentario) || "";

                      return (
                        <Card key={item.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
                              <CardTitle className="text-sm">{item.item_label}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Evaluación section (directivo or equipo) */}
                            {(isModuleReadOnly || isEvalReadOnly) ? (
                              <div className="space-y-3">
                                {/* For evaluador: always show all nivel descriptions for reference */}
                                {role === "equipo" ? (
                                  <div className="space-y-2">
                                    {NIVELES.map(n => (
                                      <div
                                        key={n.value}
                                        className={`p-3 rounded-lg border-2 ${
                                          selectedNivel === n.value
                                            ? n.color + " border-current"
                                            : "border-transparent bg-muted/20 opacity-70"
                                        }`}
                                      >
                                        <span className="font-medium text-sm">{n.label}</span>
                                        {selectedNivel === n.value && <Badge variant="secondary" className="ml-2 text-xs">Seleccionado</Badge>}
                                        <p className="text-xs mt-1 opacity-80">{getDescForNivel(item, n.value)}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Directivo read-only: only show selected */
                                  selectedNivel ? (
                                    <div className={`p-3 rounded-lg border-2 ${NIVELES.find(n => n.value === selectedNivel)?.color || ""}`}>
                                      <span className="font-medium text-sm">{NIVELES.find(n => n.value === selectedNivel)?.label}</span>
                                      <p className="text-xs mt-1 opacity-80">{getDescForNivel(item, selectedNivel)}</p>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">Sin evaluar</p>
                                  )
                                )}
                                {comment && (
                                  <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground font-medium mb-1">Comentario:</p>
                                    <p className="text-sm">{comment}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="space-y-3">
                                  {NIVELES.map(n => (
                                    <button
                                      type="button"
                                      key={n.value}
                                      onClick={() => {
                                        const newValue = selectedNivel === n.value ? "" : n.value;
                                        updateEval(item.id, nivelField as keyof Evaluacion, newValue);
                                      }}
                                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedNivel === n.value
                                          ? n.color + " border-current"
                                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                                      }`}
                                    >
                                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                        selectedNivel === n.value ? "border-current" : "border-muted-foreground/40"
                                      }`}>
                                        {selectedNivel === n.value && <div className="w-2 h-2 rounded-full bg-current" />}
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{n.label}</span>
                                        <p className="text-xs mt-1 opacity-80">{getDescForNivel(item, n.value)}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                <div>
                                  <Label className="text-xs text-muted-foreground">Comentario <span className="text-destructive">*</span></Label>
                                  <Textarea
                                    value={comment}
                                    onChange={e => updateEval(item.id, comentarioField as keyof Evaluacion, e.target.value)}
                                    placeholder="Observaciones adicionales…"
                                    className="mt-1 text-sm"
                                    rows={2}
                                  />
                                </div>
                              </>
                            )}

                            {/* Show other role's evaluation if exists */}
                            {role === "equipo" && ev?.directivo_nivel && (
                              <div className="bg-muted/30 rounded-lg p-3 text-xs">
                                <p className="font-medium text-muted-foreground mb-1">Autoevaluación del directivo:</p>
                                <Badge variant="secondary" className="text-xs">{NIVELES.find(n => n.value === ev.directivo_nivel)?.label}</Badge>
                                {ev.directivo_comentario && <p className="mt-1 italic">{ev.directivo_comentario}</p>}
                              </div>
                            )}
                            {role === "directivo" && ev?.equipo_nivel && (
                              <div className="bg-muted/30 rounded-lg p-3 text-xs">
                                <p className="font-medium text-muted-foreground mb-1">Evaluación del equipo local:</p>
                                <Badge variant="secondary" className="text-xs">{NIVELES.find(n => n.value === ev.equipo_nivel)?.label}</Badge>
                                {ev.equipo_comentario && <p className="mt-1 italic">{ev.equipo_comentario}</p>}
                              </div>
                            )}

                            {/* Acordado section — only shown when evaluador has submitted evaluación and comes back */}
                            {ev?.directivo_nivel && ev?.equipo_nivel && role === "equipo" && evaluadorStep === "nivel_acordado" && (
                              <div className="border-t pt-4 space-y-3">
                                <p className="text-sm font-medium text-primary">Nivel acordado</p>
                                <div className="flex flex-wrap gap-2">
                                  {NIVELES.map(n => (
                                    <button
                                      type="button"
                                      key={n.value}
                                      onClick={() => {
                                        const newValue = ev?.acordado_nivel === n.value ? "" : n.value;
                                        updateEval(item.id, "acordado_nivel", newValue);
                                      }}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-xs transition-all ${
                                        ev?.acordado_nivel === n.value ? n.color : "hover:bg-muted/50"
                                      }`}
                                    >
                                      <div className={`w-3 h-3 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                        ev?.acordado_nivel === n.value ? "border-current" : "border-muted-foreground/40"
                                      }`}>
                                        {ev?.acordado_nivel === n.value && <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                      </div>
                                      {n.label}
                                    </button>
                                  ))}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Comentario acordado <span className="text-destructive">*</span></Label>
                                  <Textarea
                                  value={ev?.acordado_comentario || ""}
                                  onChange={e => updateEval(item.id, "acordado_comentario", e.target.value)}
                                  placeholder="Comentario acordado…"
                                  className="text-sm"
                                  rows={2}
                                />
                                </div>
                              </div>
                            )}

                            {/* Read-only acordado (for directivo or after acordado submitted) */}
                            {ev?.acordado_nivel && (role === "directivo" || isAcordadoReadOnly) && (
                              <div className="border-t pt-4">
                                <p className="text-sm font-medium text-primary mb-2">Nivel acordado</p>
                                <Badge className={NIVELES.find(n => n.value === ev.acordado_nivel)?.color}>
                                  {NIVELES.find(n => n.value === ev.acordado_nivel)?.label}
                                </Badge>
                                {ev.acordado_comentario && <p className="text-sm mt-1 italic">{ev.acordado_comentario}</p>}
                              </div>
                            )}

                            {/* Seguimiento section — evaluator can upgrade completed module items */}
                            {role === "equipo" && renderSeguimientoSection(item, m.module_number)}

                            {/* Seguimiento read-only for directivo */}
                            {role === "directivo" && hasSubmission(m.module_number, "nivel_acordado") && (() => {
                              const itemSegs = seguimientos
                                .filter(s => s.item_id === item.id)
                                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                              if (itemSegs.length === 0) return null;
                              const lastSeg = itemSegs[itemSegs.length - 1];
                              return (
                                <div className="border-t-2 border-dashed border-primary/30 pt-4 mt-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <ArrowUp className="w-4 h-4 text-primary" />
                                    <p className="text-sm font-medium text-primary">Seguimiento</p>
                                    {lastSeg.nivel && (
                                      <Badge variant="outline" className="text-xs">
                                        Nivel actual: {NIVELES.find(n => n.value === lastSeg.nivel)?.label || lastSeg.nivel}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <History className="w-3.5 h-3.5" />
                                      <span className="font-medium">Historial de cambios:</span>
                                    </div>
                                    {itemSegs.map((seg) => (
                                      <div key={seg.id} className="bg-muted/30 rounded-lg p-2.5 text-xs space-y-1 border-l-2 border-primary/40">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {seg.nivel && (
                                            <Badge variant="secondary" className="text-xs">
                                              {NIVELES.find(n => n.value === seg.nivel)?.label}
                                            </Badge>
                                          )}
                                          <span className="text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Módulo {seg.module_number} — {new Date(seg.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                                          </span>
                                        </div>
                                        {seg.comentario && <p className="italic text-muted-foreground">{seg.comentario}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Save button — only if not fully read-only for the active module */}
            {(() => {
              const activeModuleObj = modules.find(m => m.id === activeModule);
              const activeStep = activeModuleObj && role === "equipo" ? getEvaluadorStep(activeModuleObj.module_number) : null;
              const activeAutoevDone = activeModuleObj ? hasSubmission(activeModuleObj.module_number, "autoevaluacion") : true;
              const activeBlocked = role === "equipo" && !activeAutoevDone;
              const activeModuleReadOnly = activeModuleObj ? isDirectivoModuleReadOnly(activeModuleObj.module_number) : false;
              const canSave = !activeModuleReadOnly && activeStep !== "completed" && !activeBlocked;
              if (!canSave) return null;

              const buttonLabel = role === "directivo"
                ? "Guardar autoevaluación"
                : activeStep === "nivel_acordado"
                  ? "Guardar nivel acordado"
                  : "Guardar evaluación";

              return (
                <div className="flex justify-end pb-8">
                  <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {saving ? "Guardando…" : buttonLabel}
                  </Button>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
