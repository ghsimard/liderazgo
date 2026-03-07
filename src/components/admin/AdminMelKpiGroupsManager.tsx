import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, FolderOpen, Link2, Unlink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface KpiGroup {
  id: string;
  name: string;
  description: string;
  kpi_ids: string[]; // kpi_config ids assigned
  meta_overrides: Record<string, number | null>; // kpi_config_id → meta override
}

interface KpiOption {
  id: string;
  kpi_key: string;
  label: string;
  meta_percentage: number;
}

interface Region {
  id: string;
  nombre: string;
  kpi_group_id: string | null;
}

export default function AdminMelKpiGroupsManager() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<KpiGroup[]>([]);
  const [kpiOptions, setKpiOptions] = useState<KpiOption[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: groupsData }, { data: groupItemsData }, { data: kpisData }, { data: regionsData }] = await Promise.all([
      supabase.from("mel_kpi_groups").select("*").order("name"),
      supabase.from("mel_kpi_group_items").select("*"),
      supabase.from("mel_kpi_config").select("id, kpi_key, label, meta_percentage").eq("is_active", true).order("sort_order"),
      supabase.from("regiones").select("id, nombre, kpi_group_id").order("nombre"),
    ]);

    const kpis: KpiOption[] = (kpisData ?? []).map(k => ({ ...k, meta_percentage: Number(k.meta_percentage) }));
    setKpiOptions(kpis);
    setRegions(regionsData ?? []);

    const itemsByGroup = new Map<string, { kpi_config_id: string; meta_override: number | null }[]>();
    (groupItemsData ?? []).forEach(gi => {
      if (!itemsByGroup.has(gi.group_id)) itemsByGroup.set(gi.group_id, []);
      itemsByGroup.get(gi.group_id)!.push({ kpi_config_id: gi.kpi_config_id, meta_override: gi.meta_override ? Number(gi.meta_override) : null });
    });

    setGroups((groupsData ?? []).map(g => {
      const items = itemsByGroup.get(g.id) ?? [];
      const overrides: Record<string, number | null> = {};
      items.forEach(i => { overrides[i.kpi_config_id] = i.meta_override; });
      return {
        id: g.id,
        name: g.name,
        description: g.description ?? "",
        kpi_ids: items.map(i => i.kpi_config_id),
        meta_overrides: overrides,
      };
    }));
  };

  const addGroup = () => {
    setGroups(prev => [...prev, {
      id: "",
      name: "Nuevo grupo",
      description: "",
      kpi_ids: [],
      meta_overrides: {},
    }]);
  };

  const removeGroup = async (idx: number) => {
    const g = groups[idx];
    if (g.id) {
      // Unlink regions first
      await supabase.from("regiones").update({ kpi_group_id: null }).eq("kpi_group_id", g.id);
      await supabase.from("mel_kpi_group_items").delete().eq("group_id", g.id);
      await supabase.from("mel_kpi_groups").delete().eq("id", g.id);
    }
    setGroups(prev => prev.filter((_, i) => i !== idx));
    toast({ title: "Grupo eliminado" });
    await loadAll();
  };

  const toggleKpi = (groupIdx: number, kpiId: string) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIdx) return g;
      const has = g.kpi_ids.includes(kpiId);
      return {
        ...g,
        kpi_ids: has ? g.kpi_ids.filter(id => id !== kpiId) : [...g.kpi_ids, kpiId],
        meta_overrides: has ? (() => { const m = { ...g.meta_overrides }; delete m[kpiId]; return m; })() : g.meta_overrides,
      };
    }));
  };

  const setMetaOverride = (groupIdx: number, kpiId: string, value: number | null) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIdx) return g;
      return { ...g, meta_overrides: { ...g.meta_overrides, [kpiId]: value } };
    }));
  };

  const assignRegion = (regionId: string, groupId: string | null) => {
    setRegions(prev => prev.map(r => r.id === regionId ? { ...r, kpi_group_id: groupId || null } : r));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save groups
      for (const group of groups) {
        let groupId = group.id;
        if (!groupId) {
          const { data } = await supabase.from("mel_kpi_groups").insert({
            name: group.name,
            description: group.description,
          }).select("id").single();
          if (data) groupId = data.id;
          else continue;
        } else {
          await supabase.from("mel_kpi_groups").update({
            name: group.name,
            description: group.description,
            updated_at: new Date().toISOString(),
          }).eq("id", groupId);
        }

        // Sync group items
        await supabase.from("mel_kpi_group_items").delete().eq("group_id", groupId);
        if (group.kpi_ids.length > 0) {
          await supabase.from("mel_kpi_group_items").insert(
            group.kpi_ids.map(kpiId => ({
              group_id: groupId,
              kpi_config_id: kpiId,
              meta_override: group.meta_overrides[kpiId] ?? null,
            }))
          );
        }
      }

      // Save region assignments
      for (const region of regions) {
        await supabase.from("regiones").update({ kpi_group_id: region.kpi_group_id }).eq("id", region.id);
      }

      toast({ title: "Grupos guardados", description: "Las asignaciones regionales se aplicarán al recalcular." });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const savedGroupOptions = groups.filter(g => g.id); // only saved groups for region assignment

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <FolderOpen className="w-4 h-4" /> Grupos de Indicadores
          </h3>
          <p className="text-xs text-muted-foreground">Cree perfiles de KPIs y asígnelos a regiones</p>
        </div>
        <Button onClick={saveAll} disabled={saving} size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando..." : "Guardar grupos"}
        </Button>
      </div>

      {/* Groups */}
      {groups.map((group, idx) => (
        <Card key={group.id || idx}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre del grupo</Label>
                  <Input
                    value={group.name}
                    onChange={e => setGroups(prev => prev.map((g, i) => i === idx ? { ...g, name: e.target.value } : g))}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descripción</Label>
                  <Input
                    value={group.description}
                    onChange={e => setGroups(prev => prev.map((g, i) => i === idx ? { ...g, description: e.target.value } : g))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeGroup(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">KPIs incluidos</Label>
              <div className="space-y-1.5">
                {kpiOptions.map(kpi => {
                  const isIncluded = group.kpi_ids.includes(kpi.id);
                  return (
                    <div key={kpi.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={isIncluded}
                        onCheckedChange={() => toggleKpi(idx, kpi.id)}
                      />
                      <span className="text-xs flex-1">
                        <span className="font-mono text-muted-foreground">{kpi.kpi_key}</span>
                        {" — "}{kpi.label}
                      </span>
                      {isIncluded && (
                        <div className="flex items-center gap-1">
                          <Label className="text-[10px] text-muted-foreground">Meta override:</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder={String(kpi.meta_percentage)}
                            value={group.meta_overrides[kpi.id] ?? ""}
                            onChange={e => setMetaOverride(idx, kpi.id, e.target.value ? Number(e.target.value) : null)}
                            className="h-6 text-xs w-16"
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {kpiOptions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No hay KPIs activos configurados</p>
              )}
            </div>

            {group.id && (
              <div>
                <Label className="text-xs mb-1 block text-muted-foreground">
                  Regiones asignadas a este grupo:
                </Label>
                <div className="flex flex-wrap gap-1">
                  {regions.filter(r => r.kpi_group_id === group.id).map(r => (
                    <Badge key={r.id} variant="secondary" className="text-xs">{r.nombre}</Badge>
                  ))}
                  {regions.filter(r => r.kpi_group_id === group.id).length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">Ninguna</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addGroup} className="w-full" size="sm">
        <Plus className="w-4 h-4 mr-2" /> Agregar grupo
      </Button>

      {/* Region assignments */}
      <Separator />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Asignación por Región
          </CardTitle>
          <p className="text-xs text-muted-foreground">Asigne un grupo de indicadores a cada región</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regions.map(region => (
              <div key={region.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 font-medium">{region.nombre}</span>
                <Select
                  value={region.kpi_group_id ?? "none"}
                  onValueChange={v => assignRegion(region.id, v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="Sin grupo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="flex items-center gap-1.5">
                        <Unlink className="w-3 h-3" /> Todos los KPIs (por defecto)
                      </span>
                    </SelectItem>
                    {savedGroupOptions.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
