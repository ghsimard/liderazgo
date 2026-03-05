import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Loader2, Search } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CedulaRoleResult {
  exists_ficha: boolean;
  is_admin: boolean;
  is_directivo: boolean;
  is_evaluador: boolean;
  cargo_actual: string | null;
  nombre: string | null;
}

export default function Index() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt;

  const [cedula, setCedula] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cedula.trim();
    if (!trimmed) {
      setError("Ingrese su número de cédula.");
      return;
    }
    if (trimmed.length < 6 || trimmed.length > 10) {
      setError("El número de cédula debe tener entre 6 y 10 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("check_cedula_role", {
        p_cedula: trimmed,
      });

      if (rpcError) {
        setError("Error al verificar la cédula. Intente de nuevo.");
        setLoading(false);
        return;
      }

      // Persist cedula for downstream auto-fill
      sessionStorage.setItem("user_cedula", trimmed);

      const result = (data as CedulaRoleResult) ?? {
        exists_ficha: false,
        is_admin: false,
        is_directivo: false,
        is_evaluador: false,
        cargo_actual: null,
        nombre: null,
      };

      // Case 1: Admin → redirect to login
      if (result.is_admin) {
        navigate("/admin/login");
        return;
      }

      // Case 2: Directivo and/or Evaluador → panel
      if (result.is_directivo || result.is_evaluador) {
        navigate(`/mi-panel`);
        return;
      }

      // Case 3: Cédula not found → ask confirmation
      if (!result.exists_ficha) {
        setShowConfirm(true);
        return;
      }

      // Case 4: Exists but not directivo/evaluador/admin (e.g. regular ficha without special role)
      // Show a message or redirect to their ficha in read-only
      navigate(`/mi-panel`);
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="flex justify-center items-center gap-4">
              {logoRLT && (
                <img src={logoRLT} alt="Logo RLT" className="h-16 object-contain" />
              )}
              {logoCLT && (
                <img src={logoCLT} alt="Logo CLT" className="h-16 object-contain" />
              )}
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Bienvenido/a
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ingrese su número de cédula para continuar
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Número de cédula"
                    value={cedula}
                    onChange={(e) => {
                      setCedula(e.target.value.replace(/\D/g, ""));
                      setError(null);
                    }}
                    className="pl-10 text-base h-12"
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={loading || !cedula.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Bienvenido/a, líder!</AlertDialogTitle>
            <AlertDialogDescription>
              Su número de cédula ingresado es <span className="font-bold">{cedula}</span>. Por favor, confirme que este número es correcto antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              Corregir
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowConfirm(false); navigate("/ficha"); }}>
              Sí, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
