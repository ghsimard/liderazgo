import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings2, Plus, Trash2, Save, RefreshCw, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import AdminMelKpiGroupsManager from "./AdminMelKpiGroupsManager";

interface KpiConfig {
  id: string;
  kpi_key: string;
  label: string;
  description: string;
  meta_percentage: number;
  formula_type: string;
  target_item_id: string | null;
  target_module_number: number | null;
  required_level: string;
  min_modules: number | null;
  threshold_level: string | null;
  sort_order: number;
  is_active: boolean;
  color_class: string;
}

interface RubricaItem {
  id: string;
  item_label: string;
  module_number: number;
  module_title: string;
}

const NIVEL_OPTIONS = [
  { value: "sin_evidencia", label: "Sin evidencia" },
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

const FORMULA_TYPES = [
  { value: "item_level", label: "Nivel de un ítem específico" },
  { value: "module_level", label: "Nivel global de un módulo" },
  { value: "module_count", label: "Cantidad de módulos con nivel mínimo" },
];

const COLOR_OPTIONS = [
  { value: "border-l-blue-500", label: "Azul" },
  { value: "border-l-emerald-500", label: "Verde" },
  { value: "border-l-amber-500", label: "Ámbar" },
  { value: "border-l-purple-500", label: "Púrpura" },
  { value: "border-l-red-500", label: "Rojo" },
  { value: "border-l-primary", label: "Primario" },
];

export default function AdminMelConfigTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kpis, setKpis] = useState<KpiConfig[]>([]);
  const [rubricaItems, setRubricaItems] = useState<RubricaItem[]>([]);
  const [modules, setModules] = useState<{ module_number: number; title: string }[]>([]);

  // MEL 360 settings
  const [mel360Threshold, setMel360Threshold] = useState("0.5");
  const [mel360Meta, setMel360Meta] = useState("80");
  const [showIndividualResults, setShowIndividualResults] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: kpiData }, { data: itemsData }, { data: modulesData }, { data: settings }] = await Promise.all([
      supabase.from("mel_kpi_config").select("*").order("sort_order"),
      supabase.from("rubrica_items").select("id, item_label, module_id, sort_order").order("sort_order"),
      supabase.from("rubrica_modules").select("id, module_number, title").order("module_number"),
      supabase.from("app_settings").select("key, value").in("key", ["mel_360_progression_threshold", "mel_360_global_meta", "mel_rubricas_show_individual"]),
    ]);

    const moduleMap = new Map<string, { module_number: number; title: string }>();
    (modulesData ?? []).forEach(m => moduleMap.set(m.id, { module_number: m.module_number, title: m.title }));

    setModules((modulesData ?? []).map(m => ({ module_number: m.module_number, title: m.title })));
    setRubricaItems((itemsData ?? []).map(item => {
      const mod = moduleMap.get(item.module_id);
      return {
        id: item.id,
        item_label: item.item_label,
        module_number: mod?.module_number ?? 0,
        module_title: mod?.title ?? "",
      };
    }));

    setKpis((kpiData ?? []).map(k => ({
      ...k,
      meta_percentage: Number(k.meta_percentage),
    })));

    (settings ?? []).forEach(s => {
      if (s.key === "mel_360_progression_threshold") setMel360Threshold(s.value);
      if (s.key === "mel_360_global_meta") setMel360Meta(s.value);
      if (s.key === "mel_rubricas_show_individual") setShowIndividualResults(s.value !== "false");
    });

    setLoading(false);
  };

  const updateKpi = (index: number, field: keyof KpiConfig, value: any) => {
    setKpis(prev => prev.map((k, i) => i === index ? { ...k, [field]: value } : k));
  };

  const addKpi = () => {
    setKpis(prev => [...prev, {
      id: "",
      kpi_key: `kpi_new_${Date.now()}`,
      label: "Nuevo Indicador",
      description: "",
      meta_percentage: 80,
      formula_type: "item_level",
      target_item_id: null,
      target_module_number: null,
      required_level: "avanzado",
      min_modules: null,
      threshold_level: null,
      sort_order: prev.length + 1,
      is_active: true,
      color_class: "border-l-primary",
    }]);
  };

  const removeKpi = async (index: number) => {
    const kpi = kpis[index];
    if (kpi.id) {
      await supabase.from("mel_kpi_config").delete().eq("id", kpi.id);
    }
    setKpis(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Indicador eliminado" });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save KPIs
      for (const kpi of kpis) {
        const payload = {
          kpi_key: kpi.kpi_key,
          label: kpi.label,
          description: kpi.description,
          meta_percentage: kpi.meta_percentage,
          formula_type: kpi.formula_type,
          target_item_id: kpi.target_item_id || null,
          target_module_number: kpi.target_module_number || null,
          required_level: kpi.required_level,
          min_modules: kpi.min_modules || null,
          threshold_level: kpi.threshold_level || null,
          sort_order: kpi.sort_order,
          is_active: kpi.is_active,
          color_class: kpi.color_class,
          updated_at: new Date().toISOString(),
        };

        if (kpi.id) {
          await supabase.from("mel_kpi_config").update(payload).eq("id", kpi.id);
        } else {
          const { data } = await supabase.from("mel_kpi_config").insert(payload).select("id").single();
          if (data) kpi.id = data.id;
        }
      }

      // Save MEL 360 settings
      await supabase.from("app_settings").upsert([
        { key: "mel_360_progression_threshold", value: mel360Threshold, updated_at: new Date().toISOString() },
        { key: "mel_360_global_meta", value: mel360Meta, updated_at: new Date().toISOString() },
        { key: "mel_rubricas_show_individual", value: showIndividualResults ? "true" : "false", updated_at: new Date().toISOString() },
      ]);

      toast({ title: "Configuración guardada", description: "Los cambios se aplicarán al recalcular." });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Configuración MEL
          </h2>
          <p className="text-sm text-muted-foreground">Configure los indicadores, metas y criterios del sistema MEL</p>
        </div>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Configuración MEL"}
        </Button>
      </div>

      {/* ── MEL Rúbricas KPIs ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Indicadores MEL Rúbricas</CardTitle>
          <p className="text-xs text-muted-foreground">Defina los KPIs calculados a partir de las evaluaciones por rúbrica</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpis.map((kpi, idx) => (
            <Card key={kpi.id || idx} className={`border-l-4 ${kpi.color_class} ${!kpi.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Input value={kpi.kpi_key} onChange={(e) => updateKpi(idx, "kpi_key", e.target.value)} className="h-6 text-xs w-40 font-mono" />
                    {!kpi.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs">Activo</Label>
                      <Switch checked={kpi.is_active} onCheckedChange={async (v) => {
                        updateKpi(idx, "is_active", v);
                        if (kpi.id) {
                          await supabase.from("mel_kpi_config").update({ is_active: v, updated_at: new Date().toISOString() }).eq("id", kpi.id);
                        }
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKpi(idx)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre</Label>
                    <Input value={kpi.label} onChange={(e) => updateKpi(idx, "label", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Meta (%)</Label>
                      <Input type="number" min={0} max={100} value={kpi.meta_percentage} onChange={(e) => updateKpi(idx, "meta_percentage", Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Select value={kpi.color_class} onValueChange={(v) => updateKpi(idx, "color_class", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COLOR_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Textarea value={kpi.description} onChange={(e) => updateKpi(idx, "description", e.target.value)} className="text-sm min-h-[40px]" rows={1} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Tipo de fórmula</Label>
                    <Select value={kpi.formula_type} onValueChange={(v) => updateKpi(idx, "formula_type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMULA_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {kpi.formula_type === "item_level" && (
                    <div className="md:col-span-2">
                      <Label className="text-xs">Ítem objetivo</Label>
                      <Select value={kpi.target_item_id ?? ""} onValueChange={(v) => updateKpi(idx, "target_item_id", v || null)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                        <SelectContent>
                          {rubricaItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              M{item.module_number}: {item.item_label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {kpi.formula_type === "module_level" && (
                    <>
                      <div>
                        <Label className="text-xs">Módulo objetivo</Label>
                        <Select value={String(kpi.target_module_number ?? "")} onValueChange={(v) => updateKpi(idx, "target_module_number", v ? Number(v) : null)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Módulo..." /></SelectTrigger>
                          <SelectContent>
                            {modules.map(m => <SelectItem key={m.module_number} value={String(m.module_number)}>Módulo {m.module_number}: {m.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nivel requerido</Label>
                        <Select value={kpi.required_level} onValueChange={(v) => updateKpi(idx, "required_level", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NIVEL_OPTIONS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {kpi.formula_type === "module_count" && (
                    <>
                      <div>
                        <Label className="text-xs">Mín. módulos</Label>
                        <Input type="number" min={1} max={4} value={kpi.min_modules ?? 3} onChange={(e) => updateKpi(idx, "min_modules", Number(e.target.value))} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Nivel mínimo por módulo</Label>
                        <Select value={kpi.threshold_level ?? "intermedio"} onValueChange={(v) => updateKpi(idx, "threshold_level", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NIVEL_OPTIONS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {kpi.formula_type === "item_level" && (
                    <div>
                      <Label className="text-xs">Nivel requerido</Label>
                      <Select value={kpi.required_level} onValueChange={(v) => updateKpi(idx, "required_level", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NIVEL_OPTIONS.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addKpi} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Agregar indicador
          </Button>
        </CardContent>
      </Card>

      {/* ── KPI Groups ── */}
      <AdminMelKpiGroupsManager />

      <Separator />

      {/* ── MEL 360° Settings ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Criterios MEL 360°</CardTitle>
          <p className="text-xs text-muted-foreground">Parámetros para el análisis de progresión de las encuestas 360°</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Umbral de progresión (ΔP mínimo)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={mel360Threshold}
                    onChange={(e) => setMel360Threshold(e.target.value)}
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-xs text-muted-foreground">puntos</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Un rector cumple el criterio si su ΔP (autoevaluación) es ≥ este valor
                </p>
              </div>
              <div>
                <Label className="text-xs">Meta global (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={mel360Meta}
                    onChange={(e) => setMel360Meta(e.target.value)}
                    className="h-8 text-sm w-24"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  % de rectores que deben cumplir el criterio de progresión
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MEL Rúbricas Settings ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Opciones MEL Rúbricas</CardTitle>
          <p className="text-xs text-muted-foreground">Parámetros de visualización del informe de rúbricas</p>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs">Resultados individuales</Label>
            <div className="flex items-center gap-3 mt-2">
              <Switch checked={showIndividualResults} onCheckedChange={async (val) => {
                setShowIndividualResults(val);
                await supabase.from("app_settings").upsert({ key: "mel_rubricas_show_individual", value: val ? "true" : "false", updated_at: new Date().toISOString() });
              }} />
              <span className="text-xs text-muted-foreground">
                {showIndividualResults ? "Visible en el reporte y en la interfaz" : "Oculto en el reporte y en la interfaz"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
