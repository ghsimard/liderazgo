import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, RefreshCw, FileText, Users, MapPin, DatabaseBackup } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoRLT from "@/assets/logo_rlt.png";
import AdminFichasTab from "@/components/admin/AdminFichasTab";
import AdminUsersTab from "@/components/admin/AdminUsersTab";
import AdminGeographyTab from "@/components/admin/AdminGeographyTab";

export default function AdminPage() {
  const { isAdmin, signOut } = useAdminAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

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
        <Tabs defaultValue="fichas">
          <TabsList className="mb-4">
            <TabsTrigger value="fichas" className="gap-1.5"><FileText className="w-4 h-4" /> Fichas</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" /> Administradores</TabsTrigger>
            <TabsTrigger value="geography" className="gap-1.5"><MapPin className="w-4 h-4" /> Geografía</TabsTrigger>
          </TabsList>
          <TabsContent value="fichas"><AdminFichasTab /></TabsContent>
          <TabsContent value="users"><AdminUsersTab /></TabsContent>
          <TabsContent value="geography"><AdminGeographyTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
