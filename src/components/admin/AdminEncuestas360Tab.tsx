import { useState, useEffect } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, School, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


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
  directivo: "Directivo",
  administrativo: "Administrativo",
  estudiante: "Estudiante",
  acudiente: "Acudiente",
};

export default function AdminEncuestas360Tab() {
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

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("encuestas_360")
      .select("id, tipo_formulario, nombre_completo, nombre_directivo, institucion_educativa, cargo_directivo, dias_contacto, created_at, respuestas")
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
                              <th className="px-3 py-1.5 font-medium w-10"></th>
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
              <p><strong>Directivo:</strong> {deleteTarget.tipo_formulario === "autoevaluacion" ? deleteTarget.nombre_completo : deleteTarget.nombre_directivo}</p>
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
                <p><strong>Directivo evaluado:</strong> {selectedEncuesta.tipo_formulario === "autoevaluacion" ? selectedEncuesta.nombre_completo : selectedEncuesta.nombre_directivo}</p>
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
  );
}
