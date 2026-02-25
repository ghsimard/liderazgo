import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetMe, apiLogout, isAuthenticated } from "@/utils/apiFetch";

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
        apiLogout();
        navigate("/admin/login");
        return;
      }

      setIsAdmin(true);
      setUserId(data.user.id);
    };

    checkAdmin();
  }, [navigate]);

  const signOut = () => {
    apiLogout();
    navigate("/admin/login");
  };

  return { isAdmin, userId, signOut };
}
