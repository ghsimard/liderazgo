import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, Info } from "lucide-react";
import logoRLT from "@/assets/logo_rlt.png";
import {
  type SurveyFormConfig,
  GLOSSARY,
  FREQUENCY_OPTIONS_WITH_NOSABE,
  FREQUENCY_OPTIONS_NO_NOSABE,
  AGREEMENT_OPTIONS_WITH_NOSABE,
  AGREEMENT_OPTIONS_NO_NOSABE,
  DIAS_CONTACTO_OPTIONS,
  CARGO_OPTIONS,
} from "@/data/encuesta360Data";

// ── Institution search combobox ──
function InstitutionSearch({
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
      const { data } = await supabase
        .from("instituciones")
        .select("nombre")
        .order("nombre");
      setInstituciones((data ?? []).map((i) => i.nombre));
      setLoading(false);
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
        Institución Educativa <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          disabled={loading}
          placeholder={loading ? "Cargando instituciones…" : "Escriba al menos 3 letras para buscar…"}
          value={value || query}
          onChange={(e) => {
            if (value) onChange("");
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length >= 3) setOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              if (!value) setQuery("");
            }, 150);
          }}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
            hasError ? "border-destructive" : "border-input"
          )}
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
            {filtered.map((ie) => (
              <li
                key={ie}
                onMouseDown={() => {
                  onChange(ie);
                  setQuery("");
                  setOpen(false);
                }}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-accent"
              >
                {ie}
              </li>
            ))}
          </ul>
        )}
        {open && query.length >= 3 && filtered.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
            No se encontraron instituciones
          </div>
        )}
      </div>
    </div>
  );
}

// ── Radio group ──
function RadioField({
  label,
  options,
  value,
  onChange,
  required,
  hasError,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hasError?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className={cn("flex flex-wrap gap-4", hasError && "ring-1 ring-destructive rounded p-1")}>
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-primary w-4 h-4"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Text field ──
function TextField({
  label,
  value,
  onChange,
  required,
  hasError,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
          hasError ? "border-destructive" : "border-input"
        )}
      />
    </div>
  );
}

