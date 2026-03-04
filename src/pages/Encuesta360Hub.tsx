import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ShareEncuestaDialog from "@/components/ShareEncuestaDialog";
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  GraduationCap,
  Loader2,
  Mail,
  School,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

interface DirectivoInfo {
  nombre: string;
  institucion: string;
  email: string;
  cargo: string;
}

const forms = [
  {
    label: "Autoevaluación",
    description: "Evalúe su propio desempeño",
    path: "/formulario-360-autoevaluacion",
    icon: UserCheck,
    isAutoeval: true,
  },
  {
    label: "Directivo",
    description: "Evaluación por coordinador/a",
    path: "/formulario-360-directivo",
    icon: UserRound,
    isAutoeval: false,
  },
  {
    label: "Docente",
    description: "Evaluación por docentes",
    path: "/formulario-360-docente",
    icon: GraduationCap,
    isAutoeval: false,
  },
  {
    label: "Administrativo",
    description: "Evaluación por administrativos",
    path: "/formulario-360-administrativo",
    icon: ClipboardList,
    isAutoeval: false,
  },
  {
    label: "Estudiante",
    description: "Evaluación por estudiantes",
    path: "/formulario-360-estudiante",
    icon: School,
    isAutoeval: false,
  },
  {
    label: "Acudiente",
    description: "Evaluación por acudientes",
    path: "/formulario-360-acudiente",
    icon: Users,
    isAutoeval: false,
  },
];

export default function Encuesta360Hub() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const { toast } = useToast();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt;

  const [directivoInfo, setDirectivoInfo] = useState<DirectivoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState<{ label: string; path: string } | null>(null);

  useEffect(() => {
    const cedula = sessionStorage.getItem("user_cedula");
    if (!cedula) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: cedula });
        if (data) {
          const ficha = data as any;
          setDirectivoInfo({
            nombre: ficha.nombres_apellidos || "",
            institucion: ficha.nombre_ie || "",
            email: ficha.prefiere_correo === "Institucional" && ficha.correo_institucional
              ? ficha.correo_institucional
              : ficha.correo_personal || "",
            cargo: ficha.cargo_actual || "",
          });
        }
      } catch (err) {
        console.error("Error loading directivo info:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buildShareUrl = (path: string) => {
    if (!directivoInfo) return `${window.location.origin}${path}`;
    const params = new URLSearchParams({
      nombre_directivo: directivoInfo.nombre,
      institucion: directivoInfo.institucion,
    });
    return `${window.location.origin}${path}?${params.toString()}`;
  };

  const handleCopyUrl = async (path: string, label: string) => {
    const url = buildShareUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: `Enlace del formulario "${label}" copiado al portapapeles.` });
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace.", variant: "destructive" });
    }
  };

  const handleOpenEmailDialog = (form: { label: string; path: string }) => {
    setShareForm(form);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md shadow-lg border-0">
            <CardHeader className="text-center space-y-3 pb-2">
              <div className="flex justify-center items-center gap-4">
                {logoRLT && <img src={logoRLT} alt="Logo RLT" className="h-14 object-contain" />}
                {logoCLT && <img src={logoCLT} alt="Logo CLT" className="h-14 object-contain" />}
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Encuesta 360° — Fase Inicial
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {directivoInfo
                  ? "Complete su autoevaluación o envíe los formularios a sus evaluadores"
                  : "Seleccione el formulario que desea completar"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {forms.map((form) => (
                <div key={form.path} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 justify-start gap-3 text-base"
                    onClick={() => {
                      if (form.isAutoeval) {
                        navigate(form.path);
                      } else {
                        navigate(buildShareUrl(form.path).replace(window.location.origin, ""));
                      }
                    }}
                  >
                    <form.icon className="h-5 w-5 text-primary shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">{form.label}</div>
                      <div className="text-xs text-muted-foreground">{form.description}</div>
                    </div>
                  </Button>

                  {/* Share actions for non-autoeval forms */}
                  {!form.isAutoeval && directivoInfo && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10"
                            onClick={() => handleCopyUrl(form.path, form.label)}
                          >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar enlace</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-10 w-10"
                            onClick={() => handleOpenEmailDialog(form)}
                          >
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Enviar por correo</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => navigate("/mi-panel")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Mi Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email share dialog */}
      {shareForm && directivoInfo && (
        <ShareEncuestaDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          formLabel={shareForm.label}
          formUrl={buildShareUrl(shareForm.path)}
          directivoNombre={directivoInfo.nombre}
          directivoEmail={directivoInfo.email}
          institucion={directivoInfo.institucion}
        />
      )}
    </TooltipProvider>
  );
}
