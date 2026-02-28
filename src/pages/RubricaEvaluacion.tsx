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
import { Search, CheckCircle, BookOpen, Target, FileText, Users } from "lucide-react";

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

const NIVELES = [
  { value: "avanzado", label: "Avanzado", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "intermedio", label: "Intermedio", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "basico", label: "Básico", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "sin_evidencia", label: "Sin evidencia", color: "bg-red-100 text-red-800 border-red-300" },
];

export default function RubricaEvaluacion() {
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt;

  const [cedula, setCedula] = useState("");
  const [directivoInfo, setDirectivoInfo] = useState<{ nombre: string; cedula: string; institucion: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Evaluacion>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeModule, setActiveModule] = useState<string>("");
  const [role, setRole] = useState<"directivo" | "equipo">("directivo");

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

  const handleSearch = async () => {
    if (!cedula.trim()) return;
    setSearching(true);
    try {
      // Look for directivo in fichas_rlt
      const { data: fichas } = await supabase
        .from("fichas_rlt")
        .select("nombres_apellidos, numero_cedula, nombre_ie, cargo_actual")
        .eq("numero_cedula", cedula.trim());

      if (fichas && fichas.length > 0) {
        const f = fichas[0];
        setDirectivoInfo({ nombre: f.nombres_apellidos, cedula: f.numero_cedula, institucion: f.nombre_ie });

        // Load existing evaluaciones
        const { data: evals } = await supabase
          .from("rubrica_evaluaciones")
          .select("*")
          .eq("directivo_cedula", cedula.trim());

        if (evals) {
          const map: Record<string, Evaluacion> = {};
          for (const e of evals) {
            map[e.item_id] = e;
          }
          setEvaluaciones(map);
        }
      } else {
        toast({ title: "No encontrado", description: "No se encontró un directivo con esa cédula.", variant: "destructive" });
      }
    } finally {
      setSearching(false);
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

  const handleSave = async () => {
    if (!directivoInfo) return;
    setSaving(true);
    try {
      const entries = Object.values(evaluaciones);
      for (const ev of entries) {
        const payload = {
          item_id: ev.item_id,
          directivo_cedula: directivoInfo.cedula,
          directivo_nivel: ev.directivo_nivel,
          directivo_comentario: ev.directivo_comentario,
          equipo_nivel: ev.equipo_nivel,
          equipo_comentario: ev.equipo_comentario,
          acordado_nivel: ev.acordado_nivel,
          acordado_comentario: ev.acordado_comentario,
        };

        // Check if exists
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold">¡Evaluación guardada!</h2>
            <p className="text-muted-foreground text-sm">Las respuestas han sido registradas correctamente.</p>
            <Button onClick={() => { setSubmitted(false); setCedula(""); setDirectivoInfo(null); setEvaluaciones({}); }}>
              Nueva evaluación
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
        {/* Search */}
        {!directivoInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-5 h-5" /> Identificación del directivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Número de cédula del directivo</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="Ingrese el número de cédula"
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? "Buscando…" : "Buscar"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Directivo Info + Role Selection */}
        {directivoInfo && (
          <>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{directivoInfo.nombre}</p>
                    <p className="text-sm text-muted-foreground">CC: {directivoInfo.cedula} — {directivoInfo.institucion}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">Estoy evaluando como:</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={role === "directivo" ? "default" : "outline"}
                        onClick={() => setRole("directivo")}
                        className="gap-1"
                      >
                        <FileText className="w-4 h-4" /> Directivo
                      </Button>
                      <Button
                        size="sm"
                        variant={role === "equipo" ? "default" : "outline"}
                        onClick={() => setRole("equipo")}
                        className="gap-1"
                      >
                        <Users className="w-4 h-4" /> Equipo local
                      </Button>
                    </div>
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
                return (
                  <TabsContent key={m.id} value={m.id} className="space-y-4 mt-4">
                    {/* Module header */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-4 pb-4">
                        <h3 className="font-semibold text-base">{m.title}</h3>
                        <div className="flex items-start gap-2 mt-2">
                          <Target className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <p className="text-sm text-muted-foreground"><strong>Objetivo:</strong> {m.objective}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Items */}
                    {moduleItems.map(item => {
                      const ev = evaluaciones[item.id];
                      const selectedNivel = (role === "directivo" ? ev?.directivo_nivel : ev?.equipo_nivel) || "";
                      const comment = (role === "directivo" ? ev?.directivo_comentario : ev?.equipo_comentario) || "";

                      return (
                        <Card key={item.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.item_type}
                              </Badge>
                              <CardTitle className="text-sm">{item.item_label}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Nivel descriptions */}
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

                            {/* Comment */}
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

                            {/* Acordado section — show when both have evaluated */}
                            {ev?.directivo_nivel && ev?.equipo_nivel && (
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Save */}
            <div className="flex justify-end pb-8">
              <Button size="lg" onClick={handleSave} disabled={saving} className="gap-2">
                <CheckCircle className="w-5 h-5" />
                {saving ? "Guardando…" : "Guardar evaluación"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
