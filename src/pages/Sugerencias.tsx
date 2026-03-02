import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Send, Lightbulb, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";
import { Checkbox } from "@/components/ui/checkbox";
import { useAutoFillUserInfo } from "@/hooks/useAutoFillUserInfo";

const sugerenciaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  codigo_pais: z.string().default("+57"),
  telefono: z.string().trim().max(20).optional(),
  contactar_whatsapp: z.boolean().default(false),
  asunto: z.string().trim().min(1, "El asunto es obligatorio").max(200),
  mensaje: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000),
});

type SugerenciaFormData = z.infer<typeof sugerenciaSchema>;

export default function Sugerencias() {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [esAnonimo, setEsAnonimo] = useState(false);
  const { info, loading: infoLoading } = useAutoFillUserInfo();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<SugerenciaFormData>({
    resolver: zodResolver(sugerenciaSchema),
    defaultValues: { codigo_pais: "+57", contactar_whatsapp: false },
  });

  useEffect(() => {
    if (!infoLoading && info.source && !esAnonimo) {
      if (info.nombre) setValue("nombre", info.nombre);
      if (info.email) setValue("email", info.email);
      if (info.telefono) setValue("telefono", info.telefono);
      if (info.codigo_pais) setValue("codigo_pais", info.codigo_pais);
    }
  }, [infoLoading, info, setValue, esAnonimo]);

  const onSubmit = async (data: SugerenciaFormData) => {
    setSending(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        nombre: esAnonimo ? "Anónimo" : data.nombre,
        email: esAnonimo ? "anonimo@anonimo.com" : data.email,
        codigo_pais: data.codigo_pais,
        telefono: data.telefono || null,
        contactar_whatsapp: data.contactar_whatsapp,
        asunto: data.asunto,
        mensaje: data.mensaje,
        tipo_contacto: "sugerencia",
        es_anonimo: esAnonimo,
      } as any);
      if (error) throw error;
      toast.success("¡Gracias por su sugerencia! Su opinión es muy valiosa para nosotros.");
      reset();
      setEsAnonimo(false);
    } catch {
      toast.error("Error al enviar la sugerencia. Intente de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const toggleAnonimo = () => {
    const next = !esAnonimo;
    setEsAnonimo(next);
    if (next) {
      setValue("nombre", "Anónimo");
      setValue("email", "anonimo@anonimo.com");
    } else if (info.source) {
      setValue("nombre", info.nombre || "");
      setValue("email", info.email || "");
    } else {
      setValue("nombre", "");
      setValue("email", "");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-8">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Lightbulb className="w-7 h-7" />
            Sugerencias
          </h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            Ayúdenos a mejorar esta plataforma con sus comentarios
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Su opinión es fundamental para mejorar esta plataforma. Puede compartir sugerencias
            o reportar problemas. Todos los comentarios son revisados por el equipo.
          </p>

          {/* Anonymous toggle */}
          <div className="mb-6">
            <Button
              type="button"
              variant={esAnonimo ? "default" : "outline"}
              size="sm"
              onClick={toggleAnonimo}
              className="gap-2"
            >
              <EyeOff className="w-4 h-4" />
              {esAnonimo ? "Modo anónimo activado" : "Enviar de forma anónima"}
            </Button>
            {esAnonimo && (
              <p className="text-xs text-muted-foreground mt-1">
                Su identidad será protegida. Solo el contenido del mensaje será visible.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!esAnonimo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Nombre completo *</label>
                    <Input {...register("nombre")} placeholder="Su nombre" />
                    {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Correo electrónico *</label>
                    <Input {...register("email")} type="email" placeholder="correo@ejemplo.com" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground">Teléfono</label>
                    <Controller
                      name="codigo_pais"
                      control={control}
                      render={({ field: codeField }) => (
                        <Controller
                          name="telefono"
                          control={control}
                          render={({ field: phoneField }) => (
                            <PhoneInputWithCountry
                              id="sugerencia-phone"
                              countryCode={codeField.value}
                              onCountryCodeChange={codeField.onChange}
                              phoneValue={phoneField.value || ""}
                              onPhoneChange={phoneField.onChange}
                              placeholder="Número de teléfono"
                            />
                          )}
                        />
                      )}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <Controller
                      name="contactar_whatsapp"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          Puede contactarme por WhatsApp
                        </label>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Asunto *</label>
              <Input {...register("asunto")} placeholder="Ej: Sugerencia para mejorar los formularios" />
              {errors.asunto && <p className="text-xs text-destructive">{errors.asunto.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Su sugerencia o comentario *</label>
              <Textarea
                {...register("mensaje")}
                placeholder="Describa su sugerencia, comentario o problema encontrado..."
                rows={5}
              />
              {errors.mensaje && <p className="text-xs text-destructive">{errors.mensaje.message}</p>}
            </div>

            <Button type="submit" disabled={sending} className="gap-2">
              <Send className="w-4 h-4" />
              {sending ? "Enviando..." : "Enviar sugerencia"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
