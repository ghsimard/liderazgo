/**
 * Admin tab for managing satisfaction surveys:
 * - Toggle availability per region/module/type
 * - View response counts and details
 */
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Eye, ToggleLeft, ToggleRight, User, Calendar, MapPin, FileText, MessageSquare, CheckCircle2, XCircle, MinusCircle, Search, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FORM_TYPE_LABELS, asistenciaForm, interludioForm, intensivoForm } from "@/data/satisfaccionData";
import type { SatisfaccionFormDef, SatisfaccionQuestion, SatisfaccionOption } from "@/data/satisfaccionData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import AdminSatisfaccionStats from "./AdminSatisfaccionStats";
import AdminSatisfaccionReportTab from "./AdminSatisfaccionReportTab";
import AdminSatisfaccionFormsTab from "./AdminSatisfaccionFormsTab";

const FORM_TYPES = ["asistencia", "interludio", "intensivo"] as const;
const MODULES = [1, 2, 3, 4];

const FORM_DEFS: Record<string, SatisfaccionFormDef> = {
  asistencia: asistenciaForm,
  interludio: interludioForm,
  intensivo: intensivoForm,
};

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

/** Build a flat map of question key -> question def for a given form type */
function buildQuestionMap(formType: string): Map<string, SatisfaccionQuestion> {
  const def = FORM_DEFS[formType];
  if (!def) return new Map();
  const map = new Map<string, SatisfaccionQuestion>();
  for (const section of def.sections) {
    for (const q of section.questions) {
      map.set(q.key, q);
    }
  }
  return map;
}

