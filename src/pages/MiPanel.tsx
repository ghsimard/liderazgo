import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, ClipboardCheck, ClipboardList, FileBarChart, FileText, Loader2, User } from "lucide-react";

import { genderizeRole } from "@/utils/genderizeRole";

interface CedulaRoleResult {
  exists_ficha: boolean;
  is_admin: boolean;
  is_directivo: boolean;
  is_evaluador: boolean;
  cargo_actual: string | null;
  nombre: string | null;
  genero: string | null;
}

export default function MiPanel() {
  const navigate = useNavigate();
  const cedula = sessionStorage.getItem("user_cedula") ?? "";
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt;

  const [loading, setLoading] = useState(true);
  const [roleInfo, setRoleInfo] = useState<CedulaRoleResult | null>(null);
  const [rubricaProgress, setRubricaProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 4 });
  // When both directivo + evaluador, user chooses
  const [selectedRole, setSelectedRole] = useState<"directivo" | "evaluador" | null>(null);

  useEffect(() => {
    if (!cedula) {
      navigate("/");
      return;
    }

    const fetchRole = async () => {
      const { data } = await supabase.rpc("check_cedula_role", { p_cedula: cedula });
      const result = data as CedulaRoleResult | null;
      if (!result || (!result.exists_ficha && !result.is_evaluador)) {
        navigate("/");
        return;
      }
      setRoleInfo(result);

      // Store cedula in sessionStorage for auto-fill on downstream pages
      sessionStorage.setItem("user_cedula", cedula);

      // Auto-select if only one role
      if (result.is_directivo && !result.is_evaluador) setSelectedRole("directivo");
      else if (result.is_evaluador && !result.is_directivo) setSelectedRole("evaluador");
      // If both or just ficha without directivo role, keep null for choice or auto

      // If has ficha but is not directivo nor evaluador, show ficha-only panel
      if (result.exists_ficha && !result.is_directivo && !result.is_evaluador) {
        setSelectedRole("directivo"); // show ficha access
      }

      // Fetch rubrica progress for directivos
      if (result.is_directivo && result.exists_ficha) {
        const { data: submissions } = await supabase
          .from("rubrica_submission_dates")
          .select("module_number")
          .eq("directivo_cedula", cedula)
          .eq("submission_type", "acordado");
        const { count } = await supabase
          .from("rubrica_modules")
          .select("id", { count: "exact", head: true });
        const total = count ?? 4;
        const completedModules = new Set((submissions || []).map(s => s.module_number)).size;
        setRubricaProgress({ completed: completedModules, total });
      }

      setLoading(false);
    };

    fetchRole();
  }, [cedula, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!roleInfo) return null;

  const dualRole = roleInfo.is_directivo && roleInfo.is_evaluador;

  // Role selection screen
  if (dualRole && !selectedRole) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md shadow-lg border-0">
            <CardHeader className="text-center space-y-3 pb-2">
              <div className="flex justify-center items-center gap-4">
                {logoRLT && <img src={logoRLT} alt="Logo RLT" className="h-14 object-contain" />}
                {logoCLT && <img src={logoCLT} alt="Logo CLT" className="h-14 object-contain" />}
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Hola, {roleInfo.nombre ?? "Usuario"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tiene doble rol. ¿Cómo desea ingresar?
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-3 text-base"
                onClick={() => setSelectedRole("directivo")}
              >
                <User className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Como {genderizeRole("Directivo", roleInfo.genero)}</div>
                  <div className="text-xs text-muted-foreground">
                    {genderizeRole(roleInfo.cargo_actual, roleInfo.genero) || "Rector/a o Coordinador/a"}
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-3 text-base"
                onClick={() => setSelectedRole("evaluador")}
              >
                <ClipboardList className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Como Evaluador</div>
                  <div className="text-xs text-muted-foreground">
                    Acceder a la rúbrica de evaluación
                  </div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard panel
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="flex justify-center items-center gap-4">
              {logoRLT && <img src={logoRLT} alt="Logo RLT" className="h-14 object-contain" />}
              {logoCLT && <img src={logoCLT} alt="Logo CLT" className="h-14 object-contain" />}
            </div>
            <CardTitle className="text-lg font-bold text-foreground">
              Hola, {roleInfo.nombre ?? "Usuario"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedRole === "evaluador"
                ? "Panel de Evaluador"
                : `${genderizeRole(roleInfo.cargo_actual, roleInfo.genero) ?? genderizeRole("Directivo", roleInfo.genero)}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Directivo buttons */}
            {selectedRole === "directivo" && (
              <>
                <Button
                  className="w-full h-14 justify-start gap-3 text-base"
                  onClick={() => navigate(`/ficha?mode=view`)}
                >
                  <FileText className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Mi Ficha de Información</div>
                    <div className="text-xs opacity-80">Ver y editar mis datos personales</div>
                  </div>
                </Button>

                {roleInfo.is_directivo && roleInfo.exists_ficha && (() => {
                  const allDone = rubricaProgress.completed === rubricaProgress.total;
                  return (
                  <Button
                    variant="default"
                    className={`w-full h-auto min-h-[3.5rem] justify-start gap-3 text-base py-3 ${
                      allDone
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                        : ""
                    }`}
                    onClick={() =>
                      navigate(`/rubrica-evaluacion?role=directivo`)
                    }
                  >
                    <ClipboardCheck className={`h-5 w-5 shrink-0 ${allDone ? "text-white" : ""}`} />
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-2">
                        Mi Rúbrica de Evaluación
                        {allDone && (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className={`text-xs ${allDone ? "text-emerald-100" : "text-muted-foreground"}`}>
                        {allDone
                          ? "✓ Todos los módulos completados"
                          : `${rubricaProgress.completed} de ${rubricaProgress.total} módulos completados`}
                      </div>
                      {!allDone && (
                        <Progress
                          value={(rubricaProgress.completed / rubricaProgress.total) * 100}
                          className="h-1.5 mt-1.5 bg-muted"
                        />
                      )}
                    </div>
                  </Button>
                  );
                })()}

                {roleInfo.is_directivo && (
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-start gap-3 text-base"
                    onClick={() => navigate("/formulario-360-autoevaluacion")}
                  >
                    <FileBarChart className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Mi Autoevaluación 360°</div>
                      <div className="text-xs text-muted-foreground">Encuesta de autoevaluación</div>
                    </div>
                  </Button>
                )}
              </>
            )}

            {/* Evaluador buttons */}
            {selectedRole === "evaluador" && (
              <Button
                className="w-full h-14 justify-start gap-3 text-base"
                onClick={() =>
                  navigate(`/rubrica-evaluacion?role=evaluador`)
                }
              >
                <ClipboardList className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Mi Rúbrica de Evaluación</div>
                  <div className="text-xs opacity-80">
                    Evaluar directivos asignados
                  </div>
                </div>
              </Button>
            )}

            {/* Back / switch role */}
            <div className="flex gap-2 pt-2">
              {dualRole && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setSelectedRole(null)}
                >
                  Cambiar rol
                </Button>
              )}
              <Button
                variant="ghost"
                className={dualRole ? "flex-1" : "w-full"}
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
