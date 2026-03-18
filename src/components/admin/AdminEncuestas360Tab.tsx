import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, School, ChevronDown, ChevronRight, Trash2, MapPin, EyeOff, Eye, Plus, Building2, User, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VisibilityRow {
  id?: string;
  fase: string;
  scope_type: string;
  scope_value: string;
  is_active: boolean;
}


interface Encuesta {
  id: string;
  tipo_formulario: string;
  nombre_completo: string | null;
  nombre_directivo: string | null;
  institucion_educativa: string;
  cargo_directivo: string;
  dias_contacto: string | null;
  created_at: string;
  respuestas: Record<string, string>;
}

interface InstitutionGroup {
  institucion: string;
  encuestas: Encuesta[];
}

interface ItemText {
  item_number: number;
  competency_key: string;
  response_type: string;
  text: string;
}

const FORM_TYPE_COLORS: Record<string, string> = {
  autoevaluacion: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  docente: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  directivo: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  administrativo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  estudiante: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  acudiente: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

const FORM_TYPE_LABELS: Record<string, string> = {
  autoevaluacion: "Autoevaluación",
  docente: "Docente",
  directivo: "Directivo Par",
  administrativo: "Administrativo",
  estudiante: "Estudiante",
  acudiente: "Acudiente",
};

interface AdminEncuestas360TabProps {
  fase?: "inicial" | "final";
  isViewer?: boolean;
}

export default function AdminEncuestas360Tab({ fase = "inicial", isViewer = false }: AdminEncuestas360TabProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedEncuesta, setSelectedEncuesta] = useState<Encuesta | null>(null);
  const [itemTexts, setItemTexts] = useState<ItemText[]>([]);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Encuesta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [regiones, setRegiones] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("todas");
  const [instRegionMap, setInstRegionMap] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<VisibilityRow[]>([]);
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [regionInstMap, setRegionInstMap] = useState<Record<string, string[]>>({});
  const [visOpen, setVisOpen] = useState(false);

  // Override form state
  const [addScopeType, setAddScopeType] = useState<string>("institucion");
  const [addScopeValue, setAddScopeValue] = useState("");
  const [addActive, setAddActive] = useState(true);

  useEffect(() => {
    loadEncuestas();
    loadRegiones();
  }, [fase]);

  const loadRegiones = async () => {
    const [{ data: regionesData }, { data: fichasData }, { data: visData }, { data: instRows }, { data: riData }, { data: instData }] = await Promise.all([
      supabase.from("regiones").select("id, nombre").order("nombre"),
      supabase.from("fichas_rlt").select("nombre_ie, region"),
      supabase.from("encuesta_360_visibility").select("id, fase, scope_type, scope_value, is_active").eq("fase", fase),
      supabase.rpc("get_instituciones_con_ficha"),
      supabase.from("region_instituciones").select("region_id, institucion_id"),
      supabase.from("instituciones").select("id, nombre"),
    ]);
    if (regionesData) setRegiones(regionesData);
    if (fichasData) {
      const map: Record<string, string> = {};
      fichasData.forEach((f: any) => { map[f.nombre_ie] = f.region; });
      setInstRegionMap(map);
    }
    setVisibility((visData as VisibilityRow[]) || []);
    if (instRows) setInstituciones((instRows as any[]).map((r: any) => r.nombre_ie));

    // Build region name → institution names mapping
    if (regionesData && riData && instData) {
      const instById: Record<string, string> = {};
      (instData as any[]).forEach((i: any) => { instById[i.id] = i.nombre; });
      const regById: Record<string, string> = {};
      (regionesData as any[]).forEach((r: any) => { regById[r.id] = r.nombre; });
      const rMap: Record<string, string[]> = {};
      (riData as any[]).forEach((ri: any) => {
        const regName = regById[ri.region_id];
        const instName = instById[ri.institucion_id];
        if (regName && instName) {
          if (!rMap[regName]) rMap[regName] = [];
          rMap[regName].push(instName);
        }
      });
      setRegionInstMap(rMap);
    }
  };

  const loadEncuestas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("encuestas_360")
      .select("id, tipo_formulario, nombre_completo, nombre_directivo, institucion_educativa, cargo_directivo, dias_contacto, created_at, respuestas")
      .eq("fase", fase)
      .order("institucion_educativa")
      .order("created_at", { ascending: false });

    const byInst: Record<string, Encuesta[]> = {};
    (data ?? []).forEach((e) => {
      const enc = { ...e, respuestas: (e.respuestas ?? {}) as Record<string, string> };
      if (!byInst[enc.institucion_educativa]) byInst[enc.institucion_educativa] = [];
      byInst[enc.institucion_educativa].push(enc);
    });

    const grouped = Object.entries(byInst)
      .map(([institucion, encuestas]) => ({ institucion, encuestas }))
      .sort((a, b) => a.institucion.localeCompare(b.institucion));

    setGroups(grouped);
    setLoading(false);
  };

  const handleViewEncuesta = async (enc: Encuesta) => {
    setSelectedEncuesta(enc);
    setLoadingTexts(true);

    // Fetch items and texts separately (join syntax not supported by dbClient shim on Render)
    const [{ data: itemsData }, { data: textsData }] = await Promise.all([
      supabase.from("items_360").select("id, item_number, competency_key, response_type").order("item_number"),
      supabase.from("item_texts_360").select("item_id, form_type, text").eq("form_type", enc.tipo_formulario),
    ]);

    const itemsMap = new Map<string, { item_number: number; competency_key: string; response_type: string }>();
    (itemsData ?? []).forEach((i: any) => itemsMap.set(i.id, { item_number: i.item_number, competency_key: i.competency_key, response_type: i.response_type }));

    const texts: ItemText[] = (textsData ?? [])
      .map((row: any) => {
        const item = itemsMap.get(row.item_id);
        if (!item) return null;
        return { item_number: item.item_number, competency_key: item.competency_key, response_type: item.response_type, text: row.text };
      })
      .filter(Boolean) as ItemText[];
    texts.sort((a, b) => a.item_number - b.item_number);

    setItemTexts(texts);
    setLoadingTexts(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Save to trash
      const label = `${FORM_TYPE_LABELS[deleteTarget.tipo_formulario] ?? deleteTarget.tipo_formulario} — ${deleteTarget.tipo_formulario === "autoevaluacion" ? deleteTarget.nombre_completo : deleteTarget.nombre_directivo} (${deleteTarget.institucion_educativa})`;
      const { error: trashError } = await supabase.from("deleted_records").insert([{
        record_type: "encuesta_360",
        record_label: label,
        deleted_data: deleteTarget as any,
      }]);
      if (trashError) throw trashError;

      // Delete the record
      const { error: delError } = await supabase.from("encuestas_360").delete().eq("id", deleteTarget.id);
      if (delError) throw delError;

      toast({ title: "Encuesta eliminada", description: "Se puede restaurar desde la Papelera." });
      setDeleteTarget(null);
      loadEncuestas();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleting(false);
  };

  const toggleExpand = (inst: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) next.delete(inst);
      else next.add(inst);
      return next;
    });
  };

  const regionFiltered = useMemo(() => {
    if (selectedRegion === "todas") return groups;
    const existing = groups.filter((g) => instRegionMap[g.institucion] === selectedRegion);
    // Add institutions from the region that have no submissions yet
    const existingNames = new Set(existing.map(g => g.institucion));
    const regionInsts = regionInstMap[selectedRegion] ?? [];
    const missing = regionInsts
      .filter(name => !existingNames.has(name))
      .sort()
      .map(name => ({ institucion: name, encuestas: [] as Encuesta[] }));
    return [...existing, ...missing].sort((a, b) => a.institucion.localeCompare(b.institucion));
  }, [groups, selectedRegion, instRegionMap, regionInstMap]);

  const filtered = search.trim()
    ? regionFiltered.filter((g) => g.institucion.toLowerCase().includes(search.toLowerCase()))
    : regionFiltered;

  const resolveInstVisibility = (institucion: string): { visible: boolean; source: string } => {
    const region = instRegionMap[institucion] || "";
    const instRow = visibility.find(r => r.scope_type === "institucion" && r.scope_value === institucion);
    if (instRow) return { visible: instRow.is_active, source: `Override institución: ${instRow.is_active ? "Visible" : "Oculto"}` };
    const regionRow = visibility.find(r => r.scope_type === "region" && r.scope_value === region);
    if (regionRow) return { visible: regionRow.is_active, source: `Región ${region}: ${regionRow.is_active ? "Visible" : "Oculto"}` };
    return { visible: false, source: "Sin configuración (oculto por defecto)" };
  };

  const toggleInstVisibility = async (institucion: string, currentlyVisible: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const newActive = !currentlyVisible;
    const { data, error } = await supabase.from("encuesta_360_visibility").upsert({
      fase,
      scope_type: "institucion",
      scope_value: institucion,
      is_active: newActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: "fase,scope_type,scope_value" }).select();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: newActive ? "Visibilidad activada" : "Visibilidad desactivada", description: institucion });
      const existing = visibility.find(r => r.scope_type === "institucion" && r.scope_value === institucion);
      if (existing) {
        setVisibility(prev => prev.map(r => r === existing ? { ...r, is_active: newActive } : r));
      } else if (data?.[0]) {
        setVisibility(prev => [...prev, { fase, scope_type: "institucion", scope_value: institucion, is_active: newActive }]);
      }
    }
  };

  const totalEncuestas = filtered.reduce((sum, g) => sum + g.encuestas.length, 0);

  // --- Visibility management helpers ---
  const getRegionSwitch = (regionName: string) => {
    const row = visibility.find(r => r.scope_type === "region" && r.scope_value === regionName);
    return row?.is_active ?? false;
  };

  const handleUpsertRegion = async (regionName: string, active: boolean) => {
    const existing = visibility.find(r => r.scope_type === "region" && r.scope_value === regionName);
    if (existing) {
      const { error } = await supabase.from("encuesta_360_visibility").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { setVisibility(prev => prev.map(r => r.id === existing.id ? { ...r, is_active: active } : r)); }
    } else {
      const { data, error } = await supabase.from("encuesta_360_visibility").insert({ fase, scope_type: "region", scope_value: regionName, is_active: active }).select();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else if (data) { setVisibility(prev => [...prev, ...(data as VisibilityRow[])]); }
    }
  };

  const handleAddOverride = async () => {
    if (!addScopeValue.trim()) { toast({ title: "Error", description: "Ingrese un valor", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("encuesta_360_visibility").upsert({
      fase, scope_type: addScopeType, scope_value: addScopeValue.trim(), is_active: addActive, updated_at: new Date().toISOString(),
    }, { onConflict: "fase,scope_type,scope_value" }).select();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Override guardado" }); loadRegiones(); setAddScopeValue(""); }
  };

  const handleDeleteOverride = async (id: string) => {
    const { error } = await supabase.from("encuesta_360_visibility").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setVisibility(prev => prev.filter(r => r.id !== id)); toast({ title: "Eliminado" }); }
  };

  const overrides = visibility.filter(r => r.scope_type !== "region");
  const scopeIcon = (type: string) => type === "institucion" ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Collapsible visibility management */}
      {!isViewer && (
        <Collapsible open={visOpen} onOpenChange={setVisOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between gap-2 h-9 text-sm">
              <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Gestión de visibilidad</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${visOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Region toggles */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Visibilidad por Región</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Región</TableHead>
                      <TableHead className="text-xs text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regiones.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell className="text-sm font-medium">{reg.nombre}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={getRegionSwitch(reg.nombre)} onCheckedChange={(checked) => handleUpsertRegion(reg.nombre, checked)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Overrides */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Overrides (Institución / Directivo)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                <p className="text-xs text-muted-foreground">
                  Un override de institución o directivo tiene prioridad sobre la configuración de la región.
                </p>

                <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={addScopeType} onValueChange={(v) => { setAddScopeType(v); setAddScopeValue(""); }}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar institución…" /></SelectTrigger>
                        <SelectContent>
                          {instituciones.map(inst => (<SelectItem key={inst} value={inst}>{inst}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Cédula del directivo" value={addScopeValue} onChange={e => setAddScopeValue(e.target.value)} className="h-8 text-xs" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estado</Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch checked={addActive} onCheckedChange={setAddActive} />
                      <span className="text-xs">{addActive ? "Activo" : "Inactivo"}</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={handleAddOverride} className="gap-1 h-8"><Plus className="w-3.5 h-3.5" /> Agregar</Button>
                </div>

                {overrides.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sin overrides configurados.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                            <div className="flex items-center gap-1 text-xs">
                              {scopeIcon(row.scope_type)}
                              {row.scope_type === "institucion" ? "Institución" : "Directivo"}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{row.scope_value}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${row.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                              {row.is_active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteOverride(row.id!)}>
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
          </CollapsibleContent>
        </Collapsible>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {totalEncuestas} encuesta(s) en {filtered.length} institución(es)
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Región" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las regiones</SelectItem>
                {regiones.map((r) => (
                  <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Buscar institución…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((g) => {
          const isOpen = expanded.has(g.institucion);
          const typeCounts: Record<string, number> = {};
          g.encuestas.forEach((e) => {
            typeCounts[e.tipo_formulario] = (typeCounts[e.tipo_formulario] || 0) + 1;
          });
          const vis = resolveInstVisibility(g.institucion);

          return (
            <Card key={g.institucion}>
              <CardHeader
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(g.institucion)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <School className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium truncate">{g.institucion}</CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-xs gap-1 shrink-0 cursor-pointer hover:opacity-80 ${
                              vis.visible
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }`}
                            onClick={(e) => toggleInstVisibility(g.institucion, vis.visible, e)}
                          >
                            {vis.visible ? <Eye className="w-3 h-3 text-green-600" /> : <EyeOff className="w-3 h-3 text-red-500" />}
                            {vis.visible ? "Visible" : "No visible"}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{vis.source} — Clic para cambiar</p></TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {Object.entries(typeCounts).map(([type, count]) => (
                        <Badge key={type} variant="secondary" className={`text-xs ${FORM_TYPE_COLORS[type] ?? ""}`}>
                          {FORM_TYPE_LABELS[type] ?? type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0">{g.encuestas.length}</Badge>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0 space-y-4">
                  {(() => {
                    const byDirectivo: Record<string, { nombre: string; cargo: string; encuestas: Encuesta[] }> = {};
                    g.encuestas.forEach((e) => {
                      const dirName = e.tipo_formulario === "autoevaluacion"
                        ? (e.nombre_completo || "Sin nombre")
                        : (e.nombre_directivo || "Sin nombre");
                      if (!byDirectivo[dirName]) {
                        byDirectivo[dirName] = { nombre: dirName, cargo: e.cargo_directivo, encuestas: [] };
                      }
                      byDirectivo[dirName].encuestas.push(e);
                    });

                    return Object.values(byDirectivo).map((group) => (
                      <div key={group.nombre} className="border rounded-md overflow-hidden">
                        <div className="bg-muted/50 px-3 py-2 flex items-center gap-2 text-sm">
                          <span className="font-semibold">{group.nombre}</span>
                          <span className="text-muted-foreground">— {group.cargo}</span>
                          <Badge variant="outline" className="ml-auto text-xs">{group.encuestas.length} resp.</Badge>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/30 text-left">
                              <th className="px-3 py-1.5 font-medium">Tipo</th>
                              <th className="px-3 py-1.5 font-medium">Fecha</th>
                              {!isViewer && <th className="px-3 py-1.5 font-medium w-10"></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {group.encuestas.map((e) => (
                              <tr
                                key={e.id}
                                className="border-t hover:bg-muted/30 cursor-pointer"
                                onClick={() => handleViewEncuesta(e)}
                              >
                                <td className="px-3 py-2">
                                  <Badge variant="secondary" className={`text-xs ${FORM_TYPE_COLORS[e.tipo_formulario] ?? ""}`}>
                                    {FORM_TYPE_LABELS[e.tipo_formulario] ?? e.tipo_formulario}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {new Date(e.created_at).toLocaleDateString("es-CO")}
                                </td>
                                {!isViewer && (
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(ev) => { ev.stopPropagation(); setDeleteTarget(e); }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ));
                  })()}
                </CardContent>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se encontraron instituciones.</p>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar esta encuesta?</DialogTitle>
            <DialogDescription>
              Se moverá a la Papelera y podrá ser restaurada posteriormente.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="text-sm space-y-1">
              <p><strong>Tipo:</strong> {FORM_TYPE_LABELS[deleteTarget.tipo_formulario] ?? deleteTarget.tipo_formulario}</p>
              <p><strong>Par evaluado:</strong> {deleteTarget.tipo_formulario === "autoevaluacion" ? deleteTarget.nombre_completo : deleteTarget.nombre_directivo}</p>
              <p><strong>Institución:</strong> {deleteTarget.institucion_educativa}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEncuesta} onOpenChange={(open) => { if (!open) setSelectedEncuesta(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Badge variant="secondary" className={`${FORM_TYPE_COLORS[selectedEncuesta?.tipo_formulario ?? ""] ?? ""}`}>
                {FORM_TYPE_LABELS[selectedEncuesta?.tipo_formulario ?? ""] ?? selectedEncuesta?.tipo_formulario}
              </Badge>
              <span className="truncate">
                {selectedEncuesta?.tipo_formulario === "autoevaluacion"
                  ? selectedEncuesta?.nombre_completo
                  : selectedEncuesta?.nombre_completo}
              </span>
            </DialogTitle>
            {selectedEncuesta && (
              <div className="text-sm text-muted-foreground space-y-0.5 pt-1">
                <p><strong>Institución:</strong> {selectedEncuesta.institucion_educativa}</p>
                <p><strong>Par evaluado:</strong> {selectedEncuesta.tipo_formulario === "autoevaluacion" ? selectedEncuesta.nombre_completo : selectedEncuesta.nombre_directivo}</p>
                <p><strong>Cargo:</strong> {selectedEncuesta.cargo_directivo} · <strong>Fecha:</strong> {new Date(selectedEncuesta.created_at).toLocaleDateString("es-CO")}</p>
                {selectedEncuesta.dias_contacto && <p><strong>Días de contacto:</strong> {selectedEncuesta.dias_contacto}</p>}
              </div>
            )}
          </DialogHeader>

          <div className="-mx-6 px-6 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {loadingTexts ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-3 py-2 font-medium w-10">#</th>
                      <th className="px-3 py-2 font-medium">Pregunta</th>
                      <th className="px-3 py-2 font-medium w-44">Respuesta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemTexts.map((item) => {
                      const answer = selectedEncuesta?.respuestas?.[String(item.item_number)] ?? "—";
                      return (
                        <tr key={item.item_number} className="border-t">
                          <td className="px-3 py-2 text-muted-foreground font-mono">{item.item_number}</td>
                          <td className="px-3 py-2">{item.text}</td>
                          <td className="px-3 py-2 font-medium">{answer}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
