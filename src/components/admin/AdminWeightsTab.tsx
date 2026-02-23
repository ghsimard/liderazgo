import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Save, AlertTriangle } from "lucide-react";
import { ITEM_COMPETENCY, COMPETENCY_DOMAIN, getCompetencyBase } from "@/data/encuesta360Data";

const OBSERVER_ROLES = ["coor", "doce", "admi", "acud", "estu"] as const;
const ROLE_LABELS: Record<string, string> = {
  coor: "Coordinador/a",
  doce: "Docente",
  admi: "Administrativo",
  acud: "Acudiente",
  estu: "Estudiante",
};

const COMPETENCY_LABELS: Record<string, string> = {
  autoconciencia: "Autoconciencia",
  emociones: "Manejo de las emociones",
  comunicacion: "Comunicación asertiva",
  colaborativo: "Trabajo colaborativo",
  direccion: "Dirección del PEI",
  orientacion: "Orientación pedagógica",
  convivencia: "Convivencia",
  evaluacion: "Fomento de la cultura de la evaluación",
  vision: "Fomento de la visión compartida",
  planeacion: "Planeación institucional",
  redes: "Construcción de redes",
  alianzas: "Generación de alianzas",
  rendicion: "Rendición de cuentas",
};

const DOMAIN_LABELS: Record<string, string> = {
  gestion_personal: "Gestión Personal",
  gestion_pedagogica: "Gestión Pedagógica",
  gestion_administrativa_comunitaria: "Gestión Administrativa y Comunitaria",
};

// Group competency keys by domain
const DOMAIN_ORDER = ["gestion_personal", "gestion_pedagogica", "gestion_administrativa_comunitaria"];

// Get all unique competency_keys from ITEM_COMPETENCY
const ALL_COMPETENCY_KEYS = [...new Set(Object.values(ITEM_COMPETENCY))].sort((a, b) => {
  const domainA = COMPETENCY_DOMAIN[getCompetencyBase(a)] || "";
  const domainB = COMPETENCY_DOMAIN[getCompetencyBase(b)] || "";
  const domainOrder = DOMAIN_ORDER.indexOf(domainA) - DOMAIN_ORDER.indexOf(domainB);
  if (domainOrder !== 0) return domainOrder;
  return a.localeCompare(b);
});

type WeightMap = Record<string, Record<string, number>>;

export default function AdminWeightsTab() {
  const { toast } = useToast();
  const [weights, setWeights] = useState<WeightMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchWeights = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("competency_weights")
      .select("competency_key, observer_role, weight");
    if (error) {
      toast({ title: "Error cargando ponderaciones", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const map: WeightMap = {};
    (data ?? []).forEach((row) => {
      if (!map[row.competency_key]) map[row.competency_key] = {};
      map[row.competency_key][row.observer_role] = Number(row.weight);
    });
    setWeights(map);
    setDirty(false);
    setLoading(false);
  };

  useEffect(() => { fetchWeights(); }, []);

  const handleChange = (compKey: string, role: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) && value !== "" && value !== ".") return;
    setWeights((prev) => ({
      ...prev,
      [compKey]: { ...prev[compKey], [role]: value === "" || value === "." ? 0 : num },
    }));
    setDirty(true);
  };

  // Validation: each row should sum to ~1.0
  const rowSums = useMemo(() => {
    const sums: Record<string, number> = {};
    ALL_COMPETENCY_KEYS.forEach((key) => {
      sums[key] = OBSERVER_ROLES.reduce((acc, role) => acc + (weights[key]?.[role] ?? 0), 0);
    });
    return sums;
  }, [weights]);

  const hasErrors = useMemo(
    () => ALL_COMPETENCY_KEYS.some((key) => Math.abs(rowSums[key] - 1.0) > 0.02),
    [rowSums]
  );

  const handleSave = async () => {
    if (hasErrors) {
      toast({
        title: "Error de validación",
        description: "La suma de los pesos de cada fila debe ser igual a 1.000",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Upsert all weights
      const rows = ALL_COMPETENCY_KEYS.flatMap((compKey) =>
        OBSERVER_ROLES.map((role) => ({
          competency_key: compKey,
          observer_role: role,
          weight: weights[compKey]?.[role] ?? 0,
        }))
      );

      // Delete all then insert (simple approach for admin-only operation)
      const { error: delError } = await supabase.from("competency_weights").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (delError) throw delError;

      const { error: insError } = await supabase.from("competency_weights").insert(rows);
      if (insError) throw insError;

      setDirty(false);
      toast({ title: "Ponderaciones guardadas", description: "Los cambios se aplicarán a los próximos informes." });
    } catch (err: any) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  let currentDomain = "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Ponderaciones por competencia y observador</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Cada fila debe sumar exactamente 1.000. El peso de la autoevaluación es siempre 1.0 y no se muestra aquí.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWeights} disabled={saving}>
            <RefreshCw className="w-4 h-4 mr-1" /> Recargar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty || hasErrors} className="gap-1.5">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left p-3 font-medium min-w-[200px]">Competencia / Ítem</th>
              <th className="text-center p-2 font-medium text-xs min-w-[60px]"># Form.</th>
              {OBSERVER_ROLES.map((role) => (
                <th key={role} className="text-center p-2 font-medium text-xs min-w-[100px]">
                  {ROLE_LABELS[role]}
                </th>
              ))}
              <th className="text-center p-2 font-medium text-xs min-w-[70px]">Σ</th>
            </tr>
          </thead>
          <tbody>
            {ALL_COMPETENCY_KEYS.map((compKey) => {
              const base = getCompetencyBase(compKey);
              const domain = COMPETENCY_DOMAIN[base] || "";
              const showDomainHeader = domain !== currentDomain;
              if (showDomainHeader) currentDomain = domain;

              // Find the form item number for this competency key
              const formNum = Object.entries(ITEM_COMPETENCY).find(([_, v]) => v === compKey)?.[0];
              const sum = rowSums[compKey];
              const sumOk = Math.abs(sum - 1.0) <= 0.02;

              return [
                showDomainHeader && (
                  <tr key={`domain-${domain}`} className="bg-primary/5">
                    <td colSpan={OBSERVER_ROLES.length + 3} className="px-3 py-2 font-semibold text-xs text-primary">
                      {DOMAIN_LABELS[domain] || domain}
                    </td>
                  </tr>
                ),
                <tr key={compKey} className="border-t hover:bg-muted/20">
                  <td className="p-2 pl-4 text-xs">
                    <span className="font-medium">{COMPETENCY_LABELS[base]}</span>
                    <span className="text-muted-foreground ml-1">({compKey})</span>
                  </td>
                  <td className="p-2 text-center text-xs text-muted-foreground">{formNum}</td>
                  {OBSERVER_ROLES.map((role) => (
                    <td key={role} className="p-1 text-center">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={weights[compKey]?.[role] ?? 0}
                        onChange={(e) => handleChange(compKey, role, e.target.value)}
                        className="h-8 text-center text-xs w-20 mx-auto"
                      />
                    </td>
                  ))}
                  <td className={`p-2 text-center text-xs font-mono font-medium ${sumOk ? "text-emerald-600" : "text-destructive"}`}>
                    {sum.toFixed(3)}
                    {!sumOk && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