/** Find the label for a given option value */
function findOptionLabel(options: SatisfaccionOption[] | undefined, value: string): string {
  if (!options) return value;
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Render a single answer value nicely */
function RenderAnswer({ question, value }: { question?: SatisfaccionQuestion; value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Sin respuesta</span>;
  }

  if (!question) {
    return <span className="text-foreground">{String(value)}</span>;
  }

  // Textarea / text
  if (question.type === "textarea" || question.type === "text" || question.type === "date") {
    return <span className="text-foreground">{String(value)}</span>;
  }

  // Radio / likert4
  if (question.type === "radio" || question.type === "likert4") {
    const label = findOptionLabel(question.options, String(value));
    if (question.type === "likert4") {
      const num = parseInt(String(value));
      const colors = ["", "text-red-600", "text-orange-500", "text-blue-600", "text-emerald-600"];
      return <span className={`font-medium ${colors[num] || ""}`}>{label}</span>;
    }
    return <Badge variant="secondary">{label}</Badge>;
  }

  // Checkbox
  if (question.type === "checkbox-max3") {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{findOptionLabel(question.options, v)}</Badge>
          ))}
        </div>
      );
    }
    return <Badge variant="outline">{findOptionLabel(question.options, String(value))}</Badge>;
  }

  // Grid types
  if (question.type === "grid-sino" || question.type === "grid-frequency" || question.type === "grid-logistic") {
    if (typeof value === "object" && !Array.isArray(value)) {
      return (
        <div className="space-y-1.5 mt-1">
          {question.rows?.map((row) => {
            const rowVal = value[row.key];
            const colLabel = findOptionLabel(question.columns, String(rowVal));
            const icon = rowVal === "si" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                         rowVal === "no" ? <XCircle className="w-3.5 h-3.5 text-red-500" /> :
                         rowVal === "parcialmente" ? <MinusCircle className="w-3.5 h-3.5 text-orange-500" /> : null;
            return (
              <div key={row.key} className="flex items-start gap-2 text-xs">
                {icon}
                <span className="text-muted-foreground flex-1">{row.label}</span>
                <Badge variant="outline" className="text-xs shrink-0">{colLabel}</Badge>
              </div>
            );
          })}
        </div>
      );
    }
  }

  return <span className="text-foreground">{JSON.stringify(value)}</span>;
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

  // Names & institution cache: cedula -> { name, ie }
  const [namesMap, setNamesMap] = useState<Record<string, { name: string; ie: string }>>({});

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Detail dialog
  const [detailResponse, setDetailResponse] = useState<ResponseRow | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: regData } = await supabase.from("regiones").select("nombre").order("nombre");
      const regionNames = (regData || []).map((r: any) => r.nombre);
      setRegions(regionNames);

      const { data: cfgData } = await supabase.from("satisfaccion_config").select("*").order("region").order("form_type").order("module_number");
      setConfigs((cfgData || []) as ConfigRow[]);

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
    const types = formType ? [formType] : [...FORM_TYPES];
    const upserts: any[] = [];

    for (const ft of types) {
      for (const region of regions) {
        for (const m of MODULES) {
          const existing = getConfig(ft, m, region);
          if (existing) {
            if (existing.is_active !== active) {
              upserts.push({ id: existing.id, form_type: ft, module_number: m, region, is_active: active, updated_at: now });
            }
          } else if (active) {
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

  /** Fetch names + institution for a list of cedulas */
  const fetchNames = async (cedulas: string[]) => {
    const unknown = cedulas.filter((c) => !namesMap[c]);
    if (unknown.length === 0) return;
    const { data } = await supabase
      .from("fichas_rlt")
      .select("numero_cedula,nombres,apellidos,nombres_apellidos,nombre_ie")
      .in("numero_cedula", unknown);
    const newMap = { ...namesMap };
    (data || []).forEach((f: any) => {
      const fullName = (f.nombres && f.apellidos) ? `${f.nombres} ${f.apellidos}` : f.nombres_apellidos;
      if (f.numero_cedula) newMap[f.numero_cedula] = { name: fullName, ie: f.nombre_ie || "" };
    });
    setNamesMap(newMap);
  };

  const fetchResponses = async () => {
    setLoadingResponses(true);
    let query = supabase.from("satisfaccion_responses").select("*").order("created_at", { ascending: false });
    if (filterType !== "all") query = query.eq("form_type", filterType);
    if (filterModule !== "all") query = query.eq("module_number", parseInt(filterModule));
    if (filterRegion !== "all") query = query.eq("region", filterRegion);
    const { data } = await query.limit(500);
    const rows = (data || []) as ResponseRow[];
    setResponses(rows);
    // Fetch names
    const cedulas = [...new Set(rows.map((r) => r.cedula))];
    await fetchNames(cedulas);
    setLoadingResponses(false);
  };

  useEffect(() => {
    if (activeSubTab === "responses") fetchResponses();
  }, [activeSubTab, filterType, filterModule, filterRegion]);

  const getName = (cedula: string) => namesMap[cedula]?.name || cedula;
  const getIE = (cedula: string) => namesMap[cedula]?.ie || "";

  // Client-side search filtering
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses;
    const q = searchQuery.toLowerCase().trim();
    return responses.filter((r) => {
      const name = getName(r.cedula).toLowerCase();
      const ie = getIE(r.cedula).toLowerCase();
      return name.includes(q) || ie.includes(q) || r.cedula.includes(q);
    });
  }, [responses, searchQuery, namesMap]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="hub-tabs flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="responses">Respuestas</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          <TabsTrigger value="report">Informe PDF</TabsTrigger>
          <TabsTrigger value="forms">Formularios</TabsTrigger>
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
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Buscar por nombre o institución</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nombre del directivo o institución…"
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
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
          ) : filteredResponses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{responses.length > 0 ? "Sin resultados para la búsqueda" : "Sin respuestas registradas"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {searchQuery && <p className="text-xs text-muted-foreground">{filteredResponses.length} de {responses.length} respuestas</p>}
              {filteredResponses.map((r) => (
                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailResponse(r)}>
                  <CardContent className="py-3 px-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getName(r.cedula)}</p>
                      {getIE(r.cedula) && (
                        <p className="text-xs text-muted-foreground truncate">{getIE(r.cedula)}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span>{r.region}</span>
                        <span>·</span>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(r.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{FORM_TYPE_LABELS[r.form_type] || r.form_type}</Badge>
                      <Badge variant="secondary" className="text-xs">Mód. {r.module_number}</Badge>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <AdminSatisfaccionStats regions={regions} />
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <AdminSatisfaccionReportTab regions={regions} />
        </TabsContent>

        <TabsContent value="forms" className="mt-4">
          <AdminSatisfaccionFormsTab />
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <ResponseDetailDialog
        response={detailResponse}
        onClose={() => setDetailResponse(null)}
        getName={getName}
        getIE={getIE}
      />
    </div>
  );
}

/** Beautiful detail dialog for a single response */
function ResponseDetailDialog({
  response,
  onClose,
  getName,
  getIE,
}: {
  response: ResponseRow | null;
  onClose: () => void;
  getName: (cedula: string) => string;
  getIE: (cedula: string) => string;
}) {
  if (!response) return null;

  const questionMap = buildQuestionMap(response.form_type);
  const formDef = FORM_DEFS[response.form_type];
  const respuestas = response.respuestas || {};

  return (
    <Dialog open={!!response} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-lg">{FORM_TYPE_LABELS[response.form_type]} — Módulo {response.module_number}</DialogTitle>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium">{getName(response.cedula)}</p>
                <p className="text-xs text-muted-foreground">CC {response.cedula}</p>
                {getIE(response.cedula) && <p className="text-xs text-muted-foreground">{getIE(response.cedula)}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium">{response.region}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(response.created_at).toLocaleString("es-CO", {
                    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body - structured answers */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {formDef ? (
              formDef.sections.map((section, si) => {
                // Check if any question in this section has answers
                const hasAnswers = section.questions.some((q) => respuestas[q.key] !== undefined && respuestas[q.key] !== null && respuestas[q.key] !== "");
                if (!hasAnswers) return null;

                return (
                  <div key={si}>
                    <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {section.title}
                    </h3>
                    <div className="space-y-3">
                      {section.questions.map((q) => {
                        const val = respuestas[q.key];
                        if (val === undefined || val === null || val === "") return null;

                        return (
                          <div key={q.key} className="bg-muted/40 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1.5 leading-snug">{q.label}</p>
                            <RenderAnswer question={q} value={val} />
                          </div>
                        );
                      })}
                    </div>
                    {si < formDef.sections.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })
            ) : (
              // Fallback: raw key-value
              Object.entries(respuestas).map(([key, val]) => (
                <div key={key} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">{key}</p>
                  <p className="text-sm">{typeof val === "object" ? JSON.stringify(val) : String(val)}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
