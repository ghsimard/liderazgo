import { useNavigate } from "react-router-dom";
import { useAppImages } from "@/hooks/useAppImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ClipboardList, GraduationCap, School, UserCheck, UserRound, Users } from "lucide-react";

const forms = [
  {
    label: "Autoevaluación",
    description: "Evalúe su propio desempeño",
    path: "/formulario-360-autoevaluacion",
    icon: UserCheck,
  },
  {
    label: "Directivo",
    description: "Evaluación por coordinador/a",
    path: "/formulario-360-directivo",
    icon: UserRound,
  },
  {
    label: "Docente",
    description: "Evaluación por docentes",
    path: "/formulario-360-docente",
    icon: GraduationCap,
  },
  {
    label: "Administrativo",
    description: "Evaluación por administrativos",
    path: "/formulario-360-administrativo",
    icon: ClipboardList,
  },
  {
    label: "Estudiante",
    description: "Evaluación por estudiantes",
    path: "/formulario-360-estudiante",
    icon: School,
  },
  {
    label: "Acudiente",
    description: "Evaluación por acudientes",
    path: "/formulario-360-acudiente",
    icon: Users,
  },
];

export default function Encuesta360Hub() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt;

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
              Encuesta 360° — Fase Inicial
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Seleccione el formulario que desea completar
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {forms.map((form) => (
              <Button
                key={form.path}
                variant="outline"
                className="w-full h-14 justify-start gap-3 text-base"
                onClick={() => navigate(form.path)}
              >
                <form.icon className="h-5 w-5 text-primary shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">{form.label}</div>
                  <div className="text-xs text-muted-foreground">{form.description}</div>
                </div>
              </Button>
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
  );
}
