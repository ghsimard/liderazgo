import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  FileDown,
  FileSpreadsheet,
  FileArchive,
  ChevronDown,
  Search,
  RefreshCw,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/apiFetch";
import { useAppImages } from "@/hooks/useAppImages";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { exportAdhocReportCsv } from "@/utils/adhocReportCsvExporter";
import { generateAdhocReportPdf } from "@/utils/adhocReportPdfGenerator";
import { exportAdhocReportZip } from "@/utils/adhocReportZipExporter";
import { logActivity } from "@/utils/activityLogger";

interface AdhocResponse {
  sql?: string;
  explanation?: string;
  columns?: string[];
  rows?: Record<string, unknown>[];
  row_count?: number;
  truncated?: boolean;
  needs_clarification?: boolean;
  clarification_question?: string;
  error?: string;
  sql_propuesto?: string;
}

const EXAMPLE_QUESTIONS = [
  "Cuántos directivos hay en Quibdó",
  "Directivos de 45 años o más con enfermedades reportadas",
  "Promedio de evaluaciones de rúbrica del módulo 2 por región",
  "Número de respuestas de satisfacción Intensivo por módulo",
  "Directivos sin ficha completa",
];

export default function AdminAdHocReportTab() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdhocResponse | null>(null);
  const [search, setSearch] = useState("");
  const [refreshingSchema, setRefreshingSchema] = useState(false);
  const { toast } = useToast();
  const { images } = useAppImages();
  const { userName, userId } = useAdminAuth();

  const filteredRows = useMemo(() => {
    if (!result?.rows) return [];
    if (!search.trim()) return result.rows;
    const needle = search.toLowerCase();
    return result.rows.filter((r) =>
      Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(needle))
    );
  }, [result, search]);

  const handleSubmit = async (q?: string) => {
    const finalQ = (q ?? question).trim();
    if (finalQ.length < 5) {
      toast({
        title: "Pregunta demasiado corta",
        description: "Escribe una pregunta con al menos 5 caracteres.",
        variant: "destructive",
      });
      return;
    }
    setQuestion(finalQ);
    setLoading(true);
    setResult(null);
    setSearch("");

    try {
      const { data, error, status } = await apiFetch<AdhocResponse>("/api/adhoc-report", {
        method: "POST",
        body: { question: finalQ },
      });

      if (error || !data) {
        toast({
          title: status === 400 ? "Consulta rechazada" : "Error",
          description: error || "Error desconocido.",
          variant: "destructive",
        });
        setResult({ error: error || "Error desconocido." });
      } else {
        setResult(data);
        if (data.needs_clarification) {
          toast({
            title: "Se necesita aclaración",
            description: data.clarification_question || "Reformula tu pregunta.",
          });
        } else if (data.rows) {
          toast({
            title: "Reporte generado",
            description: `${data.row_count} fila(s) encontradas.`,
          });
          // Fire-and-forget activity log
          if (userId) {
            logActivity(
              userId,
              "page_view",
              `adhoc_report:${data.row_count}filas:${finalQ.slice(0, 80)}`,
              "/admin?tab=reportes-adhoc"
            );
          }
        }
      }
    } catch (err: any) {
      toast({ title: "Error de red", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSchema = async () => {
    setRefreshingSchema(true);
    try {
      const { error } = await apiFetch("/api/adhoc-report/refresh-schema", { method: "POST" });
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        toast({ title: "Esquema actualizado", description: "Próxima consulta usará el esquema fresco." });
      }
    } finally {
      setRefreshingSchema(false);
    }
  };

  const canExport = !!result?.rows && result.rows.length > 0;

  const handleExportCsv = () => {
    if (!result?.columns || !result?.rows) return;
    exportAdhocReportCsv(result.columns, result.rows);
  };

  const handleExportPdf = async () => {
    if (!result?.columns || !result?.rows || !result?.sql) return;
    try {
      await generateAdhocReportPdf({
        question,
        sql: result.sql,
        explanation: result.explanation,
        columns: result.columns,
        rows: result.rows,
        logoRLT: images.logo_rlt_noletters || images.logo_rlt_white,
        generatedBy: userName,
      });
    } catch (err: any) {
      toast({ title: "Error al generar PDF", description: err.message, variant: "destructive" });
    }
  };

  const handleExportZip = async () => {
    if (!result?.columns || !result?.rows || !result?.sql) return;
    try {
      await exportAdhocReportZip({
        question,
        sql: result.sql,
        explanation: result.explanation,
        columns: result.columns,
        rows: result.rows,
        generatedBy: userName,
      });
    } catch (err: any) {
      toast({ title: "Error al generar ZIP", description: err.message, variant: "destructive" });
    }
  };

  const suggestZip = !!result?.rows && result.rows.length > 500;

  return (
    <div className="space-y-4">
      {/* Intro card */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Reportes Ad Hoc — Lenguaje natural</p>
              <p className="text-xs text-muted-foreground mt-1">
                Escribe tu pregunta en español. El asistente genera una consulta SQL de solo lectura,
                la ejecuta sobre la base de datos y muestra los resultados.
              </p>
            </div>
          </div>

          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej: cuántos directivos hay en Quibdó con enfermedades reportadas"
            rows={3}
            maxLength={500}
            className="text-sm"
            disabled={loading}
          />

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSubmit(q)}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => handleSubmit()} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generar reporte
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshSchema}
              disabled={refreshingSchema || loading}
              className="gap-1.5"
              title="Forzar relectura del esquema de la base de datos"
            >
              {refreshingSchema ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Refrescar esquema
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
            <span>
              Solo lectura · máx. 1000 filas · timeout 15s. La IA puede equivocarse —
              <strong className="text-amber-800"> verifica siempre el SQL generado</strong> antes de citar las cifras.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Clarification */}
      {result?.needs_clarification && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Se necesita aclaración</p>
              <p className="text-sm text-muted-foreground mt-1">{result.clarification_question}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {result?.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Consulta rechazada</p>
                <p className="text-sm text-muted-foreground mt-1">{result.error}</p>
              </div>
            </div>
            {result.sql_propuesto && (
              <pre className="text-[11px] font-mono bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {result.sql_propuesto}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* SQL block (collapsible) */}
      {result?.sql && (
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger asChild>
              <button className="w-full text-left p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">SQL generado</Badge>
                  {result.explanation && (
                    <span className="text-xs text-muted-foreground line-clamp-1">{result.explanation}</span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-2">
                {result.explanation && (
                  <p className="text-xs text-muted-foreground italic">{result.explanation}</p>
                )}
                <pre className="text-[11px] font-mono bg-muted/40 border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                  {result.sql}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Results */}
      {result?.rows && result.columns && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{result.row_count} fila(s)</Badge>
                {result.truncated && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    Truncado a 1000
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-8 pl-7 text-xs w-48"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={!canExport}
                  className="gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={!canExport}
                  className="gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" /> PDF
                </Button>
                <Button
                  variant={suggestZip ? "default" : "outline"}
                  size="sm"
                  onClick={handleExportZip}
                  disabled={!canExport}
                  className="gap-1.5"
                  title={suggestZip ? "Recomendado para volúmenes grandes" : "Descargar CSV + SQL + metadatos en un ZIP"}
                >
                  <FileArchive className="w-3.5 h-3.5" /> ZIP
                  {suggestZip && (
                    <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">
                      Recomendado
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {filteredRows.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {result.row_count === 0
                  ? "Sin resultados. Reformula la pregunta."
                  : "Ningún resultado coincide con la búsqueda."}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh] border rounded">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur">
                    <TableRow>
                      {result.columns.map((c) => (
                        <TableHead key={c} className="text-xs font-semibold whitespace-nowrap">
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.slice(0, 500).map((row, i) => (
                      <TableRow key={i}>
                        {result.columns!.map((c) => (
                          <TableCell key={c} className="text-xs align-top">
                            {formatCell(row[c])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredRows.length > 500 && (
                  <p className="text-[11px] text-muted-foreground text-center py-2">
                    Mostrando 500 de {filteredRows.length}. Exporta a CSV/PDF para ver todas.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
