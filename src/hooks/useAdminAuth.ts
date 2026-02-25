import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetMe, apiLogout, isAuthenticated } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export function useAdminAuth() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isAuthenticated()) {
        navigate("/admin/login");
        return;
      }

      const { data, error } = await apiGetMe();

      if (error || !data?.user) {
        await apiLogout();
        navigate("/admin/login");
        return;
      }

      // In Supabase mode, verify admin role via RPC
      if (!USE_EXPRESS) {
        const { data: hasRole } = await supabase.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        if (!hasRole) {
          await apiLogout();
          navigate("/admin/login");
          return;
        }
      }

      setIsAdmin(true);
      setUserId(data.user.id);
    };

    checkAdmin();
  }, [navigate]);

  const signOut = async () => {
    await apiLogout();
    navigate("/admin/login");
  };

  return { isAdmin, userId, signOut };
}
