import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppImages } from "@/hooks/useAppImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import {
  FREQUENCY_OPTIONS,
  GRADOS_COMPLETOS,
  GRADOS_ESTUDIANTE,
  JORNADA_OPTIONS,
  ANOS_OPTIONS,
  FUENTES_RETROALIMENTACION,
  INTRO_TEXT,
  FORM_TITLES,
  ACUDIENTES_LIKERT,
  ESTUDIANTES_LIKERT,
  DOCENTES_LIKERT,
  type LikertSection,
} from "@/data/ambienteEscolarData";

// ── Institution search combobox (reused pattern) ──
function InstitutionCombobox({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("instituciones")
          .select("nombre")
          .order("nombre");
        setInstituciones((data ?? []).map((i) => i.nombre));
      } catch (err) {
        console.error("Error loading instituciones:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered =
    query.length >= 3
      ? instituciones.filter((ie) =>
          ie.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        Nombre de la Institución Educativa <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={value || query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange("");
            setOpen(true);
          }}
          onFocus={() => query.length >= 3 && setOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              if (!value) setQuery("");
            }, 200);
          }}
          placeholder={loading ? "Cargando instituciones…" : "Escriba al menos 3 letras para buscar…"}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            hasError ? "border-destructive" : "border-input"
          } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {filtered.map((ie) => (
              <li
                key={ie}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
                onMouseDown={() => {
                  onChange(ie);
                  setQuery(ie);
                  setOpen(false);
                }}
              >
                {ie}
              </li>
            ))}
          </ul>
        )}
        {open && query.length >= 3 && filtered.length === 0 && !loading && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
            No se encontraron instituciones
          </div>
        )}
      </div>
    </div>
  );
}

