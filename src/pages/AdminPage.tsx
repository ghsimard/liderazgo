import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, RefreshCw, FileText, Users, MapPin, DatabaseBackup, ClipboardList, School, BookOpen, GraduationCap, Copy, Check, Scale, Settings2, Layers, ListTree, ListChecks, Plus, Trash2, BarChart3, MessageSquare, Star, GitCommit, FileDown, Link2, PlayCircle, FlagTriangleRight, FileBarChart, FileBarChart2, Printer, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, getToken } from "@/utils/apiFetch";
import { supabase as cloudClient } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { generarPDFEncuesta360EnBlanco } from "@/utils/blankEncuesta360PdfGenerator";

import { generarPDFFichaEnBlanco } from "@/utils/blankFichaPdfGenerator";
import { generarPDFAmbienteEscolarEnBlanco } from "@/utils/blankAmbienteEscolarPdfGenerator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import RegionPdfPicker from "@/components/admin/RegionPdfPicker";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminFichasTab from "@/components/admin/AdminFichasTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminGeographyTab from "@/components/admin/AdminGeographyTab";
import AdminWeightsTab from "@/components/admin/AdminWeightsTab";
import AdminDomainsManager from "@/components/admin/AdminDomainsManager";
import AdminCompetenciesManager from "@/components/admin/AdminCompetenciesManager";
import AdminItemsManager from "@/components/admin/AdminItemsManager";
import AdminCompetencyWizard from "@/components/admin/AdminCompetencyWizard";
import AdminTrashManager from "@/components/admin/AdminTrashManager";
import AdminReporte360Tab from "@/components/admin/AdminReporte360Tab";
import AdminEncuestas360Tab from "@/components/admin/AdminEncuestas360Tab";
import AdminRubricasTab from "@/components/admin/AdminRubricasTab";
import AdminMensajesTab from "@/components/admin/AdminMensajesTab";
import AdminReviewsTab from "@/components/admin/AdminReviewsTab";
import AdminChangelogTab from "@/components/admin/AdminChangelogTab";
import AdminMelTab from "@/components/admin/AdminMelTab";
import AdminMelRubricasTab from "@/components/admin/AdminMelRubricasTab";
import AdminMelConfigTab from "@/components/admin/AdminMelConfigTab";
import AdminInvitacionesTab from "@/components/admin/AdminInvitacionesTab";
import AdminActivityLogTab from "@/components/admin/AdminActivityLogTab";
import AdminInformeModuloTab from "@/components/admin/AdminInformeModuloTab";
import AdminPurgeDataTab from "@/components/admin/AdminPurgeDataTab";
import AdminSatisfaccionesTab from "@/components/admin/AdminSatisfaccionesTab";
import AdminAmbienteMonitorTab from "@/components/admin/AdminAmbienteMonitorTab";
import AdminAmbienteStatsTab from "@/components/admin/AdminAmbienteStatsTab";

interface FormItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface FormCategory {
  title: string;
  subcategories?: { title: string; forms: FormItem[] }[];
  forms?: FormItem[];
}

const categories: FormCategory[] = [
  {
    title: "360° Entrada",
    forms: [
      { name: "Formulario Acudiente", path: "/formulario-360-acudiente", icon: Users },
      { name: "Formulario Administrativo", path: "/formulario-360-administrativo", icon: ClipboardList },
      { name: "Formulario Autoevaluación", path: "/formulario-360-autoevaluacion", icon: FileText },
      { name: "Formulario Directivo Par", path: "/formulario-360-directivo", icon: School },
      { name: "Formulario Docente", path: "/formulario-360-docente", icon: BookOpen },
      { name: "Formulario Estudiante", path: "/formulario-360-estudiante", icon: GraduationCap },
    ],
  },
  {
    title: "360° Salida",
    forms: [
      { name: "Formulario Acudiente (Final)", path: "/formulario-360-final-acudiente", icon: Users },
      { name: "Formulario Administrativo (Final)", path: "/formulario-360-final-administrativo", icon: ClipboardList },
      { name: "Formulario Autoevaluación (Final)", path: "/formulario-360-final-autoevaluacion", icon: FileText },
      { name: "Formulario Directivo Par (Final)", path: "/formulario-360-final-directivo", icon: School },
      { name: "Formulario Docente (Final)", path: "/formulario-360-final-docente", icon: BookOpen },
      { name: "Formulario Estudiante (Final)", path: "/formulario-360-final-estudiante", icon: GraduationCap },
    ],
  },
  {
    title: "Rúbrica",
    forms: [
      { name: "Rúbrica de Evaluación", path: "/rubrica-evaluacion", icon: ClipboardList },
    ],
  },
  {
    title: "RLT",
    forms: [
      { name: "Ficha de Información", path: "/", icon: FileText },
    ],
    subcategories: [
      {
        title: "Ambiente Escolar",
        forms: [
          { name: "Encuesta Docente", path: "/encuesta-ambiente-docentes", icon: BookOpen },
          { name: "Encuesta Acudiente", path: "/encuesta-ambiente-acudientes", icon: Users },
          { name: "Encuesta Estudiante", path: "/encuesta-ambiente-estudiantes", icon: GraduationCap },
        ],
      },
    ],
  },
];

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

