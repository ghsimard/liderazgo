import { useState, useEffect } from "react";
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
import { Search, CheckCircle, BookOpen, Target, FileText, Users, Lock, ArrowLeft } from "lucide-react";

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

type DetectedRole = "directivo" | "evaluador" | null;

export default function RubricaEvaluacion() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt;

  const [cedula, setCedula] = useState("");
  const [searching, setSearching] = useState(false);
  const [detectedRole, setDetectedRole] = useState<DetectedRole>(null);
  const [userName, setUserName] = useState("");

  // Directivo state
  const [directivoInfo, setDirectivoInfo] = useState<{ nombre: string; cedula: string; institucion: string } | null>(null);
  const [directivoReadOnly, setDirectivoReadOnly] = useState(false);

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

  // Submission dates tracking: key = "module_number:submission_type" → submitted_at
  const [submissionDates, setSubmissionDates] = useState<Record<string, string>>({});

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

  const handleSearch = async () => {
    if (!cedula.trim()) return;
    setSearching(true);
    try {
      // 1. Check if cédula is a directivo (in fichas_rlt with Rector/a or Coordinador/a)
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("nombres_apellidos, numero_cedula, nombre_ie, cargo_actual")
        .eq("numero_cedula", cedula.trim());

      // 2. Check if cédula is an evaluador
      const { data: evaluadores } = await supabase
        .from("rubrica_evaluadores")
        .select("id, nombre, cedula")
        .eq("cedula", cedula.trim());

      const isDirectivo = fichas && fichas.length > 0;
      const isEvaluador = evaluadores && evaluadores.length > 0;

      if (isDirectivo && !isEvaluador) {
        // Pure directivo
        const f = fichas[0];
        setDetectedRole("directivo");
        setUserName(f.nombres_apellidos);
        setDirectivoInfo({ nombre: f.nombres_apellidos, cedula: f.numero_cedula, institucion: f.nombre_ie });

        const evMap = await loadEvaluaciones(f.numero_cedula);
        await loadSubmissionDates(f.numero_cedula);
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

  const handleSelectDirectivo = async (asig: Asignacion) => {
    setSelectedDirectivo(asig);
    setDirectivoInfo({ nombre: asig.directivo_nombre, cedula: asig.directivo_cedula, institucion: asig.institucion });
    await loadEvaluaciones(asig.directivo_cedula);
    await loadSubmissionDates(asig.directivo_cedula);
  };

  const handleBack = () => {
    if (selectedDirectivo && detectedRole === "evaluador") {
      setSelectedDirectivo(null);
      setDirectivoInfo(null);
      setEvaluaciones({});
      setSubmissionDates({});
    } else {
      setCedula("");
      setDetectedRole(null);
      setUserName("");
      setDirectivoInfo(null);
      setDirectivoReadOnly(false);
      setEvaluadorId("");
      setAsignaciones([]);
      setSelectedDirectivo(null);
      setEvaluaciones({});
      setSubmissionDates({});
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
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
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
  const isReadOnly = detectedRole === "directivo" && directivoReadOnly;

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
              } else {
                setCedula("");
                setDetectedRole(null);
                setUserName("");
                setDirectivoInfo(null);
                setDirectivoReadOnly(false);
                setEvaluaciones({});
                setSubmissionDates({});
              }
            }}>
              {detectedRole === "evaluador" ? "Evaluar otro directivo" : "Nueva evaluación"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <img src={logoRLT} alt="RLT" className="h-10" />
          <div>
            <h1 className="font-semibold text-lg">Rúbrica de Evaluación por Módulo</h1>
            <p className="text-sm text-muted-foreground">Programa de Liderazgo Directivo</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Step 1: Cédula input */}
        {!detectedRole && (
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
                  <Button onClick={handleSearch} disabled={searching}>
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
                      <p className="text-sm text-muted-foreground">Evaluador — Equipo local</p>
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
                <CardTitle className="text-base">Seleccione el directivo a evaluar</CardTitle>
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isReadOnly && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" /> Solo lectura
                      </Badge>
                    )}
                    <Badge variant={detectedRole === "directivo" ? "default" : "outline"}>
                      {detectedRole === "directivo" ? "Autoevaluación" : `Evaluador: ${userName}`}
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
              <TabsList className="flex-wrap h-auto gap-1">
                {modules.map(m => (
                  <TabsTrigger key={m.id} value={m.id} className="gap-1 text-xs sm:text-sm">
                    <BookOpen className="w-3.5 h-3.5" /> Módulo {m.module_number}
                  </TabsTrigger>
                ))}
              </TabsList>

              {modules.map(m => {
                const moduleItems = items.filter(i => i.module_id === m.id);
                const evaluadorStep = role === "equipo" ? getEvaluadorStep(m.module_number) : null;
                const isEvalReadOnly = role === "equipo" && (evaluadorStep === "nivel_acordado" || evaluadorStep === "completed");
                const isAcordadoReadOnly = role === "equipo" && evaluadorStep === "completed";
                const isModuleFullyReadOnly = isReadOnly || (role === "equipo" && evaluadorStep === "completed");

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
                      </CardContent>
                    </Card>

                    {moduleItems.map(item => {
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
                            {(isReadOnly || isEvalReadOnly) ? (
                              <div className="space-y-3">
                                {selectedNivel ? (
                                  <div className={`p-3 rounded-lg border-2 ${NIVELES.find(n => n.value === selectedNivel)?.color || ""}`}>
                                    <span className="font-medium text-sm">{NIVELES.find(n => n.value === selectedNivel)?.label}</span>
                                    <p className="text-xs mt-1 opacity-80">{getDescForNivel(item, selectedNivel)}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Sin evaluar</p>
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
                                <RadioGroup
                                  value={selectedNivel}
                                  onValueChange={(v) => updateEval(item.id, nivelField as keyof Evaluacion, v)}
                                  className="space-y-3"
                                >
                                  {NIVELES.map(n => (
                                    <label
                                      key={n.value}
                                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        selectedNivel === n.value
                                          ? n.color + " border-current"
                                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                                      }`}
                                    >
                                      <RadioGroupItem value={n.value} className="mt-0.5" />
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{n.label}</span>
                                        <p className="text-xs mt-1 opacity-80">{getDescForNivel(item, n.value)}</p>
                                      </div>
                                    </label>
                                  ))}
                                </RadioGroup>

                                <div>
                                  <Label className="text-xs text-muted-foreground">Comentario (opcional)</Label>
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
                                <RadioGroup
                                  value={ev?.acordado_nivel || ""}
                                  onValueChange={(v) => updateEval(item.id, "acordado_nivel", v)}
                                  className="flex flex-wrap gap-2"
                                >
                                  {NIVELES.map(n => (
                                    <label key={n.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-xs ${
                                      ev?.acordado_nivel === n.value ? n.color : "hover:bg-muted/50"
                                    }`}>
                                      <RadioGroupItem value={n.value} className="w-3 h-3" />
                                      {n.label}
                                    </label>
                                  ))}
                                </RadioGroup>
                                <Textarea
                                  value={ev?.acordado_comentario || ""}
                                  onChange={e => updateEval(item.id, "acordado_comentario", e.target.value)}
                                  placeholder="Comentario acordado…"
                                  className="text-sm"
                                  rows={2}
                                />
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
              const canSave = !isReadOnly && activeStep !== "completed";
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
