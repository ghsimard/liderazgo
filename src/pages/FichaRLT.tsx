import { useState } from "react";
import { format } from "date-fns";
import { useAppImages } from "@/hooks/useAppImages";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/utils/dbClient";
import { generarPDFFicha } from "@/utils/pdfGenerator";
import { useGeographicData } from "@/hooks/useGeographicData";
import {
  FormFieldWrapper,
  FormInput,
  FormSelect,
  FormTextArea,
  FormRadioGroup,
  FormCheckboxGroup,
  FormRichTextArea,
  FormSection,
} from "@/components/FormComponents";
import { cn } from "@/lib/utils";
import { CheckCircle, Download, RefreshCw, Send, AlertCircle } from "lucide-react";

// ── Schema de validación ─────────────────────────────────────
const schema = z.object({
  acepta_datos: z.enum(["Sí", "No", ""]).refine((v) => v === "Sí", { message: "Debe aceptar el tratamiento de datos personales" }),
  nombres: z.string().min(2, "Ingrese sus nombres"),
  apellidos: z.string().min(2, "Ingrese sus apellidos"),
  genero: z.string().min(1, "Seleccione su género"),
  numero_cedula: z.string().min(1, "Ingrese su número de cédula"),
  fecha_nacimiento: z.string().min(1, "Seleccione su fecha de nacimiento").refine((val) => {
    if (!val) return false;
    const birth = new Date(val);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 18 && age <= 70;
  }, "La edad debe estar entre 18 y 70 años"),
  lugar_nacimiento: z.string().optional(),
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
  direccion_sede_principal: z.string().optional(),
  sitio_web: z.string().optional(),
  telefono_ie: z.string().optional(),
  zona_sede: z.string().min(1, "Seleccione la zona de sede"),
  sedes_rural: z.string().min(1, "Ingrese el número de sedes rurales"),
  sedes_urbana: z.string().min(1, "Ingrese el número de sedes urbanas"),
  jornadas: z.array(z.string()).min(1, "Seleccione al menos una jornada"),
  grupos_etnicos: z.array(z.string()).optional(),
  proyectos_transversales: z.string().optional(),
  
  desplazamiento: z.string().optional(),
  niveles_educativos: z.array(z.string()).min(1, "Seleccione al menos un nivel educativo"),
  tipo_bachillerato: z.array(z.string()).optional(),
  modelo_pedagogico: z.string().optional(),
  num_docentes: z.string().min(1, "Ingrese el número de docentes"),
  num_coordinadores: z.string().min(1, "Ingrese el número de coordinadores"),
  num_administrativos: z.string().min(1, "Ingrese el número de administrativos"),
  num_orientadores: z.string().min(1, "Ingrese el número de orientadores"),
  estudiantes_preescolar: z.string().optional(),
  estudiantes_primaria: z.string().optional(),
  estudiantes_basica_secundaria: z.string().optional(),
  estudiantes_media: z.string().optional(),
  estudiantes_ciclo_complementario: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const defaultValues: Partial<FormData> = {
  acepta_datos: "" as any,
  lengua_materna: "Español",
  enfermedad_base: "No",
  discapacidad: "No",
  cargo_actual: "Rector/a",
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
  const minYear = currentYear - 70;
  const maxYear = currentYear - 18;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
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

  const getLabel = (ie: string) => ie;

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
            setTimeout(() => {
              setOpen(false);
              if (!value) setQuery("");
            }, 150);
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


function RegionSelector({ onSelect, regionNames }: { onSelect: (region: string) => void; regionNames: string[] }) {
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt;
  const logoCLTDark = images.logo_clt_dark;
  const logoCosmo = images.logo_cosmo;
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
          {regionNames.map((region) => (
            <button
              key={region}
              onClick={() => onSelect(region)}
              className="w-full py-5 rounded-xl text-white font-semibold text-lg shadow-md transition-transform active:scale-95"
              style={{ background: "var(--gradient-header)" }}
            >
              {region}
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
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [mostrarModalErrores, setMostrarModalErrores] = useState(false);

  const { images } = useAppImages();
  const logoRLT = images.logo_rlt;
  const logoCLTDark = images.logo_clt_dark;
  const logoCosmo = images.logo_cosmo;
  const logoRLTWhite = images.logo_rlt_white;
  const logoCLTWhite = images.logo_clt_white;
  const logoCosmoWhite = images.logo_cosmo_white;

  const geo = useGeographicData();

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

  // Calculated total sedes
  const sedesRural = parseInt(watch("sedes_rural") || "0") || 0;
  const sedesUrbana = parseInt(watch("sedes_urbana") || "0") || 0;
  const totalSedes = sedesRural + sedesUrbana;

  // Geographic data from DB
  const entidadSeleccionada = watch("entidad_territorial") ?? "";
  const entidadesRegion = regionActual ? geo.getEntidadesForRegion(regionActual) : [];
  const hasMultipleEntidades = entidadesRegion.length > 1;

  // If multiple entidades and one is selected, intersect region municipios with entidad municipios
  // Otherwise fall back to region-level municipios
  const municipiosRegion = (() => {
    if (!regionActual) return [];
    const regionMunis = geo.getMunicipiosForRegion(regionActual);
    if (hasMultipleEntidades && entidadSeleccionada) {
      const entidadMunis = geo.getMunicipiosForEntidad(entidadSeleccionada);
      return regionMunis.filter((m) => entidadMunis.includes(m));
    }
    return regionMunis;
  })();
  const tienesMunicipios = municipiosRegion.length > 1;
  const municipios = tienesMunicipios ? municipiosRegion : [];
  const instituciones = tienesMunicipios && municipioSeleccionado
    ? geo.getInstitucionesForMunicipio(regionActual ?? "", municipioSeleccionado)
    : (regionActual ? geo.getInstitucionesForRegion(regionActual) : []);

  const onSubmit = async (data: FormData) => {
    setEnviando(true);
    setErrorEnvio(null);

    const toInt = (v: string | undefined) => (v ? parseInt(v) : null);

    const payload = {
      acepta_datos: data.acepta_datos === "Sí",
      nombres: data.nombres,
      apellidos: data.apellidos,
      nombres_apellidos: `${data.nombres} ${data.apellidos}`,
      genero: data.genero ?? null,
      numero_cedula: data.numero_cedula ?? null,
      fecha_nacimiento: data.fecha_nacimiento || null,
      lugar_nacimiento: data.lugar_nacimiento ?? null,
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
      direccion_sede_principal: data.direccion_sede_principal ?? null,
      sitio_web: data.sitio_web ?? null,
      telefono_ie: data.telefono_ie ?? null,
      zona_sede: data.zona_sede ?? null,
      sedes_rural: toInt(data.sedes_rural),
      sedes_urbana: toInt(data.sedes_urbana),
      jornadas: data.jornadas ?? null,
      grupos_etnicos: data.grupos_etnicos?.length ? data.grupos_etnicos.join(", ") : null,
      proyectos_transversales: data.proyectos_transversales ?? null,
      
      desplazamiento: data.desplazamiento ?? null,
      niveles_educativos: data.niveles_educativos ?? null,
      tipo_bachillerato: data.tipo_bachillerato?.length ? data.tipo_bachillerato.join(", ") : null,
      modelo_pedagogico: data.modelo_pedagogico ?? null,
      num_docentes: toInt(data.num_docentes),
      num_coordinadores: toInt(data.num_coordinadores),
      num_administrativos: toInt(data.num_administrativos),
      num_orientadores: toInt(data.num_orientadores),
      estudiantes_preescolar: toInt(data.estudiantes_preescolar),
      estudiantes_primaria: toInt(data.estudiantes_primaria),
      estudiantes_basica_secundaria: toInt(data.estudiantes_basica_secundaria),
      estudiantes_media: toInt(data.estudiantes_media),
      estudiantes_ciclo_complementario: toInt(data.estudiantes_ciclo_complementario),
    };

    const { error } = await supabase.from("fichas_rlt").insert(payload as any);

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

    // Auto-remplir l'Entidad Territorial si une seule, sinon vider pour sélection manuelle
    const ets = geo.getEntidadesForRegion(region);
    if (ets.length === 1) {
      setValue("entidad_territorial", ets[0], { shouldValidate: true });
    } else {
      setValue("entidad_territorial", "", { shouldValidate: false });
    }

    // Auto-sélectionner le municipio unique, sinon vider
    const munis = geo.getMunicipiosForRegion(region);
    if (munis.length === 1) {
      setMunicipioSeleccionado(munis[0]);
    } else {
      setMunicipioSeleccionado("");
    }

    setValue("nombre_ie", "");
    if (region === "Quibdó") {
      setValue("cargo_actual", "Rector/a", { shouldValidate: true });
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
    if (datosPDF) {
      const cargo = String(datosPDF.cargo_actual ?? "");
      const isRector = cargo.toLowerCase().includes("rector");
      const isCoordinador = cargo.toLowerCase().includes("coordinador");
      generarPDFFicha(datosPDF, { logoRLT: logoRLTWhite, logoCLTDark: logoCLTWhite, logoCosmo: logoCosmoWhite }, { showLogoRlt: isRector, showLogoClt: isCoordinador });
    }
  };

  const fieldLabels: Record<string, string> = {
    acepta_datos: "Aceptación de tratamiento de datos",
    nombres: "Nombres",
    apellidos: "Apellidos",
    genero: "Género",
    numero_cedula: "Número de cédula",
    fecha_nacimiento: "Fecha de nacimiento",
    lengua_materna: "Lengua materna",
    celular_personal: "Celular personal",
    correo_personal: "Correo personal",
    prefiere_correo: "Correo preferido para comunicaciones",
    enfermedad_base: "Enfermedad base",
    discapacidad: "Discapacidad",
    tipo_formacion: "Tipo de formación",
    titulo_pregrado: "Título de pregrado",
    region: "Región",
    nombre_ie: "Nombre de la institución educativa",
    cargo_actual: "Cargo actual",
    tipo_vinculacion: "Tipo de vinculación",
    codigo_dane: "Código DANE",
    entidad_territorial: "Entidad territorial",
    zona_sede: "Zona de sede",
    sedes_rural: "Sedes rurales",
    sedes_urbana: "Sedes urbanas",
    jornadas: "Jornadas",
    niveles_educativos: "Niveles educativos",
    num_docentes: "Número de docentes",
    num_coordinadores: "Número de coordinadores",
    num_administrativos: "Número de administrativos",
    num_orientadores: "Número de orientadores",
  };

  const onInvalid = (fieldErrors: Record<string, unknown>) => {
    const labels = Object.keys(fieldErrors).map(
      (key) => fieldLabels[key] || key
    );
    setCamposFaltantes(labels);
    setMostrarModalErrores(true);
  };

  const err = (name: keyof FormData) => errors[name]?.message as string | undefined;

  // ── Selección de región ──────────────────────────────────────
  if (!regionSeleccionada) {
    return <RegionSelector onSelect={handleRegionSelect} regionNames={geo.regionNames} />;
  }

  const showLogoRlt = geo.getShowLogoRlt(regionSeleccionada ?? "");
  const showLogoClt = geo.getShowLogoClt(regionSeleccionada ?? "");

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
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-10">
                {showLogoRlt && (
                  <img src={logoRLT} alt="Rectores Líderes Transformadores" className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
                )}
                {showLogoClt && (
                  <img src={logoCLTDark} alt="Coordinadores Líderes Transformadores" className="h-14 sm:h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
                )}
              </div>
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">Ficha de Información Básica</h1>
                {showLogoRlt && (
                  <p className="text-xs sm:text-sm md:text-base opacity-90 font-light mt-1">
                    Programa RLT — Rectores Líderes Transformadores
                  </p>
                )}
                {showLogoClt && (
                  <p className="text-xs sm:text-sm md:text-base font-light opacity-90">
                    Programa CLT — Coordinadores Líderes Transformadores
                  </p>
                )}
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 opacity-95">Región: {regionSeleccionada}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Franja verde */}
        <div className="h-1" style={{ background: "hsl(var(--accent))" }} />

        {/* Formulario */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>

            {/* Consentimiento */}
            <div className="form-section border-l-4" style={{ borderLeftColor: "hsl(var(--primary))" }}>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">
                  <strong>Autorización de datos personales: </strong>
                  Entiendo la información y acepto el tratamiento de mis datos personales conforme a la{" "}
                  <a href="https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:opacity-80">
                    Ley 1581 de 2012
                  </a>{" "}
                  de protección de datos de Colombia.{" "}
                  <span className="required-star">*</span>
                </p>
                <FormRadioGroup
                  name="acepta_datos"
                  options={[
                    { value: "Sí", label: "Sí" },
                    { value: "No", label: "No" },
                  ]}
                  value={watch("acepta_datos") as string}
                  onChange={(v) => setValue("acepta_datos", v as any)}
                  hasError={!!errors.acepta_datos}
                />
                {errors.acepta_datos && (
                  <p className="field-error flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.acepta_datos.message as string}
                  </p>
                )}
              </div>
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

              <FormFieldWrapper name="genero" label="Género" required staticLabel>
                <FormRadioGroup
                  name="genero"
                  options={[
                    { value: "Masculino", label: "Masculino" },
                    { value: "Femenino", label: "Femenino" },
                  ]}
                  value={watch("genero")}
                  onChange={(v) => setValue("genero", v, { shouldValidate: true })}
                  hasError={!!err("genero")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="numero_cedula" label="Número de cédula" required>
                <FormInput
                  id="numero_cedula"
                  {...register("numero_cedula")}
                  placeholder="Ej: 1234567890"
                  hasError={!!err("numero_cedula")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nacimiento" label="Fecha de nacimiento" required staticLabel>
                <DatePickerField
                  value={watch("fecha_nacimiento") ?? ""}
                  onChange={(v) => setValue("fecha_nacimiento", v, { shouldValidate: true })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="lugar_nacimiento" label="Lugar de nacimiento">
                <FormInput
                  id="lugar_nacimiento"
                  {...register("lugar_nacimiento")}
                  placeholder="Ej: Medellín, Antioquia"
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
              {/* Entidad Territorial — auto si una sola, select si varias */}
              {(() => {
                const ets = geo.getEntidadesForRegion(regionSeleccionada ?? "");
                const etValue = ets.length <= 1 ? (ets[0] ?? "") : (watch("entidad_territorial") ?? "");
                return (
                  <div className="flex flex-col gap-1">
                    <div className={cn("floating-field-wrapper", !!etValue && "field-has-value")}>
                      {ets.length <= 1 ? (
                        <input
                          id="entidad_territorial"
                          value={ets[0] ?? ""}
                          readOnly
                          disabled
                          className="form-input floating-input opacity-75 cursor-not-allowed"
                        />
                      ) : (
                        <select
                          id="entidad_territorial"
                          value={watch("entidad_territorial") ?? ""}
                          onChange={(e) => {
                            setValue("entidad_territorial", e.target.value, { shouldValidate: true });
                            // Reset municipio and institution when entidad changes
                            setMunicipioSeleccionado("");
                            setValue("nombre_ie", "");
                          }}
                          className="form-input floating-input"
                        >
                          <option value=""></option>
                          {ets.map((et) => (
                            <option key={et} value={et}>{et}</option>
                          ))}
                        </select>
                      )}
                      <label className="floating-label" htmlFor="entidad_territorial">
                        Entidad Territorial<span className="required-star ml-0.5">*</span>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Municipio — verrouillé ou liste déroulante */}
              {(() => {
                return (
                  <div className="flex flex-col gap-1">
                    <div className={cn("floating-field-wrapper", !!municipioSeleccionado && "field-has-value")}>
                    {!tienesMunicipios ? (
                        <input
                          id="municipio"
                          value={municipioSeleccionado}
                          readOnly
                          disabled
                          className="form-input floating-input opacity-75 cursor-not-allowed"
                        />
                      ) : (
                        <select
                          id="municipio"
                          value={municipioSeleccionado}
                          onChange={(e) => {
                            setMunicipioSeleccionado(e.target.value);
                            setValue("nombre_ie", "");
                          }}
                          className="form-input floating-input"
                        >
                          <option value=""></option>
                          {municipios.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      )}
                      <label className="floating-label" htmlFor="municipio">
                        Municipio<span className="required-star ml-0.5">*</span>
                      </label>
                    </div>
                  </div>
                );
              })()}

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

              <FormFieldWrapper name="cargo_actual" label="Cargo actual" required>
                {regionSeleccionada === "Quibdó" ? (
                  <input
                    id="cargo_actual"
                    value="Rector/a"
                    readOnly
                    disabled
                    className="form-input floating-input opacity-75 cursor-not-allowed"
                  />
                ) : (
                  <FormSelect
                    id="cargo_actual"
                    {...register("cargo_actual")}
                    hasError={!!err("cargo_actual")}
                    options={[
                      { value: "Rector/a", label: "Rector/a" },
                      { value: "Coordinador/a", label: "Coordinador/a" },
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
              <FormFieldWrapper name="direccion_sede_principal" label="Dirección de la sede principal" className="md:col-span-2">
                <FormInput id="direccion_sede_principal" {...register("direccion_sede_principal")} placeholder="Ej: Calle 10 # 20-30" />
              </FormFieldWrapper>

              <FormFieldWrapper name="telefono_ie" label="Teléfono de la IE">
                <FormInput id="telefono_ie" type="tel" {...register("telefono_ie")} placeholder="Ej: +57 604 1234567" />
              </FormFieldWrapper>

              <FormFieldWrapper name="sitio_web" label="Sitio web de la IE">
                <FormInput id="sitio_web" {...register("sitio_web")} placeholder="Ej: www.ie-ejemplo.edu.co" />
              </FormFieldWrapper>

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

              <div className="md:col-span-2 flex flex-col gap-3 max-w-[380px]">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sedes_rural" className="text-sm font-medium whitespace-nowrap">
                    Número de sedes en zona rural<span className="required-star ml-0.5">*</span>
                  </label>
                  <input id="sedes_rural" type="number" min={0} max={999} {...register("sedes_rural")} placeholder="0" className="form-input w-20 text-center shrink-0" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sedes_urbana" className="text-sm font-medium whitespace-nowrap">
                    Número de sedes en zona urbana<span className="required-star ml-0.5">*</span>
                  </label>
                  <input id="sedes_urbana" type="number" min={0} max={999} {...register("sedes_urbana")} placeholder="0" className="form-input w-20 text-center shrink-0" />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
                  <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                    Número total de sedes <span className="text-xs font-normal text-muted-foreground/70">(incluye la sede principal)</span>
                  </span>
                  <span className="w-20 text-center font-semibold text-sm shrink-0">{totalSedes}</span>
                </div>
              </div>

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

              <FormFieldWrapper name="grupos_etnicos" label="Grupos étnicos en la IE" staticLabel>
                <FormCheckboxGroup
                  name="grupos_etnicos"
                  options={[
                    { value: "Afrocolombianos / NARP", label: "Afrocolombianos / NARP (Negros, afrodescendientes, mulatos, raizales, palenqueros)" },
                    { value: "Indígenas", label: "Indígenas (pueblos originarios)" },
                    { value: "Rrom / Pueblo Gitano", label: "Rrom / Pueblo Gitano" },
                  ]}
                  value={watch("grupos_etnicos") || []}
                  onChange={(v) => setValue("grupos_etnicos", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="proyectos_transversales" label="Proyectos transversales de la IE" staticLabel className="md:col-span-2">
                <FormRichTextArea
                  id="proyectos_transversales"
                  value={watch("proyectos_transversales") || ""}
                  onChange={(v) => setValue("proyectos_transversales", v)}
                  placeholder="Ej: 1. PRAE&#10;2. PIGA"
                />
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

              <FormFieldWrapper name="tipo_bachillerato" label="Tipo de bachillerato que ofrece la IE" staticLabel>
                <FormCheckboxGroup
                  name="tipo_bachillerato"
                  options={[
                    { value: "Académico", label: "Académico" },
                    { value: "Técnico", label: "Técnico" },
                  ]}
                  value={watch("tipo_bachillerato") || []}
                  onChange={(v) => setValue("tipo_bachillerato", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="modelo_pedagogico" label="Modelo o enfoque pedagógico" className="md:col-span-2">
                <FormInput id="modelo_pedagogico" {...register("modelo_pedagogico")} placeholder="Ej: Constructivista, Tradicional, etc." />
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 6: Personal */}
            <FormSection number={6} title="Personal de la IE">
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
            </FormSection>

            {/* SECCIÓN 7: Estudiantes por nivel educativo */}
            <FormSection number={7} title="Estudiantes por nivel educativo">
              <div className="md:col-span-2 space-y-3 max-w-[420px]">
                <p className="text-sm text-muted-foreground mb-2">
                  Ingrese el número de estudiantes por nivel. Los niveles con estudiantes se marcarán automáticamente.
                </p>

                {[
                  { nivel: "Preescolar", label: "Preescolar (Prejardín, Jardín, Transición)", field: "estudiantes_preescolar" },
                  { nivel: "Básica primaria", label: "Básica primaria", field: "estudiantes_primaria" },
                  { nivel: "Básica secundaria", label: "Básica secundaria", field: "estudiantes_basica_secundaria" },
                  { nivel: "Media", label: "Media", field: "estudiantes_media" },
                  { nivel: "Ciclo complementario", label: "Ciclo complementario", field: "estudiantes_ciclo_complementario" },
                ].map(({ nivel, label, field }) => {
                  const count = parseInt(watch(field as any) || "0") || 0;
                  return (
                    <div key={nivel} className={cn(
                      "flex items-center justify-between gap-4 py-2 px-3 rounded-md border bg-background transition-colors",
                      count > 0 ? "border-primary/50 bg-primary/5" : "border-input"
                    )}>
                      <span className="text-sm flex-1 min-w-0 truncate">{label}</span>
                      <input
                        type="number"
                        min={0}
                        {...register(field as any, {
                          onChange: () => {
                            // Auto-sync niveles_educativos based on all counts
                            setTimeout(() => {
                              const fields = [
                                { nivel: "Preescolar", field: "estudiantes_preescolar" },
                                { nivel: "Básica primaria", field: "estudiantes_primaria" },
                                { nivel: "Básica secundaria", field: "estudiantes_basica_secundaria" },
                                { nivel: "Media", field: "estudiantes_media" },
                                { nivel: "Ciclo complementario", field: "estudiantes_ciclo_complementario" },
                              ];
                              const active = fields
                                .filter(f => parseInt(getValues(f.field as any) || "0") > 0)
                                .map(f => f.nivel);
                              setValue("niveles_educativos", active);
                            }, 0);
                          }
                        })}
                        placeholder="0"
                        className="form-input w-20 text-center shrink-0"
                      />
                    </div>
                  );
                })}

                {errors.niveles_educativos && (
                  <p className="field-error">{errors.niveles_educativos.message as string}</p>
                )}
              </div>
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

      {/* Modal de campos faltantes */}
      {mostrarModalErrores && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={() => setMostrarModalErrores(false)}>
          <div
            className="bg-background rounded-xl shadow-2xl w-[90%] max-w-md p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
              <h3 className="text-lg font-semibold text-foreground">Campos obligatorios faltantes</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Por favor complete los siguientes campos antes de enviar:
            </p>
            <ul className="space-y-1.5 mb-5">
              {camposFaltantes.map((campo) => (
                <li key={campo} className="flex items-center gap-2 text-sm text-destructive">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {campo}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMostrarModalErrores(false)}
              className="w-full py-2.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--gradient-header)" }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </FormProvider>
  );
}
