import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Send, Plus, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/utils/emailClient";
import { supabase } from "@/utils/dbClient";

interface ShareEncuestaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formLabel: string;
  formUrl: string;
  formPath: string;
  tipoFormulario: string;
  directivoNombre: string;
  directivoEmail: string;
  directivoCedula: string;
  institucion: string;
  fase?: string;
  onInvitationsSent?: () => void;
}

export default function ShareEncuestaDialog({
  open,
  onOpenChange,
  formLabel,
  formPath,
  tipoFormulario,
  directivoNombre,
  directivoEmail,
  directivoCedula,
  institucion,
  fase = "inicial",
  onInvitationsSent,
}: ShareEncuestaDialogProps) {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!emailRegex.test(trimmed)) {
      toast({ title: "Email inválido", description: "Ingrese un correo electrónico válido.", variant: "destructive" });
      return;
    }
    if (emails.includes(trimmed)) {
      toast({ title: "Duplicado", description: "Este correo ya fue agregado.", variant: "destructive" });
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleSend = async () => {
    if (emails.length === 0) {
      toast({ title: "Sin destinatarios", description: "Agregue al menos un correo.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Create invitation records and send emails sequentially (rate limit: 2/s)
      const results: { success: boolean; error?: string }[] = [];

      for (let i = 0; i < emails.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 600));

        const email = emails[i];

        // 1. Create invitation record and get the token
        const { data: invitation, error: invError } = await supabase
          .from("encuesta_invitaciones")
          .insert({
            directivo_cedula: directivoCedula,
            directivo_nombre: directivoNombre,
            institucion,
            email_destinatario: email,
            tipo_formulario: tipoFormulario,
            fase,
          })
          .select("token")
          .single();

        if (invError || !invitation?.token) {
          results.push({ success: false, error: `Error creando invitación para ${email}` });
          continue;
        }

        // 2. Build URL with token (no email in URL)
        const formUrl = `${window.location.origin}${formPath}?token=${invitation.token}`;

        // 3. Send email
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">Encuesta 360° — ${formLabel}</h2>
            <p>Estimado/a evaluador/a,</p>
            <p><strong>${directivoNombre}</strong> de la institución <strong>${institucion}</strong> le invita a completar el formulario de evaluación 360°.</p>
            <p style="margin: 24px 0;">
              <a href="${formUrl}" 
                 style="background-color: #1a1a2e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Completar formulario
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">También puede copiar y pegar este enlace en su navegador:<br/>
              <a href="${formUrl}" style="color: #1a1a2e;">${formUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">
              Enviado por ${directivoNombre} (${directivoEmail})
            </p>
          </div>
        `;

        const res = await sendEmail({
          to: email,
          subject: `Encuesta 360° — ${formLabel} — ${institucion}`,
          html: htmlBody,
          reply_to: directivoEmail,
        });
        results.push(res);
      }

      const failed = results.filter((r) => !r.success);
      if (failed.length === 0) {
        toast({ title: "Enviado", description: `Invitación enviada a ${emails.length} destinatario(s).` });
        setEmails([]);
        onOpenChange(false);
        onInvitationsSent?.();
      } else {
        toast({ title: "Error al enviar", description: failed.map((f) => f.error).join(", ") || "Intente nuevamente.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "No se pudo enviar el correo.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Enviar formulario — {formLabel}
          </DialogTitle>
          <DialogDescription>
            Ingrese los correos de las personas que desea invitar a evaluar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Directivo info (read-only) */}
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">De:</span> {directivoNombre} ({directivoEmail})</div>
            <div><span className="text-muted-foreground">Institución:</span> {institucion}</div>
          </div>

          {/* Email input */}
          <div className="space-y-2">
            <Label>Correos de destinatarios</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <Button type="button" size="icon" variant="outline" onClick={addEmail} disabled={sending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Email chips */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {emails.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button
                    onClick={() => removeEmail(email)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    disabled={sending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending || emails.length === 0}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar ({emails.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
