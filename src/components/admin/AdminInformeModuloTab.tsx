import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, FileText, UserCheck } from "lucide-react";
import AdminAsistenciaTab from "./AdminAsistenciaTab";
import AdminInformeModuloForm from "./AdminInformeModuloForm";

export default function AdminInformeModuloTab() {
  return (
    <Tabs defaultValue="asistencia">
      <TabsList className="mb-4">
        <TabsTrigger value="asistencia" className="gap-1.5">
          <CalendarCheck className="w-4 h-4" /> Asistencia
        </TabsTrigger>
        <TabsTrigger value="informe" className="gap-1.5">
          <FileText className="w-4 h-4" /> Informe de Módulo
        </TabsTrigger>
        <TabsTrigger value="evaluacion" className="gap-1.5" disabled>
          <UserCheck className="w-4 h-4" /> Evaluación Individual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="asistencia">
        <AdminAsistenciaTab />
      </TabsContent>

      <TabsContent value="informe">
        <AdminInformeModuloForm />
      </TabsContent>

      <TabsContent value="evaluacion">
        <p className="text-sm text-muted-foreground py-8 text-center">Próximamente</p>
      </TabsContent>
    </Tabs>
  );
}