// ── Survey table for likert-type questions ──
function SurveyTable({
  items,
  options,
  answers,
  onAnswer,
  sectionTitle,
  errors,
}: {
  items: { num: number; text: string }[];
  options: string[];
  answers: Record<string, string>;
  onAnswer: (num: number, val: string) => void;
  sectionTitle: string;
  errors: Set<number>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">{sectionTitle}</h3>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-medium min-w-[40px]">#</th>
              <th className="text-left p-3 font-medium min-w-[300px]">Ítem</th>
              {options.map((opt) => (
                <th key={opt} className="p-3 font-medium text-center min-w-[80px] text-xs">
                  {opt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.num}
                className={cn(
                  "border-t hover:bg-muted/30 transition-colors",
                  errors.has(item.num) && "bg-destructive/5"
                )}
              >
                <td className="p-3 font-medium text-muted-foreground">{item.num}</td>
                <td className="p-3">{item.text}</td>
                {options.map((opt) => (
                  <td key={opt} className="p-3 text-center">
                    <input
                      type="radio"
                      name={`item_${item.num}`}
                      checked={answers[String(item.num)] === opt}
                      onChange={() => onAnswer(item.num, opt)}
                      className="accent-primary w-4 h-4 cursor-pointer"
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

// ── Directivo picker (loaded from fichas_rlt) ──
interface DirectivoOption {
  nombres_apellidos: string;
  numero_cedula: string;
  cargo_actual: string;
}

function DirectivoSelect({
  institucion,
  value,
  onChange,
  hasError,
}: {
  institucion: string;
  value: string;
  onChange: (nombre: string, cedula: string, cargo: string) => void;
  hasError?: boolean;
}) {
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!institucion) {
      setDirectivos([]);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("fichas_rlt")
        .select("nombres_apellidos, numero_cedula, cargo_actual")
        .eq("nombre_ie", institucion)
        .in("cargo_actual", ["Rector/a", "Coordinador/a"]);
      setDirectivos((data as DirectivoOption[]) ?? []);
      setLoading(false);
    })();
  }, [institucion]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        Nombre del directivo docente evaluado <span className="text-destructive">*</span>
      </label>
      <select
        value={value}
        disabled={!institucion || loading}
        onChange={(e) => {
          const selected = directivos.find((d) => d.nombres_apellidos === e.target.value);
          if (selected) {
            onChange(selected.nombres_apellidos, selected.numero_cedula ?? "", selected.cargo_actual);
          } else {
            onChange("", "", "");
          }
        }}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring",
          hasError ? "border-destructive" : "border-input"
        )}
      >
        <option value="">
          {!institucion
            ? "Seleccione primero una institución"
            : loading
            ? "Cargando directivos…"
            : directivos.length === 0
            ? "No se encontraron directivos para esta institución"
            : "Seleccione un directivo"}
        </option>
        {directivos.map((d) => (
          <option key={d.nombres_apellidos + d.numero_cedula} value={d.nombres_apellidos}>
            {d.nombres_apellidos} — {d.cargo_actual}
          </option>
        ))}
      </select>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN FORM COMPONENT
// ══════════════════════════════════════════════════════════════
interface Encuesta360FormProps {
  config: SurveyFormConfig;
}

export default function Encuesta360Form({ config }: Encuesta360FormProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Header fields
  const [institucion, setInstitucion] = useState("");
  const [nombreDirectivo, setNombreDirectivo] = useState("");
  const [cedulaDirectivo, setCedulaDirectivo] = useState("");
  const [cargoDirectivo, setCargoDirectivo] = useState("");
  const [diasContacto, setDiasContacto] = useState("");

  // Autoevaluacion fields
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cedula, setCedula] = useState("");

  // Extra fields
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  // Answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [itemErrors, setItemErrors] = useState<Set<number>>(new Set());

  const handleAnswer = (num: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [String(num)]: val }));
    setItemErrors((prev) => {
      const next = new Set(prev);
      next.delete(num);
      return next;
    });
  };

  const validate = (): boolean => {
    const errors = new Set<string>();
    const iErrors = new Set<number>();

    if (!institucion) errors.add("institucion");
    if (!cargoDirectivo) errors.add("cargo_directivo");

    if (config.isAutoeval) {
      if (!nombreCompleto.trim()) errors.add("nombre_completo");
      if (!cedula.trim()) errors.add("cedula");
    } else {
      if (!nombreDirectivo.trim()) errors.add("nombre_directivo");
      if (!cedulaDirectivo.trim()) errors.add("cedula_directivo");
      if (!diasContacto) errors.add("dias_contacto");
    }

    config.extraFields?.forEach((f) => {
      if (!extraValues[f.key]) errors.add(f.key);
    });

    const allItems = [...config.frequencyItems, ...config.agreementItems];
    allItems.forEach((item) => {
      if (!answers[String(item.num)]) iErrors.add(item.num);
    });

    setFieldErrors(errors);
    setItemErrors(iErrors);

    if (errors.size > 0 || iErrors.size > 0) {
      toast({
        title: "Campos incompletos",
        description: `Hay ${errors.size + iErrors.size} campo(s) sin responder. Por favor complete todas las preguntas.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        tipo_formulario: config.tipo,
        institucion_educativa: institucion,
        cargo_directivo: cargoDirectivo,
        respuestas: answers,
      };

      if (config.isAutoeval) {
        payload.nombre_completo = nombreCompleto;
        payload.cedula = cedula;
      } else {
        payload.nombre_directivo = nombreDirectivo;
        payload.cedula_directivo = cedulaDirectivo;
        payload.dias_contacto = diasContacto;
      }

      if (extraValues.grado_estudiante) payload.grado_estudiante = extraValues.grado_estudiante;
      if (extraValues.cargo_evaluador) payload.cargo_evaluador = extraValues.cargo_evaluador;

      const { error } = await supabase.from("encuestas_360").insert(payload as any);
      if (error) throw error;

      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Error al enviar",
        description: err.message,
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-xl font-semibold">¡Encuesta enviada!</h2>
          <p className="text-muted-foreground">{config.closingMessage}</p>
          <p className="text-sm text-muted-foreground">Programa Rectores Líderes Transformadores</p>
        </div>
      </div>
    );
  }

  const freqOptions = config.isAutoeval ? FREQUENCY_OPTIONS_NO_NOSABE : FREQUENCY_OPTIONS_WITH_NOSABE;
  const agreeOptions = config.isAutoeval ? AGREEMENT_OPTIONS_NO_NOSABE : AGREEMENT_OPTIONS_WITH_NOSABE;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={logoRLT} alt="RLT" className="h-12" />
          <div>
            <h1 className="font-bold text-base">{config.title}</h1>
            <h2 className="text-sm text-primary font-semibold">{config.subtitle}</h2>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Introduction */}
        <div className="bg-background rounded-lg border p-6 space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{config.intro}</p>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="w-4 h-4 text-primary" />
              Tenga en cuenta que…
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
              {GLOSSARY.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground italic">
            La información recogida por medio de esta encuesta es confidencial y sólo será utilizada con fines estadísticos.
            Por favor, responda todas las preguntas.
          </p>
        </div>

        {/* Identification section */}
        <div className="bg-background rounded-lg border p-6 space-y-5">
          <h3 className="font-semibold text-sm border-b pb-2">Datos de identificación</h3>

          <InstitutionSearch
            value={institucion}
            onChange={(v) => {
              setInstitucion(v);
              // Reset directivo selection when institution changes
              setNombreDirectivo("");
              setCedulaDirectivo("");
              setCargoDirectivo("");
              setFieldErrors((prev) => { const n = new Set(prev); n.delete("institucion"); return n; });
            }}
            hasError={fieldErrors.has("institucion")}
          />

          {config.isAutoeval ? (
            <>
              <TextField
                label="Nombre completo"
                value={nombreCompleto}
                onChange={(v) => {
                  setNombreCompleto(v);
                  setFieldErrors((prev) => { const n = new Set(prev); n.delete("nombre_completo"); return n; });
                }}
                required
                hasError={fieldErrors.has("nombre_completo")}
              />
              <TextField
                label="Número de cédula"
                value={cedula}
                onChange={(v) => {
                  setCedula(v);
                  setFieldErrors((prev) => { const n = new Set(prev); n.delete("cedula"); return n; });
                }}
                required
                hasError={fieldErrors.has("cedula")}
              />
              <RadioField
                label="Cargo en el colegio"
                options={CARGO_OPTIONS}
                value={cargoDirectivo}
                onChange={(v) => {
                  setCargoDirectivo(v);
                  setFieldErrors((prev) => { const n = new Set(prev); n.delete("cargo_directivo"); return n; });
                }}
                required
                hasError={fieldErrors.has("cargo_directivo")}
              />
            </>
          ) : (
            <>
              <DirectivoSelect
                institucion={institucion}
                value={nombreDirectivo}
                onChange={(nombre, cedula, cargo) => {
                  setNombreDirectivo(nombre);
                  setCedulaDirectivo(cedula);
                  setCargoDirectivo(cargo);
                  setFieldErrors((prev) => {
                    const n = new Set(prev);
                    n.delete("nombre_directivo");
                    n.delete("cedula_directivo");
                    n.delete("cargo_directivo");
                    return n;
                  });
                }}
                hasError={fieldErrors.has("nombre_directivo")}
              />
              <TextField
                label="Número de cédula del directivo docente evaluado"
                value={cedulaDirectivo}
                onChange={() => {}}
                required
                hasError={fieldErrors.has("cedula_directivo")}
                placeholder="Se completa automáticamente"
              />
              <RadioField
                label="Cargo del directivo evaluado"
                options={CARGO_OPTIONS}
                value={cargoDirectivo}
                onChange={() => {}}
                required
                hasError={fieldErrors.has("cargo_directivo")}
              />
            </>
          )}

          {!config.isAutoeval && (
            <RadioField
              label="¿Cuántos días de la semana pasada habló con el directivo evaluado?"
              options={DIAS_CONTACTO_OPTIONS}
              value={diasContacto}
              onChange={(v) => {
                setDiasContacto(v);
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("dias_contacto"); return n; });
              }}
              required
              hasError={fieldErrors.has("dias_contacto")}
            />
          )}

          {config.extraFields?.map((field) => (
            <RadioField
              key={field.key}
              label={field.label}
              options={field.options}
              value={extraValues[field.key] || ""}
              onChange={(v) => {
                setExtraValues((prev) => ({ ...prev, [field.key]: v }));
                setFieldErrors((prev) => { const n = new Set(prev); n.delete(field.key); return n; });
              }}
              required
              hasError={fieldErrors.has(field.key)}
            />
          ))}
        </div>

        {/* Frequency section (items 1-18) */}
        <div className="bg-background rounded-lg border p-6">
          <SurveyTable
            items={config.frequencyItems}
            options={freqOptions}
            answers={answers}
            onAnswer={handleAnswer}
            sectionTitle={
              config.isAutoeval
                ? "Teniendo en cuenta su gestión como directivo docente, seleccione con qué frecuencia ocurren las siguientes situaciones:"
                : "Teniendo en cuenta la gestión del directivo docente evaluado, seleccione con qué frecuencia ocurren las siguientes situaciones:"
            }
            errors={itemErrors}
          />
        </div>

        {/* Agreement section (items 19-39) */}
        <div className="bg-background rounded-lg border p-6">
          <SurveyTable
            items={config.agreementItems}
            options={agreeOptions}
            answers={answers}
            onAnswer={handleAnswer}
            sectionTitle={
              config.isAutoeval
                ? "Teniendo en cuenta su gestión como directivo docente, seleccione qué tan de acuerdo está con las siguientes afirmaciones:"
                : "Teniendo en cuenta la gestión del directivo docente evaluado, seleccione qué tan de acuerdo está con las siguientes afirmaciones:"
            }
            errors={itemErrors}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-center pb-8">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2 min-w-[200px]"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {submitting ? "Enviando…" : "Enviar encuesta"}
          </Button>
        </div>
      </main>
    </div>
  );
}
