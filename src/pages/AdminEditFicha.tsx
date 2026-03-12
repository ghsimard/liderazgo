import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/utils/dbClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";
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
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";
import { useAppImages } from "@/hooks/useAppImages";
import { AlertCircle, ArrowLeft, RefreshCw, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Ficha = Tables<"fichas_rlt">;

// ── Schema (relaxed for admin) ────────────────────────────────
const schema = z.object({
  acepta_datos: z.boolean(),
  nombres: z.string().min(1, "Requerido"),
  apellidos: z.string().min(1, "Requerido"),
  genero: z.string().optional(),
  numero_cedula: z.string().optional(),
  fecha_nacimiento: z.string().min(1, "Requerido"),
  lugar_nacimiento: z.string().optional(),
  lengua_materna: z.string().min(1, "Requerido"),
  lengua_otra: z.string().optional(),
  celular_personal: z.string().min(1, "Requerido"),
  codigo_pais_celular: z.string().default("+57"),
  correo_personal: z.string().email("Correo inválido"),
  correo_institucional: z.string().email("Correo inválido").optional().or(z.literal("")),
  prefiere_correo: z.string().min(1, "Requerido"),
  enfermedad_base: z.string().min(1, "Requerido"),
  enfermedad_detalle: z.string().optional(),
  contacto_emergencia: z.string().optional(),
  telefono_emergencia: z.string().optional(),
  codigo_pais_telefono_emergencia: z.string().default("+57"),
  discapacidad: z.string().min(1, "Requerido"),
  discapacidad_detalle: z.string().optional(),
  tipo_formacion: z.string().optional(),
  titulo_pregrado: z.string().optional(),
  titulo_especializacion: z.string().optional(),
  titulo_maestria: z.string().optional(),
  titulo_doctorado: z.string().optional(),
  otros_titulos: z.string().optional(),
  region: z.string().min(1, "Requerido"),
  nombre_ie: z.string().min(1, "Requerido"),
  cargo_actual: z.string().min(1, "Requerido"),
  tipo_vinculacion: z.string().optional(),
  fecha_vinculacion_servicio: z.string().optional(),
  fecha_nombramiento_cargo: z.string().optional(),
  fecha_nombramiento_ie: z.string().optional(),
  estatuto: z.string().optional(),
  grado_escalafon: z.string().optional(),
  codigo_dane: z.string().optional(),
  entidad_territorial: z.string().optional(),
  comuna_barrio: z.string().optional(),
  direccion_sede_principal: z.string().optional(),
  sitio_web: z.string().optional(),
  telefono_ie: z.string().optional(),
  codigo_pais_telefono_ie: z.string().default("+57"),
  zona_sede: z.string().optional(),
  sedes_rural: z.string().optional(),
  sedes_urbana: z.string().optional(),
  jornadas: z.array(z.string()).optional(),
  grupos_etnicos: z.array(z.string()).optional(),
  proyectos_transversales: z.string().optional(),
  
  desplazamiento: z.string().optional(),
  niveles_educativos: z.array(z.string()).optional(),
  tipo_bachillerato: z.array(z.string()).min(1, "Seleccione al menos un tipo de bachillerato"),
  modelo_pedagogico: z.string().optional(),
  num_docentes: z.string().optional(),
  num_coordinadores: z.string().optional(),
  num_administrativos: z.string().optional(),
  num_orientadores: z.string().optional(),
  estudiantes_preescolar: z.string().optional(),
  estudiantes_primaria: z.string().optional(),
  estudiantes_basica_secundaria: z.string().optional(),
  estudiantes_media: z.string().optional(),
  estudiantes_ciclo_complementario: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

// ── DatePicker (identical to FichaRLT) ───────────────────────
function DatePickerField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const getparts = (v: string) => {
    if (!v) return { d: "" as const, m: "" as const, y: "" as const };
    const parsed = new Date(v + "T12:00:00");
    return { d: parsed.getDate() as number, m: parsed.getMonth() as number, y: parsed.getFullYear() as number };
  };

  const initial = getparts(value);
  const [day, setDay] = useState<number | "">(initial.d);
  const [month, setMonth] = useState<number | "">(initial.m);
  const [year, setYear] = useState<number | "">(initial.y);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      setDay(d.getDate());
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  }, [value]);

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
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const maxDay = month !== "" && year !== "" ? new Date(year as number, (month as number) + 1, 0).getDate() : 31;
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const selectClass = (filled: boolean) =>
    `form-input flex-1 !pt-0 !pb-0${showError && !filled ? " error" : ""}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <select disabled={disabled} value={day} onChange={(e) => { const d = e.target.value ? Number(e.target.value) : "" as const; setDay(d); commit(d, month, year); }} className={selectClass(day !== "")}>
          <option value="">Día</option>
          {days.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select disabled={disabled} value={month} onChange={(e) => { const m = e.target.value !== "" ? Number(e.target.value) : "" as const; setMonth(m); commit(day, m, year); }} className={selectClass(month !== "")}>
          <option value="">Mes</option>
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select disabled={disabled} value={year} onChange={(e) => { const y = e.target.value ? Number(e.target.value) : "" as const; setYear(y); commit(day, month, y); }} className={selectClass(year !== "")}>
          <option value="">Año</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {showError && <p className="field-error">Debe completar el día, mes y año</p>}
    </div>
  );
}

// ── InstitutionSearchField (identical to FichaRLT) ────────────
function InstitutionSearchField({
  instituciones, municipioSeleccionado, disabled = false, value, onChange, hasError, errorMsg,
}: {
  instituciones: string[]; municipioSeleccionado: string; disabled?: boolean; value: string;
  onChange: (val: string) => void; hasError?: boolean; errorMsg?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getLabel = (ie: string) => ie;
  const selectedLabel = value ? getLabel(value) : "";
  const hasContent = !!selectedLabel || query.length > 0;
  const labelUp = isFocused || hasContent;

  const filtered = query.length >= 3
    ? instituciones.filter((ie) => getLabel(ie).toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <div className="relative">
        <input
          id="nombre_ie" type="text" autoComplete="off" disabled={disabled}
          placeholder=" " value={selectedLabel || query}
          onChange={(e) => { if (value) onChange(""); setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setIsFocused(true); if (query.length >= 3) setOpen(true); }}
          onBlur={() => { setIsFocused(false); setTimeout(() => setOpen(false), 150); }}
          className={cn("form-input", hasError && "error")}
        />
        <label htmlFor="nombre_ie" style={{
          position: "absolute", left: "0.75rem", right: "0.75rem",
          top: labelUp ? "0.45rem" : "50%", transform: labelUp ? "none" : "translateY(-50%)",
          fontSize: labelUp ? "0.68rem" : "0.875rem", fontWeight: labelUp ? 600 : 400,
          color: isFocused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          pointerEvents: "none", transition: "top 0.2s ease, font-size 0.2s ease, color 0.2s ease, transform 0.2s ease",
          lineHeight: 1, zIndex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          Nombre de la Institución Educativa <span style={{ color: "hsl(var(--destructive))" }}>*</span>
        </label>
        {open && filtered.length > 0 && (
          <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {filtered.map((ie) => (
              <li key={ie}>
                <button type="button" onMouseDown={() => { onChange(ie); setQuery(""); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors">
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

// ── Helper: ficha → FormData ──────────────────────────────────
function fichaToFormData(f: Ficha): FormData {
  const s = (v: number | null | undefined) => v != null ? String(v) : "";
  return {
    acepta_datos: f.acepta_datos,
    nombres: f.nombres ?? "",
    apellidos: f.apellidos ?? "",
    genero: (f as any).genero ?? "",
    numero_cedula: (f as any).numero_cedula ?? "",
    fecha_nacimiento: f.fecha_nacimiento ?? "",
    lugar_nacimiento: (f as any).lugar_nacimiento ?? "",
    lengua_materna: f.lengua_materna ?? "Español",
    lengua_otra: f.lengua_otra ?? "",
    celular_personal: f.celular_personal ?? "",
    codigo_pais_celular: f.codigo_pais_celular ?? "+57",
    correo_personal: f.correo_personal ?? "",
    correo_institucional: f.correo_institucional ?? "",
    prefiere_correo: f.prefiere_correo ?? "",
    enfermedad_base: f.enfermedad_base ?? "No",
    enfermedad_detalle: f.enfermedad_detalle ?? "",
    contacto_emergencia: f.contacto_emergencia ?? "",
    telefono_emergencia: f.telefono_emergencia ?? "",
    codigo_pais_telefono_emergencia: f.codigo_pais_telefono_emergencia ?? "+57",
    discapacidad: f.discapacidad ?? "No",
    discapacidad_detalle: f.discapacidad_detalle ?? "",
    tipo_formacion: f.tipo_formacion ?? "",
    titulo_pregrado: f.titulo_pregrado ?? "",
    titulo_especializacion: f.titulo_especializacion ?? "",
    titulo_maestria: f.titulo_maestria ?? "",
    titulo_doctorado: f.titulo_doctorado ?? "",
    otros_titulos: f.otros_titulos ?? "",
    region: f.region ?? "",
    nombre_ie: f.nombre_ie ?? "",
    cargo_actual: f.cargo_actual ?? "",
    tipo_vinculacion: f.tipo_vinculacion ?? "",
    fecha_vinculacion_servicio: f.fecha_vinculacion_servicio ?? "",
    fecha_nombramiento_cargo: f.fecha_nombramiento_cargo ?? "",
    fecha_nombramiento_ie: f.fecha_nombramiento_ie ?? "",
    estatuto: f.estatuto ?? "",
    grado_escalafon: f.grado_escalafon ?? "",
    codigo_dane: f.codigo_dane ?? "",
    entidad_territorial: f.entidad_territorial ?? "",
    comuna_barrio: f.comuna_barrio ?? "",
    direccion_sede_principal: (f as any).direccion_sede_principal ?? "",
    sitio_web: (f as any).sitio_web ?? "",
    telefono_ie: (f as any).telefono_ie ?? "",
    codigo_pais_telefono_ie: f.codigo_pais_telefono_ie ?? "+57",
    zona_sede: f.zona_sede ?? "",
    sedes_rural: s(f.sedes_rural),
    sedes_urbana: s(f.sedes_urbana),
    jornadas: f.jornadas ?? [],
    grupos_etnicos: f.grupos_etnicos ? f.grupos_etnicos.split(", ") : [],
    proyectos_transversales: f.proyectos_transversales ?? "",
    
    desplazamiento: f.desplazamiento ?? "",
    niveles_educativos: f.niveles_educativos ?? [],
    tipo_bachillerato: f.tipo_bachillerato ? f.tipo_bachillerato.split(", ") : [],
    modelo_pedagogico: f.modelo_pedagogico ?? "",
    num_docentes: s(f.num_docentes),
    num_coordinadores: s(f.num_coordinadores),
    num_administrativos: s(f.num_administrativos),
    num_orientadores: s(f.num_orientadores),
    estudiantes_preescolar: s(f.estudiantes_preescolar),
    estudiantes_primaria: s(f.estudiantes_primaria),
    estudiantes_basica_secundaria: s((f as any).estudiantes_basica_secundaria),
    estudiantes_media: s((f as any).estudiantes_media),
    estudiantes_ciclo_complementario: s(f.estudiantes_ciclo_complementario),
  };
}

// EntidadTerritorialField now receives entidades from hook

// ── EntidadTerritorialField (autocomplete, dès 3 chars) ───────
function EntidadTerritorialField({
  value,
  onChange,
  hasError,
  entidadNames,
}: {
  value: string;
  onChange: (val: string) => void;
  hasError?: boolean;
  entidadNames: string[];
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const hasContent = query.length > 0;
  const labelUp = isFocused || hasContent;

  const filtered = query.length >= 3
    ? entidadNames.filter((et) => et.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="relative">
      <input
        id="entidad_territorial"
        type="text"
        autoComplete="off"
        placeholder=" "
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { setIsFocused(true); if (query.length >= 3) setOpen(true); }}
        onBlur={() => { setIsFocused(false); setTimeout(() => setOpen(false), 150); }}
        className={cn("form-input", hasError && "error")}
      />
      <label
        htmlFor="entidad_territorial"
        style={{
          position: "absolute", left: "0.75rem", right: "0.75rem",
          top: labelUp ? "0.45rem" : "50%",
          transform: labelUp ? "none" : "translateY(-50%)",
          fontSize: labelUp ? "0.68rem" : "0.875rem",
          fontWeight: labelUp ? 600 : 400,
          color: isFocused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          pointerEvents: "none",
          transition: "top 0.2s ease, font-size 0.2s ease, color 0.2s ease, transform 0.2s ease",
          lineHeight: 1, zIndex: 1,
        }}
      >
        Entidad Territorial <span style={{ color: "hsl(var(--destructive))" }}>*</span>
      </label>
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {filtered.map((et) => (
            <li key={et}>
              <button
                type="button"
                onMouseDown={() => { onChange(et); setQuery(et); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
              >
                {et}
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
  );
}

// ── Main component ────────────────────────────────────────────
export default function AdminEditFicha() {
  const { id } = useParams<{ id: string }>();
  const isCreateMode = !id || id === "new";
  const navigate = useNavigate();
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_noletters;
  const logoCLTDark = images.logo_clt_noletters;
  const logoCosmo = images.logo_cosmo;

  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [loadingFicha, setLoadingFicha] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [municipioSeleccionado, setMunicipioSeleccionado] = useState("");

  // Cedula verification (create mode only)
  const [cedulaVerificada, setCedulaVerificada] = useState(false);
  const [verificandoCedula, setVerificandoCedula] = useState(false);
  const [cedulaError, setCedulaError] = useState<string | null>(null);

  const geo = useGeographicData();

  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { jornadas: [], niveles_educativos: [], codigo_pais_celular: "+57", codigo_pais_telefono_emergencia: "+57", codigo_pais_telefono_ie: "+57" },
    mode: "onBlur",
  });

  const { register, watch, setValue, getValues, handleSubmit, reset, formState: { errors } } = methods;

  const regionSeleccionada = watch("region");
  const lenguaMaterna = watch("lengua_materna");
  const enfermedadBase = watch("enfermedad_base");
  const discapacidad = watch("discapacidad");
  const jornadas = watch("jornadas") ?? [];
  const nivelesEducativos = watch("niveles_educativos") ?? [];

  // Calculated total sedes
  const sedesRural = parseInt(watch("sedes_rural") || "0") || 0;
  const sedesUrbana = parseInt(watch("sedes_urbana") || "0") || 0;
  const totalSedes = sedesRural + sedesUrbana;

  // Geographic data driven by region — matching FichaRLT intersection logic
  const entidadSeleccionada = watch("entidad_territorial") ?? "";
  const entidadesRegion = geo.getEntidadesForRegion(regionSeleccionada ?? "");
  const hasMultipleEntidades = entidadesRegion.length > 1;

  const municipiosRegion = (() => {
    if (!regionSeleccionada) return [];
    const regionMunis = geo.getMunicipiosForRegion(regionSeleccionada);
    if (hasMultipleEntidades && entidadSeleccionada) {
      const entidadMunis = geo.getMunicipiosForEntidad(entidadSeleccionada);
      return regionMunis.filter((m) => entidadMunis.includes(m));
    }
    return regionMunis;
  })();
  const tienesMunicipios = municipiosRegion.length > 1;
  const municipios = tienesMunicipios ? municipiosRegion : [];

  // Auto-select single municipio
  if (municipiosRegion.length === 1 && municipioSeleccionado !== municipiosRegion[0]) {
    setTimeout(() => setMunicipioSeleccionado(municipiosRegion[0]), 0);
  }

  const instituciones = municipioSeleccionado && regionSeleccionada
    ? geo.getInstitucionesForMunicipio(regionSeleccionada, municipioSeleccionado)
    : (regionSeleccionada ? geo.getInstitucionesForRegion(regionSeleccionada) : []);

  // Load ficha and reset form
  useEffect(() => {
    if (isCreateMode || !id || !isAdmin) return;
    if (geo.loading) return;
    (async () => {
      const { data, error } = await supabase.from("fichas_rlt").select("*").eq("id", id).single();
      if (error || !data) {
        toast({ title: "Ficha no encontrada", variant: "destructive" });
        navigate("/admin");
        return;
      }
      setFicha(data);
      const formData = fichaToFormData(data);

      // Use entidad from DB via region mapping (keep existing value if multi-entidad)
      const region = data.region ?? "";
      const ets = geo.getEntidadesForRegion(region);
      if (ets.length === 1) {
        formData.entidad_territorial = ets[0];
      }
      // If multiple entidades, keep the stored value from ficha

      reset(formData);

      // Initialiser municipioSeleccionado selon la région et l'institution sauvegardée
      const munis = geo.getMunicipiosForRegion(region);
      if (munis.length === 1) {
        setMunicipioSeleccionado(munis[0]);
      } else if (munis.length > 1 && data.nombre_ie) {
        // Déduire le municipio à partir de l'institution sauvegardée
        const found = munis.find((m) => {
          const insts = geo.getInstitucionesForMunicipio(region, m);
          return insts.includes(data.nombre_ie);
        });
        setMunicipioSeleccionado(found ?? "");
      } else {
        setMunicipioSeleccionado("");
      }

      setLoadingFicha(false);
    })();
  }, [id, isAdmin, geo.loading]);

  // Cedula verification (create mode)
  const verificarCedula = async () => {
    const cedula = getValues("numero_cedula")?.trim();
    if (!cedula || cedula.length < 4) {
      setCedulaError("Ingrese un número de cédula válido");
      return;
    }
    setVerificandoCedula(true);
    setCedulaError(null);
    try {
      const { data, error } = await supabase.rpc("check_cedula_exists", { p_cedula: cedula });
      if (error) throw error;
      if (data === true) {
        setCedulaError("Ya existe una ficha registrada con este número de cédula.");
      } else {
        setCedulaVerificada(true);
        toast({ title: "Cédula verificada", description: "No existe duplicado." });
      }
    } catch {
      setCedulaError("Error al verificar la cédula. Intente de nuevo.");
    } finally {
      setVerificandoCedula(false);
    }
  };

  const err = (name: keyof FormData) => errors[name]?.message as string | undefined;

  const onSubmit = async (data: FormData) => {
    // In create mode, require cedula verification
    if (isCreateMode && data.numero_cedula?.trim() && !cedulaVerificada) {
      toast({ title: "Verifique la cédula antes de guardar", variant: "destructive" });
      return;
    }
    if (!isCreateMode && !ficha) return;
    setSaving(true);

    const toInt = (v: string | undefined) => (v ? parseInt(v) : null);

    const payload = {
      acepta_datos: data.acepta_datos,
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
      codigo_pais_celular: data.codigo_pais_celular ?? "+57",
      correo_personal: data.correo_personal,
      correo_institucional: data.correo_institucional || null,
      prefiere_correo: data.prefiere_correo,
      enfermedad_base: data.enfermedad_base,
      enfermedad_detalle: data.enfermedad_detalle ?? null,
      contacto_emergencia: data.contacto_emergencia ?? null,
      telefono_emergencia: data.telefono_emergencia ?? null,
      codigo_pais_telefono_emergencia: data.codigo_pais_telefono_emergencia ?? "+57",
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
      codigo_pais_telefono_ie: data.codigo_pais_telefono_ie ?? "+57",
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

    if (isCreateMode) {
      const { error } = await supabase.from("fichas_rlt").insert(payload as any);
      if (error) {
        const isDuplicate = error.message?.includes("unique") || error.message?.includes("duplicate") || error.code === "23505";
        toast({
          title: isDuplicate ? "Cédula duplicada" : "Error al crear",
          description: isDuplicate ? "Ya existe una ficha con este número de cédula." : error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Ficha creada correctamente" });
        navigate("/admin");
      }
    } else {
      const { error } = await supabase.from("fichas_rlt").update(payload as any).eq("id", ficha!.id);
      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ficha actualizada correctamente" });
        navigate("/admin");
      }
    }
    setSaving(false);
  };

  if (!isAdmin || loadingFicha) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isCreateMode && !ficha) return null;

  const showLogoRlt = geo.getShowLogoRlt(regionSeleccionada ?? "");
  const showLogoClt = geo.getShowLogoClt(regionSeleccionada ?? "");

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
                  <p className="text-xs sm:text-sm md:text-base opacity-90 font-light mt-1">Programa RLT — Rectores Líderes Transformadores</p>
                )}
                {showLogoClt && (
                  <p className="text-xs sm:text-sm md:text-base font-light opacity-90">Programa CLT — Coordinadores Líderes Transformadores</p>
                )}
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 opacity-95">{regionSeleccionada ? `Región: ${regionSeleccionada}` : (isCreateMode ? "Nueva Ficha" : "")}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Franja verde */}
        <div className="h-1" style={{ background: "hsl(var(--accent))" }} />

        {/* Back button */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/admin?tab=fichas-rlt")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al menú Fichas
          </button>
        </div>

        {/* Formulario */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Hidden fields — region is managed internally, not shown like in FichaRLT */}
            <input type="hidden" {...register("region")} />

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
            </div>

            {/* SECCIÓN 1: Datos personales */}
            <FormSection number={1} title="Datos Personales">
              <FormFieldWrapper name="nombres" label="Nombre(s)" required>
                <FormInput id="nombres" {...register("nombres")} placeholder="Ej: María Carolina" hasError={!!err("nombres")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="apellidos" label="Apellido(s)" required>
                <FormInput id="apellidos" {...register("apellidos")} placeholder="Ej: Rodríguez Pérez" hasError={!!err("apellidos")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="genero" label="Género" staticLabel>
                <FormRadioGroup
                  name="genero"
                  options={[
                    { value: "Masculino", label: "Masculino" },
                    { value: "Femenino", label: "Femenino" },
                  ]}
                  value={watch("genero")}
                  onChange={(v) => setValue("genero", v, { shouldValidate: true })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="numero_cedula" label="Número de cédula" required={isCreateMode}>
                {isCreateMode ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <FormInput
                        id="numero_cedula"
                        {...register("numero_cedula")}
                        placeholder="Ej: 1234567890"
                        disabled={cedulaVerificada}
                        hasError={!!cedulaError}
                        onChange={(e) => {
                          register("numero_cedula").onChange(e);
                          setCedulaVerificada(false);
                          setCedulaError(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={verificarCedula}
                        disabled={verificandoCedula || cedulaVerificada}
                        className="px-3 py-2 rounded-md text-sm font-medium text-white whitespace-nowrap disabled:opacity-50"
                        style={{ background: cedulaVerificada ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                      >
                        {verificandoCedula ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : cedulaVerificada ? (
                          "✓ Verificada"
                        ) : (
                          "Verificar"
                        )}
                      </button>
                    </div>
                    {cedulaError && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {cedulaError}
                      </p>
                    )}
                  </div>
                ) : (
                  <FormInput id="numero_cedula" {...register("numero_cedula")} placeholder="Ej: 1234567890" />
                )}
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nacimiento" label="Fecha de nacimiento" required staticLabel>
                <DatePickerField
                  value={watch("fecha_nacimiento") ?? ""}
                  onChange={(v) => setValue("fecha_nacimiento", v, { shouldValidate: true })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="lugar_nacimiento" label="Lugar de nacimiento">
                <FormInput id="lugar_nacimiento" {...register("lugar_nacimiento")} placeholder="Ej: Medellín, Antioquia" />
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

              <FormFieldWrapper name="celular_personal" label="Número de celular personal" required staticLabel>
                <PhoneInputWithCountry
                  id="celular_personal"
                  phoneValue={watch("celular_personal") ?? ""}
                  onPhoneChange={(v) => setValue("celular_personal", v, { shouldValidate: true })}
                  countryCode={watch("codigo_pais_celular") ?? "+57"}
                  onCountryCodeChange={(v) => setValue("codigo_pais_celular", v)}
                  placeholder="300 000 0000"
                  hasError={!!err("celular_personal")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="correo_personal" label="Correo electrónico personal" required>
                <FormInput id="correo_personal" type="email" {...register("correo_personal")} placeholder="correo@gmail.com" hasError={!!err("correo_personal")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="correo_institucional" label="Correo electrónico institucional">
                <FormInput id="correo_institucional" type="email" {...register("correo_institucional")} placeholder="correo@edu.co" hasError={!!err("correo_institucional")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="prefiere_correo" label="Prefiere recibir comunicaciones en el correo" required staticLabel>
                <FormRadioGroup
                  name="prefiere_correo"
                  options={[{ value: "Personal", label: "Personal" }, { value: "Institucional", label: "Institucional" }]}
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
                  options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }]}
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

              <FormFieldWrapper name="telefono_emergencia" label="¿Cuál es el número de contacto de emergencia?" staticLabel>
                <PhoneInputWithCountry
                  id="telefono_emergencia"
                  phoneValue={watch("telefono_emergencia") ?? ""}
                  onPhoneChange={(v) => setValue("telefono_emergencia", v)}
                  countryCode={watch("codigo_pais_telefono_emergencia") ?? "+57"}
                  onCountryCodeChange={(v) => setValue("codigo_pais_telefono_emergencia", v)}
                  placeholder="300 000 0000"
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="discapacidad" label="¿Tiene alguna discapacidad?" required className="md:col-span-2" staticLabel>
                <FormRadioGroup
                  name="discapacidad"
                  options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }]}
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
              <FormFieldWrapper name="tipo_formacion" label="Tipo de formación" className="md:col-span-2" staticLabel>
                <FormRadioGroup
                  name="tipo_formacion"
                  options={[{ value: "Profesional", label: "Profesional" }, { value: "Licenciado/a", label: "Licenciado/a" }]}
                  value={watch("tipo_formacion")}
                  onChange={(v) => setValue("tipo_formacion", v, { shouldValidate: true })}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="titulo_pregrado" label="Título de pregrado">
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

            {/* SECCIÓN 4: Institución — identical logic to FichaRLT */}
            <FormSection number={4} title="Información Institucional">
              {/* Región */}
              <FormFieldWrapper name="region" label="Región" required>
                <FormSelect
                  id="region"
                  value={regionSeleccionada ?? ""}
                  hasError={!!err("region")}
                  options={geo.regionNames.map((r) => ({ value: r, label: r }))}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("region", val, { shouldValidate: true });
                    const ets = geo.getEntidadesForRegion(val);
                    if (ets.length === 1) {
                      setValue("entidad_territorial", ets[0]);
                    } else {
                      setValue("entidad_territorial", "");
                    }
                    const munis = geo.getMunicipiosForRegion(val);
                    if (munis.length === 1) {
                      setMunicipioSeleccionado(munis[0]);
                    } else {
                      setMunicipioSeleccionado("");
                    }
                    setValue("nombre_ie", "");
                  }}
                />
              </FormFieldWrapper>

              {/* Entidad Territorial — auto si una sola, select si varias */}
              <FormFieldWrapper name="entidad_territorial" label="Entidad Territorial">
                {(() => {
                  const ets = geo.getEntidadesForRegion(regionSeleccionada ?? "");
                  if (ets.length <= 1) {
                    return (
                      <input
                        id="entidad_territorial"
                        value={watch("entidad_territorial") ?? ""}
                        readOnly
                        disabled
                        className="form-input floating-input opacity-75 cursor-not-allowed"
                        placeholder=" "
                      />
                    );
                  }
                  return (
                    <FormSelect
                      id="entidad_territorial"
                      value={watch("entidad_territorial") ?? ""}
                      options={ets.map((et) => ({ value: et, label: et }))}
                      onChange={(e) => {
                        setValue("entidad_territorial", e.target.value);
                        setMunicipioSeleccionado("");
                        setValue("nombre_ie", "");
                      }}
                    />
                  );
                })()}
              </FormFieldWrapper>

              {/* Municipio — field-has-value basé sur la valeur effective (state OU valeur fixe Quibdó) */}
              {(() => {
                const munis = municipiosRegion;
                const hasMultipleMunis = munis.length > 1;
                const hasSingleMuni = munis.length === 1;
                const effectiveValue = hasSingleMuni ? munis[0] : municipioSeleccionado;
                return (
                  <div className="flex flex-col gap-1">
                    <div className={cn("floating-field-wrapper", !!effectiveValue && "field-has-value")}>
                      {hasSingleMuni ? (
                        <input
                          id="municipio"
                          value={munis[0]}
                          readOnly
                          disabled
                          placeholder=" "
                          className="form-input floating-input opacity-75 cursor-not-allowed"
                        />
                      ) : hasMultipleMunis ? (
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
                          {munis.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="municipio"
                          value={municipioSeleccionado}
                          onChange={(e) => {
                            setMunicipioSeleccionado(e.target.value);
                            setValue("nombre_ie", "");
                          }}
                          placeholder=" "
                          className="form-input floating-input"
                        />
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

              {/* Institution search — identical to FichaRLT */}
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
                <FormInput id="codigo_dane" {...register("codigo_dane")} maxLength={12} hasError={!!err("codigo_dane")} />
              </FormFieldWrapper>

              {/* Cargo actual — locked for Quibdó, dropdown for others */}
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
                  options={[{ value: "En propiedad", label: "En propiedad" }, { value: "En encargo", label: "En encargo" }]}
                  value={watch("tipo_vinculacion")}
                  onChange={(v) => setValue("tipo_vinculacion", v, { shouldValidate: true })}
                  hasError={!!err("tipo_vinculacion")}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_vinculacion_servicio" label="Fecha de vinculación al servicio educativo estatal" staticLabel>
                <DatePickerField value={watch("fecha_vinculacion_servicio") ?? ""} onChange={(v) => setValue("fecha_vinculacion_servicio", v)} />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_cargo" label="Fecha de nombramiento estatal en el cargo actual" staticLabel>
                <DatePickerField value={watch("fecha_nombramiento_cargo") ?? ""} onChange={(v) => setValue("fecha_nombramiento_cargo", v)} />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_ie" label="Fecha de nombramiento del cargo actual en la IE" staticLabel>
                <DatePickerField value={watch("fecha_nombramiento_ie") ?? ""} onChange={(v) => setValue("fecha_nombramiento_ie", v)} />
              </FormFieldWrapper>

              <FormFieldWrapper name="estatuto" label="Estatuto al que pertenece" staticLabel>
                <FormRadioGroup
                  name="estatuto"
                  options={[{ value: "2277", label: "2277" }, { value: "1278", label: "1278" }]}
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

              <FormFieldWrapper name="telefono_ie" label="Teléfono de la IE" staticLabel>
                <PhoneInputWithCountry
                  id="telefono_ie"
                  phoneValue={watch("telefono_ie") ?? ""}
                  onPhoneChange={(v) => setValue("telefono_ie", v)}
                  countryCode={watch("codigo_pais_telefono_ie") ?? "+57"}
                  onCountryCodeChange={(v) => setValue("codigo_pais_telefono_ie", v)}
                  placeholder="604 123 4567"
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="sitio_web" label="Sitio web de la IE">
                <FormInput id="sitio_web" {...register("sitio_web")} placeholder="Ej: www.ie-ejemplo.edu.co" />
              </FormFieldWrapper>

              <FormFieldWrapper name="zona_sede" label="Zona de la sede principal de la IE" required staticLabel>
                <FormRadioGroup
                  name="zona_sede"
                  options={[{ value: "Urbana", label: "Urbana" }, { value: "Rural", label: "Rural" }]}
                  value={watch("zona_sede")}
                  onChange={(v) => setValue("zona_sede", v)}
                />
              </FormFieldWrapper>

              <div className="md:col-span-2 flex flex-col gap-3 max-w-[377px]">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sedes_rural" className="text-sm font-medium whitespace-nowrap">
                    Número de sedes en zona rural<span className="required-star ml-0.5">*</span>
                  </label>
                  <input id="sedes_rural" type="number" min={0} max={999} {...register("sedes_rural")} placeholder="0" className="form-input w-20 text-center shrink-0 !min-h-0 !py-1.5 !pt-1.5" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sedes_urbana" className="text-sm font-medium whitespace-nowrap">
                    Número de sedes en zona urbana<span className="required-star ml-0.5">*</span>
                  </label>
                  <input id="sedes_urbana" type="number" min={0} max={999} {...register("sedes_urbana")} placeholder="0" className="form-input w-20 text-center shrink-0 !min-h-0 !py-1.5 !pt-1.5" />
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-border">
                  <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap flex-1">
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
                  options={[{ value: "Sí", label: "Sí" }, { value: "No", label: "No" }]}
                  value={watch("desplazamiento")}
                  onChange={(v) => setValue("desplazamiento", v)}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="tipo_bachillerato" label="Tipo de bachillerato que ofrece la IE" staticLabel required>
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
              </div>
            </FormSection>

            {/* Botón guardar — styled like FichaRLT submit button */}
            <div className="text-center pb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base border border-border transition-colors hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-header)", boxShadow: "var(--shadow-header)" }}
              >
                {saving ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" />Guardando...</>
                ) : (
                  <><Save className="w-5 h-5" />Guardar cambios</>
                )}
              </button>
            </div>
          </form>
        </main>

      </div>
    </FormProvider>
  );
}
