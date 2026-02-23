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
          entidad_territorial_id: string
          id: string
          mostrar_logo_clt: boolean
          mostrar_logo_rlt: boolean
          nombre: string
        }
        Insert: {
          created_at?: string
          entidad_territorial_id: string
          id?: string
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre: string
        }
        Update: {
          created_at?: string
          entidad_territorial_id?: string
          id?: string
          mostrar_logo_clt?: boolean
          mostrar_logo_rlt?: boolean
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "regiones_entidad_territorial_id_fkey"
            columns: ["entidad_territorial_id"]
            isOneToOne: false
            referencedRelation: "entidades_territoriales"
            referencedColumns: ["id"]
          },
        ]
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
      get_enum_types: {
        Args: never
        Returns: {
          enum_values: string
          type_name: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
