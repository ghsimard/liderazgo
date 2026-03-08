import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/utils/dbClient";

const TABLES_TO_PURGE = [
  // Children first (FK order)
  { table: "informe_modulo_equipo", label: "Equipo de informes" },
  { table: "informe_directivo", label: "Datos directivos de informes" },
  { table: "informe_asistencia", label: "Asistencia de informes" },
  { table: "informe_modulo", label: "Informes de módulo" },
  { table: "rubrica_evaluaciones", label: "Evaluaciones de rúbricas" },
  { table: "rubrica_seguimientos", label: "Seguimientos de rúbricas" },
  { table: "rubrica_submission_dates", label: "Fechas de envío de rúbricas" },
  { table: "rubrica_regional_analyses", label: "Análisis regionales" },
  { table: "rubrica_asignaciones", label: "Asignaciones de evaluadores" },
  { table: "rubrica_evaluadores", label: "Evaluadores de rúbricas" },
  { table: "encuesta_invitaciones", label: "Invitaciones de encuestas" },
  { table: "encuestas_360", label: "Respuestas 360°" },
  { table: "fichas_rlt", label: "Fichas RLT" },
  { table: "contact_messages", label: "Mensajes de contacto" },
  { table: "site_reviews", label: "Reseñas del sitio" },
  { table: "user_activity_log", label: "Registro de actividad" },
  { table: "deleted_records", label: "Papelera (registros eliminados)" },
];

const TABLES_PRESERVED = [
  { table: "users / user_roles / admin_cedulas", label: "Cuentas de administración" },
  { table: "regiones / region_entidades / region_municipios / region_instituciones", label: "Configuración geográfica" },
  { table: "entidades_territoriales / municipios / instituciones", label: "Entidades y municipios" },
  { table: "mel_kpi_config / mel_kpi_groups / mel_kpi_group_items", label: "Configuración KPI/MEL" },
  { table: "app_settings / app_images", label: "Configuración de la aplicación" },
  { table: "rubrica_modules / rubrica_items", label: "Estructura de rúbricas" },
  { table: "domains_360 / competencies_360 / items_360 / item_texts_360 / competency_weights", label: "Estructura 360°" },
];

const CONFIRM_PHRASE = "ELIMINAR TODOS LOS DATOS";

export default function AdminPurgeDataTab() {
  const [confirmText, setConfirmText] = useState("");
  const [purging, setPurging] = useState(false);
  const [results, setResults] = useState<{ table: string; ok: boolean; error?: string }[]>([]);
  const { toast } = useToast();

  const handlePurge = async () => {
    setPurging(true);
    setResults([]);
    const newResults: typeof results = [];

    for (const { table } of TABLES_TO_PURGE) {
      try {
        // Delete all rows using neq on id to bypass empty filter protection
        const { error } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) {
          newResults.push({ table, ok: false, error: error.message });
        } else {
          newResults.push({ table, ok: true });
        }
      } catch (err: any) {
        newResults.push({ table, ok: false, error: err.message });
      }
    }

    setResults(newResults);
    setConfirmText("");
    setPurging(false);

    const failures = newResults.filter((r) => !r.ok);
    if (failures.length === 0) {
      toast({ title: "Purga completada", description: `${TABLES_TO_PURGE.length} tablas vaciadas correctamente.` });
    } else {
      toast({ title: "Purga parcial", description: `${failures.length} tabla(s) con errores.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Purgar datos operativos</h2>
          <p className="text-sm text-muted-foreground">
            Elimina todos los datos operativos conservando la estructura, la configuración y los administradores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Tablas a vaciar ({TABLES_TO_PURGE.length})
            </CardTitle>
            <CardDescription className="text-xs">Todos los registros serán eliminados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {TABLES_TO_PURGE.map((t) => {
              const result = results.find((r) => r.table === t.table);
              return (
                <div key={t.table} className="flex items-center gap-2 text-xs">
                  {result ? (
                    result.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border border-destructive/40 shrink-0" />
                  )}
                  <span className="text-muted-foreground font-mono">{t.table}</span>
                  <span className="text-muted-foreground/60 ml-auto text-right">{t.label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Tablas preservadas
            </CardTitle>
            <CardDescription className="text-xs">Estos datos NO se tocan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {TABLES_PRESERVED.map((t) => (
              <div key={t.table} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground/60">{t.label}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-destructive">¡Acción irreversible!</p>
              <p className="text-muted-foreground">
                Esta operación eliminará permanentemente todas las fichas, encuestas, evaluaciones, mensajes y registros de actividad.
                Los administradores, la configuración geográfica, la estructura de rúbricas/360° y los KPI se conservarán intactos.
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={purging}>
                <Trash2 className="h-4 w-4" />
                {purging ? "Purgando…" : "Purgar todos los datos operativos"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Confirmar purga total
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Se eliminarán permanentemente <strong>{TABLES_TO_PURGE.length} tablas</strong> de datos operativos.
                    Esta acción es <strong>irreversible</strong>.
                  </p>
                  <p className="text-xs">
                    Escriba <Badge variant="outline" className="font-mono text-xs">{CONFIRM_PHRASE}</Badge> para confirmar:
                  </p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_PHRASE}
                    className="font-mono text-sm"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText("")}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handlePurge}
                  disabled={confirmText !== CONFIRM_PHRASE}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar purga
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
