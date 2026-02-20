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
          discapacidad: string
          discapacidad_detalle: string | null
          enfermedad_base: string
          enfermedad_detalle: string | null
          entidad_territorial: string | null
          estatuto: string | null
          estudiantes_ciclo_complementario: number | null
          estudiantes_jec: number | null
          estudiantes_preescolar: number | null
          estudiantes_primaria: number | null
          fecha_nacimiento: string
          fecha_nombramiento_cargo: string | null
          fecha_nombramiento_ie: string | null
          fecha_vinculacion_servicio: string | null
          grado_escalafon: string | null
          grupos_etnicos: string | null
          id: string
          jornadas: string[] | null
          lengua_materna: string
          lengua_otra: string | null
          modelo_pedagogico: string | null
          niveles_educativos: string[] | null
          nombre_ie: string
          nombres: string | null
          nombres_apellidos: string
          num_administrativos: number | null
          num_coordinadores: number | null
          num_docentes: number | null
          num_orientadores: number | null
          otros_titulos: string | null
          prefiere_correo: string
          proyectos_transversales: string | null
          region: string
          sedes_rural: number | null
          sedes_urbana: number | null
          telefono_emergencia: string | null
          tipo_bachillerato: string | null
          tipo_formacion: string | null
          tipo_vinculacion: string | null
          titulo_doctorado: string | null
          titulo_especializacion: string | null
          titulo_maestria: string | null
          titulo_pregrado: string | null
          total_sedes: number | null
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
          discapacidad?: string
          discapacidad_detalle?: string | null
          enfermedad_base?: string
          enfermedad_detalle?: string | null
          entidad_territorial?: string | null
          estatuto?: string | null
          estudiantes_ciclo_complementario?: number | null
          estudiantes_jec?: number | null
          estudiantes_preescolar?: number | null
          estudiantes_primaria?: number | null
          fecha_nacimiento: string
          fecha_nombramiento_cargo?: string | null
          fecha_nombramiento_ie?: string | null
          fecha_vinculacion_servicio?: string | null
          grado_escalafon?: string | null
          grupos_etnicos?: string | null
          id?: string
          jornadas?: string[] | null
          lengua_materna?: string
          lengua_otra?: string | null
          modelo_pedagogico?: string | null
          niveles_educativos?: string[] | null
          nombre_ie: string
          nombres?: string | null
          nombres_apellidos: string
          num_administrativos?: number | null
          num_coordinadores?: number | null
          num_docentes?: number | null
          num_orientadores?: number | null
          otros_titulos?: string | null
          prefiere_correo: string
          proyectos_transversales?: string | null
          region: string
          sedes_rural?: number | null
          sedes_urbana?: number | null
          telefono_emergencia?: string | null
          tipo_bachillerato?: string | null
          tipo_formacion?: string | null
          tipo_vinculacion?: string | null
          titulo_doctorado?: string | null
          titulo_especializacion?: string | null
          titulo_maestria?: string | null
          titulo_pregrado?: string | null
          total_sedes?: number | null
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
          discapacidad?: string
          discapacidad_detalle?: string | null
          enfermedad_base?: string
          enfermedad_detalle?: string | null
          entidad_territorial?: string | null
          estatuto?: string | null
          estudiantes_ciclo_complementario?: number | null
          estudiantes_jec?: number | null
          estudiantes_preescolar?: number | null
          estudiantes_primaria?: number | null
          fecha_nacimiento?: string
          fecha_nombramiento_cargo?: string | null
          fecha_nombramiento_ie?: string | null
          fecha_vinculacion_servicio?: string | null
          grado_escalafon?: string | null
          grupos_etnicos?: string | null
          id?: string
          jornadas?: string[] | null
          lengua_materna?: string
          lengua_otra?: string | null
          modelo_pedagogico?: string | null
          niveles_educativos?: string[] | null
          nombre_ie?: string
          nombres?: string | null
          nombres_apellidos?: string
          num_administrativos?: number | null
          num_coordinadores?: number | null
          num_docentes?: number | null
          num_orientadores?: number | null
          otros_titulos?: string | null
          prefiere_correo?: string
          proyectos_transversales?: string | null
          region?: string
          sedes_rural?: number | null
          sedes_urbana?: number | null
          telefono_emergencia?: string | null
          tipo_bachillerato?: string | null
          tipo_formacion?: string | null
          tipo_vinculacion?: string | null
          titulo_doctorado?: string | null
          titulo_especializacion?: string | null
          titulo_maestria?: string | null
          titulo_pregrado?: string | null
          total_sedes?: number | null
          zona_sede?: string | null
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
