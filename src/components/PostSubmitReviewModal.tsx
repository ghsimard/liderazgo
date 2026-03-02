import { useState, useEffect } from "react";
import { Star, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/utils/dbClient";

interface PostSubmitReviewModalProps {
  open: boolean;
  onClose: () => void;
  nombre: string;
  email?: string;
  tipoFormulario: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-3 text-sm text-muted-foreground">
          {value === 1 && "Malo"}
          {value === 2 && "Regular"}
          {value === 3 && "Bueno"}
          {value === 4 && "Muy bueno"}
          {value === 5 && "Excelente"}
        </span>
      )}
    </div>
  );
}

export default function PostSubmitReviewModal({
  open,
  onClose,
  nombre,
  email,
  tipoFormulario,
}: PostSubmitReviewModalProps) {
  const [step, setStep] = useState<"invite" | "form">("invite");
  const [rating, setRating] = useState(0);
  const [comentario, setComentario] = useState("");
  const [emailInput, setEmailInput] = useState(email || "");
  const [sending, setSending] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("invite");
      setRating(0);
      setComentario("");
      setEmailInput(email || "");
      // Check if review modal is enabled
      const checkEnabled = async () => {
        try {
          const { data } = await supabase
            .from("app_settings" as any)
            .select("value")
            .eq("key", "review_modal_enabled")
            .maybeSingle();
          if (data && (data as any).value === "false") {
            // Reviews disabled by admin — don't show
            return;
          }
        } catch {
          // If we can't check, show anyway
        }
        // Delay appearance for smooth UX after success screen renders
        setTimeout(() => setVisible(true), 1500);
      };
      checkEnabled();
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open || !visible) return null;

  const handleSubmitReview = async () => {
    if (rating < 1) {
      toast.error("Por favor seleccione una calificación.");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from("site_reviews" as any).insert({
        nombre,
        email: emailInput.trim() || "no-email@anonimo.com",
        rating,
        comentario: comentario.trim() || null,
        tipo_formulario: tipoFormulario,
      } as any);
      if (error) throw error;
      toast.success("¡Gracias por su evaluación!");
      onClose();
    } catch {
      toast.error("Error al enviar. Intente de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-md w-full p-6 relative animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {step === "invite" ? (
          <div className="text-center space-y-4">
            <Star className="w-10 h-10 text-yellow-400 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">
              ¿Le gustaría evaluar su experiencia?
            </h3>
            <p className="text-sm text-muted-foreground">
              Su opinión nos ayuda a mejorar esta plataforma. Solo toma unos segundos.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={onClose}>
                No, gracias
              </Button>
              <Button onClick={() => setStep("form")}>
                Sí, evaluar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Evalúe su experiencia
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Calificación *
              </label>
              <StarRating value={rating} onChange={setRating} />
            </div>

            {!email && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  Correo electrónico (opcional)
                </label>
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                Comentario (opcional)
              </label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="¿Algún comentario sobre su experiencia?"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {comentario.length}/500
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={onClose} disabled={sending}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitReview} disabled={sending} className="gap-2">
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
