/**
 * Admin sub-tab: View and edit satisfaction form definitions.
 * - Select form type (Asistencia, Interludio, Intensivo)
 * - Preview in read-only mode
 * - Edit mode: modify sections/questions, add/remove questions
 * - Save to DB / Reset to defaults
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, RotateCcw, Plus, Trash2, Eye, Pencil, GripVertical, ChevronDown, ChevronUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FORM_TYPE_LABELS, asistenciaForm, interludioForm, intensivoForm } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef, SatisfaccionSection, SatisfaccionQuestion, QuestionType, SatisfaccionOption } from "@/data/satisfaccionData";
import SatisfaccionForm from "@/components/SatisfaccionForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FORM_TYPES = ["asistencia", "interludio", "intensivo"] as const;

const DEFAULT_FORMS: Record<string, SatisfaccionFormDef> = {
  asistencia: asistenciaForm,
  interludio: interludioForm,
  intensivo: intensivoForm,
};

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "radio", label: "Selección única" },
  { value: "likert4", label: "Likert (4 niveles)" },
  { value: "checkbox-max3", label: "Checkbox (máx. N)" },
  { value: "grid-sino", label: "Grilla Sí/No/Parcial" },
  { value: "grid-frequency", label: "Grilla Frecuencia" },
  { value: "grid-logistic", label: "Grilla Logística" },
  { value: "textarea", label: "Texto largo" },
  { value: "text", label: "Texto corto" },
  { value: "date", label: "Fecha" },
];

export default function AdminSatisfaccionFormsTab() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("asistencia");
  const [formDef, setFormDef] = useState<SatisfaccionFormDef>(structuredClone(DEFAULT_FORMS.asistencia));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [isFromDb, setIsFromDb] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadFormDef = useCallback(async (formType: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("satisfaccion_form_definitions")
      .select("*")
      .eq("form_type", formType)
      .maybeSingle();

    if (data?.definition) {
      setFormDef(data.definition as unknown as SatisfaccionFormDef);
      setIsFromDb(true);
    } else {
      setFormDef(structuredClone(DEFAULT_FORMS[formType]));
      setIsFromDb(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFormDef(selectedType);
    setMode("preview");
  }, [selectedType, loadFormDef]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("satisfaccion_form_definitions")
      .upsert({
        form_type: selectedType,
        definition: formDef as any,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "form_type" });

    if (error) {
      toast({ title: "Error guardando", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Formulario guardado exitosamente" });
      setIsFromDb(true);
    }
    setSaving(false);
  };

  const handleReset = async () => {
    // Delete from DB and revert to default
    await supabase.from("satisfaccion_form_definitions").delete().eq("form_type", selectedType);
    setFormDef(structuredClone(DEFAULT_FORMS[selectedType]));
    setIsFromDb(false);
    toast({ title: "Formulario restablecido a valores por defecto" });
  };

  // ── Section/Question editing helpers ──
  const updateSection = (si: number, updates: Partial<SatisfaccionSection>) => {
    setFormDef(prev => {
      const newSections = [...prev.sections];
      newSections[si] = { ...newSections[si], ...updates };
      return { ...prev, sections: newSections };
    });
  };

  const addSection = () => {
    setFormDef(prev => ({
      ...prev,
      sections: [...prev.sections, { title: "Nueva sección", questions: [] }],
    }));
  };

  const removeSection = (si: number) => {
    setFormDef(prev => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== si),
    }));
  };

  const moveSection = (si: number, dir: -1 | 1) => {
    setFormDef(prev => {
      const newSections = [...prev.sections];
      const newIdx = si + dir;
      if (newIdx < 0 || newIdx >= newSections.length) return prev;
      [newSections[si], newSections[newIdx]] = [newSections[newIdx], newSections[si]];
      return { ...prev, sections: newSections };
    });
  };

  const updateQuestion = (si: number, qi: number, updates: Partial<SatisfaccionQuestion>) => {
    setFormDef(prev => {
      const newSections = [...prev.sections];
      const newQuestions = [...newSections[si].questions];
      newQuestions[qi] = { ...newQuestions[qi], ...updates };
      newSections[si] = { ...newSections[si], questions: newQuestions };
      return { ...prev, sections: newSections };
    });
  };

  const addQuestion = (si: number) => {
    const newKey = `q_${Date.now()}`;
    const newQ: SatisfaccionQuestion = {
      key: newKey,
      label: "Nueva pregunta",
      type: "text",
      required: false,
    };
    setFormDef(prev => {
      const newSections = [...prev.sections];
      newSections[si] = { ...newSections[si], questions: [...newSections[si].questions, newQ] };
      return { ...prev, sections: newSections };
    });
  };

  const removeQuestion = (si: number, qi: number) => {
    setFormDef(prev => {
      const newSections = [...prev.sections];
      newSections[si] = { ...newSections[si], questions: newSections[si].questions.filter((_, i) => i !== qi) };
      return { ...prev, sections: newSections };
    });
  };

  const moveQuestion = (si: number, qi: number, dir: -1 | 1) => {
    setFormDef(prev => {
      const newSections = [...prev.sections];
      const qs = [...newSections[si].questions];
      const newIdx = qi + dir;
      if (newIdx < 0 || newIdx >= qs.length) return prev;
      [qs[qi], qs[newIdx]] = [qs[newIdx], qs[qi]];
      newSections[si] = { ...newSections[si], questions: qs };
      return { ...prev, sections: newSections };
    });
  };

  // Option management
  const addOption = (si: number, qi: number) => {
    updateQuestion(si, qi, {
      options: [...(formDef.sections[si].questions[qi].options || []), { value: `opt_${Date.now()}`, label: "Nueva opción" }],
    });
  };

  const updateOption = (si: number, qi: number, oi: number, updates: Partial<SatisfaccionOption>) => {
    const q = formDef.sections[si].questions[qi];
    const newOpts = [...(q.options || [])];
    newOpts[oi] = { ...newOpts[oi], ...updates };
    updateQuestion(si, qi, { options: newOpts });
  };

  const removeOption = (si: number, qi: number, oi: number) => {
    const q = formDef.sections[si].questions[qi];
    updateQuestion(si, qi, { options: (q.options || []).filter((_, i) => i !== oi) });
  };

  // Grid row management
  const addGridRow = (si: number, qi: number) => {
    const q = formDef.sections[si].questions[qi];
    updateQuestion(si, qi, {
      rows: [...(q.rows || []), { key: `row_${Date.now()}`, label: "Nueva fila" }],
    });
  };

  const updateGridRow = (si: number, qi: number, ri: number, label: string) => {
    const q = formDef.sections[si].questions[qi];
    const newRows = [...(q.rows || [])];
    newRows[ri] = { ...newRows[ri], label };
    updateQuestion(si, qi, { rows: newRows });
  };

  const removeGridRow = (si: number, qi: number, ri: number) => {
    const q = formDef.sections[si].questions[qi];
    updateQuestion(si, qi, { rows: (q.rows || []).filter((_, i) => i !== ri) });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Form type selector + mode toggle */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Label className="text-sm font-medium">Formulario:</Label>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <TabsList>
              {FORM_TYPES.map(ft => (
                <TabsTrigger key={ft} value={ft}>{FORM_TYPE_LABELS[ft]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isFromDb && <Badge variant="secondary" className="text-xs">Personalizado</Badge>}
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "preview" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("preview")}
          >
            <Eye className="w-3.5 h-3.5" /> Vista previa
          </Button>
          <Button
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("edit")}
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
        </div>
      </div>

      {mode === "preview" ? (
        /* Preview mode: render the form as the user would see it */
        <Card>
          <CardContent className="pt-6">
            <SatisfaccionForm
              formDef={formDef}
              moduleNumber={1}
              region="(Vista previa)"
              onSubmit={async () => {}}
              readOnly
            />
          </CardContent>
        </Card>
      ) : (
        /* Edit mode */
        <div className="space-y-4">
          {/* Form title + description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Título y descripción del formulario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Título</Label>
                <Input value={formDef.title} onChange={e => setFormDef(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descripción</Label>
                <Textarea value={formDef.description} onChange={e => setFormDef(prev => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Sections */}
          {formDef.sections.map((section, si) => (
            <Card key={si} className="border-l-4 border-l-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveSection(si, 1)} disabled={si === formDef.sections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={section.title}
                      onChange={e => updateSection(si, { title: e.target.value })}
                      className="font-semibold"
                      placeholder="Título de la sección"
                    />
                    <Input
                      value={section.description || ""}
                      onChange={e => updateSection(si, { description: e.target.value || undefined })}
                      className="text-sm"
                      placeholder="Descripción (opcional)"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSection(si)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.questions.map((q, qi) => (
                  <QuestionEditor
                    key={q.key}
                    question={q}
                    si={si}
                    qi={qi}
                    totalQuestions={section.questions.length}
                    onUpdate={(updates) => updateQuestion(si, qi, updates)}
                    onRemove={() => removeQuestion(si, qi)}
                    onMove={(dir) => moveQuestion(si, qi, dir)}
                    onAddOption={() => addOption(si, qi)}
                    onUpdateOption={(oi, updates) => updateOption(si, qi, oi, updates)}
                    onRemoveOption={(oi) => removeOption(si, qi, oi)}
                    onAddGridRow={() => addGridRow(si, qi)}
                    onUpdateGridRow={(ri, label) => updateGridRow(si, qi, ri, label)}
                    onRemoveGridRow={(ri) => removeGridRow(si, qi, ri)}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => addQuestion(si)} className="gap-1.5 w-full">
                  <Plus className="w-3.5 h-3.5" /> Agregar pregunta
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addSection} className="gap-1.5 w-full">
            <Plus className="w-4 h-4" /> Agregar sección
          </Button>

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[160px]">
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="w-4 h-4" />}
              {saving ? "Guardando…" : "Guardar formulario"}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" /> Restablecer
            </Button>
            <Button variant="secondary" onClick={() => setPreviewOpen(true)} className="gap-2">
              <Eye className="w-4 h-4" /> Vista previa
            </Button>
          </div>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa — {FORM_TYPE_LABELS[selectedType]}</DialogTitle>
          </DialogHeader>
          <SatisfaccionForm
            formDef={formDef}
            moduleNumber={1}
            region="(Vista previa)"
            onSubmit={async () => {}}
            readOnly
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Question Editor ──
interface QuestionEditorProps {
  question: SatisfaccionQuestion;
  si: number;
  qi: number;
  totalQuestions: number;
  onUpdate: (updates: Partial<SatisfaccionQuestion>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddOption: () => void;
  onUpdateOption: (oi: number, updates: Partial<SatisfaccionOption>) => void;
  onRemoveOption: (oi: number) => void;
  onAddGridRow: () => void;
  onUpdateGridRow: (ri: number, label: string) => void;
  onRemoveGridRow: (ri: number) => void;
}

function QuestionEditor({
  question: q, si, qi, totalQuestions,
  onUpdate, onRemove, onMove,
  onAddOption, onUpdateOption, onRemoveOption,
  onAddGridRow, onUpdateGridRow, onRemoveGridRow,
}: QuestionEditorProps) {
  const hasOptions = ["radio", "likert4", "checkbox-max3"].includes(q.type);
  const isGrid = ["grid-sino", "grid-frequency", "grid-logistic"].includes(q.type);

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <button onClick={() => onMove(-1)} disabled={qi === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronUp className="w-3 h-3" />
          </button>
          <button onClick={() => onMove(1)} disabled={qi === totalQuestions - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Input
              value={q.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="Texto de la pregunta"
              className="text-sm flex-1"
            />
            <Select value={q.type} onValueChange={(v) => onUpdate({ type: v as QuestionType })}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map(qt => (
                  <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 items-center text-xs">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={q.required || false} onChange={e => onUpdate({ required: e.target.checked })} className="rounded" />
              Obligatoria
            </label>
            <span className="text-muted-foreground">key: {q.key}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Options editor */}
      {hasOptions && (
        <div className="pl-6 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Opciones</Label>
          {(q.options || []).map((opt, oi) => (
            <div key={oi} className="flex gap-2 items-center">
              <Input
                value={opt.value}
                onChange={e => onUpdateOption(oi, { value: e.target.value })}
                className="w-24 h-7 text-xs"
                placeholder="valor"
              />
              <Input
                value={opt.label}
                onChange={e => onUpdateOption(oi, { label: e.target.value })}
                className="flex-1 h-7 text-xs"
                placeholder="etiqueta"
              />
              <button onClick={() => onRemoveOption(oi)} className="text-destructive hover:text-destructive/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={onAddOption} className="gap-1 text-xs h-6">
            <Plus className="w-3 h-3" /> Opción
          </Button>
        </div>
      )}

      {/* Grid rows editor */}
      {isGrid && (
        <div className="pl-6 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Filas de la grilla</Label>
          {(q.rows || []).map((row, ri) => (
            <div key={ri} className="flex gap-2 items-center">
              <Input
                value={row.label}
                onChange={e => onUpdateGridRow(ri, e.target.value)}
                className="flex-1 h-7 text-xs"
                placeholder="Texto de la fila"
              />
              <button onClick={() => onRemoveGridRow(ri)} className="text-destructive hover:text-destructive/80">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={onAddGridRow} className="gap-1 text-xs h-6">
            <Plus className="w-3 h-3" /> Fila
          </Button>
        </div>
      )}
    </div>
  );
}