// ── Likert grid ──
function LikertGrid({
  section,
  answers,
  onChange,
  errors,
}: {
  section: LikertSection;
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
  errors: Set<string>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-primary">{section.title}</h3>
        <p className="text-sm text-muted-foreground">{section.instruction}</p>
        <p className="text-xs text-destructive mt-1">* Todas las preguntas son obligatorias</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 w-1/2"></th>
              {FREQUENCY_OPTIONS.map((opt) => (
                <th key={opt} className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[80px]">
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.items.map((item, idx) => (
              <tr
                key={item.id}
                className={`border-b ${errors.has(item.id) ? "bg-destructive/5" : idx % 2 === 0 ? "bg-muted/30" : ""}`}
              >
                <td className="p-2 text-sm">{item.text}</td>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <td key={opt} className="p-2 text-center">
                    <input
                      type="radio"
                      name={item.id}
                      checked={answers[item.id] === opt}
                      onChange={() => onChange(item.id, opt)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {section.items.map((item) => (
          <Card key={item.id} className={errors.has(item.id) ? "border-destructive" : ""}>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm">{item.text}</p>
              <RadioGroup
                value={answers[item.id] || ""}
                onValueChange={(v) => onChange(item.id, v)}
                className="flex flex-wrap gap-2"
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <div key={opt} className="flex items-center gap-1.5">
                    <RadioGroupItem value={opt} id={`${item.id}-${opt}`} />
                    <Label htmlFor={`${item.id}-${opt}`} className="text-xs cursor-pointer">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Checkbox group ──
function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  hasError,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  hasError?: boolean;
}) {
  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt]
    );
  };

  return (
    <div className={`space-y-2 ${hasError ? "ring-1 ring-destructive rounded-md p-3" : ""}`}>
      <label className="text-sm font-medium">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {options.map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <Checkbox
              id={`chk-${opt}`}
              checked={selected.includes(opt)}
              onCheckedChange={() => toggle(opt)}
            />
            <Label htmlFor={`chk-${opt}`} className="text-sm cursor-pointer">
              {opt}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Radio single select ──
function RadioSingleSelect({
  label,
  options,
  value,
  onChange,
  hasError,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  return (
    <div className={`space-y-2 ${hasError ? "ring-1 ring-destructive rounded-md p-3" : ""}`}>
      <label className="text-sm font-medium">
        {label} <span className="text-destructive">*</span>
      </label>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {options.map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <RadioGroupItem value={opt} id={`radio-${opt}`} />
            <Label htmlFor={`radio-${opt}`} className="text-sm cursor-pointer">
              {opt}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

// ── Main form ──
interface AmbienteEscolarFormProps {
  formType: "acudientes" | "estudiantes" | "docentes";
}

export default function AmbienteEscolarForm({ formType }: AmbienteEscolarFormProps) {
  const { toast } = useToast();
  const { images } = useAppImages();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Common
  const [institucion, setInstitucion] = useState("");

  // Acudientes: grados (checkbox)
  const [gradosAcudiente, setGradosAcudiente] = useState<string[]>([]);

  // Estudiantes: años, grado, jornada
  const [anosEstudiante, setAnosEstudiante] = useState("");
  const [gradoEstudiante, setGradoEstudiante] = useState("");
  const [jornadaEstudiante, setJornadaEstudiante] = useState("");

  // Docentes: años, grados, jornadas, fuentes
  const [anosDocente, setAnosDocente] = useState("");
  const [gradosDocente, setGradosDocente] = useState<string[]>([]);
  const [jornadasDocente, setJornadasDocente] = useState<string[]>([]);
  const [fuentesDocente, setFuentesDocente] = useState<string[]>([]);

  // Likert answers
  const [likertAnswers, setLikertAnswers] = useState<Record<string, string>>({});

  // Validation
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  const likertSections: LikertSection[] =
    formType === "acudientes"
      ? ACUDIENTES_LIKERT
      : formType === "estudiantes"
      ? ESTUDIANTES_LIKERT
      : DOCENTES_LIKERT;

  const allLikertIds = likertSections.flatMap((s) => s.items.map((i) => i.id));

  const validate = (): boolean => {
    const errors = new Set<string>();

    if (!institucion) errors.add("institucion");

    if (formType === "acudientes") {
      if (gradosAcudiente.length === 0) errors.add("grados_acudiente");
    }

    if (formType === "estudiantes") {
      if (!anosEstudiante) errors.add("anos_estudiante");
      if (!gradoEstudiante) errors.add("grado_estudiante");
      if (!jornadaEstudiante) errors.add("jornada_estudiante");
    }

    if (formType === "docentes") {
      if (!anosDocente) errors.add("anos_docente");
      if (gradosDocente.length === 0) errors.add("grados_docente");
      if (jornadasDocente.length === 0) errors.add("jornadas_docente");
      if (fuentesDocente.length === 0) errors.add("fuentes_docente");
    }

    for (const id of allLikertIds) {
      if (!likertAnswers[id]) errors.add(id);
    }

    setFieldErrors(errors);

    if (errors.size > 0) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todas las preguntas obligatorias.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const respuestas: Record<string, any> = { ...likertAnswers };

    if (formType === "acudientes") {
      respuestas.grados = gradosAcudiente;
    }
    if (formType === "estudiantes") {
      respuestas.anos_estudiando = anosEstudiante;
      respuestas.grado = gradoEstudiante;
      respuestas.jornada = jornadaEstudiante;
    }
    if (formType === "docentes") {
      respuestas.anos_docente = anosDocente;
      respuestas.grados = gradosDocente;
      respuestas.jornadas = jornadasDocente;
      respuestas.fuentes_retroalimentacion = fuentesDocente;
    }

    try {
      const { error } = await supabase
        .from("encuestas_ambiente_escolar" as any)
        .insert({
          tipo_formulario: formType,
          institucion_educativa: institucion,
          respuestas,
        } as any);

      if (error) throw error;

      setSubmitted(true);
      toast({ title: "¡Gracias!", description: "Su encuesta ha sido enviada exitosamente." });
    } catch (err: any) {
      console.error("Error submitting:", err);
      toast({
        title: "Error",
        description: "No se pudo enviar la encuesta. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikertChange = (id: string, value: string) => {
    setLikertAnswers((prev) => ({ ...prev, [id]: value }));
    setFieldErrors((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold">¡Gracias por participar!</h2>
          <p className="text-muted-foreground">
            Su encuesta ha sido registrada exitosamente.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3ff]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header logos */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <img src={images.logo_rlt} alt="RLT" className="h-20 object-contain" />
          <img src={images.logo_cosmo} alt="COSMO" className="h-16 object-contain" />
          <img src={images.logo_clt_dark} alt="CLT" className="h-20 object-contain" />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-[#1a3a6b] tracking-wide">
            ENCUESTA DE AMBIENTE ESCOLAR
          </h1>
          <h2 className="text-lg font-semibold text-muted-foreground">
            {FORM_TITLES[formType]}
          </h2>
        </div>

        {/* Intro */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 space-y-3">
            {INTRO_TEXT.split("\n\n").map((p, i) => (
              <p key={i} className="text-sm text-primary leading-relaxed">
                {p}
              </p>
            ))}
            <p className="text-sm font-bold text-primary">
              Te invitamos a responder con sinceridad y a completar todas las preguntas de la encuesta. ¡Gracias!
            </p>
          </CardContent>
        </Card>

        {/* Institution */}
        <InstitutionCombobox
          value={institucion}
          onChange={(v) => {
            setInstitucion(v);
            setFieldErrors((prev) => {
              const n = new Set(prev);
              n.delete("institucion");
              return n;
            });
          }}
          hasError={fieldErrors.has("institucion")}
        />

        {/* Form-specific demographic questions */}
        {formType === "acudientes" && (
          <CheckboxGroup
            label="¿Qué grado se encuentra cursando el o los estudiantes que usted representa? (puede marcar más de una casilla)"
            options={GRADOS_COMPLETOS}
            selected={gradosAcudiente}
            onChange={(v) => {
              setGradosAcudiente(v);
              setFieldErrors((prev) => {
                const n = new Set(prev);
                n.delete("grados_acudiente");
                return n;
              });
            }}
            hasError={fieldErrors.has("grados_acudiente")}
          />
        )}

        {formType === "estudiantes" && (
          <>
            <RadioSingleSelect
              label="¿Cuántos años llevas estudiando en el colegio?"
              options={ANOS_OPTIONS}
              value={anosEstudiante}
              onChange={(v) => {
                setAnosEstudiante(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("anos_estudiante"); return n; });
              }}
              hasError={fieldErrors.has("anos_estudiante")}
            />
            <RadioSingleSelect
              label="¿En qué grado estás actualmente?"
              options={GRADOS_ESTUDIANTE}
              value={gradoEstudiante}
              onChange={(v) => {
                setGradoEstudiante(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("grado_estudiante"); return n; });
              }}
              hasError={fieldErrors.has("grado_estudiante")}
            />
            <RadioSingleSelect
              label="¿En qué jornada tienes clases?"
              options={JORNADA_OPTIONS}
              value={jornadaEstudiante}
              onChange={(v) => {
                setJornadaEstudiante(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("jornada_estudiante"); return n; });
              }}
              hasError={fieldErrors.has("jornada_estudiante")}
            />
          </>
        )}

        {formType === "docentes" && (
          <>
            <RadioSingleSelect
              label="Incluyendo este año escolar, ¿cuántos años se ha desempeñado como docente en este colegio?"
              options={ANOS_OPTIONS}
              value={anosDocente}
              onChange={(v) => {
                setAnosDocente(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("anos_docente"); return n; });
              }}
              hasError={fieldErrors.has("anos_docente")}
            />
            <CheckboxGroup
              label="¿En qué grados tiene asignación de actividades de docencia en este colegio? (múltiple respuesta)"
              options={GRADOS_COMPLETOS}
              selected={gradosDocente}
              onChange={(v) => {
                setGradosDocente(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("grados_docente"); return n; });
              }}
              hasError={fieldErrors.has("grados_docente")}
            />
            <CheckboxGroup
              label="¿En qué jornada desarrolla sus clases? (múltiple respuesta)"
              options={JORNADA_OPTIONS}
              selected={jornadasDocente}
              onChange={(v) => {
                setJornadasDocente(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("jornadas_docente"); return n; });
              }}
              hasError={fieldErrors.has("jornadas_docente")}
            />
            <CheckboxGroup
              label="¿De qué fuentes de retroalimentación recibe información sobre su desempeño docente? (múltiple respuesta)"
              options={FUENTES_RETROALIMENTACION}
              selected={fuentesDocente}
              onChange={(v) => {
                setFuentesDocente(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("fuentes_docente"); return n; });
              }}
              hasError={fieldErrors.has("fuentes_docente")}
            />
          </>
        )}

        {/* Likert sections */}
        {likertSections.map((section) => (
          <LikertGrid
            key={section.title}
            section={section}
            answers={likertAnswers}
            onChange={handleLikertChange}
            errors={fieldErrors}
          />
        ))}

        {/* Submit */}
        <div className="flex justify-center pt-4 pb-8">
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enviando…
              </>
            ) : (
              "Enviar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
