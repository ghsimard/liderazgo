import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/utils/emailClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ShareEncuestaDialog from "@/components/ShareEncuestaDialog";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  GraduationCap,
  Loader2,
  Mail,
  School,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";

interface DirectivoInfo {
  nombre: string;
  institucion: string;
  email: string;
  cargo: string;
  cedula: string;
}

interface Invitation {
  id: string;
  token: string;
  email_destinatario: string;
  tipo_formulario: string;
  fase: string;
  sent_at: string;
  last_reminder_at: string | null;
  responded_at: string | null;
}

const FORM_QUOTAS: Record<string, number> = {
  autoevaluacion: 1,
  directivo: 2,
  docente: 2,
  administrativo: 2,
  estudiante: 1,
  acudiente: 1,
};

const forms = [
  { label: "Autoevaluación", description: "Evalúe su propio desempeño", path: "/formulario-360-autoevaluacion", tipo: "autoevaluacion", icon: UserCheck, isAutoeval: true },
  { label: "Directivo", description: "Evaluación por coordinador/a", path: "/formulario-360-directivo", tipo: "directivo", icon: UserRound, isAutoeval: false },
  { label: "Docente", description: "Evaluación por docentes", path: "/formulario-360-docente", tipo: "docente", icon: GraduationCap, isAutoeval: false },
  { label: "Administrativo", description: "Evaluación por administrativos", path: "/formulario-360-administrativo", tipo: "administrativo", icon: ClipboardList, isAutoeval: false },
  { label: "Estudiante", description: "Evaluación por estudiantes", path: "/formulario-360-estudiante", tipo: "estudiante", icon: School, isAutoeval: false },
  { label: "Acudiente", description: "Evaluación por acudientes", path: "/formulario-360-acudiente", tipo: "acudiente", icon: Users, isAutoeval: false },
];

