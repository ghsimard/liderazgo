import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Send, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { PhoneInputWithCountry } from "@/components/PhoneInputWithCountry";

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

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { codigo_pais: "+57", contactar_whatsapp: false },
  });

  const onSubmit = async (data: ContactFormData) => {
    setSending(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        nombre: data.nombre,
        email: data.email,
        codigo_pais: data.codigo_pais,
        telefono: data.telefono || null,
        contactar_whatsapp: data.contactar_whatsapp,
        asunto: data.asunto,
        mensaje: data.mensaje,
        tipo_contacto: "contacto",
      } as any);
      if (error) throw error;
      toast.success("Mensaje enviado correctamente. Gracias por contactarnos.");
      reset();
    } catch {
      toast.error("Error al enviar el mensaje. Intente de nuevo.");
    } finally {
      setSending(false);
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
          <p className="text-sm text-muted-foreground mb-6">
            Si tiene preguntas, solicitudes o comentarios relacionados con el funcionamiento de esta plataforma, puede comunicarse a través del siguiente formulario.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
