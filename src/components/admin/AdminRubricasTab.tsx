import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Users, ClipboardList, UserCheck, FileText, BarChart3, Trash2, Loader2 } from "lucide-react";
import AdminEvaluadoresTab from "./AdminEvaluadoresTab";
import AdminRubricaModuleReport from "./AdminRubricaModuleReport";
import AdminRubricaRegionalReport from "./AdminRubricaRegionalReport";

interface Evaluacion {
  id: string;
  item_id: string;
  directivo_cedula: string;
  directivo_nivel: string | null;
  equipo_nivel: string | null;
  acordado_nivel: string | null;
  created_at: string;
}

interface Seguimiento {
  id: string;
  item_id: string;
  directivo_cedula: string;
  nivel: string | null;
  created_at: string;
}

interface RubricaModule {
  id: string;
  module_number: number;
  title: string;
  objective: string;
}

interface RubricaItem {
  id: string;
  module_id: string;
  item_type: string;
  item_label: string;
  sort_order: number;
}

const NIVEL_COLORS: Record<string, string> = {
  avanzado: "bg-emerald-100 text-emerald-800",
  intermedio: "bg-blue-100 text-blue-800",
  basico: "bg-amber-100 text-amber-800",
  sin_evidencia: "bg-red-100 text-red-800",
};