const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export default function Encuesta360Hub() {
  const navigate = useNavigate();
  const { images } = useAppImages();
  const { toast } = useToast();
  const logoRLT = images.logo_rlt_white;
  const logoCLT = images.logo_clt;

  const [directivoInfo, setDirectivoInfo] = useState<DirectivoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [formCounts, setFormCounts] = useState<Record<string, number>>({});
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareForm, setShareForm] = useState<{ label: string; path: string; tipo: string } | null>(null);

  const loadInvitations = useCallback(async (cedula: string) => {
    try {
      const { data } = await supabase.rpc("get_invitaciones_directivo", { p_cedula: cedula });
      setInvitations(Array.isArray(data) ? data : (data ? JSON.parse(data) : []));
    } catch (err) {
      console.error("Error loading invitations:", err);
    }
  }, []);

  useEffect(() => {
    const cedula = sessionStorage.getItem("user_cedula");
    if (!cedula) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: cedula });
        if (data) {
          const ficha = data as any;
          setDirectivoInfo({
            nombre: ficha.nombres_apellidos || "",
            institucion: ficha.nombre_ie || "",
            email: ficha.prefiere_correo === "Institucional" && ficha.correo_institucional
              ? ficha.correo_institucional
              : ficha.correo_personal || "",
            cargo: ficha.cargo_actual || "",
            cedula,
          });
          await loadInvitations(cedula);

          // Count submissions per form type for this directivo
          const { data: countRows } = await supabase
            .from("encuestas_360")
            .select("tipo_formulario")
            .or(`cedula.eq.${cedula},cedula_directivo.eq.${cedula}`)
            .eq("fase", "inicial");
          const counts: Record<string, number> = {};
          (countRows || []).forEach((r: any) => {
            counts[r.tipo_formulario] = (counts[r.tipo_formulario] || 0) + 1;
          });
          setFormCounts(counts);
        }
      } catch (err) {
        console.error("Error loading directivo info:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadInvitations]);

  const buildShareUrl = (path: string) => {
    if (!directivoInfo) return `${window.location.origin}${path}`;
    const params = new URLSearchParams({
      nombre_directivo: directivoInfo.nombre,
      institucion: directivoInfo.institucion,
    });
    return `${window.location.origin}${path}?${params.toString()}`;
  };

  const handleCopyUrl = async (path: string, label: string) => {
    const url = buildShareUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: `Enlace del formulario "${label}" copiado al portapapeles.` });
    } catch {
      toast({ title: "Error", description: "No se pudo copiar el enlace.", variant: "destructive" });
    }
  };

  const handleOpenEmailDialog = (form: { label: string; path: string; tipo: string }) => {
    setShareForm(form);
    setShareDialogOpen(true);
  };

  const canSendReminder = (inv: Invitation): boolean => {
    if (inv.responded_at) return false;
    if (!inv.last_reminder_at) return true;
    return Date.now() - new Date(inv.last_reminder_at).getTime() > REMINDER_COOLDOWN_MS;
  };

  const handleSendReminder = async (inv: Invitation) => {
    if (!directivoInfo || !canSendReminder(inv)) return;
    setSendingReminder(inv.id);
    try {
      const formUrl = `${window.location.origin}${forms.find(f => f.tipo === inv.tipo_formulario)?.path || ""}?token=${inv.token}`;
      const formLabel = forms.find(f => f.tipo === inv.tipo_formulario)?.label || inv.tipo_formulario;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Recordatorio — Encuesta 360° (${formLabel})</h2>
          <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #856404;">
              ⚠️ Este formulario debe ser diligenciado <u>únicamente</u> por: <span style="font-size: 22px; color: #1a1a2e;">${formLabel}</span>
              <br/><span style="font-size: 16px;">en relación con la institución:</span>
              <br/><span style="font-size: 20px; font-weight: bold; color: #000000;">${directivoInfo.institucion}</span>
            </p>
          </div>
          <p>Estimado/a evaluador/a,</p>
          <p>Le recordamos que <strong>${directivoInfo.nombre}</strong> de la institución <strong>${directivoInfo.institucion}</strong> le invitó a completar un formulario de evaluación 360° que aún no ha sido diligenciado.</p>
          <p style="margin: 24px 0;">
            <a href="${formUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Completar formulario
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">También puede copiar y pegar este enlace en su navegador:<br/>
            <a href="${formUrl}" style="color: #1a1a2e;">${formUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">Enviado por ${directivoInfo.nombre} (${directivoInfo.email})</p>
        </div>
      `;

      const res = await sendEmail({
        to: inv.email_destinatario,
        subject: `Recordatorio — Encuesta 360° — ${formLabel} — ${directivoInfo.institucion}`,
        html: htmlBody,
        reply_to: directivoInfo.email,
      });

      if (res.success) {
        // Update last_reminder_at
        await supabase.from("encuesta_invitaciones").update({ last_reminder_at: new Date().toISOString() }).eq("id", inv.id);
        toast({ title: "Recordatorio enviado", description: `Recordatorio enviado a ${inv.email_destinatario}.` });
        if (directivoInfo.cedula) await loadInvitations(directivoInfo.cedula);
      } else {
        toast({ title: "Error", description: res.error || "No se pudo enviar el recordatorio.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo enviar el recordatorio.", variant: "destructive" });
    } finally {
      setSendingReminder(null);
    }
  };

  // Group invitations by form type
  const pendingInvitations = invitations.filter((i) => !i.responded_at);
  const respondedCount = invitations.filter((i) => i.responded_at).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/30">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md space-y-4">
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center space-y-3 pb-2">
                <div className="flex justify-center items-center gap-4">
                  {logoRLT && <img src={logoRLT} alt="Logo RLT" className="h-14 object-contain" />}
                  {logoCLT && <img src={logoCLT} alt="Logo CLT" className="h-14 object-contain" />}
                </div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Encuesta 360° — Fase Inicial
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {directivoInfo
                    ? "Complete su autoevaluación o envíe los formularios a sus evaluadores"
                    : "Seleccione el formulario que desea completar"}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {forms.map((form) => {
                  const count = formCounts[form.tipo] || 0;
                  const quota = FORM_QUOTAS[form.tipo] || 1;
                  const quotaMet = count >= quota;
                  const isAutoevalDone = form.isAutoeval && quotaMet;

                  return (
                  <div key={form.path} className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      className={`flex-1 h-14 justify-start gap-3 text-base ${isAutoevalDone ? "opacity-60" : ""}`}
                      disabled={isAutoevalDone}
                      onClick={() => {
                        if (form.isAutoeval) {
                          navigate(form.path);
                        } else {
                          navigate(buildShareUrl(form.path).replace(window.location.origin, ""));
                        }
                      }}
                    >
                      <form.icon className={`h-5 w-5 shrink-0 ${isAutoevalDone ? "text-muted-foreground" : "text-primary"}`} />
                      <div className="text-left">
                        <div className="font-semibold flex items-center gap-2">
                          {form.label}
                          {quotaMet && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isAutoevalDone
                            ? "Ya completada"
                            : !form.isAutoeval && directivoInfo && count > 0
                            ? `${count}/${quota} respuesta(s)`
                            : form.description}
                        </div>
                      </div>
                    </Button>

                    {!form.isAutoeval && directivoInfo && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => handleCopyUrl(form.path, form.label)}>
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copiar enlace</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => handleOpenEmailDialog(form)}>
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Enviar por correo</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                  );
                })}
                <Button variant="ghost" className="w-full mt-2" onClick={() => navigate("/mi-panel")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Mi Panel
                </Button>
              </CardContent>
            </Card>

            {/* Invitation tracking section */}
            {directivoInfo && invitations.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    Seguimiento de invitaciones
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {respondedCount} respondida(s) · {pendingInvitations.length} pendiente(s)
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingInvitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      <CheckCircle2 className="inline h-4 w-4 mr-1" />
                      Todas las invitaciones han sido respondidas.
                    </p>
                  ) : (
                    pendingInvitations.map((inv) => {
                      const formMeta = forms.find((f) => f.tipo === inv.tipo_formulario);
                      const canRemind = canSendReminder(inv);
                      const nextReminderAt = inv.last_reminder_at
                        ? new Date(new Date(inv.last_reminder_at).getTime() + REMINDER_COOLDOWN_MS)
                        : null;

                      return (
                        <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{inv.email_destinatario}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {formMeta?.label || inv.tipo_formulario}
                              </Badge>
                              <span>·</span>
                              <Clock className="h-3 w-3" />
                              {new Date(inv.sent_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-8 w-8"
                                disabled={!canRemind || sendingReminder === inv.id}
                                onClick={() => handleSendReminder(inv)}
                              >
                                {sendingReminder === inv.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Bell className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {canRemind
                                ? "Enviar recordatorio"
                                : nextReminderAt
                                ? `Próximo recordatorio disponible: ${nextReminderAt.toLocaleString()}`
                                : "Ya respondido"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Email share dialog */}
      {shareForm && directivoInfo && (
        <ShareEncuestaDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          formLabel={shareForm.label}
          formUrl={buildShareUrl(shareForm.path)}
          formPath={shareForm.path}
          tipoFormulario={shareForm.tipo}
          directivoNombre={directivoInfo.nombre}
          directivoEmail={directivoInfo.email}
          directivoCedula={directivoInfo.cedula}
          institucion={directivoInfo.institucion}
          onInvitationsSent={() => loadInvitations(directivoInfo.cedula)}
        />
      )}
    </TooltipProvider>
  );
}