/** Map form path to blank PDF action */
const FORM_PATH_TO_BLANK: Record<string, string> = {
  "/formulario-360-acudiente": "acudiente",
  "/formulario-360-administrativo": "administrativo",
  "/formulario-360-autoevaluacion": "autoevaluacion",
  "/formulario-360-directivo": "directivo",
  "/formulario-360-docente": "docente",
  "/formulario-360-estudiante": "estudiante",
  "/formulario-360-final-acudiente": "acudiente",
  "/formulario-360-final-administrativo": "administrativo",
  "/formulario-360-final-autoevaluacion": "autoevaluacion",
  "/formulario-360-final-directivo": "directivo",
  "/formulario-360-final-docente": "docente",
  "/formulario-360-final-estudiante": "estudiante",
  
  "/": "ficha",

  "/encuesta-acudiente": "ambiente_acudientes",
  "/encuesta-estudiante": "ambiente_estudiantes",
  "/encuesta-docente": "ambiente_docentes",
  "/encuesta-ambiente-acudientes": "ambiente_acudientes",
  "/encuesta-ambiente-estudiantes": "ambiente_estudiantes",
  "/encuesta-ambiente-docentes": "ambiente_docentes",
};

function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Enlace copiado", description: url });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 shrink-0" title="Copiar enlace">
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function BlankPdfButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { toast } = useToast();
  const { images } = useAppImages();
  const blankType = FORM_PATH_TO_BLANK[path];

  if (!blankType) return null;

  const handleRegionConfirm = async (flags: { showLogoRlt: boolean; showLogoClt: boolean }) => {
    if (loading) return;
    setLoading(true);
    const logos = { logoRLT: images.logo_rlt_white, logoCLTDark: images.logo_clt_white, logoCosmo: images.logo_cosmo };
    try {
      if (blankType === "ficha") {
        await generarPDFFichaEnBlanco(logos, flags);
      } else if (blankType.startsWith("ambiente_")) {
        const ambienteType = blankType.replace("ambiente_", "") as "acudientes" | "estudiantes" | "docentes";
        await generarPDFAmbienteEscolarEnBlanco(ambienteType, logos, flags);
      } else {
        await generarPDFEncuesta360EnBlanco(blankType, logos, flags);
      }
      toast({ title: "PDF en blanco descargado" });
      setPickerOpen(false);
    } catch {
      toast({ title: "Error al generar PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setPickerOpen(true)} disabled={loading} className="h-8 w-8 shrink-0" title="Descargar formulario en blanco (PDF)">
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      </Button>
      <RegionPdfPicker open={pickerOpen} onOpenChange={setPickerOpen} onConfirm={handleRegionConfirm} loading={loading} />
    </>
  );
}

function FormCard({ form }: { form: FormItem }) {
  const Icon = form.icon;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <a href={form.path} target="_blank" rel="noopener noreferrer" className="text-sm font-medium flex-1 hover:underline hover:text-primary transition-colors">
          {form.name}
        </a>
        <BlankPdfButton path={form.path} />
        <CopyLinkButton path={form.path} />
      </CardContent>
    </Card>
  );
}

function getHubTitle(activeTab: string): string {
  const titleMap: Record<string, string> = {
    formularios: "Enlaces",
    encuesta360: "Encuesta 360°", enlaces360: "Encuesta 360°", ponderaciones: "Encuesta 360°",
    encuestas360: "Encuesta 360°", encuestas360final: "Encuesta 360°",
    reportes360: "Encuesta 360°", reportes360final: "Encuesta 360°",
    invitaciones: "Encuesta 360°", "blancos-360": "Encuesta 360°",
    "fichas-rlt": "Fichas RLT", fichas: "Fichas RLT", geography: "Fichas RLT",
    "enlace-ficha": "Fichas RLT", "blank-pdf": "Fichas RLT",
    rubricas: "Rúbricas",
    "informe-modulo": "Informe de Módulo",
    "ambiente-escolar": "Ambiente Escolar", "ambiente-monitoreo": "Ambiente Escolar", "ambiente-estadisticas": "Ambiente Escolar", "blancos-ambiente": "Ambiente Escolar",
    satisfacciones: "Encuestas de Satisfacción",
    certificaciones: "Certificaciones",
    mel: "MEL", "mel-rubricas": "MEL", "mel-config": "MEL",
    users: "Administradores",
    "activity-log": "Registro de Actividad",
    reviews: "Apreciaciones",
    mensajes: "Mensajes",
    changelog: "Changelog",
    "purge-data": "Purgar datos",
    papelera: "Papelera",
  };
  return titleMap[activeTab] || "Panel";
}

function AdminContent({ activeTab, isSuperAdmin }: { activeTab: string; isSuperAdmin: boolean }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardRefreshKey, setWizardRefreshKey] = useState(0);

  switch (activeTab) {
    case "formularios":
      return (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">Copia el enlace de cada formulario para compartirlo.</p>
          {categories.map((cat) => (
            <section key={cat.title} className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">{cat.title}</h3>
              {cat.forms && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {cat.forms.map((f) => <FormCard key={f.path} form={f} />)}
                </div>
              )}
              {cat.subcategories?.map((sub) => (
                <div key={sub.title} className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <h4 className="text-sm font-medium text-muted-foreground">{sub.title}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sub.forms.map((f) => <FormCard key={f.path} form={f} />)}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      );

    case "encuesta360":
    case "enlaces360":
    case "ponderaciones":
    case "encuestas360":
    case "encuestas360final":
    case "reportes360":
    case "reportes360final":
    case "invitaciones":
    case "blancos-360": {
      const sub360Map: Record<string, string> = {
        encuesta360: "formularios",
        enlaces360: "formularios",
        ponderaciones: "configuracion",
        encuestas360: "inicial",
        encuestas360final: "final",
        reportes360: "informes-inicial",
        reportes360final: "informes-final",
        invitaciones: "invitaciones",
        "blancos-360": "blancos",
      };
      const defaultSub = sub360Map[activeTab] || "formularios";
      return (
        <Tabs defaultValue={defaultSub} className="space-y-4">
          <TabsList className="hub-tabs flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
            <TabsTrigger value="formularios" className="gap-1.5"><Link2 className="w-4 h-4" /> Formularios</TabsTrigger>
            <TabsTrigger value="inicial" className="gap-1.5"><PlayCircle className="w-4 h-4" /> Entrada</TabsTrigger>
            <TabsTrigger value="final" className="gap-1.5"><FlagTriangleRight className="w-4 h-4" /> Salida</TabsTrigger>
            <TabsTrigger value="invitaciones" className="gap-1.5"><Users className="w-4 h-4" /> Invitaciones</TabsTrigger>
            <TabsTrigger value="informes-inicial" className="gap-1.5"><FileBarChart className="w-4 h-4" /> Informes Entrada</TabsTrigger>
            <TabsTrigger value="informes-final" className="gap-1.5"><FileBarChart2 className="w-4 h-4" /> Informes Salida</TabsTrigger>
            
            <TabsTrigger value="configuracion" className="gap-1.5"><Settings2 className="w-4 h-4" /> Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="formularios">
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground">Copia el enlace de cada formulario 360° para compartirlo.</p>
              {categories.filter((cat) => cat.title.startsWith("360°")).map((cat) => (
                <section key={cat.title} className="space-y-4">
                  <h3 className="text-base font-semibold border-b pb-2">{cat.title}</h3>
                  {cat.forms && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cat.forms.map((f) => <FormCard key={f.path} form={f} />)}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="configuracion">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Gestión completa de competencias 360°</h3>
              <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Asistente de creación
              </Button>
            </div>
            <AdminCompetencyWizard
              open={wizardOpen}
              onOpenChange={setWizardOpen}
              onComplete={() => setWizardRefreshKey((k) => k + 1)}
            />
            <Tabs defaultValue="dominios">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="dominios" className="gap-1.5"><Layers className="w-4 h-4" /> Dominios</TabsTrigger>
                <TabsTrigger value="competencias" className="gap-1.5"><ListTree className="w-4 h-4" /> Competencias</TabsTrigger>
                <TabsTrigger value="items" className="gap-1.5"><ListChecks className="w-4 h-4" /> Ítems</TabsTrigger>
                <TabsTrigger value="pesos" className="gap-1.5"><Scale className="w-4 h-4" /> Ponderaciones</TabsTrigger>
              </TabsList>
              <TabsContent value="dominios"><AdminDomainsManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="competencias"><AdminCompetenciesManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="items"><AdminItemsManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="pesos"><AdminWeightsTab key={wizardRefreshKey} /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="inicial">
            <AdminEncuestas360Tab fase="inicial" />
          </TabsContent>
          <TabsContent value="final">
            <AdminEncuestas360Tab fase="final" />
          </TabsContent>
          <TabsContent value="invitaciones">
            <AdminInvitacionesTab />
          </TabsContent>
          <TabsContent value="informes-inicial">
            <AdminReporte360Tab fase="inicial" />
          </TabsContent>
          <TabsContent value="informes-final">
            <AdminReporte360Tab fase="final" />
          </TabsContent>
        </Tabs>
      );
    }

    case "fichas-rlt":
    case "fichas":
    case "geography":
    case "enlace-ficha":
    case "blank-pdf": {
      const subFichasMap: Record<string, string> = {
        "fichas-rlt": "lista",
        fichas: "lista",
        geography: "regiones",
        "enlace-ficha": "enlace",
        "blank-pdf": "enlace",
      };
      const defaultSubFichas = subFichasMap[activeTab] || "lista";
      return (
        <Tabs key={activeTab} defaultValue={defaultSubFichas} className="space-y-4">
          <TabsList className="hub-tabs flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
            <TabsTrigger value="lista" className="gap-1.5"><FileText className="w-4 h-4" /> Lista</TabsTrigger>
            <TabsTrigger value="enlace" className="gap-1.5"><Link2 className="w-4 h-4" /> Enlace y PDF</TabsTrigger>
            <TabsTrigger value="regiones" className="gap-1.5"><MapPin className="w-4 h-4" /> Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="lista">
            <AdminFichasTab />
          </TabsContent>

          <TabsContent value="enlace">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-2">Enlace de la Ficha RLT</h3>
                <p className="text-sm text-muted-foreground">Comparte el enlace de la ficha de información con los directivos.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <FormCard form={{ name: "Ficha de Información", path: "/", icon: FileText }} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="regiones">
            <AdminGeographyTab />
          </TabsContent>
        </Tabs>
      );
    }

    case "users":
      return <AdminUsersTab isSuperAdmin={isSuperAdmin} />;
    case "mel":
    case "mel-rubricas":
    case "mel-config": {
      const subMelMap: Record<string, string> = {
        mel: "mel-360",
        "mel-rubricas": "mel-rubricas",
        "mel-config": "mel-config",
      };
      const defaultSubMel = subMelMap[activeTab] || "mel-360";
      return (
        <Tabs defaultValue={defaultSubMel} className="space-y-4">
          <TabsList className="hub-tabs flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
            <TabsTrigger value="mel-360" className="gap-1.5"><TrendingUp className="w-4 h-4" /> MEL 360°</TabsTrigger>
            <TabsTrigger value="mel-rubricas" className="gap-1.5"><ClipboardList className="w-4 h-4" /> MEL Rúbricas</TabsTrigger>
            <TabsTrigger value="mel-config" className="gap-1.5"><Settings2 className="w-4 h-4" /> Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="mel-360">
            <AdminMelTab />
          </TabsContent>
          <TabsContent value="mel-rubricas">
            <AdminMelRubricasTab />
          </TabsContent>
          <TabsContent value="mel-config">
            <AdminMelConfigTab />
          </TabsContent>
        </Tabs>
      );
    }

    case "rubricas":
      return <AdminRubricasTab />;
    case "informe-modulo":
      return <AdminInformeModuloTab />;
    case "blancos-ambiente":
    case "ambiente-escolar":
    case "ambiente-monitoreo":
    case "ambiente-estadisticas": {
      const subAmbienteMap: Record<string, string> = {
        "ambiente-escolar": "monitoreo",
        "ambiente-monitoreo": "monitoreo",
        "ambiente-estadisticas": "estadisticas",
        "blancos-ambiente": "enlaces",
      };
      const defaultSubAmbiente = subAmbienteMap[activeTab] || "monitoreo";
      return (
        <Tabs defaultValue={defaultSubAmbiente} className="space-y-4">
          <TabsList className="hub-tabs flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
            <TabsTrigger value="monitoreo" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Monitoreo</TabsTrigger>
            <TabsTrigger value="estadisticas" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Estadísticas</TabsTrigger>
            <TabsTrigger value="enlaces" className="gap-1.5"><Link2 className="w-4 h-4" /> Enlaces</TabsTrigger>
          </TabsList>

          <TabsContent value="monitoreo">
            <AdminAmbienteMonitorTab />
          </TabsContent>
          <TabsContent value="estadisticas">
            <AdminAmbienteStatsTab />
          </TabsContent>
          <TabsContent value="enlaces">
            <div className="space-y-4">
              <h3 className="text-base font-semibold border-b pb-2">Enlaces de Encuestas</h3>
              <p className="text-sm text-muted-foreground">Copia el enlace de cada encuesta para compartirlo.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: "Encuesta Acudiente", path: "/encuesta-ambiente-acudientes", icon: Users },
                  { name: "Encuesta Estudiante", path: "/encuesta-ambiente-estudiantes", icon: GraduationCap },
                  { name: "Encuesta Docente", path: "/encuesta-ambiente-docentes", icon: BookOpen },
                ].map((f) => <FormCard key={f.path} form={f} />)}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      );
    }
    case "satisfacciones":
      return <AdminSatisfaccionesTab />;
    case "certificaciones":
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <h3 className="text-lg font-semibold">Certificaciones</h3>
          <p className="text-sm text-muted-foreground">Esta sección está en construcción.</p>
        </div>
      );
    case "reviews":
      return isSuperAdmin ? <AdminReviewsTab /> : null;
    case "mensajes":
      return isSuperAdmin ? <AdminMensajesTab /> : null;
    case "activity-log":
      return <AdminActivityLogTab isSuperAdmin={isSuperAdmin} />;
    case "changelog":
      return isSuperAdmin ? <AdminChangelogTab /> : null;
    case "purge-data":
      return isSuperAdmin ? <AdminPurgeDataTab /> : null;
    case "papelera":
      return <AdminTrashManager />;
    default:
      return null;
  }
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isSuperAdmin, signOut } = useAdminAuth();
  const { toast } = useToast();
  const { images } = useAppImages();
  const logoRLT = images.logo_rlt_noletters;
  const logoCLT = images.logo_clt_noletters;
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "formularios");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleExportDB = async () => {
    setExporting(true);
    try {
      let blob: Blob;

      if (USE_EXPRESS) {
        const token = getToken();
        if (!token) throw new Error("Session admin expirée. Reconnectez-vous.");
        const { data, error } = await apiFetch<string>("/api/export");
        if (error || !data) throw new Error(error || "Aucune donnée exportée.");
        blob = new Blob([data], { type: "application/sql" });
      } else {
        const { data, error } = await cloudClient.functions.invoke("export-database");
        if (error) throw new Error(error.message || "Échec de l'export.");
        if (data instanceof Blob) {
          blob = data;
        } else if (typeof data === "string") {
          blob = new Blob([data], { type: "application/sql" });
        } else {
          throw new Error("Réponse d'export invalide.");
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_db_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export SQL téléchargé" });
    } catch (err: any) {
      toast({ title: "Erreur d'export", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/20">
        <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} isSuperAdmin={isSuperAdmin} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-primary text-primary-foreground sticky top-0 z-20">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-primary-foreground hover:bg-primary-foreground/10" />
                <img src={logoRLT} alt="RLT" className="h-9" />
                <img src={logoCLT} alt="CLT" className="h-9" />
                <h1 className="font-semibold text-base leading-tight hidden sm:block">Panel de Administración</h1>
              </div>
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <Button variant="outline" size="sm" onClick={handleExportDB} disabled={exporting} className="gap-1.5 bg-primary-foreground/10 border-primary-foreground !text-primary-foreground hover:bg-primary-foreground/20">
                    <DatabaseBackup className="w-4 h-4" /> {exporting ? "Exportando…" : "Export SQL"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-primary-foreground hover:bg-primary-foreground/10">
                  <LogOut className="w-4 h-4" /> Salir
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{getHubTitle(activeTab)}</h2>
            <AdminContent activeTab={activeTab} isSuperAdmin={isSuperAdmin} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
