import { useEffect, useState } from "react";
import { logActivity } from "@/utils/activityLogger";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, ClipboardCheck, ClipboardList, FileBarChart, FileText, Loader2, Printer, ThumbsUp, User, ChevronDown, ChevronUp } from "lucide-react";
import { generarPDFFichaEnBlanco } from "@/utils/blankFichaPdfGenerator";
import { FORM_TYPE_LABELS } from "@/data/satisfaccionData";

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

function BlankFichaPdfButton() {
  const [generating, setGenerating] = useState(false);
  const { images } = useAppImages();
  const { toast } = useToast();

  const handleClick = async () => {
    if (generating) return;
    setGenerating(true);
    const cedula = sessionStorage.getItem("user_cedula") ?? "";
    logActivity(cedula, "ficha_view", "Descarga ficha en blanco (PDF)", "/mi-panel");
    try {
      await generarPDFFichaEnBlanco(
        { logoRLT: images.logo_rlt_white, logoCLTDark: images.logo_clt_dark, logoCosmo: images.logo_cosmo },
        { showLogoRlt: true, showLogoClt: true }
      );
      toast({ title: "PDF generado", description: "La ficha en blanco se ha descargado." });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full h-14 justify-start gap-3 text-base"
      onClick={handleClick}
      disabled={generating}
    >
      <Printer className="h-5 w-5" />
      <div className="text-left">
        <div className="font-semibold">{generating ? "Generando…" : "Ficha en Blanco"}</div>
        <div className="text-xs text-muted-foreground">Descargar PDF para diligenciar a mano</div>
      </div>
    </Button>
  );
}

function SatisfaccionPanel({ cedula, navigate }: { cedula: string; navigate: ReturnType<typeof useNavigate> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeForms, setActiveForms] = useState<{ form_type: string; module_number: number; done: boolean }[]>([]);
  const [hasAny, setHasAny] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Get user region via SECURITY DEFINER RPC
      const { data: fichaData } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: cedula });
      const fichaObj = fichaData as any;
      const userRegion = fichaObj?.region;
      if (!userRegion) { setLoading(false); return; }

      // Get active configs for this region
      const { data: configs } = await supabase
        .from("satisfaccion_config")
        .select("form_type,module_number")
        .eq("region", userRegion)
        .eq("is_active", true);

      if (!configs || (Array.isArray(configs) && configs.length === 0)) {
        setHasAny(false);
        setLoading(false);
        return;
      }

      setHasAny(true);

      // Check which ones are already submitted
      const { data: submitted } = await supabase
        .from("satisfaccion_responses")
        .select("form_type,module_number")
        .eq("cedula", cedula);

      const doneSet = new Set((submitted || []).map((s: any) => `${s.form_type}-${s.module_number}`));

      setActiveForms(
        (configs as any[]).map((c) => ({
          form_type: c.form_type,
          module_number: c.module_number,
          done: doneSet.has(`${c.form_type}-${c.module_number}`),
        }))
      );
      setLoading(false);
    };
    load();
  }, [cedula]);

  // Don't render anything if loading or no active forms
  if (loading || !hasAny) return null;

  return (
    <div className="space-y-2">
      <Button
        className="w-full h-14 justify-start gap-3 text-base"
        onClick={() => setOpen(!open)}
      >
        <ThumbsUp className="h-5 w-5" />
        <div className="text-left flex-1">
          <div className="font-semibold">Satisfacción</div>
          <div className="text-xs text-muted-foreground">Encuestas de satisfacción</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {open && (
        <div className="pl-4 space-y-1.5">
          {activeForms.map((f) => (
            <Button
              key={`${f.form_type}-${f.module_number}`}
              variant={f.done ? "ghost" : "outline"}
              size="sm"
              className="w-full justify-start gap-2 h-9"
              onClick={() => navigate(`/satisfaccion-${f.form_type}?module=${f.module_number}`)}
            >
              {f.done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              <span className="text-sm">{FORM_TYPE_LABELS[f.form_type]} — Módulo {f.module_number}</span>
              {f.done && <Badge variant="secondary" className="ml-auto text-xs">Completada</Badge>}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [inicialDone, setInicialDone] = useState(false);
  
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
      logActivity(cedula, "page_view", `Panel: ${result.is_directivo ? "directivo" : ""}${result.is_evaluador ? " evaluador" : ""}`, "/mi-panel");

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

      // Check if directivo has started module 4 in rubrica (unlock Salida)
      if (result.is_directivo) {
        const { count: mod4Count } = await supabase
          .from("rubrica_evaluaciones")
          .select("id", { count: "exact", head: true })
          .eq("directivo_cedula", cedula)
          .in("item_id", 
            (await supabase
              .from("rubrica_items")
              .select("id")
              .in("module_id", 
                (await supabase
                  .from("rubrica_modules")
                  .select("id")
                  .eq("module_number", 4)
                ).data?.map(m => m.id) ?? []
              )
            ).data?.map(i => i.id) ?? []
          );
        setInicialDone((mod4Count ?? 0) > 0);
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
                Hola, {roleInfo.nombre?.split(" ")[0] ?? "Usuario"}
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
              Hola, {roleInfo.nombre?.split(" ")[0] ?? "Usuario"}
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
                    className="w-full h-14 justify-start gap-3 text-base"
                    onClick={() => navigate("/encuesta-360")}
                  >
                    <FileBarChart className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Mis Encuestas 360° - Entrada</div>
                      <div className="text-xs opacity-80">Encuestas de evaluación inicial</div>
                    </div>
                  </Button>
                )}

                {roleInfo.is_directivo && (
                  <Button
                    className="w-full h-14 justify-start gap-3 text-base"
                    onClick={() => navigate("/encuesta-360?fase=final")}
                  >
                    <FileBarChart className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Mis Encuestas 360° - Salida</div>
                      <div className="text-xs opacity-80">Encuestas de evaluación final</div>
                    </div>
                  </Button>
                )}

                {/* Satisfacción button */}
                {roleInfo.is_directivo && (
                  <SatisfaccionPanel cedula={cedula} navigate={navigate} />
                )}
              </>
            )}

            {/* Evaluador buttons */}
            {selectedRole === "evaluador" && (
              <>
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
                <Button
                  className="w-full h-14 justify-start gap-3 text-base"
                  variant="outline"
                  onClick={() => navigate("/informe-modulo")}
                >
                  <FileBarChart className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Informe de Módulo</div>
                    <div className="text-xs opacity-80">Registrar informe por módulo y ET</div>
                  </div>
                </Button>
                <BlankFichaPdfButton />
              </>
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
