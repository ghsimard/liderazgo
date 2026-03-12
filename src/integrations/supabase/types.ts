export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_cedulas: {
        Row: {
          cedula: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cedula: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cedula?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_images: {
        Row: {
          id: string
          image_key: string
          storage_path: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          image_key: string
          storage_path: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          image_key?: string
          storage_path?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      competencies_360: {
        Row: {
          domain_id: string
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          domain_id: string
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          domain_id?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "competencies_360_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains_360"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_weights: {
        Row: {
          competency_key: string
          id: string
          observer_role: string
          weight: number
        }
        Insert: {
          competency_key: string
          id?: string
          observer_role: string
          weight?: number
        }
        Update: {
          competency_key?: string
          id?: string
          observer_role?: string
          weight?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          asunto: string
          codigo_pais: string
          contactar_whatsapp: boolean
          created_at: string
          email: string
          es_anonimo: boolean
          id: string
          leido: boolean
          mensaje: string
          nombre: string
          rating: number | null
          rol_remitente: string | null
          telefono: string | null
          tipo_contacto: string
        }
        Insert: {
          asunto: string
          codigo_pais?: string
          contactar_whatsapp?: boolean
          created_at?: string
          email: string
          es_anonimo?: boolean
          id?: string
          leido?: boolean
          mensaje: string
          nombre: string
          rating?: number | null
          rol_remitente?: string | null
          telefono?: string | null
          tipo_contacto?: string
        }
        Update: {
          asunto?: string
          codigo_pais?: string
          contactar_whatsapp?: boolean
          created_at?: string
          email?: string
          es_anonimo?: boolean
          id?: string
          leido?: boolean
          mensaje?: string
          nombre?: string
          rating?: number | null
          rol_remitente?: string | null
          telefono?: string | null
          tipo_contacto?: string
        }
        Relationships: []
      }
      deleted_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          deleted_data: Json
          id: string
          record_label: string
          record_type: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_data?: Json
          id?: string
          record_label: string
          record_type: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          deleted_data?: Json
          id?: string
          record_label?: string
          record_type?: string
        }
        Relationships: []
      }
      domains_360: {
        Row: {
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          id?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      encuesta_invitaciones: {
        Row: {
          access_count: number
          directivo_cedula: string
          directivo_nombre: string
          email_destinatario: string
          fase: string
          id: string
          institucion: string
          last_reminder_at: string | null
          responded_at: string | null
          sent_at: string
          tipo_formulario: string
          token: string
        }
        Insert: {
          access_count?: number
          directivo_cedula: string
          directivo_nombre: string
          email_destinatario: string
          fase?: string
          id?: string
          institucion: string
          last_reminder_at?: string | null
          responded_at?: string | null
          sent_at?: string
          tipo_formulario: string
          token?: string
        }
        Update: {
          access_count?: number
          directivo_cedula?: string
          directivo_nombre?: string
          email_destinatario?: string
          fase?: string
          id?: string
          institucion?: string
          last_reminder_at?: string | null
          responded_at?: string | null
          sent_at?: string
          tipo_formulario?: string
          token?: string
        }
        Relationships: []
      }
      encuestas_360: {
        Row: {
          cargo_directivo: string
          cargo_evaluador: string | null
          cedula: string | null
          cedula_directivo: string | null
          created_at: string
          dias_contacto: string | null
          email_evaluador: string | null
          fase: string
          grado_estudiante: string | null
          id: string
          institucion_educativa: string
          nombre_completo: string | null
          nombre_directivo: string | null
          respuestas: Json
          tipo_formulario: string
        }
        Insert: {
          cargo_directivo: string
          cargo_evaluador?: string | null
          cedula?: string | null
          cedula_directivo?: string | null
          created_at?: string
          dias_contacto?: string | null
          email_evaluador?: string | null
          fase?: string
          grado_estudiante?: string | null
          id?: string
          institucion_educativa: string
          nombre_completo?: string | null
          nombre_directivo?: string | null
          respuestas?: Json
          tipo_formulario: string
        }
        Update: {
          cargo_directivo?: string
          cargo_evaluador?: string | null
          cedula?: string | null
          cedula_directivo?: string | null
          created_at?: string
          dias_contacto?: string | null
          email_evaluador?: string | null
          fase?: string
          grado_estudiante?: string | null
          id?: string
          institucion_educativa?: string
          nombre_completo?: string | null
          nombre_directivo?: string | null
          respuestas?: Json
          tipo_formulario?: string
        }
        Relationships: []
      }
      encuestas_ambiente_escolar: {
        Row: {
          created_at: string
          id: string
          institucion_educativa: string
          respuestas: Json
          tipo_formulario: string
        }
        Insert: {
          created_at?: string
          id?: string
          institucion_educativa: string
          respuestas?: Json
          tipo_formulario: string
        }
        Update: {
          created_at?: string
          id?: string
          institucion_educativa?: string
          respuestas?: Json
          tipo_formulario?: string
        }
        Relationships: []
      }
      entidades_territoriales: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      fichas_rlt: {
        Row: {
          acepta_datos: boolean
          apellidos: string | null
          cargo_actual: string
          celular_personal: string
          codigo_dane: string | null
          codigo_pais_celular: string
          codigo_pais_telefono_emergencia: string | null
          codigo_pais_telefono_ie: string | null
          comuna_barrio: string | null
          contacto_emergencia: string | null
          correo_institucional: string | null
          correo_personal: string
          created_at: string
          desplazamiento: string | null
          direccion_sede_principal: string | null
          discapacidad: string
          discapacidad_detalle: string | null
          enfermedad_base: string
          enfermedad_detalle: string | null
          entidad_territorial: string | null
          estatuto: string | null
          estudiantes_basica_secundaria: number | null
          estudiantes_ciclo_complementario: number | null
          estudiantes_media: number | null
          estudiantes_preescolar: number | null
          estudiantes_primaria: number | null
          fecha_nacimiento: string
          fecha_nombramiento_cargo: string | null
          fecha_nombramiento_ie: string | null
          fecha_vinculacion_servicio: string | null
          genero: string | null
          grado_escalafon: string | null
          grupos_etnicos: string | null
          id: string
          jornadas: string[] | null
          lengua_materna: string
          lengua_otra: string | null
          lugar_nacimiento: string | null
          modelo_pedagogico: string | null
          niveles_educativos: string[] | null
          nombre_ie: string
          nombres: string | null
          nombres_apellidos: string
          num_administrativos: number | null
          num_coordinadores: number | null
          num_docentes: number | null
          num_orientadores: number | null
          numero_cedula: string | null
          otros_titulos: string | null
          prefiere_correo: string
          proyectos_transversales: string | null
          region: string
          sedes_rural: number | null
          sedes_urbana: number | null
          sitio_web: string | null
          telefono_emergencia: string | null
          telefono_ie: string | null
          tipo_bachillerato: string | null
          tipo_formacion: string | null
          tipo_vinculacion: string | null
          titulo_doctorado: string | null
          titulo_especializacion: string | null
          titulo_maestria: string | null
          titulo_pregrado: string | null
          updated_at: string
          zona_sede: string | null
        }
        Insert: {
          acepta_datos?: boolean
          apellidos?: string | null
          cargo_actual: string
          celular_personal: string
          codigo_dane?: string | null
          codigo_pais_celular?: string
          codigo_pais_telefono_emergencia?: string | null
          codigo_pais_telefono_ie?: string | null
          comuna_barrio?: string | null
          contacto_emergencia?: string | null
          correo_institucional?: string | null
          correo_personal: string
          created_at?: string
          desplazamiento?: string | null
          direccion_sede_principal?: string | null
          discapacidad?: string
          discapacidad_detalle?: string | null
          enfermedad_base?: string
          enfermedad_detalle?: string | null
          entidad_territorial?: string | null
          estatuto?: string | null
          estudiantes_basica_secundaria?: number | null
          estudiantes_ciclo_complementario?: number | null
          estudiantes_media?: number | null
          estudiantes_preescolar?: number | null
          estudiantes_primaria?: number | null
          fecha_nacimiento: string
          fecha_nombramiento_cargo?: string | null
          fecha_nombramiento_ie?: string | null
          fecha_vinculacion_servicio?: string | null
          genero?: string | null
          grado_escalafon?: string | null
          grupos_etnicos?: string | null
          id?: string
          jornadas?: string[] | null
          lengua_materna?: string
          lengua_otra?: string | null
          lugar_nacimiento?: string | null
          modelo_pedagogico?: string | null
          niveles_educativos?: string[] | null
          nombre_ie: string
          nombres?: string | null
          nombres_apellidos: string
          num_administrativos?: number | null
          num_coordinadores?: number | null
          num_docentes?: number | null
          num_orientadores?: number | null
          numero_cedula?: string | null
          otros_titulos?: string | null
          prefiere_correo: string
          proyectos_transversales?: string | null
          region: string
          sedes_rural?: number | null
          sedes_urbana?: number | null
          sitio_web?: string | null
          telefono_emergencia?: string | null
          telefono_ie?: string | null
          tipo_bachillerato?: string | null
          tipo_formacion?: string | null
          tipo_vinculacion?: string | null
          titulo_doctorado?: string | null
          titulo_especializacion?: string | null
          titulo_maestria?: string | null
          titulo_pregrado?: string | null
          updated_at?: string
          zona_sede?: string | null
        }
        Update: {
          acepta_datos?: boolean
          apellidos?: string | null
          cargo_actual?: string
          celular_personal?: string
          codigo_dane?: string | null
          codigo_pais_celular?: string
          codigo_pais_telefono_emergencia?: string | null
          codigo_pais_telefono_ie?: string | null
          comuna_barrio?: string | null
          contacto_emergencia?: string | null
          correo_institucional?: string | null
          correo_personal?: string
          created_at?: string
          desplazamiento?: string | null
          direccion_sede_principal?: string | null
          discapacidad?: string
          discapacidad_detalle?: string | null
          enfermedad_base?: string
          enfermedad_detalle?: string | null
          entidad_territorial?: string | null
          estatuto?: string | null
          estudiantes_basica_secundaria?: number | null
          estudiantes_ciclo_complementario?: number | null
          estudiantes_media?: number | null
          estudiantes_preescolar?: number | null
          estudiantes_primaria?: number | null
          fecha_nacimiento?: string
          fecha_nombramiento_cargo?: string | null
          fecha_nombramiento_ie?: string | null
          fecha_vinculacion_servicio?: string | null
          genero?: string | null
          grado_escalafon?: string | null
          grupos_etnicos?: string | null
          id?: string
          jornadas?: string[] | null
          lengua_materna?: string
          lengua_otra?: string | null
          lugar_nacimiento?: string | null
          modelo_pedagogico?: string | null
          niveles_educativos?: string[] | null
          nombre_ie?: string
          nombres?: string | null
          nombres_apellidos?: string
          num_administrativos?: number | null
          num_coordinadores?: number | null
          num_docentes?: number | null
          num_orientadores?: number | null
          numero_cedula?: string | null
          otros_titulos?: string | null
          prefiere_correo?: string
          proyectos_transversales?: string | null
          region?: string
          sedes_rural?: number | null
          sedes_urbana?: number | null
          sitio_web?: string | null
          telefono_emergencia?: string | null
          telefono_ie?: string | null
          tipo_bachillerato?: string | null
          tipo_formacion?: string | null
          tipo_vinculacion?: string | null
          titulo_doctorado?: string | null
          titulo_especializacion?: string | null
          titulo_maestria?: string | null
          titulo_pregrado?: string | null
          updated_at?: string
          zona_sede?: string | null
        }
        Relationships: []
      }
      informe_asistencia: {
        Row: {
          created_at: string
          dia: number
          directivo_cedula: string
          id: string
          module_number: number
          observaciones: string | null
          razon_inasistencia: string | null
          session_am: boolean
          session_pm: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia: number
          directivo_cedula: string
          id?: string
          module_number: number
          observaciones?: string | null
          razon_inasistencia?: string | null
          session_am?: boolean
          session_pm?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia?: number
          directivo_cedula?: string
          id?: string
          module_number?: number
          observaciones?: string | null
          razon_inasistencia?: string | null
          session_am?: boolean
          session_pm?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      informe_directivo: {
        Row: {
          avances_administrativa: string | null
          avances_pedagogica: string | null
          avances_personal: string | null
          created_at: string
          directivo_cedula: string
          id: string
          informe_id: string | null
          module_number: number
          razon_sin_reto: string | null
          reto_estrategico: string | null
          retos_administrativa: string | null
          retos_pedagogica: string | null
          retos_personal: string | null
          updated_at: string
        }
        Insert: {
          avances_administrativa?: string | null
          avances_pedagogica?: string | null
          avances_personal?: string | null
          created_at?: string
          directivo_cedula: string
          id?: string
          informe_id?: string | null
          module_number: number
          razon_sin_reto?: string | null
          reto_estrategico?: string | null
          retos_administrativa?: string | null
          retos_pedagogica?: string | null
          retos_personal?: string | null
          updated_at?: string
        }
        Update: {
          avances_administrativa?: string | null
          avances_pedagogica?: string | null
          avances_personal?: string | null
          created_at?: string
          directivo_cedula?: string
          id?: string
          informe_id?: string | null
          module_number?: number
          razon_sin_reto?: string | null
          reto_estrategico?: string | null
          retos_administrativa?: string | null
          retos_pedagogica?: string | null
          retos_personal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "informe_directivo_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informe_modulo"
            referencedColumns: ["id"]
          },
        ]
      }
      informe_modulo: {
        Row: {
          acompanamiento_descripcion: string | null
          acompanamiento_directivos: Json | null
          acompanamiento_no_cumplido: string | null
          ajustes_actividades: Json | null
          aprendizajes_intensivo: string | null
          aprendizajes_interludio: string | null
          articulacion_intensivo: string | null
          articulacion_interludio: string | null
          contexto_articulacion: string | null
          contexto_plan_sectorial: string | null
          created_at: string
          entidad_territorial: string
          estrategias: Json | null
          fecha_fin_intensivo: string | null
          fecha_fin_interludio: string | null
          fecha_inicio_intensivo: string | null
          fecha_inicio_interludio: string | null
          id: string
          module_number: number
          novedades: Json | null
          razones_diferencias: string | null
          region: string
          sesiones_programadas: Json | null
          sesiones_realizadas: Json | null
          updated_at: string
        }
        Insert: {
          acompanamiento_descripcion?: string | null
          acompanamiento_directivos?: Json | null
          acompanamiento_no_cumplido?: string | null
          ajustes_actividades?: Json | null
          aprendizajes_intensivo?: string | null
          aprendizajes_interludio?: string | null
          articulacion_intensivo?: string | null
          articulacion_interludio?: string | null
          contexto_articulacion?: string | null
          contexto_plan_sectorial?: string | null
          created_at?: string
          entidad_territorial: string
          estrategias?: Json | null
          fecha_fin_intensivo?: string | null
          fecha_fin_interludio?: string | null
          fecha_inicio_intensivo?: string | null
          fecha_inicio_interludio?: string | null
          id?: string
          module_number: number
          novedades?: Json | null
          razones_diferencias?: string | null
          region: string
          sesiones_programadas?: Json | null
          sesiones_realizadas?: Json | null
          updated_at?: string
        }
        Update: {
          acompanamiento_descripcion?: string | null
          acompanamiento_directivos?: Json | null
          acompanamiento_no_cumplido?: string | null
          ajustes_actividades?: Json | null
          aprendizajes_intensivo?: string | null
          aprendizajes_interludio?: string | null
          articulacion_intensivo?: string | null
          articulacion_interludio?: string | null
          contexto_articulacion?: string | null
          contexto_plan_sectorial?: string | null
          created_at?: string
          entidad_territorial?: string
          estrategias?: Json | null
          fecha_fin_intensivo?: string | null
          fecha_fin_interludio?: string | null
          fecha_inicio_intensivo?: string | null
          fecha_inicio_interludio?: string | null
          id?: string
          module_number?: number
          novedades?: Json | null
          razones_diferencias?: string | null
          region?: string
          sesiones_programadas?: Json | null
          sesiones_realizadas?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      informe_modulo_equipo: {
        Row: {
          id: string
          informe_id: string
          nombre: string
          rol: string
        }
        Insert: {
          id?: string
          informe_id: string
          nombre: string
          rol: string
        }
        Update: {
          id?: string
          informe_id?: string
          nombre?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "informe_modulo_equipo_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informe_modulo"
            referencedColumns: ["id"]
          },
        ]
      }
      instituciones: {
        Row: {
          created_at: string
          id: string
          municipio_id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipio_id: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          municipio_id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "instituciones_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      item_texts_360: {
        Row: {
          form_type: string
          id: string
          item_id: string
          text: string
        }
        Insert: {
          form_type: string
          id?: string
          item_id: string
          text: string
        }
        Update: {
          form_type?: string
          id?: string
          item_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_texts_360_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_360"
            referencedColumns: ["id"]
          },
        ]
      }
      items_360: {
        Row: {
          competency_key: string
          id: string
          item_number: number
          response_type: string
          sort_order: number
        }
        Insert: {
          competency_key: string
          id?: string
          item_number: number
          response_type: string
          sort_order?: number
        }
        Update: {
          competency_key?: string
          id?: string
          item_number?: number
          response_type?: string
          sort_order?: number
        }
        Relationships: []
      }
      mel_kpi_config: {
        Row: {
          color_class: string | null
          created_at: string | null
          description: string | null
          formula_type: string
          id: string
          is_active: boolean | null
          kpi_key: string
          label: string
          meta_percentage: number
          min_modules: number | null
          required_level: string
          sort_order: number | null
          target_item_id: string | null
          target_module_number: number | null
          threshold_level: string | null
          updated_at: string | null
        }
        Insert: {
          color_class?: string | null
          created_at?: string | null
          description?: string | null
          formula_type?: string
          id?: string
          is_active?: boolean | null
          kpi_key: string
          label: string
          meta_percentage?: number
          min_modules?: number | null
          required_level?: string
          sort_order?: number | null
          target_item_id?: string | null
          target_module_number?: number | null
          threshold_level?: string | null
          updated_at?: string | null
        }
        Update: {
          color_class?: string | null
          created_at?: string | null
          description?: string | null
          formula_type?: string
          id?: string
          is_active?: boolean | null
          kpi_key?: string
          label?: string
          meta_percentage?: number
          min_modules?: number | null
          required_level?: string
          sort_order?: number | null
          target_item_id?: string | null
          target_module_number?: number | null
          threshold_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mel_kpi_config_target_item_id_fkey"
            columns: ["target_item_id"]
            isOneToOne: false
            referencedRelation: "rubrica_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mel_kpi_group_items: {
        Row: {
          group_id: string
          id: string
          kpi_config_id: string
          meta_override: number | null
        }
        Insert: {
          group_id: string
          id?: string
          kpi_config_id: string
          meta_override?: number | null
        }
        Update: {
          group_id?: string
          id?: string
          kpi_config_id?: string
          meta_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mel_kpi_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mel_kpi_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mel_kpi_group_items_kpi_config_id_fkey"
            columns: ["kpi_config_id"]
            isOneToOne: false
            referencedRelation: "mel_kpi_config"
            referencedColumns: ["id"]
          },
        ]
      }
      mel_kpi_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      municipios: {
        Row: {
          created_at: string
          entidad_territorial_id: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          entidad_territorial_id: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          entidad_territorial_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipios_entidad_territorial_id_fkey"
            columns: ["entidad_territorial_id"]
            isOneToOne: false
            referencedRelation: "entidades_territoriales"
            referencedColumns: ["id"]
          },
        ]
      }
      region_entidades: {
        Row: {
          entidad_territorial_id: string
          id: string
          region_id: string
        }
        Insert: {
          entidad_territorial_id: string
          id?: string
          region_id: string
        }
        Update: {
          entidad_territorial_id?: string
          id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_entidades_entidad_territorial_id_fkey"
            columns: ["entidad_territorial_id"]
            isOneToOne: false
            referencedRelation: "entidades_territoriales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_entidades_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regiones"
            referencedColumns: ["id"]
          },
        ]
      }
      region_instituciones: {
        Row: {
          id: string
          institucion_id: string
          region_id: string
        }
        Insert: {
          id?: string
          institucion_id: string
          region_id: string
        }
        Update: {
          id?: string
          institucion_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_instituciones_institucion_id_fkey"
            columns: ["institucion_id"]
            isOneToOne: false
            referencedRelation: "instituciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_instituciones_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regiones"
            referencedColumns: ["id"]
          },
        ]
      }
      region_municipios: {
        Row: {
          id: string
          municipio_id: string
          region_id: string
        }
        Insert: {
          id?: string
          municipio_id: string
          region_id: string
        }
        Update: {
          id?: string
          municipio_id?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_municipios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "region_municipios_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regiones"
            referencedColumns: ["id"]
          },
        ]
      }
      regiones: {
        Row: {
          created_at: string
          id: string
          kpi_group_id: string | null
          mostrar_logo_clt: boolean
          mostrar_logo_rlt: boolean
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_group_id?: string | null
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_group_id?: string | null
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "regiones_kpi_group_id_fkey"
            columns: ["kpi_group_id"]
            isOneToOne: false
            referencedRelation: "mel_kpi_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_asignaciones: {
        Row: {
          created_at: string
          directivo_cedula: string
          directivo_nombre: string
          evaluador_id: string
          id: string
          institucion: string
        }
        Insert: {
          created_at?: string
          directivo_cedula: string
          directivo_nombre: string
          evaluador_id: string
          id?: string
          institucion: string
        }
        Update: {
          created_at?: string
          directivo_cedula?: string
          directivo_nombre?: string
          evaluador_id?: string
          id?: string
          institucion?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_asignaciones_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "rubrica_evaluadores"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_evaluaciones: {
        Row: {
          acordado_comentario: string | null
          acordado_nivel: string | null
          created_at: string
          directivo_cedula: string
          directivo_comentario: string | null
          directivo_nivel: string | null
          equipo_comentario: string | null
          equipo_nivel: string | null
          id: string
          item_id: string
          updated_at: string
        }
        Insert: {
          acordado_comentario?: string | null
          acordado_nivel?: string | null
          created_at?: string
          directivo_cedula: string
          directivo_comentario?: string | null
          directivo_nivel?: string | null
          equipo_comentario?: string | null
          equipo_nivel?: string | null
          id?: string
          item_id: string
          updated_at?: string
        }
        Update: {
          acordado_comentario?: string | null
          acordado_nivel?: string | null
          created_at?: string
          directivo_cedula?: string
          directivo_comentario?: string | null
          directivo_nivel?: string | null
          equipo_comentario?: string | null
          equipo_nivel?: string | null
          id?: string
          item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_evaluaciones_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "rubrica_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_evaluadores: {
        Row: {
          cedula: string
          created_at: string
          email: string | null
          id: string
          nombre: string
        }
        Insert: {
          cedula: string
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
        }
        Update: {
          cedula?: string
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      rubrica_items: {
        Row: {
          created_at: string
          desc_avanzado: string
          desc_basico: string
          desc_intermedio: string
          desc_sin_evidencia: string
          id: string
          item_label: string
          item_type: string
          module_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          desc_avanzado?: string
          desc_basico?: string
          desc_intermedio?: string
          desc_sin_evidencia?: string
          id?: string
          item_label: string
          item_type: string
          module_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          desc_avanzado?: string
          desc_basico?: string
          desc_intermedio?: string
          desc_sin_evidencia?: string
          id?: string
          item_label?: string
          item_type?: string
          module_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "rubrica_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_modules: {
        Row: {
          created_at: string
          id: string
          module_number: number
          objective: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_number: number
          objective: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          module_number?: number
          objective?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      rubrica_regional_analyses: {
        Row: {
          analysis_text: string
          id: string
          module_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          analysis_text?: string
          id?: string
          module_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          analysis_text?: string
          id?: string
          module_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_regional_analyses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "rubrica_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_seguimientos: {
        Row: {
          comentario: string | null
          created_at: string
          directivo_cedula: string
          id: string
          item_id: string
          module_number: number
          nivel: string | null
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          directivo_cedula: string
          id?: string
          item_id: string
          module_number: number
          nivel?: string | null
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          directivo_cedula?: string
          id?: string
          item_id?: string
          module_number?: number
          nivel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrica_seguimientos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "rubrica_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrica_submission_dates: {
        Row: {
          directivo_cedula: string
          id: string
          module_number: number
          submission_type: string
          submitted_at: string
        }
        Insert: {
          directivo_cedula: string
          id?: string
          module_number: number
          submission_type: string
          submitted_at?: string
        }
        Update: {
          directivo_cedula?: string
          id?: string
          module_number?: number
          submission_type?: string
          submitted_at?: string
        }
        Relationships: []
      }
      satisfaccion_config: {
        Row: {
          available_from: string | null
          available_until: string | null
          created_at: string
          form_type: string
          id: string
          is_active: boolean
          module_number: number
          region: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          form_type: string
          id?: string
          is_active?: boolean
          module_number: number
          region: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          form_type?: string
          id?: string
          is_active?: boolean
          module_number?: number
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      satisfaccion_form_definitions: {
        Row: {
          definition: Json
          form_type: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          definition?: Json
          form_type: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          definition?: Json
          form_type?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      satisfaccion_report_content: {
        Row: {
          content: Json
          extra_logos: string[] | null
          form_type: string
          id: string
          module_number: number
          region: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          extra_logos?: string[] | null
          form_type: string
          id?: string
          module_number: number
          region: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          extra_logos?: string[] | null
          form_type?: string
          id?: string
          module_number?: number
          region?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      satisfaccion_responses: {
        Row: {
          cedula: string
          created_at: string
          form_type: string
          id: string
          module_number: number
          region: string
          respuestas: Json
        }
        Insert: {
          cedula: string
          created_at?: string
          form_type: string
          id?: string
          module_number: number
          region: string
          respuestas?: Json
        }
        Update: {
          cedula?: string
          created_at?: string
          form_type?: string
          id?: string
          module_number?: number
          region?: string
          respuestas?: Json
        }
        Relationships: []
      }
      site_reviews: {
        Row: {
          comentario: string | null
          created_at: string
          email: string
          es_anonimo: boolean
          id: string
          nombre: string
          rating: number
          rol_evaluador: string | null
          tipo_formulario: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          email: string
          es_anonimo?: boolean
          id?: string
          nombre: string
          rating: number
          rol_evaluador?: string | null
          tipo_formulario?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          email?: string
          es_anonimo?: boolean
          id?: string
          nombre?: string
          rating?: number
          rol_evaluador?: string | null
          tipo_formulario?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_detail: string | null
          action_type: string
          cedula: string
          created_at: string
          id: string
          ip_address: string | null
          page_path: string | null
          user_agent: string | null
        }
        Insert: {
          action_detail?: string | null
          action_type: string
          cedula: string
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path?: string | null
          user_agent?: string | null
        }
        Update: {
          action_detail?: string | null
          action_type?: string
          cedula?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          page_path?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_cedula_exists: { Args: { p_cedula: string }; Returns: boolean }
      check_cedula_role: { Args: { p_cedula: string }; Returns: Json }
      get_directivos_por_institucion: {
        Args: { p_nombre_ie: string }
        Returns: {
          cargo_actual: string
          genero: string
          nombres_apellidos: string
          numero_cedula: string
        }[]
      }
      get_enum_types: {
        Args: never
        Returns: {
          enum_values: string
          type_name: string
        }[]
      }
      get_ficha_by_cedula: { Args: { p_cedula: string }; Returns: Json }
      get_instituciones_con_ficha: {
        Args: never
        Returns: {
          nombre_ie: string
        }[]
      }
      get_invitaciones_directivo: { Args: { p_cedula: string }; Returns: Json }
      get_invitation_by_token: { Args: { p_token: string }; Returns: Json }
      get_own_autoevaluacion: {
        Args: { p_cedula: string; p_fase?: string }
        Returns: Json
      }
      get_table_columns: {
        Args: { table_names: string[] }
        Returns: {
          column_default: string
          column_name: string
          is_nullable: string
          table_name: string
          udt_name_full: string
        }[]
      }
      get_table_constraints: {
        Args: { table_names: string[] }
        Returns: {
          column_names: string
          constraint_name: string
          constraint_type: string
          foreign_columns: string
          foreign_table: string
          table_name: string
        }[]
      }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "superadmin"],
    },
  },
} as const
