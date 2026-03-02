import { Link } from "react-router-dom";
import { Lightbulb, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { isAuthenticated, apiGetMe } from "@/utils/apiFetch";
import logoCosmoFooter from "@/assets/logo_cosmo_dark.png";

export default function AppFooter() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        if (!isAuthenticated()) return;
        const { data } = await apiGetMe();
        if (data?.user?.roles && data.user.roles.length > 0) setIsAdmin(true);
      } catch {}
    };
    check();
  }, []);

  return (
    <footer className="sticky bottom-0 z-50 py-3" style={{ background: "hsl(var(--primary))" }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center">
        <img
          src={logoCosmoFooter}
          alt="Cosmo Schools"
          className="h-8 w-auto object-contain shrink-0"
        />
        <p className="text-primary-foreground text-xs opacity-60 flex-1 text-center">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
        <div className="flex items-center gap-4 shrink-0">
          <Link
            to="/sugerencias"
            className="text-primary-foreground text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            <Lightbulb className="w-3.5 h-3.5" /> Sugerencias
          </Link>
          {isAdmin && (
            <Link
              to="/faq"
              className="text-primary-foreground text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> FAQ
            </Link>
          )}
          <Link
            to="/derechos-contacto"
            className="text-primary-foreground text-xs opacity-60 hover:opacity-100 transition-opacity underline underline-offset-2"
          >
            Derechos y Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
