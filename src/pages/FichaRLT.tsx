import { useState } from "react";
import { format } from "date-fns";
import logoRLT from "@/assets/logo_rlt.png";
import logoCLT from "@/assets/logo_clt.png";
import logoCLTDark from "@/assets/logo_clt_dark.png";
import logoCosmo from "@/assets/logo_cosmo.png";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { generarPDFFicha } from "@/utils/pdfGenerator";
import { institucionesPorRegion, entidadTerritorialPorRegion, getMunicipiosPorRegion, getInstitucionesPorMunicipio, formatIEName } from "@/data/instituciones";
import {
  FormFieldWrapper,
  FormInput,
  FormSelect,
  FormTextArea,
  FormRadioGroup,
  FormCheckboxGroup,
  FormSection,
} from "@/components/FormComponents";
import { cn } from "@/lib/utils";
import { CheckCircle, Download, RefreshCw, Send, AlertCircle } from "lucide-react";

// ── Schema de validación ─────────────────────────────────────
const schema = z.object({
  acepta_datos: z.boolean().refine((v) => v === true, { message: "Debe aceptar el tratamiento de datos personales" }),
  nombres: z.string().min(2, "Ingrese sus nombres"),
  apellidos: z.string().min(2, "Ingrese sus apellidos"),
  fecha_nacimiento: z.string().min(1, "Seleccione su fecha de nacimiento"),
  lengua_materna: z.string().min(1, "Seleccione una lengua materna"),
  lengua_otra: z.string().optional(),
  celular_personal: z.string().regex(/^\+57\s?\d{3}\s?\d{4}\s?\d{3}$|^\d{10}$|^\+57\d{10}$/, "Ingrese un número celular válido de Colombia"),
  correo_personal: z.string().email("Ingrese un correo electrónico válido"),
  correo_institucional: z.string().email("Ingrese un correo institucional válido").optional().or(z.literal("")),
  prefiere_correo: z.string().min(1, "Seleccione dónde prefiere recibir comunicaciones"),
  enfermedad_base: z.string().min(1, "Seleccione una opción"),
  enfermedad_detalle: z.string().optional(),
  contacto_emergencia: z.string().optional(),
  telefono_emergencia: z.string().optional(),
  discapacidad: z.string().min(1, "Seleccione una opción"),
  discapacidad_detalle: z.string().optional(),
  tipo_formacion: z.string().min(1, "Seleccione el tipo de formación"),
  titulo_pregrado: z.string().min(1, "Ingrese el título de pregrado"),
  titulo_especializacion: z.string().optional(),
  titulo_maestria: z.string().optional(),
  titulo_doctorado: z.string().optional(),
  otros_titulos: z.string().optional(),
  region: z.string().min(1, "Seleccione una región"),
  nombre_ie: z.string().min(1, "Seleccione la institución educativa"),
  cargo_actual: z.string().min(1, "Seleccione su cargo actual"),
  tipo_vinculacion: z.string().min(1, "Seleccione el tipo de vinculación"),
  fecha_vinculacion_servicio: z.string().optional(),
  fecha_nombramiento_cargo: z.string().optional(),
  fecha_nombramiento_ie: z.string().optional(),
  estatuto: z.string().optional(),
  grado_escalafon: z.string().optional(),
  codigo_dane: z
    .string()
    .min(1, "El Código DANE es obligatorio")
    .refine((v) => /^\d{12}$/.test(v), { message: "El Código DANE debe tener exactamente 12 dígitos numéricos" }),
  entidad_territorial: z.string().min(1, "Seleccione la entidad territorial"),
  comuna_barrio: z.string().optional(),
  zona_sede: z.string().min(1, "Seleccione la zona de sede"),
  total_sedes: z.string().min(1, "Ingrese el número total de sedes"),
  sedes_rural: z.string().min(1, "Ingrese el número de sedes rurales"),
  sedes_urbana: z.string().min(1, "Ingrese el número de sedes urbanas"),
  jornadas: z.array(z.string()).min(1, "Seleccione al menos una jornada"),
  grupos_etnicos: z.string().optional(),
  proyectos_transversales: z.string().optional(),
  estudiantes_jec: z.string().optional(),
  desplazamiento: z.string().optional(),
  niveles_educativos: z.array(z.string()).min(1, "Seleccione al menos un nivel educativo"),
  tipo_bachillerato: z.string().optional(),
  modelo_pedagogico: z.string().optional(),
  num_docentes: z.string().min(1, "Ingrese el número de docentes"),
  num_coordinadores: z.string().min(1, "Ingrese el número de coordinadores"),
  num_administrativos: z.string().min(1, "Ingrese el número de administrativos"),
  num_orientadores: z.string().min(1, "Ingrese el número de orientadores"),
  estudiantes_preescolar: z.string().optional(),
  estudiantes_primaria: z.string().optional(),
  estudiantes_ciclo_complementario: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultValues: Partial<FormData> = {
  acepta_datos: false,
  lengua_materna: "Español",
  enfermedad_base: "No",
  discapacidad: "No",
  cargo_actual: "Rector / a",
  jornadas: [],
  niveles_educativos: [],
};

// ── DatePicker convivial ──────────────────────────────────────
function DatePickerField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const parsed = value ? new Date(value + "T12:00:00") : undefined;

  const [day, setDay] = useState<number | "">(parsed ? parsed.getDate() : "");
  const [month, setMonth] = useState<number | "">(parsed ? parsed.getMonth() : "");
  const [year, setYear] = useState<number | "">(parsed ? parsed.getFullYear() : "");
  const [touched, setTouched] = useState(false);

  const anyFilled = day !== "" || month !== "" || year !== "";
  const allFilled = day !== "" && month !== "" && year !== "";
  const showError = touched && anyFilled && !allFilled;

  const commit = (d: number | "", m: number | "", y: number | "") => {
    setTouched(true);
    if (d !== "" && m !== "" && y !== "") {
      const date = new Date(y as number, m as number, d as number, 12);
      onChange(format(date, "yyyy-MM-dd"));
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1939 }, (_, i) => currentYear - i);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const maxDay = (month !== "" && year !== "")
    ? new Date(year as number, (month as number) + 1, 0).getDate()
    : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const selectClass = (filled: boolean) =>
    `form-input flex-1 !pt-0 !pb-0${showError && !filled ? " error" : ""}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <select
          disabled={disabled}
          value={day}
          onChange={(e) => {
            const d = e.target.value ? Number(e.target.value) : "" as const;
            setDay(d);
            commit(d, month, year);
          }}
          className={selectClass(day !== "")}
        >
          <option value="">Día</option>
          {days.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={month}
          onChange={(e) => {
            const m = e.target.value !== "" ? Number(e.target.value) : "" as const;
            setMonth(m);
            commit(day, m, year);
          }}
          className={selectClass(month !== "")}
        >
          <option value="">Mes</option>
          {months.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <select
          disabled={disabled}
          value={year}
          onChange={(e) => {
            const y = e.target.value ? Number(e.target.value) : "" as const;
            setYear(y);
            commit(day, month, y);
          }}
          className={selectClass(year !== "")}
        >
          <option value="">Año</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      {showError && (
        <p className="field-error">Debe completar el día, mes y año</p>
      )}
    </div>
  );
}

// ── Combobox de búsqueda de institución ──────────────────────
function InstitutionSearchField({
  instituciones,
  municipioSeleccionado,
  disabled = false,
  value,
  onChange,
  hasError,
  errorMsg,
}: {
  instituciones: string[];
  municipioSeleccionado: string;
  disabled?: boolean;
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  errorMsg?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getLabel = (ie: string) =>
    formatIEName(ie).replace(new RegExp(`\\s*-\\s*${municipioSeleccionado}$`), "");

  const selectedLabel = value ? getLabel(value) : "";
  const hasContent = !!selectedLabel || query.length > 0;
  const labelUp = isFocused || hasContent;

  const filtered =
    query.length >= 3
      ? instituciones.filter((ie) =>
          getLabel(ie).toLowerCase().includes(query.toLowerCase())
        )
      : [];

  const handleSelect = (ie: string) => {
    onChange(ie);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <div className="relative">
        <input
          id="nombre_ie"
          type="text"
          autoComplete="off"
          disabled={disabled}
          placeholder=" "
          value={selectedLabel || query}
          onChange={(e) => {
            if (value) onChange("");
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (query.length >= 3) setOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setOpen(false), 150);
          }}
          className={cn("form-input", hasError && "error")}
        />
        {/* Label flottant géré localement */}
        <label
          htmlFor="nombre_ie"
          style={{
            position: "absolute",
            left: "0.75rem",
            right: "0.75rem",
            top: labelUp ? "0.45rem" : "50%",
            transform: labelUp ? "none" : "translateY(-50%)",
            fontSize: labelUp ? "0.68rem" : "0.875rem",
            fontWeight: labelUp ? 600 : 400,
            color: isFocused
              ? "hsl(var(--primary))"
              : labelUp
              ? "hsl(var(--muted-foreground))"
              : "hsl(var(--muted-foreground))",
            pointerEvents: "none",
            transition: "top 0.2s ease, font-size 0.2s ease, color 0.2s ease, transform 0.2s ease, font-weight 0.2s ease",
            lineHeight: 1,
            zIndex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Nombre de la Institución Educativa <span style={{ color: "hsl(var(--destructive))" }}>*</span>
        </label>
        {open && filtered.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {filtered.map((ie) => (
              <li key={ie}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(ie)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  {getLabel(ie)}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query.length >= 3 && filtered.length === 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-card shadow-lg px-3 py-2 text-sm text-muted-foreground">
            Sin resultados
          </div>
        )}
      </div>
      {hasError && errorMsg && <p className="field-error">{errorMsg}</p>}
    </div>
  );
}


function RegionSelector({ onSelect }: { onSelect: (region: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm text-center">
        {/* Logos */}
        <div className="flex justify-center gap-4 mb-6 items-center">
          <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: "var(--gradient-header)" }}>
            <img src={logoRLT} alt="RLT" className="h-16 sm:h-24 w-auto object-contain" />
          </div>
          <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: "var(--gradient-header)" }}>
            <img src={logoCLTDark} alt="CLT" className="h-16 sm:h-24 w-auto object-contain" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: "hsl(var(--primary))" }}>
          Ficha de Información Básica
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Seleccione su región para continuar
        </p>
        <div className="flex flex-col gap-4">
          {["Quibdó", "Oriente"].map((region) => (
            <button
              key={region}
              onClick={() => onSelect(region)}
              className="w-full py-5 rounded-xl text-white font-semibold text-lg shadow-md transition-transform active:scale-95"
              style={{ background: "var(--gradient-header)" }}
            >
              {region === "Quibdó" ? "🏫 Quibdó" : "🏫 Oriente"}
            </button>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <div className="bg-white rounded-xl px-6 py-3 shadow-md inline-flex items-center justify-center">
            <img src={logoCosmo} alt="Cosmo Schools" className="h-8 w-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function FichaRLTForm() {
  const [regionSeleccionada, setRegionSeleccionada] = useState<string | null>(null);
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState<string>("");
  const [enviado, setEnviado] = useState(false);
  const [datosPDF, setDatosPDF] = useState<Record<string, unknown> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const {
    register,
    watch,
    setValue,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = methods;

  const regionActual = watch("region");
  const lenguaMaterna = watch("lengua_materna");
  const enfermedadBase = watch("enfermedad_base");
  const discapacidad = watch("discapacidad");
  const jornadas = watch("jornadas") ?? [];
  const nivelesEducativos = watch("niveles_educativos") ?? [];

  // Quibdó n'a pas de structure " - Municipio" → pas de filtre par municipio
  const tienesMunicipios = regionActual ? getMunicipiosPorRegion(regionActual).length > 1 : false;
  const municipios = tienesMunicipios ? getMunicipiosPorRegion(regionActual ?? "") : [];
  const instituciones = tienesMunicipios && municipioSeleccionado
    ? getInstitucionesPorMunicipio(regionActual ?? "", municipioSeleccionado)
    : (regionActual ? (institucionesPorRegion[regionActual] ?? []) : []);


  const onSubmit = async (data: FormData) => {
    setEnviando(true);
    setErrorEnvio(null);

    const toInt = (v: string | undefined) => (v ? parseInt(v) : null);

    const payload = {
      acepta_datos: data.acepta_datos,
      nombres: data.nombres,
      apellidos: data.apellidos,
      nombres_apellidos: `${data.nombres} ${data.apellidos}`,
      fecha_nacimiento: data.fecha_nacimiento || null,
      lengua_materna: data.lengua_materna,
      lengua_otra: data.lengua_otra ?? null,
      celular_personal: data.celular_personal,
      correo_personal: data.correo_personal,
      correo_institucional: data.correo_institucional || null,
      prefiere_correo: data.prefiere_correo,
      enfermedad_base: data.enfermedad_base,
      enfermedad_detalle: data.enfermedad_detalle ?? null,
      contacto_emergencia: data.contacto_emergencia ?? null,
      telefono_emergencia: data.telefono_emergencia ?? null,
      discapacidad: data.discapacidad,
      discapacidad_detalle: data.discapacidad_detalle ?? null,
      tipo_formacion: data.tipo_formacion ?? null,
      titulo_pregrado: data.titulo_pregrado ?? null,
      titulo_especializacion: data.titulo_especializacion ?? null,
      titulo_maestria: data.titulo_maestria ?? null,
      titulo_doctorado: data.titulo_doctorado ?? null,
      otros_titulos: data.otros_titulos ?? null,
      region: data.region,
      nombre_ie: data.nombre_ie,
      cargo_actual: data.cargo_actual,
      tipo_vinculacion: data.tipo_vinculacion ?? null,
      fecha_vinculacion_servicio: data.fecha_vinculacion_servicio || null,
      fecha_nombramiento_cargo: data.fecha_nombramiento_cargo || null,
      fecha_nombramiento_ie: data.fecha_nombramiento_ie || null,
      estatuto: data.estatuto ?? null,
      grado_escalafon: data.grado_escalafon ?? null,
      codigo_dane: data.codigo_dane ?? null,
      entidad_territorial: data.entidad_territorial ?? null,
      comuna_barrio: data.comuna_barrio ?? null,
      zona_sede: data.zona_sede ?? null,
      total_sedes: toInt(data.total_sedes),
      sedes_rural: toInt(data.sedes_rural),
      sedes_urbana: toInt(data.sedes_urbana),
      jornadas: data.jornadas ?? null,
      grupos_etnicos: data.grupos_etnicos ?? null,
      proyectos_transversales: data.proyectos_transversales ?? null,
      estudiantes_jec: toInt(data.estudiantes_jec),
      desplazamiento: data.desplazamiento ?? null,
      niveles_educativos: data.niveles_educativos ?? null,
      tipo_bachillerato: data.tipo_bachillerato ?? null,
      modelo_pedagogico: data.modelo_pedagogico ?? null,
      num_docentes: toInt(data.num_docentes),
      num_coordinadores: toInt(data.num_coordinadores),
      num_administrativos: toInt(data.num_administrativos),
      num_orientadores: toInt(data.num_orientadores),
      estudiantes_preescolar: toInt(data.estudiantes_preescolar),
      estudiantes_primaria: toInt(data.estudiantes_primaria),
      estudiantes_ciclo_complementario: toInt(data.estudiantes_ciclo_complementario),
    };

    const { error } = await supabase.from("fichas_rlt").insert([payload]);

    if (error) {
      setErrorEnvio("Error al guardar la ficha. Por favor intente de nuevo.");
      setEnviando(false);
      return;
    }

    setDatosPDF(payload as unknown as Record<string, unknown>);
    setEnviado(true);
    setEnviando(false);
  };

  const handleRegionSelect = (region: string) => {
    setRegionSeleccionada(region);
    setValue("region", region);

    // Auto-remplir l'Entidad Territorial depuis le mappage (verrouillé)
    const et = entidadTerritorialPorRegion[region] ?? "";
    setValue("entidad_territorial", et, { shouldValidate: true });

    // Si la valeur de l'Entidad Territorial existe aussi comme Municipio dans cette région
    // → le Municipio est automatiquement verrouillé sur cette même valeur
    const municipiosRegion = getMunicipiosPorRegion(region);
    if (et && municipiosRegion.includes(et)) {
      setMunicipioSeleccionado(et);
    } else {
      setMunicipioSeleccionado("");
    }

    setValue("nombre_ie", "");
    if (region === "Quibdó") {
      setValue("cargo_actual", "Rector / a", { shouldValidate: true });
    }
  };

  const handleNuevaFicha = () => {
    setRegionSeleccionada(null);
    setMunicipioSeleccionado("");
    reset(defaultValues);
    setEnviado(false);
    setDatosPDF(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDescargarPDF = () => {
    if (datosPDF) generarPDFFicha(datosPDF);
  };

  const err = (name: keyof FormData) => errors[name]?.message as string | undefined;

  // ── Selección de región ──────────────────────────────────────
  if (!regionSeleccionada) {
    return <RegionSelector onSelect={handleRegionSelect} />;
  }

  const logoHeader = regionSeleccionada === "Quibdó" ? logoRLT : logoCLTDark;
  const altHeader = regionSeleccionada === "Quibdó"
    ? "Rectores Líderes Transformadores"
    : "Coordinadores Líderes Transformadores";

  // ── Pantalla de éxito ───────────────────────────────────────
  if (enviado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full success-banner">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "hsl(var(--color-success))" }} />
          <h2 className="text-2xl font-bold mb-2 text-foreground">¡Ficha enviada con éxito!</h2>
          <p className="text-muted-foreground mb-6">
            La información ha sido guardada correctamente en el sistema del programa RLT/CLT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleDescargarPDF}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
            <button
              onClick={handleNuevaFicha}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium border border-border transition-colors hover:bg-muted"
            >
              <RefreshCw className="w-4 h-4" />
              Rellenar otra ficha
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────
  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="text-white px-4 py-5 md:py-6 text-center" style={{ background: "var(--gradient-header)" }}>
          <div className="max-w-4xl mx-auto">
            {regionSeleccionada === "Quibdó" ? (
              /* Quibdó : un seul logo RLT centré au-dessus des titres */
              <div className="flex flex-col items-center gap-3">
                <img src={logoRLT} alt="Rectores Líderes Transformadores" className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg" />
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Ficha de Información Básica</h1>
                  <p className="text-xs sm:text-sm md:text-base opacity-90 font-light mt-1">Programa RLT — Rectores Líderes Transformadores</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 opacity-95">Región: {regionSeleccionada}</p>
                </div>
              </div>
            ) : (
              /* Oriente : les deux logos côte à côte centrés, puis titres en dessous */
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4 sm:gap-10">
                  <img src={logoRLT} alt="Rectores Líderes Transformadores" className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
                  <img src={logoCLTDark} alt="Coordinadores Líderes Transformadores" className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Ficha de Información Básica</h1>
                  <p className="text-xs sm:text-sm md:text-base opacity-90 font-light mt-1">
                    Programa RLT — Rectores Líderes Transformadores
                  </p>
                  <p className="text-xs sm:text-sm md:text-base font-light opacity-90">
                    Programa CLT — Coordinadores Líderes Transformadores
                  </p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 opacity-95">Región: {regionSeleccionada}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Franja verde */}
        <div className="h-1" style={{ background: "hsl(var(--accent))" }} />

        {/* Formulario */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Consentimiento */}
            <div className="form-section border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("acepta_datos")}
                  className="mt-1 w-5 h-5 accent-primary flex-shrink-0"
                />
                <span className="text-sm leading-relaxed">
                  <strong>Autorización de datos personales: </strong>
                  Entiendo la información y acepto el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 de protección de datos de Colombia.{" "}
                  <span className="required-star">*</span>
                </span>
              </label>
              {errors.acepta_datos && (
                <p className="field-error mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.acepta_datos.message as string}
                </p>
              )}
            </div>

            {/* SECCIÓN 1: Datos personales */}
            <FormSection number={1} title="Datos Personales">
              <FormFieldWrapper name="nombres" label="Nombre(s)" required>
                <FormInput
                  id="nombres"
                  {...register("nombres")}
                  placeholder="Ej: María Carolina"
                  hasError={!!err("nombres")}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="apellidos" label="Apellido(s)" required>
                <FormInput
                  id="apellidos"
                  {...register("apellidos")}
                  placeholder="Ej: Rodríguez Pérez"
                  hasError={!!err("apellidos")}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nacimiento" label="Fecha de nacimiento" required staticLabel>
                <DatePickerField
                  value={watch("fecha_nacimiento") ?? ""}
                  onChange={(v) => setValue("fecha_nacimiento", v, { shouldValidate: true })}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="lengua_materna" label="Lengua materna" required>
                <FormSelect
                  id="lengua_materna"
                  {...register("lengua_materna")}
                  hasError={!!err("lengua_materna")}
                  options={[
                    { value: "Español", label: "Español" },
                    { value: "Otra", label: "Otra" },
                  ]}
                />

              </FormFieldWrapper>

              {lenguaMaterna === "Otra" && (
                <FormFieldWrapper name="lengua_otra" label="Si su respuesta fue Otra ¿Cuál es?" className="md:col-span-2">
                  <FormInput id="lengua_otra" {...register("lengua_otra")} placeholder="Indique su lengua materna" />
                </FormFieldWrapper>
              )}

              <FormFieldWrapper name="celular_personal" label="Número de celular personal" required>
                <FormInput
                  id="celular_personal"
                  {...register("celular_personal")}
                  placeholder="+57 300 0000 000"
                  type="tel"
                  hasError={!!err("celular_personal")}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="correo_personal" label="Correo electrónico personal" required>
                <FormInput
                  id="correo_personal"
                  type="email"
                  {...register("correo_personal")}
                  placeholder="correo@gmail.com"
                  hasError={!!err("correo_personal")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="correo_institucional" label="Correo electrónico institucional">
                <FormInput
                  id="correo_institucional"
                  type="email"
                  {...register("correo_institucional")}
                  placeholder="correo@edu.co"
                  hasError={!!err("correo_institucional")}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="prefiere_correo" label="Prefiere recibir comunicaciones en el correo" required staticLabel>
                <FormRadioGroup
                  name="prefiere_correo"
                  options={[
                    { value: "Personal", label: "Personal" },
                    { value: "Institucional", label: "Institucional" },
                  ]}
                  value={watch("prefiere_correo")}
                  onChange={(v) => setValue("prefiere_correo", v, { shouldValidate: true })}
                  hasError={!!err("prefiere_correo")}
                />

              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 2: Salud */}
            <FormSection number={2} title="Salud y Contacto de Emergencia">
              <FormFieldWrapper name="enfermedad_base" label="¿Tiene alguna enfermedad de base que pueda requerir atención especial?" required className="md:col-span-2" staticLabel>
                <FormRadioGroup
                  name="enfermedad_base"
                  options={[
                    { value: "Sí", label: "Sí" },
                    { value: "No", label: "No" },
                  ]}
                  value={watch("enfermedad_base")}
                  onChange={(v) => setValue("enfermedad_base", v, { shouldValidate: true })}
                  hasError={!!err("enfermedad_base")}
                />

              </FormFieldWrapper>

              {enfermedadBase === "Sí" && (
                <FormFieldWrapper name="enfermedad_detalle" label="Indique la enfermedad y sus requerimientos" className="md:col-span-2">
                  <FormTextArea id="enfermedad_detalle" {...register("enfermedad_detalle")} placeholder="Describa la enfermedad y los requerimientos especiales..." />
                </FormFieldWrapper>
              )}

              <FormFieldWrapper name="contacto_emergencia" label="Si requiere atención médica urgente ¿A quién podemos contactar?">
                <FormInput id="contacto_emergencia" {...register("contacto_emergencia")} placeholder="Nombre completo del contacto" />
              </FormFieldWrapper>

              <FormFieldWrapper name="telefono_emergencia" label="¿Cuál es el número de contacto de emergencia?">
                <FormInput id="telefono_emergencia" type="tel" {...register("telefono_emergencia")} placeholder="+57 300 0000 000" />
              </FormFieldWrapper>

              <FormFieldWrapper name="discapacidad" label="¿Tiene alguna discapacidad?" required className="md:col-span-2" staticLabel>
                <FormRadioGroup
                  name="discapacidad"
                  options={[
                    { value: "Sí", label: "Sí" },
                    { value: "No", label: "No" },
                  ]}
                  value={watch("discapacidad")}
                  onChange={(v) => setValue("discapacidad", v, { shouldValidate: true })}
                  hasError={!!err("discapacidad")}
                />

              </FormFieldWrapper>

              {discapacidad === "Sí" && (
                <FormFieldWrapper name="discapacidad_detalle" label="Si su respuesta fue afirmativa ¿Cuál es?" className="md:col-span-2">
                  <FormInput id="discapacidad_detalle" {...register("discapacidad_detalle")} placeholder="Indique el tipo de discapacidad" />
                </FormFieldWrapper>
              )}
            </FormSection>

            {/* SECCIÓN 3: Formación */}
            <FormSection number={3} title="Formación Académica">
              <FormFieldWrapper name="tipo_formacion" label="Tipo de formación" required className="md:col-span-2" staticLabel>
                <FormRadioGroup name="tipo_formacion" options={[{ value: "Profesional", label: "Profesional" }, { value: "Licenciado/a", label: "Licenciado/a" }]} value={watch("tipo_formacion")} onChange={(v) => setValue("tipo_formacion", v, { shouldValidate: true })} hasError={!!err("tipo_formacion")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="titulo_pregrado" label="Título de pregrado" required>
                <FormInput id="titulo_pregrado" {...register("titulo_pregrado")} placeholder="Título obtenido" />
              </FormFieldWrapper>

              <FormFieldWrapper name="titulo_especializacion" label="Título de especialización">
                <FormInput id="titulo_especializacion" {...register("titulo_especializacion")} placeholder="Título obtenido" />
              </FormFieldWrapper>

              <FormFieldWrapper name="titulo_maestria" label="Título de maestría">
                <FormInput id="titulo_maestria" {...register("titulo_maestria")} placeholder="Título obtenido" />
              </FormFieldWrapper>

              <FormFieldWrapper name="titulo_doctorado" label="Título de doctorado">
                <FormInput id="titulo_doctorado" {...register("titulo_doctorado")} placeholder="Título obtenido" />
              </FormFieldWrapper>

              <FormFieldWrapper name="otros_titulos" label="Otros títulos ¿cuáles?" className="md:col-span-2">
                <FormInput id="otros_titulos" {...register("otros_titulos")} placeholder="Otros títulos o certificaciones relevantes" />
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 4: Institución */}
            <FormSection number={4} title="Información Institucional">
              {/* Entidad Territorial — auto-rempli et verrouillé */}
              <FormFieldWrapper name="entidad_territorial" label="Entidad Territorial" required staticLabel>
                <input
                  id="entidad_territorial"
                  value={entidadTerritorialPorRegion[regionSeleccionada ?? ""] ?? ""}
                  readOnly
                  disabled
                  className="form-input opacity-75 cursor-not-allowed"
                 />
              </FormFieldWrapper>

              {/* Municipio — verrouillé (Quibdó) ou liste déroulante (Oriente) */}
              <FormFieldWrapper name="municipio" label="Municipio" required staticLabel>
                {!tienesMunicipios || (municipioSeleccionado && entidadTerritorialPorRegion[regionSeleccionada ?? ""] === municipioSeleccionado) ? (
                  <input
                    id="municipio"
                    value={entidadTerritorialPorRegion[regionSeleccionada ?? ""] ?? municipioSeleccionado}
                    readOnly
                    disabled
                    className="form-input opacity-75 cursor-not-allowed"
                  />
                ) : (
                  <select
                    id="municipio"
                    value={municipioSeleccionado}
                    onChange={(e) => {
                      setMunicipioSeleccionado(e.target.value);
                      setValue("nombre_ie", "");
                    }}
                    className="form-input"
                  >
                    <option value="">Seleccione el municipio</option>
                    {municipios.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </FormFieldWrapper>

              <FormFieldWrapper name="comuna_barrio" label="Comuna, barrio, corregimiento o localidad">
                <FormInput id="comuna_barrio" {...register("comuna_barrio")} placeholder="Ej: Barrio La Esperanza" />
              </FormFieldWrapper>

              {/* Institution — directe pour Quibdó, filtrée par municipio pour Oriente */}
              <InstitutionSearchField
                instituciones={instituciones}
                municipioSeleccionado={municipioSeleccionado}
                disabled={tienesMunicipios && !municipioSeleccionado}
                value={watch("nombre_ie") ?? ""}
                onChange={(val) => setValue("nombre_ie", val, { shouldValidate: true })}
                hasError={!!err("nombre_ie")}
                errorMsg={errors.nombre_ie?.message as string}
              />

              <FormFieldWrapper name="codigo_dane" label="Código DANE (12 dígitos)" required>
                <FormInput
                  id="codigo_dane"
                  {...register("codigo_dane")}
                  maxLength={12}
                  hasError={!!err("codigo_dane")}
                />

              </FormFieldWrapper>

              <FormFieldWrapper name="cargo_actual" label="Cargo actual" required staticLabel>
                {regionSeleccionada === "Quibdó" ? (
                  <input
                    id="cargo_actual"
                    value="Rector / a"
                    readOnly
                    disabled
                    className="form-input opacity-75 cursor-not-allowed"
                  />
                ) : (
                  <FormSelect
                    id="cargo_actual"
                    {...register("cargo_actual")}
                    hasError={!!err("cargo_actual")}
                    placeholder="Seleccione su cargo"
                    options={[
                      { value: "Rector / a", label: "Rector / a" },
                      { value: "Coordinador / a", label: "Coordinador / a" },
                    ]}
                  />
                )}

              </FormFieldWrapper>

              <FormFieldWrapper name="tipo_vinculacion" label="Tipo de vinculación actual" required staticLabel>
                <FormRadioGroup
                  name="tipo_vinculacion"
                  options={[
                    { value: "En propiedad", label: "En propiedad" },
                    { value: "En encargo", label: "En encargo" },
                  ]}
                  value={watch("tipo_vinculacion")}
                  onChange={(v) => setValue("tipo_vinculacion", v, { shouldValidate: true })}
                  hasError={!!err("tipo_vinculacion")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_vinculacion_servicio" label="Fecha de vinculación al servicio educativo estatal" staticLabel>
                <DatePickerField
                  value={watch("fecha_vinculacion_servicio") ?? ""}
                  onChange={(v) => setValue("fecha_vinculacion_servicio", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_cargo" label="Fecha de nombramiento estatal en el cargo actual" staticLabel>
                <DatePickerField
                  value={watch("fecha_nombramiento_cargo") ?? ""}
                  onChange={(v) => setValue("fecha_nombramiento_cargo", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_ie" label="Fecha de nombramiento del cargo actual en la IE" staticLabel>
                <DatePickerField
                  value={watch("fecha_nombramiento_ie") ?? ""}
                  onChange={(v) => setValue("fecha_nombramiento_ie", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="estatuto" label="Estatuto al que pertenece" staticLabel>
                <FormRadioGroup
                  name="estatuto"
                  options={[
                    { value: "2277", label: "2277" },
                    { value: "1278", label: "1278" },
                  ]}
                  value={watch("estatuto")}
                  onChange={(v) => setValue("estatuto", v, { shouldValidate: true })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="grado_escalafon" label="Grado en el escalafón">
                <FormInput id="grado_escalafon" {...register("grado_escalafon")} placeholder="Ej: 2B, 3, etc." />
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 5: Datos de la IE */}
            <FormSection number={5} title="Datos de la Institución Educativa">
              <FormFieldWrapper name="zona_sede" label="Zona de la sede principal de la IE" required staticLabel>
                <FormRadioGroup
                  name="zona_sede"
                  options={[
                    { value: "Urbana", label: "Urbana" },
                    { value: "Rural", label: "Rural" },
                  ]}
                  value={watch("zona_sede")}
                  onChange={(v) => setValue("zona_sede", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="total_sedes" label="Número total de sedes (incluida la sede principal)" required>
                <FormInput id="total_sedes" type="number" min={1} {...register("total_sedes")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="sedes_rural" label="Número de sedes en zona rural" required>
                <FormInput id="sedes_rural" type="number" min={0} {...register("sedes_rural")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="sedes_urbana" label="Número de sedes en zona urbana" required>
                <FormInput id="sedes_urbana" type="number" min={0} {...register("sedes_urbana")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="jornadas" label="Jornadas de la IE" required className="md:col-span-2" hideError staticLabel>
                <FormCheckboxGroup
                  name="jornadas"
                  options={[
                    { value: "Mañana", label: "Mañana" },
                    { value: "Tarde", label: "Tarde" },
                    { value: "Nocturna", label: "Nocturna" },
                    { value: "Única", label: "Única" },
                  ]}
                  value={jornadas}
                  onChange={(v) => setValue("jornadas", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="grupos_etnicos" label="Grupos étnicos en la IE">
                <FormInput id="grupos_etnicos" {...register("grupos_etnicos")} placeholder="Ej: Afrodescendiente, Indígena, etc." />
              </FormFieldWrapper>

              <FormFieldWrapper name="proyectos_transversales" label="Proyectos transversales de la IE">
                <FormInput id="proyectos_transversales" {...register("proyectos_transversales")} placeholder="Ej: PRAE, PIGA, etc." />
              </FormFieldWrapper>

              <FormFieldWrapper name="desplazamiento" label="¿Hay estudiantes o familias en condición de desplazamiento?" staticLabel>
                <FormRadioGroup
                  name="desplazamiento"
                  options={[
                    { value: "Sí", label: "Sí" },
                    { value: "No", label: "No" },
                  ]}
                  value={watch("desplazamiento")}
                  onChange={(v) => setValue("desplazamiento", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="niveles_educativos" label="Niveles educativos que ofrece la IE" required className="md:col-span-2" hideError staticLabel>
                <FormCheckboxGroup
                  name="niveles_educativos"
                  options={[
                    { value: "Primera infancia", label: "Primera infancia" },
                    { value: "Preescolar", label: "Preescolar" },
                    { value: "Básica primaria", label: "Básica primaria" },
                    { value: "Básica secundaria", label: "Básica secundaria" },
                    { value: "Media", label: "Media" },
                    { value: "Ciclo complementario", label: "Ciclo complementario" },
                  ]}
                  value={nivelesEducativos}
                  onChange={(v) => setValue("niveles_educativos", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="tipo_bachillerato" label="Tipo de bachillerato que ofrece la IE">
                <FormInput id="tipo_bachillerato" {...register("tipo_bachillerato")} placeholder="Ej: Académico, Técnico, etc." />
              </FormFieldWrapper>

              <FormFieldWrapper name="modelo_pedagogico" label="Modelo o enfoque pedagógico">
                <FormInput id="modelo_pedagogico" {...register("modelo_pedagogico")} placeholder="Ej: Constructivista, Tradicional, etc." />
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 6: Personal y estudiantes */}
            <FormSection number={6} title="Personal y Estudiantes">
              <FormFieldWrapper name="num_docentes" label="Número de docentes" required>
                <FormInput id="num_docentes" type="number" min={0} {...register("num_docentes")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_coordinadores" label="Número de coordinadores/as" required>
                <FormInput id="num_coordinadores" type="number" min={0} {...register("num_coordinadores")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_administrativos" label="Número de administrativos" required>
                <FormInput id="num_administrativos" type="number" min={0} {...register("num_administrativos")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_orientadores" label="Número de orientadores/as" required>
                <FormInput id="num_orientadores" type="number" min={0} {...register("num_orientadores")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="estudiantes_preescolar" label="Número de estudiantes en Preescolar">
                <FormInput id="estudiantes_preescolar" type="number" min={0} {...register("estudiantes_preescolar")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="estudiantes_primaria" label="Número de estudiantes en Primaria">
                <FormInput id="estudiantes_primaria" type="number" min={0} {...register("estudiantes_primaria")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="estudiantes_ciclo_complementario" label="Número de estudiantes en Ciclo Complementario">
                <FormInput id="estudiantes_ciclo_complementario" type="number" min={0} {...register("estudiantes_ciclo_complementario")} placeholder="0" />
              </FormFieldWrapper>
            </FormSection>

            {/* Error global */}
            {errorEnvio && (
              <div className="form-section border border-destructive bg-destructive/5 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm font-medium">{errorEnvio}</p>
              </div>
            )}

            {/* Botón de envío */}
            <div className="text-center pb-8">
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-header)", boxShadow: "var(--shadow-header)" }}
              >
                {enviando ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Enviando ficha...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Ficha de Información
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Los campos marcados con <span className="required-star font-bold">*</span> son obligatorios
              </p>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center" style={{ background: "hsl(var(--primary))" }}>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white rounded-xl px-6 py-3 shadow-md inline-flex items-center justify-center">
              <img
                src={logoCosmo}
                alt="Cosmo Schools"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-white text-xs opacity-60">Programa RLT / CLT · Colombia · {new Date().getFullYear()}</p>
          </div>
        </footer>
      </div>
    </FormProvider>
  );
}
