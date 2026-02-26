import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetMe, apiLogout, isAuthenticated } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export function useAdminAuth() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const buildLoginRoute = (reason: string) =>
      `/admin/login?reason=${encodeURIComponent(reason)}`;

    const checkAdmin = async () => {
      try {
        if (!isAuthenticated()) {
          navigate(buildLoginRoute("session_missing"));
          return;
        }

        const { data, error, status } = await apiGetMe();

        if (error || !data?.user) {
          await apiLogout();
          navigate(buildLoginRoute(status === 401 ? "session_invalid" : "user_not_found"));
          return;
        }

        const uid = data.user.id;

        if (USE_EXPRESS) {
          // On Render, roles come from the /api/auth/me response
          const roles: string[] = (data.user as any).roles ?? [];
          if (!roles.includes("admin") && !roles.includes("superadmin")) {
            await apiLogout();
            navigate(buildLoginRoute("role_missing"));
            return;
          }
          setIsSuperAdmin(roles.includes("superadmin"));
        } else {
          // On Lovable/Supabase, check via RPC
          const { data: hasAdmin } = await supabase.rpc("has_role", {
            _user_id: uid,
            _role: "admin",
          });
          const { data: hasSuperAdmin } = await supabase.rpc("has_role", {
            _user_id: uid,
            _role: "superadmin",
          });
          if (!hasAdmin && !hasSuperAdmin) {
            await apiLogout();
            navigate(buildLoginRoute("role_missing"));
            return;
          }
          setIsSuperAdmin(!!hasSuperAdmin);
        }

        setIsAdmin(true);
        setUserId(uid);
      } catch {
        await apiLogout();
        navigate(buildLoginRoute("auth_check_failed"));
      }
    };

    checkAdmin();
  }, [navigate]);

  const signOut = async () => {
    await apiLogout();
    navigate("/admin/login");
  };

  return { isAdmin, isSuperAdmin, userId, signOut };
}
