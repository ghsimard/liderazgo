import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, AlertTriangle, CheckCircle2, Search, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import {
  loadPdfLogos,
  drawCoverLogos,
  drawPageHeaderLogos,
  drawFooterCosmo,
  CONTENT_START_Y,
  CONTENT_BOTTOM_MARGIN,
  type LoadedLogos,
} from "@/utils/pdfLogoHelper";
import { useAppImages } from "@/hooks/useAppImages";

/** Required counts per tipo_formulario */
const ROLE_LIMITS: Record<string, { min: number; max: number; label: string }> = {
  autoevaluacion: { min: 1, max: 1, label: "Autoevaluación" },
  directivo: { min: 2, max: 2, label: "Directivo Par" },
  docente: { min: 2, max: 2, label: "Docente" },
  administrativo: { min: 2, max: 2, label: "Administrativo" },
  estudiante: { min: 1, max: 1, label: "Estudiante" },
  acudiente: { min: 1, max: 1, label: "Acudiente" },
};

const ROLE_KEYS = Object.keys(ROLE_LIMITS);

interface DirectivoRow {
  nombre: string;
  cedula: string;
  institucion: string;
  region: string;
  counts: Record<string, number>;
  incomplete: boolean;
}

interface AdminEncuestaMonitorProps {
  fase?: "inicial" | "final";
}

