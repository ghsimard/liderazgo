import { useState } from "react";
import logoRLT from "@/assets/logo_rlt.png";
import logoCLT from "@/assets/logo_clt.png";
import logoCLTDark from "@/assets/logo_clt_dark.png";
import logoCosmo from "@/assets/logo_cosmo.png";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { generarPDFFicha } from "@/utils/pdfGenerator";
import { institucionesPorRegion, entidadesTerritorialesColombia } from "@/data/instituciones";
import {
  FormFieldWrapper,
  FormInput,
  FormSelect,
  FormTextArea,
  FormRadioGroup,
  FormCheckboxGroup,
  FormSection,
} from "@/components/FormComponents";
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
  tipo_formacion: z.string().optional(),
  titulo_pregrado: z.string().optional(),
  titulo_especializacion: z.string().optional(),
  titulo_maestria: z.string().optional(),
  titulo_doctorado: z.string().optional(),
  otros_titulos: z.string().optional(),
  region: z.string().min(1, "Seleccione una región"),
  nombre_ie: z.string().min(1, "Seleccione la institución educativa"),
  cargo_actual: z.string().min(1, "Seleccione su cargo actual"),
  tipo_vinculacion: z.string().optional(),
  fecha_vinculacion_servicio: z.string().optional(),
  fecha_nombramiento_cargo: z.string().optional(),
  fecha_nombramiento_ie: z.string().optional(),
  estatuto: z.string().optional(),
  grado_escalafon: z.string().optional(),
  codigo_dane: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{12}$/.test(v), { message: "El Código DANE debe tener exactamente 12 dígitos numéricos" }),
  entidad_territorial: z.string().optional(),
  comuna_barrio: z.string().optional(),
  zona_sede: z.string().optional(),
  total_sedes: z.string().optional(),
  sedes_rural: z.string().optional(),
  sedes_urbana: z.string().optional(),
  jornadas: z.array(z.string()).optional(),
  grupos_etnicos: z.string().optional(),
  proyectos_transversales: z.string().optional(),
  estudiantes_jec: z.string().optional(),
  desplazamiento: z.string().optional(),
  niveles_educativos: z.array(z.string()).optional(),
  tipo_bachillerato: z.string().optional(),
  modelo_pedagogico: z.string().optional(),
  num_docentes: z.string().optional(),
  num_coordinadores: z.string().optional(),
  num_administrativos: z.string().optional(),
  num_orientadores: z.string().optional(),
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
  jornadas: [],
  niveles_educativos: [],
};

