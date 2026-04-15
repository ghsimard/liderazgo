
-- ============================================
-- Table 1: ae_rectores_2025
-- ============================================
CREATE TABLE public.ae_rectores_2025 (
  id serial PRIMARY KEY,
  excel_id integer,
  entiendo_la_informacion_y_acepto_el_trato_de_mis_datos_personal text,
  nombre_s_y_apellido_s_completo_s text,
  numero_de_cedula text,
  genero text,
  lugar_de_nacimiento text,
  fecha_de_nacimiento text,
  lengua_materna text,
  numero_de_celular_personal text,
  correo_electronico_personal text,
  correo_electronico_institucional_el_que_usted_usa_en_su_rol_com text,
  prefiere_recibir_comunicaciones_en_el_correo text,
  tiene_alguna_enfermedad_de_base_por_la_que_pueda_requerir_atenc text,
  si_requiere_atencion_medica_urgente_durante_algun_encuentro_pre text,
  cual_es_su_numero_de_contacto text,
  tiene_alguna_discapacidad text,
  tipo_de_formacion text,
  titulo_de_pregrado text,
  titulo_de_especializacion text,
  titulo_de_maestria text,
  titulo_de_doctorado text,
  nombre_de_la_institucion_educativa_en_la_actualmente_desempena_ text,
  cargo_actual text,
  tipo_de_vinculacion_actual text,
  fecha_de_vinculacion_al_servicio_educativo_estatal text,
  fecha_de_nombramiento_estatal_en_el_cargo_actual text,
  fecha_de_nombramiento_del_cargo_actual_en_la_ie text,
  estatuto_al_que_pertenece text,
  grado_en_el_escalafon text,
  codigo_dane_de_la_ie_12_digitos text,
  entidad_territorial text,
  comuna_corregimiento_o_localidad text,
  zona_de_la_sede_principal_de_la_ie text,
  zona_de_la_sede_principal_de_la_ie2 text,
  direccion_de_la_sede_principal text,
  telefono_de_contacto_de_la_ie text,
  sitio_web text,
  correo_electronico_institucional text,
  numero_total_de_sedes_de_la_ie_incluida_la_sede_principal text,
  numero_de_sedes_en_zona_rural text,
  numero_de_sedes_en_zona_urbana text,
  jornadas_de_la_ie_seleccion_multiple text,
  grupos_etnicos_en_la_ie_seleccion_multiple text,
  proyectos_transversales_de_la_ie text,
  estudiantes_o_familias_de_la_ie_en_condicion_de_desplazamiento text,
  niveles_educativos_que_ofrece_la_ie_seleccion_multiple text,
  tipo_de_bachillerato_que_ofrece_la_ie text,
  modelo_o_enfoque_pedagogico text,
  numero_de_docentes text,
  numero_de_coordinadoras_es text,
  numero_de_administrativos text,
  numero_de_orientadoras_es text,
  numero_de_estudiantes_en_preescolar text,
  numero_de_estudiantes_en_basica_primaria text,
  numero_de_estudiantes_en_basica_secundaria text,
  numero_de_estudiantes_en_media text,
  numero_de_estudiantes_en_ciclo_complementario text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ae_rectores_2025 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_rectores_2025" ON public.ae_rectores_2025 FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_rectores_2025" ON public.ae_rectores_2025 FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_rectores_2025" ON public.ae_rectores_2025 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_rectores_2025" ON public.ae_rectores_2025 FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_rectores_2025" ON public.ae_rectores_2025 FOR DELETE USING (has_admin_access(auth.uid()));

-- ============================================
-- Table 2: ae_docentes_submissions_2025
-- ============================================
CREATE TABLE public.ae_docentes_submissions_2025 (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  institucion_educativa text NOT NULL,
  anos_como_docente text,
  grados_asignados text,
  jornada text,
  retroalimentacion_de text,
  comunicacion jsonb NOT NULL DEFAULT '{}'::jsonb,
  practicas_pedagogicas jsonb NOT NULL DEFAULT '{}'::jsonb,
  convivencia jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.ae_docentes_submissions_2025 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_docentes_submissions_2025" ON public.ae_docentes_submissions_2025 FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_docentes_submissions_2025" ON public.ae_docentes_submissions_2025 FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_docentes_submissions_2025" ON public.ae_docentes_submissions_2025 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_docentes_submissions_2025" ON public.ae_docentes_submissions_2025 FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_docentes_submissions_2025" ON public.ae_docentes_submissions_2025 FOR DELETE USING (has_admin_access(auth.uid()));

-- ============================================
-- Table 3: ae_estudiantes_submissions_2025
-- ============================================
CREATE TABLE public.ae_estudiantes_submissions_2025 (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  institucion_educativa text NOT NULL,
  anos_estudiando text,
  grado_actual text,
  jornada text,
  comunicacion jsonb NOT NULL DEFAULT '{}'::jsonb,
  practicas_pedagogicas jsonb NOT NULL DEFAULT '{}'::jsonb,
  convivencia jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.ae_estudiantes_submissions_2025 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_estudiantes_submissions_2025" ON public.ae_estudiantes_submissions_2025 FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_estudiantes_submissions_2025" ON public.ae_estudiantes_submissions_2025 FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_estudiantes_submissions_2025" ON public.ae_estudiantes_submissions_2025 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_estudiantes_submissions_2025" ON public.ae_estudiantes_submissions_2025 FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_estudiantes_submissions_2025" ON public.ae_estudiantes_submissions_2025 FOR DELETE USING (has_admin_access(auth.uid()));

-- ============================================
-- Table 4: ae_acudientes_submissions_2025
-- ============================================
CREATE TABLE public.ae_acudientes_submissions_2025 (
  id serial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  institucion_educativa text NOT NULL,
  grados_estudiantes text,
  comunicacion jsonb NOT NULL DEFAULT '{}'::jsonb,
  practicas_pedagogicas jsonb NOT NULL DEFAULT '{}'::jsonb,
  convivencia jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.ae_acudientes_submissions_2025 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ae_acudientes_submissions_2025" ON public.ae_acudientes_submissions_2025 FOR SELECT USING (has_admin_access(auth.uid()));
CREATE POLICY "Viewers can read ae_acudientes_submissions_2025" ON public.ae_acudientes_submissions_2025 FOR SELECT TO authenticated USING (has_read_access(auth.uid()));
CREATE POLICY "Admins can insert ae_acudientes_submissions_2025" ON public.ae_acudientes_submissions_2025 FOR INSERT WITH CHECK (has_admin_access(auth.uid()));
CREATE POLICY "Admins can update ae_acudientes_submissions_2025" ON public.ae_acudientes_submissions_2025 FOR UPDATE USING (has_admin_access(auth.uid()));
CREATE POLICY "Admins can delete ae_acudientes_submissions_2025" ON public.ae_acudientes_submissions_2025 FOR DELETE USING (has_admin_access(auth.uid()));
