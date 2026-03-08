import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Save, AlertTriangle, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OBSERVER_ROLES = ["coor", "doce", "admi", "acud", "estu"] as const;
const ROLE_LABELS: Record<string, string> = {
  coor: "Coordinador/a",
  doce: "Docente",
  admi: "Administrativo",
  acud: "Acudiente",
  estu: "Estudiante",
};

interface Domain { id: string; key: string; label: string; sort_order: number; }
interface Competency { id: string; key: string; label: string; domain_id: string; sort_order: number; }
interface Item { id: string; item_number: number; competency_key: string; sort_order: number; }

type WeightMap = Record<string, Record<string, number>>;

export default function AdminWeightsTab() {
  const { toast } = useToast();
  const [weights, setWeights] = useState<WeightMap>({});
  const [domains, setDomains] = useState<Domain[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const [wRes, dRes, cRes, iRes] = await Promise.all([
      supabase.from("competency_weights").select("competency_key, observer_role, weight"),
      supabase.from("domains_360").select("*").order("sort_order"),
      supabase.from("competencies_360").select("*").order("sort_order"),
      supabase.from("items_360").select("id, item_number, competency_key, sort_order").order("sort_order"),
    ]);

    const map: WeightMap = {};
    (wRes.data ?? []).forEach((row) => {
      if (!map[row.competency_key]) map[row.competency_key] = {};
      map[row.competency_key][row.observer_role] = Number(row.weight);
    });
    setWeights(map);
    setDomains((dRes.data as Domain[]) ?? []);
    setCompetencies((cRes.data as Competency[]) ?? []);
    setItems((iRes.data as Item[]) ?? []);
    setDirty(false);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Derive all unique competency_keys from items, sorted by domain
  const domainMap = useMemo(() => Object.fromEntries(domains.map((d) => [d.id, d])), [domains]);
  const compMap = useMemo(() => Object.fromEntries(competencies.map((c) => [c.key, c])), [competencies]);

  const getCompBase = (key: string) => key.replace(/_\d+$/, "");

  const allCompKeys = useMemo(() => {
    const keys = [...new Set(items.map((i) => i.competency_key))];
    return keys.sort((a, b) => {
      const compA = compMap[getCompBase(a)];
      const compB = compMap[getCompBase(b)];
      const domA = compA ? domainMap[compA.domain_id]?.sort_order ?? 99 : 99;
      const domB = compB ? domainMap[compB.domain_id]?.sort_order ?? 99 : 99;
      if (domA !== domB) return domA - domB;
      const sortA = compA?.sort_order ?? 99;
      const sortB = compB?.sort_order ?? 99;
      if (sortA !== sortB) return sortA - sortB;
      return a.localeCompare(b);
    });
  }, [items, compMap, domainMap]);

  const handleChange = (compKey: string, role: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) && value !== "" && value !== ".") return;
    setWeights((prev) => ({
      ...prev,
      [compKey]: { ...prev[compKey], [role]: value === "" || value === "." ? 0 : num },
    }));
    setDirty(true);
  };

  const rowSums = useMemo(() => {
    const sums: Record<string, number> = {};
    allCompKeys.forEach((key) => {
      sums[key] = OBSERVER_ROLES.reduce((acc, role) => acc + (weights[key]?.[role] ?? 0), 0);
    });
    return sums;
  }, [weights, allCompKeys]);

  const hasErrors = useMemo(
    () => allCompKeys.some((key) => Math.abs(rowSums[key] - 1.0) > 0.02),
    [rowSums, allCompKeys]
  );

  const handleDeleteAll = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("competency_weights").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      setWeights({});
      setDirty(false);
      toast({ title: "Ponderaciones eliminadas", description: "Todas las ponderaciones han sido eliminadas." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (hasErrors) {
      toast({ title: "Error de validación", description: "La suma de los pesos de cada fila debe ser igual a 1.000", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const rows = allCompKeys.flatMap((compKey) =>
        OBSERVER_ROLES.map((role) => ({
          competency_key: compKey,
          observer_role: role,
          weight: weights[compKey]?.[role] ?? 0,
        }))
      );
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
    return <div className="flex items-center justify-center py-12"><RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" /></div>;
  }

  let currentDomainId = "";

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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={saving}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar todo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar todas las ponderaciones?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará todas las ponderaciones de la base de datos. Los informes generados no serán afectados, pero los futuros cálculos no tendrán pesos asignados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={saving}>
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
                <th key={role} className="text-center p-2 font-medium text-xs min-w-[100px]">{ROLE_LABELS[role]}</th>
              ))}
              <th className="text-center p-2 font-medium text-xs min-w-[70px]">Σ</th>
            </tr>
          </thead>
          <tbody>
            {allCompKeys.map((compKey) => {
              const base = getCompBase(compKey);
              const comp = compMap[base];
              const domain = comp ? domainMap[comp.domain_id] : null;
              const showDomainHeader = domain && domain.id !== currentDomainId;
              if (showDomainHeader && domain) currentDomainId = domain.id;

              const formNum = items.find((i) => i.competency_key === compKey)?.item_number;
              const sum = rowSums[compKey];
              const sumOk = Math.abs(sum - 1.0) <= 0.02;

              return [
                showDomainHeader && (
                  <tr key={`domain-${domain!.id}`} className="bg-primary/5">
                    <td colSpan={OBSERVER_ROLES.length + 3} className="px-3 py-2 font-semibold text-xs text-primary">
                      {domain!.label}
                    </td>
                  </tr>
                ),
                <tr key={compKey} className="border-t hover:bg-muted/20">
                  <td className="p-2 pl-4 text-xs">
                    <span className="font-medium">{comp?.label ?? base}</span>
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
