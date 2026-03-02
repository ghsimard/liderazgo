import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Send, Mail, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";
import { useAutoFillUserInfo } from "@/hooks/useAutoFillUserInfo";

const contactSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  codigo_pais: z.string().default("+57"),
  telefono: z.string().trim().max(20).optional(),
  contactar_whatsapp: z.boolean().default(false),
  asunto: z.string().trim().min(1, "El asunto es obligatorio").max(200),
  mensaje: z.string().trim().min(10, "El mensaje debe tener al menos 10 caracteres").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contacto() {
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
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { codigo_pais: "+57", contactar_whatsapp: false },
  });

  // Auto-fill when info is detected
  useEffect(() => {
    if (!infoLoading && info.source && !esAnonimo) {
      if (info.nombre) setValue("nombre", info.nombre);
      if (info.email) setValue("email", info.email);
      if (info.telefono) setValue("telefono", info.telefono);
      if (info.codigo_pais) setValue("codigo_pais", info.codigo_pais);
    }
  }, [infoLoading, info, setValue, esAnonimo]);

  const onSubmit = async (data: ContactFormData) => {
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
        tipo_contacto: "contacto",
        es_anonimo: esAnonimo,
      } as any);
      if (error) throw error;
      toast.success("Mensaje enviado correctamente. Gracias por contactarnos.");
      reset();
      setEsAnonimo(false);
    } catch {
      toast.error("Error al enviar el mensaje. Intente de nuevo.");
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
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Mail className="w-7 h-7" />
            Contactar al Administrador
          </h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            Envíenos sus preguntas, solicitudes o comentarios
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Si tiene preguntas, solicitudes o comentarios relacionados con el funcionamiento de esta plataforma, puede comunicarse a través del siguiente formulario.
            </p>
          </div>

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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                              id="contacto-phone"
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
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
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
              <Input {...register("asunto")} placeholder="Asunto de su mensaje" />
              {errors.asunto && <p className="text-xs text-destructive">{errors.asunto.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Mensaje *</label>
              <Textarea {...register("mensaje")} placeholder="Escriba su mensaje aquí..." rows={5} />
              {errors.mensaje && <p className="text-xs text-destructive">{errors.mensaje.message}</p>}
            </div>

            <Button type="submit" disabled={sending} className="gap-2">
              <Send className="w-4 h-4" />
              {sending ? "Enviando..." : "Enviar mensaje"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
