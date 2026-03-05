import { Link } from "react-router-dom";
import { Lightbulb, HelpCircle, Star, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthenticated, apiGetMe } from "@/utils/apiFetch";
import { supabase } from "@/utils/dbClient";
import logoCosmoFooter from "@/assets/logo_cosmo_dark.png";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export default function AppFooter() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        if (!isAuthenticated()) return;

        if (USE_EXPRESS) {
          const { data } = await apiGetMe();
          if (data?.user?.roles && data.user.roles.length > 0) setIsAdmin(true);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .limit(1);
          if (roles && roles.length > 0) setIsAdmin(true);
        }
      } catch {}
    };
    check();
  }, []);

  return (
    <footer className="sticky bottom-0 z-50 py-2 sm:py-3 bg-sidebar text-sidebar-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-0">
        <div className="hidden sm:block">
          <img
            src={logoCosmoFooter}
            alt="Cosmo Schools"
            className="h-8 w-auto object-contain shrink-0"
          />
        </div>
        <p className="text-primary-foreground text-[10px] sm:text-xs opacity-60 sm:flex-1 text-center">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap justify-center">
          <Link
            to="/evaluacion"
            className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Evaluar
          </Link>
          <Link
            to="/sugerencias"
            className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Sugerencias
          </Link>
          {isAdmin && (
            <>
              <Link
                to="/faq"
                className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> FAQ
              </Link>
              <Link
                to="/admin"
                className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
              >
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Admin
              </Link>
            </>
          )}
          <Link
            to="/derechos-contacto"
            className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            Derechos
          </Link>
          <Link
            to="/contacto"
            className="text-primary-foreground text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
