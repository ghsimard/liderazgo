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
          id: string
          leido: boolean
          mensaje: string
          nombre: string
          rating: number | null
          telefono: string | null
          tipo_contacto: string
        }
        Insert: {
          asunto: string
          codigo_pais?: string
          contactar_whatsapp?: boolean
          created_at?: string
          email: string
          id?: string
          leido?: boolean
          mensaje: string
          nombre: string
          rating?: number | null
          telefono?: string | null
          tipo_contacto?: string
        }
        Update: {
          asunto?: string
          codigo_pais?: string
          contactar_whatsapp?: boolean
          created_at?: string
          email?: string
          id?: string
          leido?: boolean
          mensaje?: string
          nombre?: string
          rating?: number | null
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
      encuestas_360: {
        Row: {
          cargo_directivo: string
          cargo_evaluador: string | null
          cedula: string | null
          cedula_directivo: string | null
          created_at: string
          dias_contacto: string | null
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
          zona_sede?: string | null
        }
        Relationships: []
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
          mostrar_logo_clt: boolean
          mostrar_logo_rlt: boolean
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre?: string
        }
        Relationships: []
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
          id: string
          nombre: string
        }
        Insert: {
          cedula: string
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          cedula?: string
          created_at?: string
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
      get_directivos_por_institucion: {
        Args: { p_nombre_ie: string }
        Returns: {
          cargo_actual: string
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
      get_instituciones_con_ficha: {
        Args: never
        Returns: {
          nombre_ie: string
        }[]
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
