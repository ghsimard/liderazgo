import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import { supabase } from "@/utils/dbClient";
import { autoevaluacionConfig } from "@/data/encuesta360Data";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cedula: string;
  fase: "inicial" | "final";
}

export default function AutoevalViewerDialog({ open, onOpenChange, cedula, fase }: Props) {
  const [loading, setLoading] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, string> | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !cedula) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase.rpc("get_own_autoevaluacion", {
          p_cedula: cedula,
          p_fase: fase,
        });
        if (data) {
          const record = typeof data === "string" ? JSON.parse(data) : data;
          setRespuestas(record.respuestas || {});
          setSubmittedAt(record.created_at || null);
        } else {
          setRespuestas(null);
        }
      } catch (err) {
        console.error("Error fetching autoevaluación:", err);
        setRespuestas(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, cedula, fase]);

  const allItems = [
    ...autoevaluacionConfig.frequencyItems.map((item) => ({
      ...item,
      section: "Frecuencia",
    })),
    ...autoevaluacionConfig.agreementItems.map((item) => ({
      ...item,
      section: "Grado de acuerdo",
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-primary" />
            Mi Autoevaluación — Fase {fase === "inicial" ? "Inicial" : "Final"}
          </DialogTitle>
          {submittedAt && (
            <p className="text-xs text-muted-foreground">
              Enviada el {new Date(submittedAt).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !respuestas ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No se encontró la autoevaluación.
          </p>
        ) : (
          <ScrollArea className="flex-1 min-h-0 pr-3">
            <div className="space-y-3">
              {allItems.map((item, idx) => {
                const answer = respuestas[String(item.num)] || "—";
                const prevSection = idx > 0 ? allItems[idx - 1].section : null;
                const showSectionHeader = item.section !== prevSection;

                return (
                  <div key={item.num}>
                    {showSectionHeader && (
                      <div className="flex items-center gap-2 pt-2 pb-1">
                        <Badge variant="secondary" className="text-xs">
                          {item.section}
                        </Badge>
                      </div>
                    )}
                    <div className="rounded-md border p-3 bg-muted/30">
                      <p className="text-sm leading-relaxed">
                        <span className="font-bold text-primary mr-1.5">{item.num}.</span>
                        {item.text}
                      </p>
                      <div className="mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {answer}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
