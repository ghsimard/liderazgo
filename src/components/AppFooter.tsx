import { Link } from "react-router-dom";
import logoCosmoFooter from "@/assets/logo_cosmo_dark.png";

export default function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-50 py-3" style={{ background: "hsl(var(--primary))" }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center">
        <img
          src={logoCosmoFooter}
          alt="Cosmo Schools"
          className="h-8 w-auto object-contain shrink-0"
        />
        <p className="text-white text-xs opacity-60 flex-1 text-center">
          Programa RLT / CLT · Colombia · {new Date().getFullYear()}
        </p>
        <Link
          to="/derechos-contacto"
          className="text-white text-xs opacity-60 hover:opacity-100 transition-opacity shrink-0 underline underline-offset-2"
        >
          Todos los derechos reservados a Ghislain Simard
        </Link>
      </div>
    </footer>
  );
}
