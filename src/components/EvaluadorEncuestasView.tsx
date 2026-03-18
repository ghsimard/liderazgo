import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/utils/dbClient";
import { useAppImages } from "@/hooks/useAppImages";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Eye, EyeOff, Loader2, Building2, User } from "lucide-react";

interface InstitutionVisibility {
  institucion: string;
  directivos: { cedula: string; nombre: string }[];
  isVisible: boolean;
  source: "institucion" | "region" | "default";
}

export default function EvaluadorEncuestasView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fase = searchParams.get("fase") === "final" ? "final" : "inicial";
  const dbFase = fase === "final" ? "final" : "inicial";
  const { toast } = useToast();
  const { images } = useAppImages();

  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<InstitutionVisibility[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const cedula = sessionStorage.getItem("user_cedula") ?? "";

  useEffect(() => {
    if (!cedula) { navigate("/"); return; }

    const load = async () => {
      // Get evaluador_id
      const { data: evalData } = await supabase
        .from("rubrica_evaluadores")
        .select("id")
        .eq("cedula", cedula)
        .limit(1);
      const evaluadorId = evalData?.[0]?.id;
      if (!evaluadorId) { setLoading(false); return; }

      // Get assignments
      const { data: asigs } = await supabase
        .from("rubrica_asignaciones")
        .select("directivo_cedula, directivo_nombre, institucion")
        .eq("evaluador_id", evaluadorId);

      if (!asigs || asigs.length === 0) { setLoading(false); return; }

      // Group by institution
      const instMap = new Map<string, { cedula: string; nombre: string }[]>();
      for (const a of asigs) {
        const list = instMap.get(a.institucion) || [];
        list.push({ cedula: a.directivo_cedula, nombre: a.directivo_nombre });
        instMap.set(a.institucion, list);
      }

      // Get region for visibility resolution
      const firstCedula = asigs[0].directivo_cedula;
      const { data: fichaData } = await supabase.rpc("get_ficha_by_cedula", { p_cedula: firstCedula });
      const userRegion = (fichaData as any)?.region;

      // Get all visibility rows for this fase
      const { data: visRows } = await supabase
        .from("encuesta_360_visibility")
        .select("fase, scope_type, scope_value, is_active")
        .eq("fase", dbFase);

      const allVis = (visRows || []) as { fase: string; scope_type: string; scope_value: string; is_active: boolean }[];

      // Build institution list with resolved visibility
      const result: InstitutionVisibility[] = [];
      for (const [inst, dirs] of instMap) {
        const instRow = allVis.find(r => r.scope_type === "institucion" && r.scope_value === inst);
        if (instRow) {
          result.push({ institucion: inst, directivos: dirs, isVisible: instRow.is_active, source: "institucion" });
        } else {
          const regionRow = allVis.find(r => r.scope_type === "region" && r.scope_value === userRegion);
          if (regionRow) {
            result.push({ institucion: inst, directivos: dirs, isVisible: regionRow.is_active, source: "region" });
          } else {
            result.push({ institucion: inst, directivos: dirs, isVisible: false, source: "default" });
          }
        }
      }

      result.sort((a, b) => a.institucion.localeCompare(b.institucion));
      setInstitutions(result);
      setLoading(false);
    };

    load();
  }, [cedula, dbFase, navigate]);

  const handleToggle = async (inst: InstitutionVisibility) => {
    setToggling(inst.institucion);
    const newVal = !inst.isVisible;

    const { error } = await supabase
      .from("encuesta_360_visibility")
      .upsert(
        { fase: dbFase, scope_type: "institucion", scope_value: inst.institucion, is_active: newVal, updated_at: new Date().toISOString() },
        { onConflict: "fase,scope_type,scope_value" }
      );

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setInstitutions(prev =>
        prev.map(i => i.institucion === inst.institucion ? { ...i, isVisible: newVal, source: "institucion" } : i)
      );
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const faseLabel = fase === "final" ? "Salida" : "Entrada";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/mi-panel")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Encuestas 360° — {faseLabel}</h1>
            <p className="text-sm text-muted-foreground">Gestione la visibilidad por institución</p>
          </div>
        </div>

        {/* Logos */}
        <div className="flex justify-center items-center gap-4">
          {images.logo_rlt_white && <img src={images.logo_rlt_white} alt="Logo RLT" className="h-12 object-contain" />}
          {images.logo_clt && <img src={images.logo_clt} alt="Logo CLT" className="h-12 object-contain" />}
        </div>

        {institutions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No tiene instituciones asignadas.
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {institutions.map(inst => (
              <AccordionItem key={inst.institucion} value={inst.institucion} className="border rounded-lg overflow-hidden bg-card">
                <div className="flex items-center px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <AccordionTrigger className="hover:no-underline p-0 [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="font-medium text-sm truncate">{inst.institucion}</p>
                          <p className="text-xs text-muted-foreground">
                            {inst.directivos.length} directivo(s)
                            {inst.source !== "institucion" && (
                              <span className="ml-1 opacity-60">
                                — heredado de {inst.source === "region" ? "región" : "defecto"}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <Badge
                    className={`cursor-pointer select-none shrink-0 ${
                      inst.isVisible
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={(e) => { e.stopPropagation(); if (!toggling) handleToggle(inst); }}
                  >
                    {toggling === inst.institucion ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : inst.isVisible ? (
                      <Eye className="h-3 w-3 mr-1" />
                    ) : (
                      <EyeOff className="h-3 w-3 mr-1" />
                    )}
                    {inst.isVisible ? "Visible" : "No visible"}
                  </Badge>
                </div>
                <AccordionContent className="px-4 pb-3 pt-0">
                  <div className="border-t pt-3 space-y-2">
                    {inst.directivos.map(d => (
                      <div key={d.cedula} className="flex items-center gap-3 py-1.5 px-2 rounded-md bg-muted/40">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.nombre}</p>
                          <p className="text-xs text-muted-foreground">CC {d.cedula}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
