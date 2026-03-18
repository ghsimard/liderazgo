import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Building2, User, MapPin } from "lucide-react";

interface VisibilityRow {
  id: string;
  fase: string;
  scope_type: string;
  scope_value: string;
  is_active: boolean;
}

interface Region {
  id: string;
  nombre: string;
}

export default function AdminEncuesta360VisibilityTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<VisibilityRow[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Add override form
  const [addFase, setAddFase] = useState<string>("inicial");
  const [addScopeType, setAddScopeType] = useState<string>("institucion");
  const [addScopeValue, setAddScopeValue] = useState("");
  const [addActive, setAddActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: visRows }, { data: regs }, { data: instRows }] = await Promise.all([
      supabase.from("encuesta_360_visibility").select("*").order("scope_type", { ascending: true }).order("scope_value", { ascending: true }),
      supabase.from("regiones").select("id, nombre").order("nombre", { ascending: true }),
      supabase.rpc("get_instituciones_con_ficha"),
    ]);
    if (visRows) setRows(visRows as VisibilityRow[]);
    if (regs) setRegions(regs as Region[]);
    if (instRows) setInstituciones((instRows as any[]).map((r: any) => r.nombre_ie));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (row: VisibilityRow) => {
    const newVal = !row.is_active;
    const { error } = await supabase.from("encuesta_360_visibility").update({ is_active: newVal, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, is_active: newVal } : r));
    }
  };

  const handleUpsertRegion = async (regionName: string, fase: string, active: boolean) => {
    const existing = rows.find(r => r.fase === fase && r.scope_type === "region" && r.scope_value === regionName);
    if (existing) {
      await handleToggle(existing);
    } else {
      const { data, error } = await supabase.from("encuesta_360_visibility").insert({
        fase, scope_type: "region", scope_value: regionName, is_active: active,
      }).select();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else if (data) {
        setRows(prev => [...prev, ...(data as VisibilityRow[])]);
      }
    }
  };

  const handleAddOverride = async () => {
    if (!addScopeValue.trim()) {
      toast({ title: "Error", description: "Ingrese un valor", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("encuesta_360_visibility").upsert({
      fase: addFase,
      scope_type: addScopeType,
      scope_value: addScopeValue.trim(),
      is_active: addActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fase,scope_type,scope_value" }).select();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Override guardado" });
      loadData();
      setAddScopeValue("");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("encuesta_360_visibility").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRows(prev => prev.filter(r => r.id !== id));
      toast({ title: "Eliminado" });
    }
  };

  const getRegionSwitch = (regionName: string, fase: string) => {
    const row = rows.find(r => r.fase === fase && r.scope_type === "region" && r.scope_value === regionName);
    return row?.is_active ?? false;
  };

  const overrides = rows.filter(r => r.scope_type !== "region");

  const scopeIcon = (type: string) => {
    if (type === "institucion") return <Building2 className="w-3.5 h-3.5" />;
    if (type === "directivo") return <User className="w-3.5 h-3.5" />;
    return <MapPin className="w-3.5 h-3.5" />;
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Controle la visibilidad de las encuestas 360° Entrada y Salida por región. 
        Puede agregar overrides por institución o directivo (cédula) para activar o desactivar individualmente.
      </p>

      {/* Region toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Visibilidad por Región</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Región</TableHead>
                <TableHead className="text-xs text-center">Entrada (Inicial)</TableHead>
                <TableHead className="text-xs text-center">Salida (Final)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map(reg => (
                <TableRow key={reg.id}>
                  <TableCell className="text-sm font-medium">{reg.nombre}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={getRegionSwitch(reg.nombre, "inicial")}
                      onCheckedChange={(checked) => handleUpsertRegion(reg.nombre, "inicial", checked)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={getRegionSwitch(reg.nombre, "final")}
                      onCheckedChange={(checked) => handleUpsertRegion(reg.nombre, "final", checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Overrides (Institución / Directivo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Un override de institución o directivo tiene prioridad sobre la configuración de la región.
            Prioridad: Directivo &gt; Institución &gt; Región.
          </p>

          {/* Add override form */}
          <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <Label className="text-xs">Fase</Label>
              <Select value={addFase} onValueChange={setAddFase}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inicial">Entrada</SelectItem>
                  <SelectItem value="final">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={addScopeType} onValueChange={(v) => { setAddScopeType(v); setAddScopeValue(""); }}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="institucion">Institución</SelectItem>
                  <SelectItem value="directivo">Directivo (Cédula)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Valor</Label>
              {addScopeType === "institucion" ? (
                <Select value={addScopeValue} onValueChange={setAddScopeValue}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seleccionar institución…" />
                  </SelectTrigger>
                  <SelectContent>
                    {instituciones.map(inst => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Cédula del directivo"
                  value={addScopeValue}
                  onChange={e => setAddScopeValue(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <div className="flex items-center gap-2 h-8">
                <Switch checked={addActive} onCheckedChange={setAddActive} />
                <span className="text-xs">{addActive ? "Activo" : "Inactivo"}</span>
              </div>
            </div>
            <Button size="sm" onClick={handleAddOverride} className="gap-1 h-8">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </Button>
          </div>

          {/* Overrides list */}
          {overrides.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sin overrides configurados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Fase</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs text-center">Estado</TableHead>
                  <TableHead className="text-xs w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.fase === "inicial" ? "Entrada" : "Salida"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        {scopeIcon(row.scope_type)}
                        {row.scope_type === "institucion" ? "Institución" : "Directivo"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{row.scope_value}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={row.is_active} onCheckedChange={() => handleToggle(row)} />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(row.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
