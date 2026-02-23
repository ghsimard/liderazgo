import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, RefreshCw, FileText, Users, MapPin, DatabaseBackup, ClipboardList, School, BookOpen, GraduationCap, Copy, Check, UserCheck, Scale, Settings2, Layers, ListTree, ListChecks, Plus, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoRLT from "@/assets/logo_rlt.png";
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
    title: "360",
    forms: [
      { name: "Formulario Acudiente", path: "/formulario-360-acudiente", icon: Users },
      { name: "Formulario Administrativo", path: "/formulario-360-administrativo", icon: ClipboardList },
      { name: "Formulario Autoevaluación", path: "/formulario-360-autoevaluacion", icon: FileText },
      { name: "Formulario Directivo", path: "/formulario-360-directivo", icon: School },
      { name: "Formulario Docente", path: "/formulario-360-docente", icon: BookOpen },
      { name: "Formulario Estudiante", path: "/formulario-360-estudiante", icon: GraduationCap },
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
          { name: "Encuesta Docente", path: "/encuesta-docente", icon: BookOpen },
          { name: "Encuesta Acudiente", path: "/encuesta-acudiente", icon: Users },
          { name: "Encuesta Estudiante", path: "/encuesta-estudiante", icon: GraduationCap },
        ],
      },
    ],
  },
];

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

function FormCard({ form }: { form: FormItem }) {
  const Icon = form.icon;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium flex-1">{form.name}</span>
        <CopyLinkButton path={form.path} />
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { isAdmin, signOut } = useAdminAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardRefreshKey, setWizardRefreshKey] = useState(0);

  const handleExportDB = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke("export-database", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;

      const blob = new Blob([res.data], { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_db_${new Date().toISOString().slice(0, 10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export SQL téléchargé" });
    } catch (err: any) {
      toast({ title: "Erreur d'export", description: err.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoRLT} alt="RLT" className="h-9" />
            <h1 className="font-semibold text-base leading-tight">Panel de Administración</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportDB} disabled={exporting} className="gap-1.5">
              <DatabaseBackup className="w-4 h-4" /> {exporting ? "Exportando…" : "Export SQL"}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5">
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="formularios">
          <TabsList className="mb-4">
            <TabsTrigger value="formularios" className="gap-1.5"><ClipboardList className="w-4 h-4" /> Formularios</TabsTrigger>
            <TabsTrigger value="fichas" className="gap-1.5"><FileText className="w-4 h-4" /> Fichas Gestión</TabsTrigger>
            <TabsTrigger value="ponderaciones" className="gap-1.5"><Settings2 className="w-4 h-4" /> Config 360°</TabsTrigger>
            <TabsTrigger value="reportes360" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Informes 360°</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> Administradores</TabsTrigger>
          </TabsList>
          <TabsContent value="formularios">
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
          </TabsContent>
          <TabsContent value="fichas">
            <Tabs defaultValue="lista">
              <TabsList className="mb-4">
                <TabsTrigger value="lista" className="gap-1.5"><FileText className="w-4 h-4" /> Lista de Fichas</TabsTrigger>
                <TabsTrigger value="geography" className="gap-1.5"><MapPin className="w-4 h-4" /> Configuración de Región</TabsTrigger>
              </TabsList>
              <TabsContent value="lista"><AdminFichasTab /></TabsContent>
              <TabsContent value="geography"><AdminGeographyTab /></TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="ponderaciones">
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
                <TabsTrigger value="papelera" className="gap-1.5"><Trash2 className="w-4 h-4" /> Papelera</TabsTrigger>
              </TabsList>
              <TabsContent value="dominios"><AdminDomainsManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="competencias"><AdminCompetenciesManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="items"><AdminItemsManager key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="pesos"><AdminWeightsTab key={wizardRefreshKey} /></TabsContent>
              <TabsContent value="papelera"><AdminTrashManager /></TabsContent>
            </Tabs>
          </TabsContent>
          <TabsContent value="reportes360"><AdminReporte360Tab /></TabsContent>
          <TabsContent value="users"><AdminUsersTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
