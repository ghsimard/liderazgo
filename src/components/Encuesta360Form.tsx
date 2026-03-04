import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";
import { genderizeRole } from "@/utils/genderizeRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, Info } from "lucide-react";
import { useAppImages } from "@/hooks/useAppImages";
import PostSubmitReviewModal from "@/components/PostSubmitReviewModal";
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
  onlyWithFichas,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
  onlyWithFichas?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const USE_EXPRESS = !!import.meta.env.VITE_API_URL;
        if (USE_EXPRESS) {
          if (onlyWithFichas) {
            // Backward-compatible Render routes: try canonical RPC first, then alias.
            const endpoints = [
              "/api/rpc/get_instituciones_con_ficha",
              "/api/rpc/instituciones-ficha",
            ];

            let rows: any[] = [];
            for (const endpoint of endpoints) {
              const { data, error } = await apiFetch<any>(endpoint);
              if (!error && Array.isArray(data)) {
                rows = data;
                break;
              }
            }

            setInstituciones(rows.map((r: any) => r.nombre_ie).filter(Boolean));
          } else {
            const { data } = await apiFetch<any[]>("/api/geography/instituciones");
            setInstituciones((data ?? []).map((i: any) => i.nombre));
          }
        } else {
          if (onlyWithFichas) {
            const { data } = await supabase.rpc("get_instituciones_con_ficha");
            setInstituciones((data ?? []).map((r: any) => r.nombre_ie));
          } else {
            const { data } = await supabase.from("instituciones").select("id, nombre").order("nombre");
            setInstituciones((data ?? []).map((i: any) => i.nombre));
          }
        }
      } catch (err) {
        console.error("Error loading instituciones:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [onlyWithFichas]);

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

// ── Single question card (wizard mode) ──
function QuestionCard({
  item,
  options,
  value,
  onAnswer,
  hasError,
  current,
  total,
  onPrev,
  onNext,
  onSubmit,
  isLast,
  submitting,
  sectionTitle,
}: {
  item: { num: number; text: string };
  options: string[];
  value: string;
  onAnswer: (val: string) => void;
  hasError: boolean;
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isLast: boolean;
  submitting: boolean;
  sectionTitle?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Pregunta {current} de {total}</span>
          <span>{Math.round((current / total) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Section instruction */}
      {sectionTitle && (
        <div className="bg-muted/60 rounded-lg px-4 py-3 text-sm text-muted-foreground italic">
          {sectionTitle}
        </div>
      )}

      {/* Question */}
      <div className={cn(
        "bg-background rounded-lg border p-6 space-y-6",
        hasError && "border-destructive"
      )}>
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Ítem {item.num}</span>
          <p className="text-lg font-medium leading-relaxed">{item.text}</p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onAnswer(opt);
                // Auto-advance after a short delay
                if (!isLast) {
                  setTimeout(() => onNext(), 350);
                }
              }}
              className={cn(
                "w-full text-left px-5 py-4 rounded-lg border-2 transition-all text-sm font-medium",
                value === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={current === 1}
          className="gap-2"
        >
          ← Anterior
        </Button>

        {isLast ? (
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="gap-2 min-w-[160px]"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {submitting ? "Enviando…" : "Enviar encuesta"}
          </Button>
        ) : (
          <Button onClick={onNext} className="gap-2">
            Siguiente →
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Directivo picker (loaded from fichas_rlt) ──
interface DirectivoOption {
  nombres_apellidos: string;
  numero_cedula: string;
  cargo_actual: string;
  genero?: string | null;
}

function DirectivoSelect({
  institucion,
  value,
  onChange,
  hasError,
  label,
}: {
  institucion: string;
  value: string;
  onChange: (nombre: string, cedula: string, cargo: string) => void;
  hasError?: boolean;
  label?: string;
}) {
  const [directivos, setDirectivos] = useState<DirectivoOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!institucion) {
      setDirectivos([]);
      onChange("", "", "");
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const USE_EXPRESS = !!import.meta.env.VITE_API_URL;
        if (USE_EXPRESS) {
          const endpoints = [
            `/api/rpc/get_directivos_por_institucion?p_nombre_ie=${encodeURIComponent(institucion)}`,
            `/api/rpc/directivos?institucion=${encodeURIComponent(institucion)}`,
          ];

          let rows: DirectivoOption[] = [];
          for (const endpoint of endpoints) {
            const { data, error } = await apiFetch<any>(endpoint);
            if (!error && Array.isArray(data)) {
              rows = data as DirectivoOption[];
              break;
            }
          }

          setDirectivos(rows);
          // Auto-select if only one directivo
          if (rows.length === 1) {
            onChange(rows[0].nombres_apellidos, rows[0].numero_cedula ?? "", rows[0].cargo_actual);
          }
        } else {
          const { data } = await supabase.rpc("get_directivos_por_institucion", { p_nombre_ie: institucion });
          const rows = (data ?? []) as DirectivoOption[];
          setDirectivos(rows);
          // Auto-select if only one directivo
          if (rows.length === 1) {
            onChange(rows[0].nombres_apellidos, rows[0].numero_cedula ?? "", rows[0].cargo_actual);
          }
        }
      } catch (err) {
        console.error("Error loading directivos:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [institucion]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground">
        {label || "Nombre del directivo docente a evaluar"} <span className="text-destructive">*</span>
      </label>
      <select
        value={value}
        disabled={!institucion || loading || directivos.length === 1}
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
            {d.nombres_apellidos} — {genderizeRole(d.cargo_actual, d.genero)}
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
  fase?: "inicial" | "final";
}

export default function Encuesta360Form({ config, fase }: Encuesta360FormProps) {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_noletters;
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Token-based invitation (email not in URL)
  const invitationToken = searchParams.get("token") || "";
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationId, setInvitationId] = useState("");

  // Pre-filled from URL params (shared links — legacy or copy-link mode)
  const prefillInstitucion = searchParams.get("institucion") || "";
  const prefillNombreDirectivo = searchParams.get("nombre_directivo") || "";
  const [tokenPrefillInstitucion, setTokenPrefillInstitucion] = useState("");
  const [tokenPrefillNombreDirectivo, setTokenPrefillNombreDirectivo] = useState("");

  const effectiveInstitucionPrefill = prefillInstitucion || tokenPrefillInstitucion;
  const effectiveNombreDirectivoPrefill = prefillNombreDirectivo || tokenPrefillNombreDirectivo;
  const isPrefilled = !!effectiveInstitucionPrefill && !!effectiveNombreDirectivoPrefill;

  // Header fields
  const [institucion, setInstitucion] = useState(prefillInstitucion);
  const [nombreDirectivo, setNombreDirectivo] = useState(prefillNombreDirectivo);
  const [cedulaDirectivo, setCedulaDirectivo] = useState("");
  const [cargoDirectivo, setCargoDirectivo] = useState("");
  const [diasContacto, setDiasContacto] = useState("");

  // Resolve invitation token on mount
  useEffect(() => {
    if (!invitationToken) return;
    (async () => {
      try {
        const { data } = await supabase.rpc("get_invitation_by_token", { p_token: invitationToken });
        if (data) {
          const inv = typeof data === "string" ? JSON.parse(data) : data;
          if (inv.responded_at) {
            toast({ title: "Ya respondida", description: "Esta invitación ya fue completada.", variant: "destructive" });
            return;
          }
          setInvitationEmail(inv.email_destinatario || "");
          setInvitationId(inv.id || "");
          if (inv.institucion) {
            setTokenPrefillInstitucion(inv.institucion);
            setInstitucion(inv.institucion);
          }
          if (inv.directivo_nombre) {
            setTokenPrefillNombreDirectivo(inv.directivo_nombre);
            setNombreDirectivo(inv.directivo_nombre);
          }
        }
      } catch (err) {
        console.error("Error resolving invitation token:", err);
      }
    })();
  }, [invitationToken]);

  // Autoevaluacion fields
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [cedula, setCedula] = useState("");

  // Extra fields
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  // Answers & wizard
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  const [itemErrors, setItemErrors] = useState<Set<number>>(new Set());
  const [wizardStarted, setWizardStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0); // 0-indexed into allItems

  const handleAnswer = (num: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [String(num)]: val }));
    setItemErrors((prev) => {
      const next = new Set(prev);
      next.delete(num);
      return next;
    });
  };

  const validateIdentification = (): boolean => {
    const errors = new Set<string>();
    if (!institucion) errors.add("institucion");
    if (!cargoDirectivo && !isPrefilled) errors.add("cargo_directivo");
    if (config.isAutoeval) {
      if (!nombreCompleto.trim()) errors.add("nombre_completo");
    } else {
      if (!nombreDirectivo.trim()) errors.add("nombre_directivo");
      if (!diasContacto) errors.add("dias_contacto");
    }
    config.extraFields?.forEach((f) => {
      if (!extraValues[f.key]) errors.add(f.key);
    });
    setFieldErrors(errors);
    if (errors.size > 0) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los datos de identificación.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const validate = (): boolean => {
    if (!validateIdentification()) return false;

    const iErrors = new Set<number>();
    const allItems = [...config.frequencyItems, ...config.agreementItems];
    allItems.forEach((item) => {
      if (!answers[String(item.num)]) iErrors.add(item.num);
    });
    setItemErrors(iErrors);

    if (iErrors.size > 0) {
      toast({
        title: "Campos incompletos",
        description: `Hay ${iErrors.size} pregunta(s) sin responder.`,
        variant: "destructive",
      });
      // Navigate to first unanswered question
      const firstUnanswered = allItems.findIndex((item) => !answers[String(item.num)]);
      if (firstUnanswered >= 0) setCurrentQuestion(firstUnanswered);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Prevent duplicate autoevaluacion submission
      if (config.isAutoeval && cedula) {
        const currentFase = fase ?? "inicial";
        const { count } = await supabase
          .from("encuestas_360")
          .select("id", { count: "exact", head: true })
          .eq("cedula", cedula)
          .eq("tipo_formulario", "autoevaluacion")
          .eq("fase", currentFase);
        if ((count ?? 0) > 0) {
          toast({
            title: "Ya completada",
            description: `Ya existe una autoevaluación ${currentFase === "inicial" ? "de entrada" : "de salida"} registrada con esta cédula.`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }
      // Resolve cédula + cargo from DB when prefilled (cédula never exposed to user)
      let resolvedCedula = cedulaDirectivo;
      let resolvedCargo = cargoDirectivo;
      if (isPrefilled && !config.isAutoeval && !resolvedCedula) {
        const { data } = await supabase.rpc("get_directivos_por_institucion", { p_nombre_ie: institucion });
        const match = (data as any[] ?? []).find(
          (d: any) => d.nombres_apellidos === nombreDirectivo
        );
        if (match) {
          resolvedCedula = match.numero_cedula ?? "";
          resolvedCargo = match.cargo_actual ?? cargoDirectivo;
        }
      }

      const payload: Record<string, unknown> = {
        tipo_formulario: config.tipo,
        institucion_educativa: institucion,
        cargo_directivo: resolvedCargo,
        respuestas: answers,
        fase: fase ?? "inicial",
      };

      if (config.isAutoeval) {
        payload.nombre_completo = nombreCompleto;
        payload.cedula = cedula;
      } else {
        payload.nombre_directivo = nombreDirectivo;
        payload.cedula_directivo = resolvedCedula;
        payload.dias_contacto = diasContacto;
      }

      if (extraValues.grado_estudiante) payload.grado_estudiante = extraValues.grado_estudiante;
      if (extraValues.cargo_evaluador) payload.cargo_evaluador = extraValues.cargo_evaluador;
      if (invitationEmail) payload.email_evaluador = invitationEmail;

      const USE_EXPRESS = !!import.meta.env.VITE_API_URL;
      if (USE_EXPRESS) {
        const { error } = await apiFetch("/api/encuestas", { method: "POST", body: payload as any });
        if (error) throw new Error(error);
      } else {
        const { error } = await supabase.from("encuestas_360").insert(payload as any);
        if (error) throw new Error(error.message);
      }

      // Mark invitation as responded
      if (invitationId) {
        try {
          await supabase.from("encuesta_invitaciones").update({ responded_at: new Date().toISOString() }).eq("id", invitationId);
        } catch { /* non-blocking */ }
      }

      setSubmitted(true);
      setShowReviewModal(true);
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
          {config.isAutoeval && (
            <Button
              onClick={() => navigate("/mi-panel")}
              className="mt-4"
            >
              Volver a Mi Panel
            </Button>
          )}
        </div>
        <PostSubmitReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          nombre={config.isAutoeval ? nombreCompleto : (nombreDirectivo || "")}
          tipoFormulario={config.tipo}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={logoRLT} alt="RLT" className="h-12" />
          <div>
            <h1 className="font-bold text-base">{config.title}</h1>
            <h2 className="text-sm font-semibold opacity-90">{config.subtitle}</h2>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {!wizardStarted && (
        <>
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

          {isPrefilled && !config.isAutoeval ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                Institución Educativa
              </label>
              <input
                type="text"
                value={institucion}
                disabled
                className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm cursor-not-allowed"
              />
            </div>
          ) : (
            <InstitutionSearch
              value={institucion}
              onChange={(v) => {
                setInstitucion(v);
                setNombreDirectivo("");
                setCedulaDirectivo("");
                setCargoDirectivo("");
                setFieldErrors((prev) => { const n = new Set(prev); n.delete("institucion"); return n; });
              }}
              hasError={fieldErrors.has("institucion")}
              onlyWithFichas
            />
          )}

          {config.isAutoeval ? (
            <>
              <DirectivoSelect
                institucion={institucion}
                value={nombreCompleto}
                onChange={(nombre, _cedula, cargo) => {
                  setNombreCompleto(nombre);
                  setCedula(_cedula);
                  setCargoDirectivo(cargo);
                  setFieldErrors((prev) => {
                    const n = new Set(prev);
                    n.delete("nombre_completo");
                    n.delete("cargo_directivo");
                    return n;
                  });
                }}
                hasError={fieldErrors.has("nombre_completo")}
                label="Nombre completo"
              />
            </>
          ) : isPrefilled ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">
                  Nombre del directivo docente a evaluar
                </label>
                <input
                  type="text"
                  value={nombreDirectivo}
                  disabled
                  className="w-full rounded-md border border-input bg-muted px-3 py-2.5 text-sm cursor-not-allowed"
                />
              </div>
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
        </>
        )}

        {/* Wizard: one question at a time */}
        {!wizardStarted ? (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => {
              // Validate identification fields first
              if (!validateIdentification()) return;
              setWizardStarted(true);
              setCurrentQuestion(0);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} className="gap-2 min-w-[200px]">
              Comenzar encuesta →
            </Button>
          </div>
        ) : (
          (() => {
            const freqOptions = config.isAutoeval ? FREQUENCY_OPTIONS_NO_NOSABE : FREQUENCY_OPTIONS_WITH_NOSABE;
            const agreeOptions = config.isAutoeval ? AGREEMENT_OPTIONS_NO_NOSABE : AGREEMENT_OPTIONS_WITH_NOSABE;
            const allItems = [
              ...config.frequencyItems.map((item) => ({ ...item, options: freqOptions })),
              ...config.agreementItems.map((item) => ({ ...item, options: agreeOptions })),
            ];
            const totalQ = allItems.length;
            const current = allItems[currentQuestion];
            if (!current) return null;

            const freqCount = config.frequencyItems.length;
            const freqTitle = config.isAutoeval
              ? "Teniendo en cuenta su gestión como directivo docente, seleccione con qué frecuencia ocurren las siguientes situaciones:"
              : "Teniendo en cuenta la gestión del directivo docente evaluado, seleccione con qué frecuencia ocurren las siguientes situaciones:";
            const agreeTitle = config.isAutoeval
              ? "Teniendo en cuenta su gestión como directivo docente, seleccione qué tan de acuerdo está con las siguientes afirmaciones:"
              : "Teniendo en cuenta la gestión del directivo docente evaluado, seleccione qué tan de acuerdo está con las siguientes afirmaciones:";

            // Show section title on first question of each section
            const isFirstFreq = currentQuestion === 0;
            const isFirstAgree = currentQuestion === freqCount;
            const sectionTitle = isFirstFreq ? freqTitle : isFirstAgree ? agreeTitle : undefined;

            return (
              <QuestionCard
                item={current}
                options={current.options}
                value={answers[String(current.num)] || ""}
                onAnswer={(val) => handleAnswer(current.num, val)}
                hasError={itemErrors.has(current.num)}
                current={currentQuestion + 1}
                total={totalQ}
                sectionTitle={sectionTitle}
                onPrev={() => {
                  if (currentQuestion === 0) {
                    setWizardStarted(false);
                  } else {
                    setCurrentQuestion((p) => p - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                onNext={() => {
                  setCurrentQuestion((p) => Math.min(p + 1, totalQ - 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onSubmit={handleSubmit}
                isLast={currentQuestion === totalQ - 1}
                submitting={submitting}
              />
            );
          })()
        )}
      </main>
    </div>
  );
}
