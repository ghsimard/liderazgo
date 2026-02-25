import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiLogin } from "@/utils/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock } from "lucide-react";
import { useAppImages } from "@/hooks/useAppImages";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: loginError } = await apiLogin(email, password);

    if (loginError || !data) {
      setError(loginError || "Correo o contraseña incorrectos.");
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
            Acceso Administrador
          </CardTitle>
        </CardHeader>
        <CardContent>
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
            <p className="text-xs text-muted-foreground text-center">
              ¿Olvidaste tu contraseña? Contacta al administrador.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
