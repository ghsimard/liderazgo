/**
 * Hook to auto-detect user info from:
 * 1. Admin session (Express JWT or Supabase auth)
 * 2. fichas_rlt table (lookup by cedula stored in sessionStorage)
 * 3. rubrica_evaluadores table
 *
 * Returns detected info to pre-fill contact/evaluation forms.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { isAuthenticated, apiGetMe } from "@/utils/apiFetch";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export interface DetectedUserInfo {
  nombre: string;
  email: string;
  telefono: string;
  codigo_pais: string;
  rol: string;
  source: string; // "admin" | "ficha" | "evaluador" | ""
}

const EMPTY: DetectedUserInfo = {
  nombre: "",
  email: "",
  telefono: "",
  codigo_pais: "+57",
  rol: "",
  source: "",
};

export function useAutoFillUserInfo() {
  const [info, setInfo] = useState<DetectedUserInfo>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detect = async () => {
      try {
        // 1. Check admin session
        if (isAuthenticated()) {
          if (USE_EXPRESS) {
            const { data } = await apiGetMe();
            if (data?.user) {
              setInfo({
                nombre: "",
                email: data.user.email || "",
                telefono: "",
                codigo_pais: "+57",
                rol: data.user.roles?.length ? "admin" : "",
                source: "admin",
              });
              setLoading(false);
              return;
            }
          } else {
            const { supabase: sbClient } = await import("@/integrations/supabase/client");
            const { data: { user } } = await sbClient.auth.getUser();
            if (user) {
              const { data: roles } = await supabase
                .from("user_roles" as any)
                .select("role")
                .eq("user_id", user.id)
                .limit(1);
              if (roles && (roles as any[]).length > 0) {
                setInfo({
                  nombre: "",
                  email: user.email || "",
                  telefono: "",
                  codigo_pais: "+57",
                  rol: "admin",
                  source: "admin",
                });
                setLoading(false);
                return;
              }
            }
          }
        }

        // 2. Check fichas_rlt via sessionStorage cedula
        const cedula = sessionStorage.getItem("user_cedula");
        if (cedula) {
          const { data } = await supabase
            .from("fichas_rlt")
            .select("nombres_apellidos,correo_personal,celular_personal,codigo_pais_celular,cargo_actual")
            .eq("numero_cedula", cedula)
            .limit(1);
          const row = Array.isArray(data) ? data[0] : data;
          if (row) {
            setInfo({
              nombre: (row as any).nombres_apellidos || "",
              email: (row as any).correo_personal || "",
              telefono: (row as any).celular_personal || "",
              codigo_pais: (row as any).codigo_pais_celular || "+57",
              rol: (row as any).cargo_actual || "",
              source: "ficha",
            });
            setLoading(false);
            return;
          }
        }

        // 3. Check rubrica_evaluadores via sessionStorage
        const evalCedula = sessionStorage.getItem("evaluador_cedula");
        if (evalCedula) {
          const { data } = await supabase
            .from("rubrica_evaluadores")
            .select("nombre,cedula")
            .eq("cedula", evalCedula)
            .limit(1);
          const row = Array.isArray(data) ? data[0] : data;
          if (row) {
            setInfo({
              nombre: (row as any).nombre || "",
              email: "",
              telefono: "",
              codigo_pais: "+57",
              rol: "evaluador",
              source: "evaluador",
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    detect();
  }, []);

  return { info, loading };
}
