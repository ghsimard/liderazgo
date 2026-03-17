import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, FileText, Download, UserCheck } from "lucide-react";
import AdminAsistenciaTab from "./AdminAsistenciaTab";
import AdminInformeModuloForm from "./AdminInformeModuloForm";
import AdminInformeReportTab from "./AdminInformeReportTab";
import AdminEvalIndividualTab from "./AdminEvalIndividualTab";

export default function AdminInformeModuloTab({ isViewer = false }: { isViewer?: boolean }) {
  return (
    <Tabs defaultValue="asistencia">
      <TabsList className="hub-tabs mb-4 flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
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
        <fieldset disabled={isViewer} className="contents">
          <AdminAsistenciaTab />
        </fieldset>
      </TabsContent>

      <TabsContent value="informe">
        <fieldset disabled={isViewer} className="contents">
          <AdminInformeModuloForm />
        </fieldset>
      </TabsContent>

      <TabsContent value="evaluacion">
        <fieldset disabled={isViewer} className="contents">
          <AdminEvalIndividualTab />
        </fieldset>
      </TabsContent>

      <TabsContent value="reportes">
        <AdminInformeReportTab />
      </TabsContent>
    </Tabs>
  );
}
