import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetMe, apiLogout, isAuthenticated } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";
import { logActivity } from "@/utils/activityLogger";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export function useAdminAuth() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

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
        const email = data.user.email || "";
        setUserName(email.split("@")[0]);

        if (USE_EXPRESS) {
          const roles: string[] = (data.user as any).roles ?? [];
          if (!roles.includes("admin") && !roles.includes("superadmin") && !roles.includes("monitoreo")) {
            await apiLogout();
            navigate(buildLoginRoute("role_missing"));
            return;
          }
          setIsSuperAdmin(roles.includes("superadmin"));
          setIsViewer(!roles.includes("admin") && !roles.includes("superadmin") && roles.includes("monitoreo"));
        } else {
          // Use new RBAC: query user_custom_roles + custom_roles
          const { data: ucrs } = await supabase
            .from("user_custom_roles")
            .select("custom_roles(name)")
            .eq("user_id", uid);

          const roleNames = (ucrs ?? []).map((r: any) => r.custom_roles?.name).filter(Boolean) as string[];

          if (roleNames.length === 0) {
            await apiLogout();
            navigate(buildLoginRoute("role_missing"));
            return;
          }

          setIsSuperAdmin(roleNames.includes("Superadmin"));
          setIsViewer(
            !roleNames.includes("Admin") && !roleNames.includes("Superadmin") && roleNames.includes("Monitoreo")
          );
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
    if (userId) {
      const email = sessionStorage.getItem("admin_email") || userId;
      logActivity(email, "logout", "Admin logout");
    }
    await apiLogout();
    sessionStorage.removeItem("admin_email");
    navigate("/admin/login");
  };

  return { isAdmin, isSuperAdmin, isViewer, userId, userName, signOut };
}
