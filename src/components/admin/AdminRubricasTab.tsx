import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, BookOpen, Users, ClipboardList, UserCheck } from "lucide-react";
import AdminEvaluadoresTab from "./AdminEvaluadoresTab";

interface Evaluacion {
  id: string;
  item_id: string;
  directivo_cedula: string;
  directivo_nivel: string | null;
  equipo_nivel: string | null;
  acordado_nivel: string | null;
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
  const [searchCedula, setSearchCedula] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCedula, setSelectedCedula] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: mods }, { data: its }, { data: evals }] = await Promise.all([
      supabase.from("rubrica_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_items").select("*").order("sort_order", { ascending: true }),
      supabase.from("rubrica_evaluaciones").select("*").order("created_at", { ascending: false }),
    ]);
    if (mods) setModules(mods);
    if (its) setItems(its);
    if (evals) setEvaluaciones(evals);
    setLoading(false);
  };

  const uniqueCedulas = [...new Set(evaluaciones.map(e => e.directivo_cedula))];
  const filteredCedulas = searchCedula
    ? uniqueCedulas.filter(c => c.includes(searchCedula))
    : uniqueCedulas;

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
    <Tabs defaultValue="evaluadores">
      <TabsList className="mb-4">
        <TabsTrigger value="evaluadores" className="gap-1.5">
          <UserCheck className="w-4 h-4" /> Evaluadores y asignaciones
        </TabsTrigger>
        <TabsTrigger value="resultados" className="gap-1.5">
          <ClipboardList className="w-4 h-4" /> Resultados
        </TabsTrigger>
      </TabsList>

      <TabsContent value="evaluadores">
        <AdminEvaluadoresTab />
      </TabsContent>

      <TabsContent value="resultados">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cédula…"
                value={searchCedula}
                onChange={e => setSearchCedula(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Badge variant="secondary">{uniqueCedulas.length} directivos evaluados</Badge>
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
                        <span>CC: {ced}</span>
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
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5" />
                            Módulo {m.module_number}: {m.title}
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Ítem</TableHead>
                                <TableHead className="text-xs">Directivo</TableHead>
                                <TableHead className="text-xs">Equipo</TableHead>
                                <TableHead className="text-xs">Acordado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {modItems.map(item => {
                                const ev = modEvals.find(e => e.item_id === item.id);
                                if (!ev) return null;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs">
                                      <Badge variant="outline" className="text-[10px] mr-1">{item.item_type}</Badge>
                                      {item.item_label}
                                    </TableCell>
                                    <TableCell><NivelBadge nivel={ev.directivo_nivel} /></TableCell>
                                    <TableCell><NivelBadge nivel={ev.equipo_nivel} /></TableCell>
                                    <TableCell><NivelBadge nivel={ev.acordado_nivel} /></TableCell>
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
    </Tabs>
  );
}
