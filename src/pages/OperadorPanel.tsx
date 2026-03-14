import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, RefreshCw, ClipboardCheck, FileBarChart, School, ThumbsUp, TrendingUp, FolderOpen, Gauge, Award, CalendarCheck } from "lucide-react";
import { useAppImages } from "@/hooks/useAppImages";

// Lazy-load admin sub-components that operators can access
import AdminAsistenciaTab from "@/components/admin/AdminAsistenciaTab";
import AdminInformeModuloTab from "@/components/admin/AdminInformeModuloTab";
import AdminRubricasTab from "@/components/admin/AdminRubricasTab";
import AdminEncuestas360Tab from "@/components/admin/AdminEncuestas360Tab";
import AdminFichasTab from "@/components/admin/AdminFichasTab";
import AdminAmbienteMonitorTab from "@/components/admin/AdminAmbienteMonitorTab";
import AdminSatisfaccionesTab from "@/components/admin/AdminSatisfaccionesTab";
import AdminMelTab from "@/components/admin/AdminMelTab";

interface OperatorPermission {
  id: string;
  cedula: string;
  nombre: string;
  section: string;
  region: string | null;
  entidad: string | null;
  institucion: string | null;
  module_number: number | null;
}

const SECTION_META: Record<string, { label: string; icon: React.ElementType }> = {
  asistencia: { label: "Asistencia", icon: CalendarCheck },
  "informe-modulo": { label: "Informe de Módulo", icon: FileBarChart },
  rubricas: { label: "Rúbricas", icon: ClipboardCheck },
  encuesta360: { label: "Encuesta 360°", icon: Gauge },
  "fichas-rlt": { label: "Fichas de Información", icon: FolderOpen },
  "ambiente-escolar": { label: "Ambiente Escolar", icon: School },
  satisfacciones: { label: "Satisfacciones", icon: ThumbsUp },
  mel: { label: "MEL", icon: TrendingUp },
  certificaciones: { label: "Certificaciones", icon: Award },
};

export default function OperadorPanel() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const cedula = sessionStorage.getItem("user_cedula");
  const [permissions, setPermissions] = useState<OperatorPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState("");

  useEffect(() => {
    if (!cedula) {
      navigate("/");
      return;
    }
    loadPermissions();
  }, [cedula]);

  const loadPermissions = async () => {
    const { data } = await supabase
      .from("operator_permissions")
      .select("*")
      .eq("cedula", cedula!);
    const perms = (data as OperatorPermission[]) || [];
    setPermissions(perms);
    if (perms.length > 0) {
      setOperatorName(perms[0].nombre);
    }
    setLoading(false);
  };

  const uniqueSections = [...new Set(permissions.map((p) => p.section))];

  const getSectionFilters = (section: string) => {
    return permissions.filter((p) => p.section === section);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user_cedula");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-muted-foreground">No tiene permisos asignados.</p>
            <Button onClick={handleLogout}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderSection = () => {
    if (!activeSection) return null;
    const filters = getSectionFilters(activeSection);

    switch (activeSection) {
      case "asistencia":
        return <AdminAsistenciaTab />;
      case "informe-modulo":
        return <AdminInformeModuloTab />;
      case "rubricas":
        return <AdminRubricasTab />;
      case "encuesta360":
        return <AdminEncuestas360Tab fase="inicial" />;
      case "fichas-rlt":
        return <AdminFichasTab />;
      case "ambiente-escolar":
        return <AdminAmbienteMonitorTab />;
      case "satisfacciones":
        return <AdminSatisfaccionesTab />;
      case "mel":
        return <AdminMelTab />;
      case "certificaciones":
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Esta sección está en construcción.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="bg-primary text-primary-foreground sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {images.logo_rlt_noletters && (
              <img src={images.logo_rlt_noletters} alt="RLT" className="h-9" />
            )}
            <div>
              <h1 className="font-semibold text-base leading-tight">Panel de Operador</h1>
              {operatorName && (
                <p className="text-xs text-primary-foreground/70">{operatorName}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-4 h-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {!activeSection ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Herramientas disponibles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {uniqueSections.map((section) => {
                const meta = SECTION_META[section] || { label: section, icon: FolderOpen };
                const Icon = meta.icon;
                const sectionPerms = getSectionFilters(section);
                return (
                  <Card
                    key={section}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setActiveSection(section)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="font-medium">{meta.label}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sectionPerms.map((p) => (
                          <Badge key={p.id} variant="secondary" className="text-xs">
                            {p.region || p.entidad || p.institucion || "Todas"}
                            {p.module_number ? ` M${p.module_number}` : ""}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setActiveSection(null)}>
                ← Volver
              </Button>
              <h2 className="text-lg font-semibold">
                {SECTION_META[activeSection]?.label || activeSection}
              </h2>
            </div>
            {renderSection()}
          </div>
        )}
      </main>
    </div>
  );
}
