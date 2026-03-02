import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Star, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAutoFillUserInfo } from "@/hooks/useAutoFillUserInfo";

const ROL_OPTIONS = [
  { value: "rector", label: "Rector/a" },
  { value: "coordinador", label: "Coordinador/a" },
  { value: "docente", label: "Docente" },
  { value: "estudiante", label: "Estudiante" },
  { value: "acudiente", label: "Acudiente" },
  { value: "administrativo", label: "Administrativo/a" },
  { value: "otro", label: "Otro" },
];

const evaluacionSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100),
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  rol_evaluador: z.string().min(1, "Por favor seleccione su rol"),
  rating: z.number().min(1, "Por favor seleccione una calificación").max(5),
  comentario: z.string().trim().max(2000).optional(),
});

type EvaluacionFormData = z.infer<typeof evaluacionSchema>;

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

export default function Evaluacion() {
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
  } = useForm<EvaluacionFormData>({
    resolver: zodResolver(evaluacionSchema),
    defaultValues: { rating: 0, rol_evaluador: "" },
  });

  // Auto-fill from detected info
  useEffect(() => {
    if (!infoLoading && info.source && !esAnonimo) {
      if (info.nombre) setValue("nombre", info.nombre);
      if (info.email) setValue("email", info.email);
      if (info.rol === "admin") {
        setValue("rol_evaluador", "admin");
      } else if (info.rol) {
        // Try to match rol to options
        const match = ROL_OPTIONS.find(o =>
          info.rol.toLowerCase().includes(o.value) ||
          o.label.toLowerCase().includes(info.rol.toLowerCase())
        );
        if (match) setValue("rol_evaluador", match.value);
      }
    }
  }, [infoLoading, info, setValue, esAnonimo]);

  const detectedAdmin = info.rol === "admin";

  const onSubmit = async (data: EvaluacionFormData) => {
    setSending(true);
    try {
      const { error } = await supabase.from("site_reviews" as any).insert({
        nombre: esAnonimo ? "Anónimo" : data.nombre,
        email: esAnonimo ? "anonimo@anonimo.com" : data.email,
        rating: data.rating,
        comentario: data.comentario || null,
        rol_evaluador: data.rol_evaluador,
        es_anonimo: esAnonimo,
      } as any);
      if (error) throw error;
      toast.success("¡Gracias por su evaluación! Su opinión nos ayuda a mejorar.");
      reset();
      setEsAnonimo(false);
    } catch {
      toast.error("Error al enviar la evaluación. Intente de nuevo.");
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
        <div className="max-w-2xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Star className="w-7 h-7" />
            Evalúe esta plataforma
          </h1>
          <p className="mt-2 text-primary-foreground/70 text-sm">
            Su calificación nos ayuda a mejorar continuamente
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Califique su experiencia general con la plataforma. Opcionalmente puede dejar un comentario.
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
              {esAnonimo ? "Modo anónimo activado" : "Evaluar de forma anónima"}
            </Button>
            {esAnonimo && (
              <p className="text-xs text-muted-foreground mt-1">
                Su identidad será protegida. Solo la calificación y el comentario serán visibles.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                ¿Cómo califica su experiencia? *
              </label>
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <StarRating value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.rating && (
                <p className="text-xs text-destructive">{errors.rating.message}</p>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">¿Cuál es su rol? *</label>
              {detectedAdmin ? (
                <Input value="Administrador" readOnly className="bg-muted cursor-not-allowed" />
              ) : (
                <Controller
                  name="rol_evaluador"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione su rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.rol_evaluador && <p className="text-xs text-destructive">{errors.rol_evaluador.message}</p>}
            </div>

            {/* Name & Email */}
            {!esAnonimo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Nombre *</label>
                  <Input {...register("nombre")} placeholder="Su nombre" />
                  {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-foreground">Correo electrónico *</label>
                  <Input {...register("email")} type="email" placeholder="correo@ejemplo.com" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>
            )}

            {/* Optional comment */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Comentario (opcional)</label>
              <Textarea
                {...register("comentario")}
                placeholder="¿Desea agregar algún comentario sobre su experiencia?"
                rows={4}
              />
              {errors.comentario && <p className="text-xs text-destructive">{errors.comentario.message}</p>}
            </div>

            <Button type="submit" disabled={sending} className="gap-2">
              <Send className="w-4 h-4" />
              {sending ? "Enviando..." : "Enviar evaluación"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