export default function AdminRubricasTab() {
  const { toast } = useToast();
  const [modules, setModules] = useState<RubricaModule[]>([]);
  const [items, setItems] = useState<RubricaItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCedula, setSelectedCedula] = useState<string | null>(null);
  const [cedulaToName, setCedulaToName] = useState<Record<string, string>>({});
  const [regiones, setRegiones] = useState<{ id: string; nombre: string }[]>([]);
  const [cedulaToRegion, setCedulaToRegion] = useState<Record<string, string>>({});
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [deletingAutoeval, setDeletingAutoeval] = useState<string | null>(null); // module_id being deleted

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: mods }, { data: its }, { data: evals }, { data: asignaciones }, { data: segs }, { data: fichas }, { data: regs }] = await Promise.all([
      supabase.from("rubrica_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_evaluaciones").select("*").order("created_at", { ascending: false }),
      supabase.from("rubrica_asignaciones").select("directivo_cedula, directivo_nombre"),
      supabase.from("rubrica_seguimientos").select("id, item_id, directivo_cedula, nivel, created_at").order("created_at", { ascending: false }),
      supabase.from("fichas_rlt").select("numero_cedula, nombres_apellidos, region"),
      supabase.from("regiones").select("id, nombre").order("nombre"),
    ]);
    if (mods) setModules(mods);
    if (its) setItems(its);
    if (evals) setEvaluaciones(evals);
    if (segs) setSeguimientos(segs);
    if (regs) setRegiones(regs);

    // Build name map: asignaciones first (fallback), then fichas_rlt (source of truth)
    const map: Record<string, string> = {};
    asignaciones?.forEach((a: any) => { if (a.directivo_nombre?.trim()) map[a.directivo_cedula] = a.directivo_nombre; });
    fichas?.forEach((f: any) => { if (f.nombres_apellidos?.trim()) map[f.numero_cedula] = f.nombres_apellidos; });
    setCedulaToName(map);

    // Build cedula → region map
    const regionMap: Record<string, string> = {};
    fichas?.forEach((f: any) => { if (f.region) regionMap[f.numero_cedula] = f.region; });
    setCedulaToRegion(regionMap);

    setLoading(false);
  };

  const handleDeleteAutoeval = async (moduleId: string, moduleNumber: number) => {
    if (!selectedCedula) return;
    if (!confirm(`¿Eliminar la autoevaluación del Módulo ${moduleNumber} para este directivo? Esta acción no se puede deshacer.`)) return;
    
    setDeletingAutoeval(moduleId);
    try {
      const modItems = items.filter(i => i.module_id === moduleId);
      const itemIds = modItems.map(i => i.id);

      // Delete evaluaciones for these items
      await supabase
        .from("rubrica_evaluaciones")
        .delete()
        .eq("directivo_cedula", selectedCedula)
        .in("item_id", itemIds);

      // Delete submission dates for this module
      await supabase
        .from("rubrica_submission_dates")
        .delete()
        .eq("directivo_cedula", selectedCedula)
        .eq("module_number", moduleNumber);

      // Delete seguimientos for this module's items
      await supabase
        .from("rubrica_seguimientos")
        .delete()
        .eq("directivo_cedula", selectedCedula)
        .in("item_id", itemIds);

      toast({ title: "Eliminado", description: `Autoevaluación del Módulo ${moduleNumber} eliminada.` });
      await loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingAutoeval(null);
    }
  };

  const uniqueCedulas = [...new Set(evaluaciones.map(e => e.directivo_cedula))];
  const filteredCedulas = uniqueCedulas.filter(c => {
    const term = searchTerm.toLowerCase();
    const name = (cedulaToName[c] || "").toLowerCase();
    const matchesSearch = !searchTerm || c.includes(term) || name.includes(term);
    const matchesRegion = selectedRegion === "all" || cedulaToRegion[c] === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const selectedEvals = selectedCedula
    ? evaluaciones.filter(e => e.directivo_cedula === selectedCedula)
    : [];

  const NivelBadge = ({ nivel }: { nivel: string | null }) => {
    if (!nivel) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <Badge className={`text-xs ${NIVEL_COLORS[nivel] || ""}`}>
        {nivel === "sin_evidencia" ? "Sin evidencia" : nivel.charAt(0).toUpperCase() + nivel.slice(1)}
      </Badge>
    );
  };

  return (
    <Tabs defaultValue="resultados">
      <TabsList className="hub-tabs mb-4 flex-wrap h-auto gap-1 sticky top-[3.5rem] z-10 bg-primary/90 text-primary-foreground py-2 shadow-md rounded-lg">
        <TabsTrigger value="resultados" className="gap-1.5">
          <ClipboardList className="w-4 h-4" /> Resultados
        </TabsTrigger>
        <TabsTrigger value="informes" className="gap-1.5">
          <FileText className="w-4 h-4" /> Informes por módulo
        </TabsTrigger>
        <TabsTrigger value="regional" className="gap-1.5">
          <BarChart3 className="w-4 h-4" /> Informe regional
        </TabsTrigger>
        <TabsTrigger value="evaluadores" className="gap-1.5">
          <UserCheck className="w-4 h-4" /> Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="evaluadores">
        <AdminEvaluadoresTab />
      </TabsContent>

      <TabsContent value="informes">
        <AdminRubricaModuleReport />
      </TabsContent>

      <TabsContent value="resultados">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 flex items-center gap-2 min-w-[200px]">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cédula o nombre…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas las regiones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las regiones</SelectItem>
                {regiones.map(r => (
                  <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredCedulas.length} directivos evaluados</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" /> Directivos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Cargando…</p>
                ) : filteredCedulas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay evaluaciones registradas.</p>
                ) : (
                  filteredCedulas.map(ced => {
                    const evalCount = evaluaciones.filter(e => e.directivo_cedula === ced).length;
                    return (
                      <button
                        key={ced}
                        onClick={() => setSelectedCedula(ced)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                          selectedCedula === ced ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">
                          {cedulaToName[ced] ? `${cedulaToName[ced]}` : `CC: ${ced}`}
                        </span>
                        <Badge variant="outline" className="text-xs">{evalCount} ítems</Badge>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Detalle de evaluación
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCedula ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Seleccione un directivo para ver sus evaluaciones.</p>
                ) : (
                  <div className="space-y-4">
                    {modules.map(m => {
                      const modItems = items.filter(i => i.module_id === m.id);
                      const modEvals = selectedEvals.filter(e => modItems.some(i => i.id === e.item_id));
                      if (modEvals.length === 0) return null;

                      return (
                        <div key={m.id}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5" />
                              Módulo {m.module_number}: {m.title}
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-xs h-7"
                              onClick={() => handleDeleteAutoeval(m.id, m.module_number)}
                              disabled={!!deletingAutoeval}
                            >
                              {deletingAutoeval === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Borrar evaluaciones
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                              <TableHead className="text-xs">Ítem</TableHead>
                                <TableHead className="text-xs">Directivo</TableHead>
                                <TableHead className="text-xs">Equipo</TableHead>
                                <TableHead className="text-xs">Acordado</TableHead>
                                <TableHead className="text-xs">Seguimiento</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {modItems.map(item => {
                                const ev = modEvals.find(e => e.item_id === item.id);
                                if (!ev) return null;
                                const lastSeg = seguimientos.find(s => s.item_id === item.id && s.directivo_cedula === selectedCedula);
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs">
                                      <Badge variant="outline" className="text-[10px] mr-1">{item.item_type}</Badge>
                                      {item.item_label}
                                    </TableCell>
                                    <TableCell><NivelBadge nivel={ev.directivo_nivel} /></TableCell>
                                    <TableCell><NivelBadge nivel={ev.equipo_nivel} /></TableCell>
                                    <TableCell><NivelBadge nivel={ev.acordado_nivel} /></TableCell>
                                    <TableCell><NivelBadge nivel={lastSeg?.nivel ?? null} /></TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="regional">
        <AdminRubricaRegionalReport />
      </TabsContent>
    </Tabs>
  );
}
