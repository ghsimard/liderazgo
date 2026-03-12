/**
 * Shared wrapper for all 3 satisfaction form pages.
 * Handles: cedula lookup, region detection, availability check, duplicate check, submission.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SatisfaccionForm from "@/components/SatisfaccionForm";
import { SATISFACCION_FORMS, FORM_TYPE_LABELS } from "@/data/satisfaccionData";

interface SatisfaccionPageProps {
  formType: "asistencia" | "interludio" | "intensivo";
}

export default function SatisfaccionPage({ formType }: SatisfaccionPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { images } = useAppImages();

  const moduleNumber = parseInt(searchParams.get("module") || "0", 10);
  const cedula = sessionStorage.getItem("user_cedula") || "";

  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("");
  const [fichaInfo, setFichaInfo] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formDef = SATISFACCION_FORMS[formType];

  useEffect(() => {
    if (!cedula) {
      setError("No se ha identificado su cédula. Por favor ingrese desde Mi Panel.");
      setLoading(false);
      return;
    }
    if (!moduleNumber || moduleNumber < 1 || moduleNumber > 4) {
      setError("Módulo inválido.");
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Get region via SECURITY DEFINER RPC (bypasses RLS on fichas_rlt)
        const { data: fichaData } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: cedula });
        const fichaObj = fichaData as any;
        if (!fichaObj) {
          setError("No se encontró su ficha. Contacte al administrador.");
          setLoading(false);
          return;
        }
        const userRegion = fichaObj.region;
        setRegion(userRegion);

        // Check availability
        const { data: config } = await supabase
          .from("satisfaccion_config")
          .select("*")
          .eq("form_type", formType)
          .eq("module_number", moduleNumber)
          .eq("region", userRegion)
          .eq("is_active", true)
          .limit(1);
        const cfg = Array.isArray(config) ? config[0] : config;
        if (!cfg) {
          setError("Esta encuesta no está disponible actualmente.");
          setLoading(false);
          return;
        }

        // Check date range
        const now = new Date();
        if ((cfg as any).available_from && new Date((cfg as any).available_from) > now) {
          setError("Esta encuesta aún no está disponible.");
          setLoading(false);
          return;
        }
        if ((cfg as any).available_until && new Date((cfg as any).available_until) < now) {
          setError("El plazo para responder esta encuesta ha finalizado.");
          setLoading(false);
          return;
        }

        // Check duplicate
        const { data: existing } = await supabase
          .from("satisfaccion_responses")
          .select("id")
          .eq("form_type", formType)
          .eq("module_number", moduleNumber)
          .eq("cedula", cedula)
          .limit(1);
        if (existing && (Array.isArray(existing) ? existing.length > 0 : !!existing)) {
          setAlreadySubmitted(true);
        }
      } catch {
        setError("Error al verificar disponibilidad.");
      }
      setLoading(false);
    };
    init();
  }, [cedula, moduleNumber, formType]);

  const handleSubmit = async (respuestas: Record<string, any>) => {
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("satisfaccion_responses").insert({
        form_type: formType,
        module_number: moduleNumber,
        region,
        cedula,
        respuestas,
      } as any);
      if (insertError) {
        if (insertError.message?.includes("duplicate") || insertError.message?.includes("unique")) {
          toast({ title: "Ya respondió esta encuesta", variant: "destructive" });
          setAlreadySubmitted(true);
        } else {
          throw insertError;
        }
      } else {
        setSubmitted(true);
        toast({ title: "¡Gracias!", description: "Su encuesta ha sido registrada." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo enviar.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate("/mi-panel")}>Volver a Mi Panel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <h2 className="text-lg font-semibold">
              {submitted ? "¡Encuesta enviada!" : "Ya respondió esta encuesta"}
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              {submitted
                ? "Gracias por completar la encuesta de satisfacción."
                : `Ya envió la encuesta de ${FORM_TYPE_LABELS[formType]} para el módulo ${moduleNumber}.`}
            </p>
            <Button variant="outline" onClick={() => navigate("/mi-panel")}>Volver a Mi Panel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Logos */}
        <div className="flex justify-center items-center gap-4 mb-6">
          {images.logo_rlt_white && <img src={images.logo_rlt_white} alt="Logo RLT" className="h-12 object-contain" />}
          {images.logo_clt && <img src={images.logo_clt} alt="Logo CLT" className="h-12 object-contain" />}
        </div>

        <SatisfaccionForm
          formDef={formDef}
          moduleNumber={moduleNumber}
          region={region}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