export default function AdminEncuestaMonitor({ fase = "inicial" }: AdminEncuestaMonitorProps) {
  const [rows, setRows] = useState<DirectivoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "incomplete" | "complete">("all");
  const [regionFilter, setRegionFilter] = useState<string>("__all__");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { toast } = useToast();
  const { images: appImages } = useAppImages();

  const regions = useMemo(() => {
    const set = new Set(rows.map((r) => r.region).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  useEffect(() => {
    loadData();
  }, [fase]);

  const loadData = async () => {
    setLoading(true);

    const { data: fichas } = await supabase
      .from("fichas_rlt")
      .select("nombres_apellidos, nombre_ie, region, numero_cedula")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"])
      .order("nombres_apellidos");

    const { data: encuestas } = await supabase
      .from("encuestas_360")
      .select("tipo_formulario, institucion_educativa, nombre_directivo, nombre_completo, cedula_directivo, cedula")
      .eq("fase", fase);

    const directivoList = (fichas ?? []).map((f) => ({
      nombre: f.nombres_apellidos,
      cedula: f.numero_cedula || "",
      institucion: f.nombre_ie,
      region: f.region,
    }));

    const result: DirectivoRow[] = directivoList.map((d) => {
      const counts: Record<string, number> = {};
      ROLE_KEYS.forEach((k) => { counts[k] = 0; });

      (encuestas ?? []).forEach((e) => {
        if (e.tipo_formulario === "autoevaluacion") {
          if (e.cedula && e.cedula === d.cedula) {
            counts.autoevaluacion++;
          }
        } else {
          if (e.cedula_directivo && e.cedula_directivo === d.cedula) {
            counts[e.tipo_formulario] = (counts[e.tipo_formulario] || 0) + 1;
          }
        }
      });

      const incomplete = ROLE_KEYS.some((k) => counts[k] < ROLE_LIMITS[k].min);
      return { ...d, counts, incomplete };
    });

    setRows(result);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (regionFilter !== "__all__") list = list.filter((r) => r.region === regionFilter);
    if (filterMode === "incomplete") list = list.filter((r) => r.incomplete);
    if (filterMode === "complete") list = list.filter((r) => !r.incomplete);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.nombre.toLowerCase().includes(q) || r.institucion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filterMode, search, regionFilter]);

  const incompleteCount = useMemo(() => {
    let list = rows;
    if (regionFilter !== "__all__") list = list.filter((r) => r.region === regionFilter);
    return list.filter((r) => r.incomplete).length;
  }, [rows, regionFilter]);

  const totalForRegion = useMemo(() => {
    if (regionFilter === "__all__") return rows.length;
    return rows.filter((r) => r.region === regionFilter).length;
  }, [rows, regionFilter]);

  // ── PDF Generation ──
  const generatePdf = async () => {
    if (filtered.length === 0) {
      toast({ title: "Sin datos", description: "No hay datos para generar el PDF.", variant: "destructive" });
      return;
    }
    setGeneratingPdf(true);
    try {
      const logoRLT = appImages["logo_rlt_white"] || "";
      const logoCLT = appImages["logo_clt"] || "";
      const logoCosmo = appImages["logo_cosmo"] || "";
      let showRlt = true;
      let showClt = true;
      if (regionFilter !== "__all__") {
        const { data: regData } = await supabase
          .from("regiones")
          .select("mostrar_logo_rlt, mostrar_logo_clt")
          .eq("nombre", regionFilter)
          .single();
        if (regData) {
          showRlt = regData.mostrar_logo_rlt;
          showClt = regData.mostrar_logo_clt;
        }
      }
      const logos: LoadedLogos = await loadPdfLogos({ logoRLT, logoCLT, logoCosmo }, showRlt, showClt);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = 0;

      const addHeaderFooter = () => {
        drawPageHeaderLogos(doc, logos, { margin, pageW });
        drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum: doc.getNumberOfPages() });
      };

      const checkPageBreak = (needed: number): boolean => {
        if (y + needed > pageH - CONTENT_BOTTOM_MARGIN) {
          addHeaderFooter();
          doc.addPage();
          y = CONTENT_START_Y;
          return true;
        }
        return false;
      };

      // ── Cover ──
      y = 30;
      y = drawCoverLogos(doc, logos, { y, pageW, targetH: 28 }) + 15;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const faseLabel = fase === "inicial" ? "Entrada" : "Salida";
      doc.text(`ESTADO DE RECOLECCIÓN - ${faseLabel.toUpperCase()}`, pageW / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text("Encuesta 360°", pageW / 2, y, { align: "center" });
      y += 10;

      if (regionFilter !== "__all__") {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(`Región: ${regionFilter}`, pageW / 2, y, { align: "center" });
        y += 8;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, y, { align: "center" });
      y += 6;

      const regionInc = filtered.filter((r) => r.incomplete).length;
      const regionComp = filtered.length - regionInc;
      doc.text(`Total: ${filtered.length} directivos  |  Completos: ${regionComp}  |  Incompletos: ${regionInc}`, pageW / 2, y, { align: "center" });

      drawFooterCosmo(doc, logos, { margin, pageW, pageH, pageNum: 1 });

      // ── Table pages ──
      doc.addPage();
      y = CONTENT_START_Y;

      // Column widths
      const colRole = 12;
      const colStatus = 14;
      const usedByRolesAndStatus = colRole * ROLE_KEYS.length + colStatus;
      const remaining = contentW - usedByRolesAndStatus;
      const colName = remaining * 0.45;
      const colInst = remaining * 0.55;
      const rowH = 7;

      // Draw table header
      const drawTableHeader = () => {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, contentW, rowH, "F");
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text("Par (Directivo)", margin + 2, y + 5);
        doc.text("Institución", margin + colName + 2, y + 5);
        let xPos = margin + colName + colInst;
        ROLE_KEYS.forEach((k) => {
          const lbl = ROLE_LIMITS[k].label;
          const short = lbl.length > 8 ? lbl.substring(0, 7) + "." : lbl;
          doc.text(short, xPos + colRole / 2, y + 5, { align: "center" });
          xPos += colRole;
        });
        doc.text("Estado", margin + contentW - colStatus / 2, y + 5, { align: "center" });
        y += rowH;
      };

      drawTableHeader();

      for (const r of filtered) {
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);

        // Wrap name to fit column
        const nameLines = doc.splitTextToSize(r.nombre, colName - 3);
        const instLines = doc.splitTextToSize(r.institucion, colInst - 3);
        const maxLines = Math.max(nameLines.length, instLines.length);
        const actualRowH = Math.max(rowH, maxLines * 3.2 + 2);

        // Re-check page break with actual height
        if (y + actualRowH > pageH - CONTENT_BOTTOM_MARGIN) {
          addHeaderFooter();
          doc.addPage();
          y = CONTENT_START_Y;
          drawTableHeader();
        }

        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, margin + contentW, y);

        if (r.incomplete) {
          doc.setFillColor(255, 250, 245);
          doc.rect(margin, y, contentW, actualRowH, "F");
        }

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        doc.text(nameLines, margin + 2, y + 3.5);

        doc.setTextColor(80, 80, 80);
        doc.text(instLines, margin + colName + 2, y + 3.5);

        let xPos = margin + colName + colInst;
        const midY = y + actualRowH / 2 + 1.5;
        ROLE_KEYS.forEach((k) => {
          const count = r.counts[k] || 0;
          const min = ROLE_LIMITS[k].min;
          const ok = count >= min;
          if (ok) {
            doc.setTextColor(5, 150, 105);
          } else if (count > 0) {
            doc.setTextColor(217, 119, 6);
          } else {
            doc.setTextColor(220, 38, 38);
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text(`${count}/${min}`, xPos + colRole / 2, midY, { align: "center" });
          xPos += colRole;
        });

        // Status
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        if (r.incomplete) {
          doc.setTextColor(217, 119, 6);
          doc.text("Pend.", margin + contentW - colStatus / 2, midY, { align: "center" });
        } else {
          doc.setTextColor(5, 150, 105);
          doc.text("OK", margin + contentW - colStatus / 2, midY, { align: "center" });
        }

        y += actualRowH;
      }


      addHeaderFooter();

      const regionSlug = regionFilter !== "__all__" ? `_${regionFilter.replace(/\s+/g, "_")}` : "";
      doc.save(`Estado_Recoleccion_360_${faseLabel}${regionSlug}_${new Date().toISOString().slice(0, 10)}.pdf`);

      toast({ title: "PDF generado", description: "El archivo se descargó correctamente." });
    } catch (err) {
      console.error("Error generating PDF:", err);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Estado de recolección por par
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={incompleteCount > 0 ? "destructive" : "secondary"}>
              {incompleteCount} incompleto(s) / {totalForRegion} total
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={generatePdf}
              disabled={generatingPdf || filtered.length === 0}
              className="h-8 gap-1.5"
            >
              {generatingPdf ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Región" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas las regiones</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar par o IE…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incomplete">Solo incompletos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="complete">Solo completos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Par</TableHead>
                <TableHead className="min-w-[150px]">Institución</TableHead>
                {ROLE_KEYS.map((k) => (
                  <TableHead key={k} className="text-center text-xs whitespace-nowrap">
                    {ROLE_LIMITS[k].label}
                    <div className="text-[10px] text-muted-foreground font-normal">
                      min {ROLE_LIMITS[k].min}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={ROLE_KEYS.length + 3} className="text-center text-muted-foreground py-8">
                    {filterMode === "incomplete"
                      ? "✅ Todos los pares tienen el mínimo requerido"
                      : "Sin resultados"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.nombre + r.institucion}>
                    <TableCell className="font-medium text-sm">{r.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.institucion}</TableCell>
                    {ROLE_KEYS.map((k) => {
                      const count = r.counts[k] || 0;
                      const min = ROLE_LIMITS[k].min;
                      const ok = count >= min;
                      return (
                        <TableCell key={k} className="text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                              ok
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : count > 0
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {count}/{min}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      {r.incomplete ? (
                        <AlertTriangle className="w-4 h-4 text-orange-500 mx-auto" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} par(es) mostrado(s)
        </p>
      </CardContent>
    </Card>
  );
}
