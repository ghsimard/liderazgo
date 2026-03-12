/**
 * Admin tab for managing satisfaction surveys:
 * - Toggle availability per region/module/type
 * - View response counts and details
 */
import { useEffect, useState } from "react";
import { supabase } from "@/utils/dbClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FORM_TYPE_LABELS } from "@/data/satisfaccionData";

const FORM_TYPES = ["asistencia", "interludio", "intensivo"] as const;
const MODULES = [1, 2, 3, 4];

interface ConfigRow {
  id: string;
  form_type: string;
  module_number: number;
  region: string;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
}

interface ResponseRow {
  id: string;
  form_type: string;
  module_number: number;
  region: string;
  cedula: string;
  respuestas: any;
  created_at: string;
}

export default function AdminSatisfaccionesTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [activeSubTab, setActiveSubTab] = useState("config");

  // Detail view
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");

  // Detail dialog
  const [detailResponse, setDetailResponse] = useState<ResponseRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch regions
      const { data: regData } = await supabase.from("regiones").select("nombre").order("nombre");
      const regionNames = (regData || []).map((r: any) => r.nombre);
      setRegions(regionNames);

      // Fetch configs
      const { data: cfgData } = await supabase.from("satisfaccion_config").select("*").order("region").order("form_type").order("module_number");
      setConfigs((cfgData || []) as ConfigRow[]);

      // Fetch response counts
      const { data: respData } = await supabase.from("satisfaccion_responses").select("form_type,module_number,region");
      const counts: Record<string, number> = {};
      (respData || []).forEach((r: any) => {
        const key = `${r.form_type}-${r.module_number}-${r.region}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      setResponseCounts(counts);
    } catch {
      toast({ title: "Error cargando datos", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getConfig = (formType: string, module: number, region: string): ConfigRow | undefined => {
    return configs.find((c) => c.form_type === formType && c.module_number === module && c.region === region);
  };

  const toggleActive = async (formType: string, module: number, region: string) => {
    const existing = getConfig(formType, module, region);
    if (existing) {
      const { error } = await supabase
        .from("satisfaccion_config")
        .update({ is_active: !existing.is_active, updated_at: new Date().toISOString() } as any)
        .eq("id", existing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await supabase.from("satisfaccion_config").insert({
        form_type: formType,
        module_number: module,
        region,
        is_active: true,
      } as any);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
    }
    fetchData();
  };

  const bulkSetActive = async (formType: string | null, active: boolean) => {
    const now = new Date().toISOString();
    // Build upserts for all region/module combos for the given formType (or all types)
    const types = formType ? [formType] : [...FORM_TYPES];
    const upserts: any[] = [];

    for (const ft of types) {
      for (const region of regions) {
        for (const m of MODULES) {
          const existing = getConfig(ft, m, region);
          if (existing) {
            // Only update if state differs
            if (existing.is_active !== active) {
              upserts.push({ id: existing.id, form_type: ft, module_number: m, region, is_active: active, updated_at: now });
            }
          } else if (active) {
            // Create new config only when enabling
            upserts.push({ form_type: ft, module_number: m, region, is_active: true, updated_at: now });
          }
        }
      }
    }

    if (upserts.length === 0) return;

    const { error } = await supabase.from("satisfaccion_config").upsert(upserts as any, { onConflict: "id" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    fetchData();
  };

  const updateDates = async (id: string, field: "available_from" | "available_until", value: string) => {
    const { error } = await supabase
      .from("satisfaccion_config")
      .update({ [field]: value || null, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  const fetchResponses = async () => {
    setLoadingResponses(true);
    let query = supabase.from("satisfaccion_responses").select("*").order("created_at", { ascending: false });
    if (filterType !== "all") query = query.eq("form_type", filterType);
    if (filterModule !== "all") query = query.eq("module_number", parseInt(filterModule));
    if (filterRegion !== "all") query = query.eq("region", filterRegion);
    const { data } = await query.limit(500);
    setResponses((data || []) as ResponseRow[]);
    setLoadingResponses(false);
  };

  useEffect(() => {
    if (activeSubTab === "responses") fetchResponses();
  }, [activeSubTab, filterType, filterModule, filterRegion]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Encuestas de Satisfacción</h2>
        <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="responses">Respuestas</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6 mt-4">
          {/* Global bulk actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bulkSetActive(null, true)}>
              <ToggleRight className="w-4 h-4" /> Activar todo
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bulkSetActive(null, false)}>
              <ToggleLeft className="w-4 h-4" /> Desactivar todo
            </Button>
          </div>

          {FORM_TYPES.map((ft) => (
            <Card key={ft}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{FORM_TYPE_LABELS[ft]}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => bulkSetActive(ft, true)}>
                    <ToggleRight className="w-3.5 h-3.5" /> Activar
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => bulkSetActive(ft, false)}>
                    <ToggleLeft className="w-3.5 h-3.5" /> Desactivar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Región</TableHead>
                        {MODULES.map((m) => (
                          <TableHead key={m} className="text-center">Módulo {m}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regions.map((region) => (
                        <TableRow key={region}>
                          <TableCell className="font-medium text-sm">{region}</TableCell>
                          {MODULES.map((m) => {
                            const cfg = getConfig(ft, m, region);
                            const count = responseCounts[`${ft}-${m}-${region}`] || 0;
                            return (
                              <TableCell key={m} className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Switch
                                    checked={cfg?.is_active || false}
                                    onCheckedChange={() => toggleActive(ft, m, region)}
                                  />
                                  {count > 0 && <Badge variant="secondary" className="text-xs">{count}</Badge>}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="responses" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                <option value="all">Todos</option>
                {FORM_TYPES.map((ft) => <option key={ft} value={ft}>{FORM_TYPE_LABELS[ft]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Módulo</Label>
              <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                <option value="all">Todos</option>
                {MODULES.map((m) => <option key={m} value={String(m)}>Módulo {m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Región</Label>
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                <option value="all">Todas</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {loadingResponses ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Región</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin respuestas</TableCell>
                  </TableRow>
                ) : responses.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.cedula}</TableCell>
                    <TableCell><Badge variant="outline">{FORM_TYPE_LABELS[r.form_type] || r.form_type}</Badge></TableCell>
                    <TableCell>{r.module_number}</TableCell>
                    <TableCell>{r.region}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("es-CO")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDetailResponse(r)}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!detailResponse} onOpenChange={() => setDetailResponse(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de respuesta</DialogTitle>
          </DialogHeader>
          {detailResponse && (
            <div className="space-y-3 text-sm">
              <div><strong>Cédula:</strong> {detailResponse.cedula}</div>
              <div><strong>Tipo:</strong> {FORM_TYPE_LABELS[detailResponse.form_type]}</div>
              <div><strong>Módulo:</strong> {detailResponse.module_number}</div>
              <div><strong>Región:</strong> {detailResponse.region}</div>
              <div><strong>Fecha:</strong> {new Date(detailResponse.created_at).toLocaleString("es-CO")}</div>
              <hr />
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(detailResponse.respuestas, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
