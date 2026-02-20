import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock } from "lucide-react";
import logoRLT from "@/assets/logo_rlt.png";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Veuillez entrer votre adresse email.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("Erreur lors de l'envoi. Vérifiez l'email.");
    } else {
      setResetSent(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    // Verificar que sea admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      await supabase.auth.signOut();
      setError("No tienes permisos de administrador.");
      setLoading(false);
      return;
    }

    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-4">
          <img src={logoRLT} alt="RLT" className="h-14 mx-auto mb-3" />
          <CardTitle className="text-lg flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            {resetMode ? "Restablecer contraseña" : "Acceso Administrador"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resetSent ? (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="text-sm text-muted-foreground">
                Se ha enviado un enlace de restablecimiento a <strong>{email}</strong>. Revisa tu bandeja de entrada.
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setResetMode(false); setResetSent(false); }}>
                Volver al inicio de sesión
              </Button>
            </div>
          ) : resetMode ? (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-1">
                {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:underline text-center"
                onClick={() => { setResetMode(false); setError(null); }}
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ejemplo.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-1">
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:underline text-center"
                onClick={() => { setResetMode(true); setError(null); }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
