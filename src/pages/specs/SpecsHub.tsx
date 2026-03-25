import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, GitBranch, Monitor, BookOpen, LayoutDashboard, ClipboardList } from "lucide-react";

const sections = [
  {
    title: "PRD Completo",
    description: "Documento de requisitos del producto: visión, objetivos, funcionalidades y arquitectura.",
    icon: FileText,
    path: "/specs/prd",
  },
  {
    title: "Especificaciones Técnicas",
    description: "Documentación técnica detallada de cada módulo, tabla y flujo del sistema.",
    icon: BookOpen,
    path: "/specs/specs",
  },
  {
    title: "Diagramas",
    description: "Diagramas de flujo de usuarios, arquitectura y procesos del sistema.",
    icon: GitBranch,
    path: "/specs/diagramas",
  },
  {
    title: "Wireframes",
    description: "Vistas estilo boceto de las pantallas principales de la aplicación.",
    icon: Monitor,
    path: "/specs/wireframes",
  },
  {
    title: "Hubs de la Aplicación",
    description: "Especificaciones detalladas de cada hub: rutas, roles, funcionalidades y diagramas.",
    icon: LayoutDashboard,
    path: "/specs/hubs",
  },
  {
    title: "Formularios",
    description: "Referencia completa de todos los formularios, preguntas, estructura y ponderaciones.",
    icon: ClipboardList,
    path: "/specs/formularios",
  },
];

export default function SpecsHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Inicio
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
        {/* IP Notice */}
        <div className="border border-border rounded-lg bg-muted/30 p-5 text-center mb-8">
          <p className="text-sm font-semibold text-foreground mb-2">AVISO DE PROPIEDAD INTELECTUAL</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este documento es propiedad intelectual exclusiva de Ghislain Simard (CE 6798900).
            Todos los derechos están reservados. Queda estrictamente prohibida la reproducción, distribución,
            modificación, transmisión o utilización total o parcial de este documento y de su contenido,
            en cualquier forma o por cualquier medio, sin el consentimiento previo, expreso y por escrito del autor.
          </p>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">Documentación del Proyecto</h1>
        <p className="text-muted-foreground mb-8">
          Hub centralizado de especificaciones, diagramas y wireframes de la plataforma RLT / CLT.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((s) => (
            <Card
              key={s.path}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(s.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-1">
                  <s.icon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">{s.title}</CardTitle>
                </div>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