// ── Pantalla de selección de región ──────────────────────────
function RegionSelector({ onSelect }: { onSelect: (region: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Logos côte à côte : les deux sur fond foncé */}
        <div className="flex justify-center gap-6 mb-8 items-center">
          <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: "var(--gradient-header)" }}>
            <img src={logoRLT} alt="RLT" className="h-24 w-auto object-contain" />
          </div>
          <div className="rounded-xl p-3 flex items-center justify-center" style={{ background: "var(--gradient-header)" }}>
            <img src={logoCLTDark} alt="CLT" className="h-24 w-auto object-contain" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "hsl(var(--primary))" }}>
          Ficha de Información Básica
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Seleccione su región para continuar
        </p>
        <div className="flex flex-col gap-4">
          {["Quibdó", "Oriente"].map((region) => (
            <button
              key={region}
              onClick={() => onSelect(region)}
              className="w-full py-5 rounded-xl text-white font-semibold text-lg shadow-md transition-transform hover:scale-105 active:scale-95"
              style={{ background: "var(--gradient-header)" }}
            >
              {region === "Quibdó" ? "🏫 Quibdó" : "🏫 Oriente"}
            </button>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
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

  const instituciones = regionActual ? (institucionesPorRegion[regionActual] ?? []) : [];

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
    if (region === "Quibdó") {
      setValue("cargo_actual", "Rector / a", { shouldValidate: true });
    }
  };

  const handleNuevaFicha = () => {
    setRegionSeleccionada(null);
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
        <header className="text-white px-4 py-6 text-center" style={{ background: "var(--gradient-header)" }}>
          <div className="max-w-4xl mx-auto">
            {regionSeleccionada === "Quibdó" ? (
              /* Quibdó : un seul logo RLT centré au-dessus des titres */
              <div className="flex flex-col items-center gap-4">
                <img src={logoRLT} alt="Rectores Líderes Transformadores" className="h-20 w-auto object-contain drop-shadow-lg" />
                <div className="text-center">
                  <h1 className="text-2xl md:text-3xl font-bold leading-tight">Ficha de Información Básica</h1>
                  <p className="text-sm md:text-base opacity-90 font-light mt-1">Programa RLT — Rectores Líderes Transformadores</p>
                  <p className="text-xl md:text-2xl font-bold mt-2 opacity-95">Región: {regionSeleccionada}</p>
                </div>
              </div>
            ) : (
              /* Oriente : logo CLT à gauche, logo RLT à droite, titres centrés */
              <div className="flex items-center justify-center gap-10">
                <img src={logoCLTDark} alt="Coordinadores Líderes Transformadores" className="h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
                <div className="text-center">
                  <h1 className="text-2xl md:text-3xl font-bold leading-tight">Ficha de Información Básica</h1>
                  <p className="text-sm md:text-base opacity-90 font-light mt-1">
                    Programa RLT — Rectores Líderes Transformadores
                  </p>
                  <p className="text-sm md:text-base font-light opacity-90">
                    Programa CLT — Coordinadores Líderes Transformadores
                  </p>
                  <p className="text-xl md:text-2xl font-bold mt-2 opacity-95">Región: {regionSeleccionada}</p>
                </div>
                <img src={logoRLT} alt="Rectores Líderes Transformadores" className="h-20 w-auto object-contain drop-shadow-lg flex-shrink-0" />
              </div>
            )}
          </div>
        </header>

        {/* Franja verde */}
        <div className="h-1" style={{ background: "hsl(var(--accent))" }} />

        {/* Formulario */}
        <main className="max-w-4xl mx-auto px-4 py-8">
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
              <FormFieldWrapper name="nombres" label="Nombres" required>
                <FormInput
                  id="nombres"
                  {...register("nombres")}
                  placeholder="Ej: María Carolina"
                  hasError={!!err("nombres")}
                />
                {err("nombres") && <p className="field-error">{err("nombres")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="apellidos" label="Apellidos" required>
                <FormInput
                  id="apellidos"
                  {...register("apellidos")}
                  placeholder="Ej: Rodríguez Pérez"
                  hasError={!!err("apellidos")}
                />
                {err("apellidos") && <p className="field-error">{err("apellidos")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nacimiento" label="Fecha de nacimiento" required>
                <FormInput
                  id="fecha_nacimiento"
                  type="date"
                  {...register("fecha_nacimiento")}
                  hasError={!!err("fecha_nacimiento")}
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
                {err("lengua_materna") && <p className="field-error">{err("lengua_materna")}</p>}
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
                {err("celular_personal") && <p className="field-error">{err("celular_personal")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="correo_personal" label="Correo electrónico personal" required>
                <FormInput
                  id="correo_personal"
                  type="email"
                  {...register("correo_personal")}
                  placeholder="correo@gmail.com"
                  hasError={!!err("correo_personal")}
                />
                {err("correo_personal") && <p className="field-error">{err("correo_personal")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="correo_institucional" label="Correo electrónico institucional">
                <FormInput
                  id="correo_institucional"
                  type="email"
                  {...register("correo_institucional")}
                  placeholder="correo@edu.co"
                  hasError={!!err("correo_institucional")}
                />
                {err("correo_institucional") && <p className="field-error">{err("correo_institucional")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="prefiere_correo" label="Prefiere recibir comunicaciones en el correo" required>
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
                {err("prefiere_correo") && <p className="field-error">{err("prefiere_correo")}</p>}
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 2: Salud */}
            <FormSection number={2} title="Salud y Contacto de Emergencia">
              <FormFieldWrapper name="enfermedad_base" label="¿Tiene alguna enfermedad de base que pueda requerir atención especial?" required className="md:col-span-2">
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
                {err("enfermedad_base") && <p className="field-error">{err("enfermedad_base")}</p>}
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

              <FormFieldWrapper name="discapacidad" label="¿Tiene alguna discapacidad?" required className="md:col-span-2">
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
                {err("discapacidad") && <p className="field-error">{err("discapacidad")}</p>}
              </FormFieldWrapper>

              {discapacidad === "Sí" && (
                <FormFieldWrapper name="discapacidad_detalle" label="Si su respuesta fue afirmativa ¿Cuál es?" className="md:col-span-2">
                  <FormInput id="discapacidad_detalle" {...register("discapacidad_detalle")} placeholder="Indique el tipo de discapacidad" />
                </FormFieldWrapper>
              )}
            </FormSection>

            {/* SECCIÓN 3: Formación */}
            <FormSection number={3} title="Formación Académica">
              <FormFieldWrapper name="tipo_formacion" label="Tipo de formación" className="md:col-span-2">
                <FormInput id="tipo_formacion" {...register("tipo_formacion")} placeholder="Ej: Licenciatura, Ingeniería, etc." />
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

            {/* SECCIÓN 4: Institución */}
            <FormSection number={4} title="Información Institucional">
              <FormFieldWrapper name="nombre_ie" label="Nombre de la Institución Educativa" required>
                <select
                  id="nombre_ie"
                  {...register("nombre_ie")}
                  className={`form-input ${err("nombre_ie") ? "error" : ""}`}
                >
                  <option value="">Seleccione la institución</option>
                  {(institucionesPorRegion[regionSeleccionada] ?? []).map((ie) => (
                    <option key={ie} value={ie}>{ie}</option>
                  ))}
                </select>
                {err("nombre_ie") && <p className="field-error">{err("nombre_ie")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="cargo_actual" label="Cargo actual" required>
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
                {err("cargo_actual") && <p className="field-error">{err("cargo_actual")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="tipo_vinculacion" label="Tipo de vinculación actual">
                <FormSelect
                  id="tipo_vinculacion"
                  {...register("tipo_vinculacion")}
                  placeholder="Seleccione"
                  options={[
                    { value: "En propiedad", label: "En propiedad" },
                    { value: "En encargo", label: "En encargo" },
                  ]}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_vinculacion_servicio" label="Fecha de vinculación al servicio educativo estatal">
                <FormInput id="fecha_vinculacion_servicio" type="date" {...register("fecha_vinculacion_servicio")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_cargo" label="Fecha de nombramiento estatal en el cargo actual">
                <FormInput id="fecha_nombramiento_cargo" type="date" {...register("fecha_nombramiento_cargo")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="fecha_nombramiento_ie" label="Fecha de nombramiento del cargo actual en la IE">
                <FormInput id="fecha_nombramiento_ie" type="date" {...register("fecha_nombramiento_ie")} />
              </FormFieldWrapper>

              <FormFieldWrapper name="estatuto" label="Estatuto al que pertenece">
                <FormSelect
                  id="estatuto"
                  {...register("estatuto")}
                  placeholder="Seleccione"
                  options={[
                    { value: "2277", label: "2277" },
                    { value: "1278", label: "1278" },
                  ]}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="grado_escalafon" label="Grado en el escalafón">
                <FormInput id="grado_escalafon" {...register("grado_escalafon")} placeholder="Ej: 2B, 3, etc." />
              </FormFieldWrapper>

              <FormFieldWrapper name="codigo_dane" label="Código DANE de la IE (12 dígitos)">
                <FormInput
                  id="codigo_dane"
                  {...register("codigo_dane")}
                  placeholder="123456789012"
                  maxLength={12}
                  hasError={!!err("codigo_dane")}
                />
                {err("codigo_dane") && <p className="field-error">{err("codigo_dane")}</p>}
              </FormFieldWrapper>

              <FormFieldWrapper name="entidad_territorial" label="Entidad Territorial">
                <FormSelect
                  id="entidad_territorial"
                  {...register("entidad_territorial")}
                  placeholder="Seleccione"
                  options={entidadesTerritorialesColombia.map((et) => ({ value: et, label: et }))}
                />
              </FormFieldWrapper>

              <FormFieldWrapper name="comuna_barrio" label="Comuna, barrio, corregimiento o localidad">
                <FormInput id="comuna_barrio" {...register("comuna_barrio")} placeholder="Ej: Barrio La Esperanza" />
              </FormFieldWrapper>
            </FormSection>

            {/* SECCIÓN 5: Datos de la IE */}
            <FormSection number={5} title="Datos de la Institución Educativa">
              <FormFieldWrapper name="zona_sede" label="Zona de la sede principal de la IE">
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

              <FormFieldWrapper name="total_sedes" label="Número total de sedes (incluida la sede principal)">
                <FormInput id="total_sedes" type="number" min={1} {...register("total_sedes")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="sedes_rural" label="Número de sedes en zona rural">
                <FormInput id="sedes_rural" type="number" min={0} {...register("sedes_rural")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="sedes_urbana" label="Número de sedes en zona urbana">
                <FormInput id="sedes_urbana" type="number" min={0} {...register("sedes_urbana")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="jornadas" label="Jornadas de la IE" className="md:col-span-2" hideError>
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

              <FormFieldWrapper name="estudiantes_jec" label="Número de estudiantes en JEC / Inspiración Comfama">
                <FormInput id="estudiantes_jec" type="number" min={0} {...register("estudiantes_jec")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="desplazamiento" label="¿Hay estudiantes o familias en condición de desplazamiento?">
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

              <FormFieldWrapper name="niveles_educativos" label="Niveles educativos que ofrece la IE" className="md:col-span-2" hideError>
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
              <FormFieldWrapper name="num_docentes" label="Número de docentes">
                <FormInput id="num_docentes" type="number" min={0} {...register("num_docentes")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_coordinadores" label="Número de coordinadores/as">
                <FormInput id="num_coordinadores" type="number" min={0} {...register("num_coordinadores")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_administrativos" label="Número de administrativos">
                <FormInput id="num_administrativos" type="number" min={0} {...register("num_administrativos")} placeholder="0" />
              </FormFieldWrapper>

              <FormFieldWrapper name="num_orientadores" label="Número de orientadores/as">
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
