import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, FileText, Download, UserCheck } from "lucide-react";
import AdminAsistenciaTab from "./AdminAsistenciaTab";
import AdminInformeModuloForm from "./AdminInformeModuloForm";
import AdminInformeReportTab from "./AdminInformeReportTab";
import AdminEvalIndividualTab from "./AdminEvalIndividualTab";

export default function AdminInformeModuloTab() {
  return (
    <Tabs defaultValue="asistencia">
      <TabsList className="mb-4 sticky top-0 z-10 bg-background py-2">
        <TabsTrigger value="asistencia" className="gap-1.5">
          <CalendarCheck className="w-4 h-4" /> Asistencia
        </TabsTrigger>
        <TabsTrigger value="informe" className="gap-1.5">
          <FileText className="w-4 h-4" /> Informe de Módulo
        </TabsTrigger>
        <TabsTrigger value="evaluacion" className="gap-1.5">
          <UserCheck className="w-4 h-4" /> Evaluación Individual
        </TabsTrigger>
        <TabsTrigger value="reportes" className="gap-1.5">
          <Download className="w-4 h-4" /> Reportes PDF
        </TabsTrigger>
      </TabsList>

      <TabsContent value="asistencia">
        <AdminAsistenciaTab />
      </TabsContent>

      <TabsContent value="informe">
        <AdminInformeModuloForm />
      </TabsContent>

      <TabsContent value="evaluacion">
        <AdminEvalIndividualTab />
      </TabsContent>

      <TabsContent value="reportes">
        <AdminInformeReportTab />
      </TabsContent>
    </Tabs>
  );
}
