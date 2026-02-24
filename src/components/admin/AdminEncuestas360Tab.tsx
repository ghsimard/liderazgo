import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, School, ChevronDown, ChevronRight, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Encuesta {
  id: string;
  tipo_formulario: string;
  nombre_completo: string | null;
  nombre_directivo: string | null;
  institucion_educativa: string;
  cargo_directivo: string;
  dias_contacto: string | null;
  created_at: string;
}

interface InstitutionGroup {
  institucion: string;
  encuestas: Encuesta[];
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
  directivo: "Directivo",
  administrativo: "Administrativo",
  estudiante: "Estudiante",
  acudiente: "Acudiente",
};

export default function AdminEncuestas360Tab() {
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("encuestas_360")
      .select("id, tipo_formulario, nombre_completo, nombre_directivo, institucion_educativa, cargo_directivo, dias_contacto, created_at")
      .order("institucion_educativa")
      .order("created_at", { ascending: false });

    const byInst: Record<string, Encuesta[]> = {};
    (data ?? []).forEach((e) => {
      if (!byInst[e.institucion_educativa]) byInst[e.institucion_educativa] = [];
      byInst[e.institucion_educativa].push(e);
    });

    const grouped = Object.entries(byInst)
      .map(([institucion, encuestas]) => ({ institucion, encuestas }))
      .sort((a, b) => a.institucion.localeCompare(b.institucion));

    setGroups(grouped);
    setLoading(false);
  };

  const toggleExpand = (inst: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) next.delete(inst);
      else next.add(inst);
      return next;
    });
  };

  const filtered = search.trim()
    ? groups.filter((g) => g.institucion.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const totalEncuestas = groups.reduce((sum, g) => sum + g.encuestas.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {totalEncuestas} encuesta(s) en {groups.length} institución(es)
        </p>
        <Input
          placeholder="Buscar institución…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((g) => {
          const isOpen = expanded.has(g.institucion);
          const typeCounts: Record<string, number> = {};
          g.encuestas.forEach((e) => {
            typeCounts[e.tipo_formulario] = (typeCounts[e.tipo_formulario] || 0) + 1;
          });

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
                    <CardTitle className="text-sm font-medium truncate">{g.institucion}</CardTitle>
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
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="px-3 py-2 font-medium">Tipo</th>
                          <th className="px-3 py-2 font-medium">Evaluador</th>
                          <th className="px-3 py-2 font-medium">Directivo evaluado</th>
                          <th className="px-3 py-2 font-medium">Cargo</th>
                          <th className="px-3 py-2 font-medium">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.encuestas.map((e) => (
                          <tr key={e.id} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className={`text-xs ${FORM_TYPE_COLORS[e.tipo_formulario] ?? ""}`}>
                                {FORM_TYPE_LABELS[e.tipo_formulario] ?? e.tipo_formulario}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {e.nombre_completo || "—"}
                            </td>
                            <td className="px-3 py-2">
                              {e.tipo_formulario === "autoevaluacion"
                                ? e.nombre_completo || "—"
                                : e.nombre_directivo || "—"}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{e.cargo_directivo}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {new Date(e.created_at).toLocaleDateString("es-CO")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No se encontraron instituciones.</p>
        )}
      </div>
    </div>
  );
}
