/**
 * Shared satisfaction form renderer.
 * Renders sections/questions from a SatisfaccionFormDef and collects answers as a flat object.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { genderizeRole } from "@/utils/genderizeRole";
import type { SatisfaccionFormDef, SatisfaccionQuestion, SatisfaccionOption } from "@/data/satisfaccionData";

interface SatisfaccionFormProps {
  formDef: SatisfaccionFormDef;
  moduleNumber: number;
  region: string;
  onSubmit: (respuestas: Record<string, any>) => Promise<void>;
  submitting?: boolean;
  fichaInfo?: Record<string, any> | null;
  readOnly?: boolean;
  savedAnswers?: Record<string, any> | null;
}

export default function SatisfaccionForm({ formDef, moduleNumber, region, onSubmit, submitting, fichaInfo, readOnly, savedAnswers }: SatisfaccionFormProps) {
  const [answers, setAnswers] = useState<Record<string, any>>(savedAnswers || {});
  const { toast } = useToast();
  const navigate = useNavigate();

  const set = (key: string, value: any) => { if (!readOnly) setAnswers((prev) => ({ ...prev, [key]: value })); };

  const handleCheckboxMax3 = (key: string, value: string, checked: boolean, max: number) => {
    const current: string[] = answers[key] || [];
    if (checked) {
      if (current.length >= max) {
        toast({ title: `Máximo ${max} opciones`, variant: "destructive" });
        return;
      }
      set(key, [...current, value]);
    } else {
      set(key, current.filter((v: string) => v !== value));
    }
  };

  const setGrid = (questionKey: string, rowKey: string, value: string) => {
    const current = answers[questionKey] || {};
    set(questionKey, { ...current, [rowKey]: value });
  };

  const validate = (): boolean => {
    for (const section of formDef.sections) {
      for (const q of section.questions) {
        // Skip conditional questions that aren't visible
        if (q.conditionalOn && answers[q.conditionalOn.key] !== q.conditionalOn.value) continue;
        if (!q.required) continue;
        const val = answers[q.key];
        if (q.type === "checkbox-max3") {
          if (!val || val.length === 0) {
            toast({ title: "Campo requerido", description: q.label || section.title, variant: "destructive" });
            return false;
          }
        } else if (q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") {
          const grid = val || {};
          const missing = q.rows?.filter((r) => !grid[r.key]);
          if (missing && missing.length > 0) {
            toast({ title: "Campo requerido", description: `Complete todas las filas en "${section.title}"`, variant: "destructive" });
            return false;
          }
        } else if (!val) {
          toast({ title: "Campo requerido", description: q.label || section.title, variant: "destructive" });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    // Auto-inject date and rol from ficha
    const enriched = { ...answers };
    enriched.fecha_sesion = new Date().toISOString().slice(0, 10);
    if (fichaInfo) {
      enriched.rol_ie = genderizeRole(fichaInfo.cargo_actual, fichaInfo.genero) || "";
      enriched.nombre_completo = fichaInfo.nombres_apellidos || "";
      enriched.correo = fichaInfo.correo_personal || fichaInfo.correo_institucional || "";
      enriched.institucion = fichaInfo.nombre_ie || "";
    }
    await onSubmit(enriched);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/mi-panel")} className="mb-2">
        ← Volver a mi panel
      </Button>

      {readOnly && (
        <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
          <span className="text-base">🔒</span>
          Ya respondió esta encuesta. Sus respuestas se muestran en modo de lectura.
        </div>
      )}

      <div className="text-left space-y-2">
        <h1 className="text-xl font-bold text-foreground text-center">{formDef.title}</h1>
        <p className="text-sm text-muted-foreground text-center">Módulo {moduleNumber} — {region}</p>
        {formDef.description.split("\n\n").map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground">{p}</p>
        ))}
      </div>

      {/* Identity card from ficha */}
      {fichaInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información del participante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Nombre(s)</p>
                <p className="text-sm font-medium text-foreground">{fichaInfo.nombres || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Apellido(s)</p>
                <p className="text-sm font-medium text-foreground">{fichaInfo.apellidos || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Rol en la Institución Educativa</p>
                <p className="text-sm font-medium text-foreground">{genderizeRole(fichaInfo.cargo_actual, fichaInfo.genero) || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correo electrónico de contacto</p>
                <p className="text-sm font-medium text-foreground">{fichaInfo.correo_personal || fichaInfo.correo_institucional || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Institución Educativa</p>
                <p className="text-sm font-medium text-foreground">{fichaInfo.nombre_ie || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {formDef.sections.map((section, si) => (
        <Card key={si}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
          </CardHeader>
          <CardContent className="space-y-5">
            {section.questions.map((q) => {
              // Handle conditional visibility
              if (q.conditionalOn) {
                const parentVal = answers[q.conditionalOn.key];
                if (parentVal !== q.conditionalOn.value) return null;
              }
              return (
                <QuestionRenderer
                  key={q.key}
                  question={q}
                  value={answers[q.key]}
                  onChange={(v) => set(q.key, v)}
                  onCheckboxChange={(val, checked) => handleCheckboxMax3(q.key, val, checked, q.maxSelect || 3)}
                  onGridChange={(rowKey, val) => setGrid(q.key, rowKey, val)}
                  disabled={readOnly}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <div className="flex justify-center">
          <Button size="lg" onClick={handleSubmit} disabled={submitting} className="min-w-[200px]">
            {submitting ? "Enviando…" : "Enviar encuesta"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Question Renderer ──
interface QRProps {
  question: SatisfaccionQuestion;
  value: any;
  onChange: (v: any) => void;
  onCheckboxChange: (val: string, checked: boolean) => void;
  onGridChange: (rowKey: string, val: string) => void;
  disabled?: boolean;
}

function QuestionRenderer({ question: q, value, onChange, onCheckboxChange, onGridChange, disabled }: QRProps) {
  const disabledClass = disabled ? "opacity-70 pointer-events-none" : "";

  switch (q.type) {
    case "date":
      return (
        <div className={`space-y-2 ${disabledClass}`}>
          <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>
          <Input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} className="max-w-xs" disabled={disabled} />
        </div>
      );

    case "text":
      return (
        <div className="space-y-2">
          <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>
          <Input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Escriba aquí..." />
        </div>
      );

    case "radio":
      return (
        <div className="space-y-2">
          <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>
          <RadioGroup value={value || ""} onValueChange={onChange} className="space-y-1.5">
            {q.options?.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`${q.key}-${opt.value}`} />
                <Label htmlFor={`${q.key}-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "likert4":
      return (
        <div className="space-y-2">
          <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>
          <RadioGroup value={value || ""} onValueChange={onChange} className="flex flex-wrap gap-3">
            {q.options?.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value} id={`${q.key}-${opt.value}`} />
                <Label htmlFor={`${q.key}-${opt.value}`} className="font-normal cursor-pointer text-sm">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );

    case "checkbox-max3":
      return (
        <div className="space-y-2">
          <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>
          <div className="space-y-1.5">
            {q.options?.map((opt) => {
              const checked = (value || []).includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${q.key}-${opt.value}`}
                    checked={checked}
                    onCheckedChange={(c) => onCheckboxChange(opt.value, !!c)}
                  />
                  <Label htmlFor={`${q.key}-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "grid-sino":
    case "grid-frequency":
    case "grid-logistic":
      return <GridQuestion question={q} value={value || {}} onGridChange={onGridChange} />;

    case "textarea":
      return (
        <div className="space-y-2">
          <Label className="font-medium">{q.label}</Label>
          <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Escriba aquí..." />
        </div>
      );

    default:
      return null;
  }
}

function GridQuestion({ question: q, value, onGridChange }: { question: SatisfaccionQuestion; value: Record<string, string>; onGridChange: (rowKey: string, val: string) => void }) {
  const columns = q.columns || [];

  return (
    <div className="space-y-2">
      {q.label && <Label className="font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</Label>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground min-w-[200px]"></th>
              {columns.map((col) => (
                <th key={col.value} className="text-center py-2 px-2 font-medium text-muted-foreground whitespace-nowrap text-xs">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.rows?.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="py-2.5 pr-4 text-sm">{row.label}</td>
                {columns.map((col) => (
                  <td key={col.value} className="text-center py-2.5 px-2">
                    <input
                      type="radio"
                      name={`${q.key}-${row.key}`}
                      checked={value[row.key] === col.value}
                      onChange={() => onGridChange(row.key, col.value)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
