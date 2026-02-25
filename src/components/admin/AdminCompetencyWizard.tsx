import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowRight, ArrowLeft, Check, Plus, Layers, ListTree, ListChecks, Scale, Wand2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const OBSERVER_ROLES = ["coor", "doce", "admi", "acud", "estu"] as const;
const ROLE_LABELS: Record<string, string> = {
  coor: "Coordinador/a", doce: "Docente", admi: "Administrativo", acud: "Acudiente", estu: "Estudiante",
};
const FORM_TYPES = ["docente", "estudiante", "directivo", "acudiente", "autoevaluacion", "administrativo"] as const;
const FORM_TYPE_LABELS: Record<string, string> = {
  docente: "Docente", estudiante: "Estudiante", directivo: "Directivo",
  acudiente: "Acudiente", autoevaluacion: "Autoevaluación", administrativo: "Administrativo",
};

interface Domain { id: string; key: string; label: string; sort_order: number; }
interface Competency { id: string; key: string; label: string; domain_id: string; sort_order: number; }

interface WizardItem {
  competency_key: string;
  item_number: number;
  response_type: string;
  sort_order: number;
  texts: Record<string, string>;
}

const STEPS = [
  { key: "domain", label: "Dominio", icon: Layers, desc: "Seleccionar o crear un dominio" },
  { key: "competency", label: "Competencia", icon: ListTree, desc: "Crear la competencia" },
  { key: "items", label: "Ítems", icon: ListChecks, desc: "Definir los ítems y textos" },
  { key: "weights", label: "Pesos", icon: Scale, desc: "Asignar las ponderaciones" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const generateKey = (label: string) =>
  label
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");

export default function AdminCompetencyWizard({ open, onOpenChange, onComplete }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 - Domain
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const [newDomain, setNewDomain] = useState(false);
  const [domainForm, setDomainForm] = useState({ key: "", label: "" });

  // Step 2 - Competency
  const [compForm, setCompForm] = useState({ key: "", label: "" });

  // Step 3 - Items
  const [wizardItems, setWizardItems] = useState<WizardItem[]>([]);

  // Step 4 - Weights
  const [weights, setWeights] = useState<Record<string, Record<string, number>>>({});

  // Existing data for context
  const [existingItems, setExistingItems] = useState<{ item_number: number }[]>([]);
  const [existingComps, setExistingComps] = useState<Competency[]>([]);

  const fetchData = async () => {
    const [dRes, cRes, iRes] = await Promise.all([
      supabase.from("domains_360").select("*").order("sort_order"),
      supabase.from("competencies_360").select("*").order("sort_order"),
      supabase.from("items_360").select("item_number").order("item_number"),
    ]);
    setDomains((dRes.data as Domain[]) ?? []);
    setExistingComps((cRes.data as Competency[]) ?? []);
    setExistingItems((iRes.data as { item_number: number }[]) ?? []);
  };

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelectedDomainId("");
      setNewDomain(false);
      setDomainForm({ key: "", label: "" });
      setCompForm({ key: "", label: "" });
      setWizardItems([]);
      setWeights({});
      fetchData();
    }
  }, [open]);

  const addItem = () => {
    const maxExisting = existingItems.reduce((m, i) => Math.max(m, i.item_number), 0);
    const maxWizard = wizardItems.reduce((m, i) => Math.max(m, i.item_number), 0);
    const nextNum = Math.max(maxExisting, maxWizard) + 1;
    const variant = wizardItems.length + 1;
    const compKey = `${compForm.key}_${variant}`;
    setWizardItems((prev) => [...prev, {
      competency_key: compKey,
      item_number: nextNum,
      response_type: "frequency",
      sort_order: nextNum,
      texts: {},
    }]);
    // Init weights for this variant
    setWeights((prev) => ({
      ...prev,
      [compKey]: Object.fromEntries(OBSERVER_ROLES.map((r) => [r, 0.2])),
    }));
  };

  const updateItem = (index: number, updates: Partial<WizardItem>) => {
    setWizardItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItem = (index: number) => {
    const removed = wizardItems[index];
    setWizardItems((prev) => prev.filter((_, i) => i !== index));
    setWeights((prev) => {
      const next = { ...prev };
      delete next[removed.competency_key];
      return next;
    });
  };

  const updateItemText = (index: number, formType: string, text: string) => {
    setWizardItems((prev) => prev.map((item, i) =>
      i === index ? { ...item, texts: { ...item.texts, [formType]: text } } : item
    ));
  };

  const handleWeightChange = (compKey: string, role: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) && value !== "" && value !== ".") return;
    setWeights((prev) => ({
      ...prev,
      [compKey]: { ...prev[compKey], [role]: value === "" || value === "." ? 0 : num },
    }));
  };

  const getRowSum = (compKey: string) =>
    OBSERVER_ROLES.reduce((acc, role) => acc + (weights[compKey]?.[role] ?? 0), 0);

  const canProceed = () => {
    switch (step) {
      case 0: return newDomain ? (domainForm.key.trim() && domainForm.label.trim()) : !!selectedDomainId;
      case 1: return compForm.key.trim() && compForm.label.trim();
      case 2: return wizardItems.length > 0 && wizardItems.every((i) => {
        const hasTexts = FORM_TYPES.some((ft) => i.texts[ft]?.trim());
        return i.competency_key.trim() && hasTexts;
      });
      case 3: return wizardItems.every((i) => Math.abs(getRowSum(i.competency_key) - 1.0) <= 0.02);
      default: return false;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Step 1: Create domain if new
      let domainId = selectedDomainId;
      if (newDomain) {
        const { data, error } = await supabase.from("domains_360").insert({
          key: domainForm.key, label: domainForm.label, sort_order: domains.length + 1,
        }).select("id").single();
        if (error) throw error;
        domainId = data.id;
      }

      // Step 2: Create competency
      const compSortOrder = existingComps.length + 1;
      const { error: compErr } = await supabase.from("competencies_360").insert({
        key: compForm.key, label: compForm.label, domain_id: domainId, sort_order: compSortOrder,
      });
      if (compErr) throw compErr;

      // Step 3: Create items + texts
      for (const item of wizardItems) {
        const { data: itemData, error: itemErr } = await supabase.from("items_360").insert({
          item_number: item.item_number,
          competency_key: item.competency_key,
          response_type: item.response_type,
          sort_order: item.sort_order,
        }).select("id").single();
        if (itemErr) throw itemErr;

        const textRows = FORM_TYPES
          .filter((ft) => item.texts[ft]?.trim())
          .map((ft) => ({ item_id: itemData.id, form_type: ft, text: item.texts[ft].trim() }));
        if (textRows.length > 0) {
          const { error: tErr } = await supabase.from("item_texts_360").insert(textRows);
          if (tErr) throw tErr;
        }
      }

      // Step 4: Create weights
      const weightRows = wizardItems.flatMap((item) =>
        OBSERVER_ROLES.map((role) => ({
          competency_key: item.competency_key,
          observer_role: role,
          weight: weights[item.competency_key]?.[role] ?? 0,
        }))
      );
      if (weightRows.length > 0) {
        const { error: wErr } = await supabase.from("competency_weights").insert(weightRows);
        if (wErr) throw wErr;
      }

      toast({ title: "✅ Competencia creada", description: `${compForm.label} con ${wizardItems.length} ítem(s) y sus ponderaciones.` });
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asistente de creación de competencia</DialogTitle>
          <DialogDescription>Siga los pasos para crear una competencia completa con sus ítems y ponderaciones.</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors w-full ${
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[250px]">
          {/* STEP 0: Domain */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Choisissez un domaine existant ou créez-en un nouveau.</p>
              <div className="flex gap-2">
                <Button variant={!newDomain ? "default" : "outline"} size="sm" onClick={() => setNewDomain(false)}>Dominio existente</Button>
                <Button variant={newDomain ? "default" : "outline"} size="sm" onClick={() => setNewDomain(true)}>Nuevo dominio</Button>
              </div>
              {!newDomain ? (
                <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                  <SelectTrigger><SelectValue placeholder="Seleccione un dominio" /></SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium">Etiqueta</label>
                    <Input value={domainForm.label} onChange={(e) => setDomainForm((p) => ({ ...p, label: e.target.value }))} placeholder="Gestión Nueva" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium">Clave (interna)</label>
                      {domainForm.label.trim() && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setDomainForm((p) => ({ ...p, key: generateKey(p.label) }))}>
                          <Wand2 className="w-3 h-3" /> Auto
                        </Button>
                      )}
                    </div>
                    <Input value={domainForm.key} onChange={(e) => setDomainForm((p) => ({ ...p, key: e.target.value }))} placeholder="gestion_nueva" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Competency */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Définissez la compétence à ajouter dans le domaine sélectionné.</p>
              <div>
                <label className="text-xs font-medium">Etiqueta</label>
                <Input value={compForm.label} onChange={(e) => setCompForm((p) => ({ ...p, label: e.target.value }))} placeholder="Nueva Competencia" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium">Clave (interna, sin número)</label>
                  {compForm.label.trim() && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setCompForm((p) => ({ ...p, key: generateKey(p.label) }))}>
                      <Wand2 className="w-3 h-3" /> Auto
                    </Button>
                  )}
                </div>
                <Input value={compForm.key} onChange={(e) => setCompForm((p) => ({ ...p, key: e.target.value }))} placeholder="nueva_competencia" />
                <p className="text-xs text-muted-foreground mt-1">Préfixe pour les variantes (ex: {compForm.key || "clave"}_1, {compForm.key || "clave"}_2)</p>
              </div>
            </div>
          )}

          {/* STEP 2: Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Ajoutez les ítems (variantes) et leurs textes par formulaire.</p>
                <Button size="sm" onClick={addItem} className="gap-1.5"><Plus className="w-4 h-4" /> Agregar ítem</Button>
              </div>
              {wizardItems.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Cliquez sur "Agregar ítem" pour ajouter le premier ítem.
                  </CardContent>
                </Card>
              )}
              {wizardItems.map((item, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Ítem #{item.item_number} — <Badge variant="secondary">{item.competency_key}</Badge></CardTitle>
                      <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeItem(idx)}>Eliminar</Button>
                    </div>
                    <CardDescription className="text-xs">
                      <Select value={item.response_type} onValueChange={(v) => updateItem(idx, { response_type: v })}>
                        <SelectTrigger className="h-7 text-xs w-52"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frequency">Frecuencia (Nunca → Siempre)</SelectItem>
                          <SelectItem value="agreement">Acuerdo (Tot. desacuerdo → Tot. de acuerdo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="docente">
                      <TabsList className="flex-wrap h-auto gap-1">
                        {FORM_TYPES.map((ft) => (
                          <TabsTrigger key={ft} value={ft} className="text-xs px-2 py-1">
                            {FORM_TYPE_LABELS[ft]}
                            {item.texts[ft]?.trim() ? "" : " ⚠"}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {FORM_TYPES.map((ft) => (
                        <TabsContent key={ft} value={ft}>
                          <Textarea
                            rows={2}
                            value={item.texts[ft] ?? ""}
                            onChange={(e) => updateItemText(idx, ft, e.target.value)}
                            placeholder={`Texto para ${FORM_TYPE_LABELS[ft]}…`}
                            className="text-sm"
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* STEP 3: Weights */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Asignez les poids par observateur pour chaque variante. Chaque ligne doit sommer à 1.000.</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium text-xs">Variante</th>
                      {OBSERVER_ROLES.map((role) => (
                        <th key={role} className="text-center p-2 font-medium text-xs">{ROLE_LABELS[role]}</th>
                      ))}
                      <th className="text-center p-2 font-medium text-xs">Σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wizardItems.map((item) => {
                      const sum = getRowSum(item.competency_key);
                      const ok = Math.abs(sum - 1.0) <= 0.02;
                      return (
                        <tr key={item.competency_key} className="border-t">
                          <td className="p-2 text-xs font-medium">{item.competency_key}</td>
                          {OBSERVER_ROLES.map((role) => (
                            <td key={role} className="p-1 text-center">
                              <Input
                                type="number" step="0.001" min="0" max="1"
                                value={weights[item.competency_key]?.[role] ?? 0}
                                onChange={(e) => handleWeightChange(item.competency_key, role, e.target.value)}
                                className="h-8 text-center text-xs w-20 mx-auto"
                              />
                            </td>
                          ))}
                          <td className={`p-2 text-center text-xs font-mono font-medium ${ok ? "text-emerald-600" : "text-destructive"}`}>
                            {sum.toFixed(3)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Cancelar" : "Anterior"}
          </Button>
          <span className="text-xs text-muted-foreground">Paso {step + 1} de {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gap-1.5">
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !canProceed()} className="gap-1.5">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Crear todo
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
