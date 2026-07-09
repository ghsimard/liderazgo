import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/dbClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users, BookOpen, GraduationCap, Filter, Download, FileText, FlaskConical, Layers } from "lucide-react";

async function fetchAllRows<T = any>(table: string, columns: string): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all = all.concat(data as T[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
import { ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT, FREQUENCY_OPTIONS, JORNADA_OPTIONS, GRADOS_COMPLETOS, GRADOS_ESTUDIANTE, ANOS_OPTIONS, FUENTES_RETROALIMENTACION, type LikertSection } from "@/data/ambienteEscolarData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generarAmbienteEscolarReportPDF, type AmbienteReportData } from "@/utils/ambienteEscolarReportPdfGenerator";
import { useAppImages } from "@/hooks/useAppImages";
import { getPdfLogoSources } from "@/utils/pdfLogoHelper";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";

const FORM_TYPES = [
  { key: "docentes", label: "Docentes", icon: BookOpen, likert: DOCENTES_LIKERT },
  { key: "estudiantes", label: "Estudiantes", icon: GraduationCap, likert: ESTUDIANTES_LIKERT },
  { key: "acudientes", label: "Acudientes", icon: Users, likert: ACUDIENTES_LIKERT },
] as const;

const FREQ_COLORS: Record<string, string> = {
  "Siempre": "hsl(142, 71%, 45%)",
  "Casi siempre": "hsl(142, 50%, 60%)",
  "A veces": "hsl(45, 93%, 47%)",
  "Casi nunca": "hsl(25, 95%, 53%)",
  "Nunca": "hsl(0, 84%, 60%)",
};

interface RawSubmission {
  institucion_educativa: string;
  tipo_formulario: string;
  respuestas: Record<string, string>;
  cohorte_id: string | null;
  fase: string | null;
}

type FaseKey = "inicial" | "evolucion" | "ambas";
const FASE_DB: Record<Exclude<FaseKey, "ambas">, string> = {
  inicial: "linea_base",
  evolucion: "cierre",
};
const FASE_LABEL: Record<Exclude<FaseKey, "ambas">, string> = {
  inicial: "Inicial",
  evolucion: "Evolución",
};


interface FichaInfo {
  nombre_ie: string;
  region: string;
  entidad_territorial: string | null;
}

interface RegionInfo {
  nombre: string;
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

function computeFrequencies(
  submissions: RawSubmission[],
  sections: LikertSection[]
): { section: string; items: { id: string; text: string; freqs: Record<string, number>; total: number }[] }[] {
  return sections.map((sec) => ({
    section: sec.title,
    items: sec.items.map((item) => {
      const freqs: Record<string, number> = {};
      FREQUENCY_OPTIONS.forEach((f) => (freqs[f] = 0));
      let total = 0;
      for (const sub of submissions) {
        const val = sub.respuestas?.[item.id];
        if (val && val in freqs) {
          freqs[val]++;
          total++;
        }
      }
      return { id: item.id, text: item.text, freqs, total };
    }),
  }));
}

function FrequencyTable({ data }: { data: ReturnType<typeof computeFrequencies> }) {
  return (
    <div className="space-y-6">
      {data.map((sec) => (
        <div key={sec.section} className="space-y-2">
          <h4 className="font-semibold text-sm">{sec.section}</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Ítem</TableHead>
                <TableHead className="text-center">N</TableHead>
                {FREQUENCY_OPTIONS.map((f) => (
                  <TableHead key={f} className="text-center text-xs">{f}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sec.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.text}</TableCell>
                  <TableCell className="text-center text-xs font-medium">{item.total}</TableCell>
                  {FREQUENCY_OPTIONS.map((f) => {
                    const pct = item.total > 0 ? Math.round((item.freqs[f] / item.total) * 100) : 0;
                    return (
                      <TableCell key={f} className="text-center text-xs">
                        {item.total > 0 ? `${pct}%` : "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

function FrequencyChart({ data }: { data: ReturnType<typeof computeFrequencies> }) {
  const chartData = data.map((sec) => {
    const totals: Record<string, number> = {};
    FREQUENCY_OPTIONS.forEach((f) => (totals[f] = 0));
    let grand = 0;
    sec.items.forEach((item) => {
      FREQUENCY_OPTIONS.forEach((f) => (totals[f] += item.freqs[f]));
      grand += item.total;
    });
    const row: Record<string, string | number> = { section: sec.section };
    FREQUENCY_OPTIONS.forEach((f) => {
      row[f] = grand > 0 ? Math.round((totals[f] / grand) * 100) : 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="section" width={110} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `${v}%`} />
        <Legend />
        {FREQUENCY_OPTIONS.map((f) => (
          <Bar key={f} dataKey={f} stackId="a" fill={FREQ_COLORS[f]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdminAmbienteStatsTab() {
  const { images } = useAppImages();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<RawSubmission[]>([]);
  const [fichas, setFichas] = useState<FichaInfo[]>([]);
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [cohortes, setCohortes] = useState<{ id: string; year: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [selEntidades, setSelEntidades] = useState<string[]>([]);
  const [selCohortes, setSelCohortes] = useState<string[]>([]);
  const [selectedIEs, setSelectedIEs] = useState<string[]>([]);
  const [selFase, setSelFase] = useState<FaseKey>("ambas");
  const [selCohorte, setSelCohorte] = useState<string>("");

  // PDF state
  const [generating, setGenerating] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [subData, fichaData, regRes, cohortesRes, cohorteInstRes, rectores2025Res] = await Promise.all([
        fetchAllRows<RawSubmission>("encuestas_ambiente_escolar", "institucion_educativa, tipo_formulario, respuestas, cohorte_id, fase"),

        fetchAllRows<FichaInfo>("fichas_rlt", "nombre_ie, region, entidad_territorial"),
        supabase.from("regiones").select("nombre, mostrar_logo_rlt, mostrar_logo_clt"),
        supabase.from("ae_cohortes").select("id, year, nombre, entidad_territorial"),
        supabase.from("v_ae_instituciones_por_cohorte").select("cohorte_id, institucion_educativa"),
        supabase.from("ae_rectores_2025").select("nombre_de_la_institucion_educativa_en_la_actualmente_desempena_, entidad_territorial"),
      ]);

      // Only keep submissions belonging to any known cohorte
      const currentCohortes = (cohortesRes.data || []) as { id: string; year: number; nombre: string; entidad_territorial: string | null }[];
      const currentCohorteIds = new Set(currentCohortes.map((c) => c.id));
      const filteredSubs = subData.filter(s => s.cohorte_id && currentCohorteIds.has(s.cohorte_id));

      // Enrich fichas with synthetic entries for 2025 cohortes (Medellín/Itagüí/Rionegro)
      // whose directivos live in ae_rectores_2025, not fichas_rlt.
      const fichaMap = new Map<string, FichaInfo>();
      for (const f of fichaData) fichaMap.set(f.nombre_ie, f);

      const cohorteById = new Map(currentCohortes.map((c) => [c.id, c]));
      const cohorteInst = (cohorteInstRes.data || []) as { cohorte_id: string; institucion_educativa: string }[];
      const etByIe2025 = new Map<string, string>();
      for (const r of (rectores2025Res.data || []) as any[]) {
        const ie = r?.nombre_de_la_institucion_educativa_en_la_actualmente_desempena_;
        if (ie && r?.entidad_territorial) etByIe2025.set(ie, r.entidad_territorial);
      }
      for (const ci of cohorteInst) {
        if (fichaMap.has(ci.institucion_educativa)) continue;
        const co = cohorteById.get(ci.cohorte_id);
        if (!co) continue;
        fichaMap.set(ci.institucion_educativa, {
          nombre_ie: ci.institucion_educativa,
          region: co.nombre, // ex: "Medellín 2025"
          entidad_territorial: etByIe2025.get(ci.institucion_educativa) || co.entidad_territorial,
        });
      }

      setSubmissions(filteredSubs);
      setFichas(Array.from(fichaMap.values()));
      setRegions((regRes.data || []) as RegionInfo[]);
      setCohortes(currentCohortes.sort((a, b) => b.year - a.year));
      setLoading(false);
    }
    load();
  }, []);

  // Clear downstream filters
  useEffect(() => { setSelEntidades([]); setSelectedIEs([]); }, [selRegions]);
  useEffect(() => { setSelectedIEs([]); }, [selEntidades]);
  useEffect(() => { setSelectedIEs([]); }, [selCohortes]);

  // Build institution list from submissions + fichas, filtered by region/entidad/cohortes
  const institutionOptions = useMemo(() => {
    let subsPool = submissions;
    if (selCohortes.length > 0) {
      subsPool = subsPool.filter((s) => s.cohorte_id && selCohortes.includes(s.cohorte_id));
    }
    const ieFromSubs = new Set(subsPool.map((s) => s.institucion_educativa));

    const ieInfo = new Map<string, FichaInfo>();
    for (const f of fichas) ieInfo.set(f.nombre_ie, f);

    let ieList = Array.from(ieFromSubs);

    if (selRegions.length > 0) {
      ieList = ieList.filter((ie) => {
        const info = ieInfo.get(ie);
        return info && selRegions.includes(info.region);
      });
    }
    if (selEntidades.length > 0) {
      ieList = ieList.filter((ie) => {
        const info = ieInfo.get(ie);
        return info && info.entidad_territorial && selEntidades.includes(info.entidad_territorial);
      });
    }

    return ieList.sort();
  }, [submissions, fichas, selRegions, selEntidades, selCohortes]);

  const regionOptions = useMemo(() => {
    const vals = [...new Set(fichas.map((f) => f.region).filter(Boolean))].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [fichas]);

  const entidadOptions = useMemo(() => {
    let pool = fichas;
    if (selRegions.length > 0) pool = pool.filter((f) => selRegions.includes(f.region));
    const vals = [...new Set(pool.map((f) => f.entidad_territorial).filter(Boolean) as string[])].sort();
    return vals.map((v) => ({ value: v, label: v }));
  }, [fichas, selRegions]);

  const cohorteOptions = useMemo(
    () => cohortes.map((c) => ({ value: c.id, label: c.nombre })),
    [cohortes]
  );

  const ieOptions = useMemo(
    () => institutionOptions.map((ie) => ({ value: ie, label: ie })),
    [institutionOptions]
  );

  // Base filtered (region/entidad/cohortes/IE) — WITHOUT fase filter, used to compute per-fase views.
  const baseFiltered = useMemo(() => {
    let out = submissions;
    if (selCohortes.length > 0) {
      out = out.filter((s) => s.cohorte_id && selCohortes.includes(s.cohorte_id));
    }
    if (selectedIEs.length > 0) {
      out = out.filter((s) => selectedIEs.includes(s.institucion_educativa));
    } else {
      // Restrict to institutionOptions if any region/entidad filter is applied
      if (selRegions.length > 0 || selEntidades.length > 0) {
        out = out.filter((s) => institutionOptions.includes(s.institucion_educativa));
      }
    }
    return out;
  }, [submissions, selCohortes, selectedIEs, selRegions, selEntidades, institutionOptions]);

  const filteredInicial = useMemo(
    () => baseFiltered.filter((s) => s.fase === FASE_DB.inicial),
    [baseFiltered]
  );
  const filteredEvolucion = useMemo(
    () => baseFiltered.filter((s) => s.fase === FASE_DB.evolucion),
    [baseFiltered]
  );

  const hasFilters = selRegions.length > 0 || selEntidades.length > 0 || selCohortes.length > 0 || selectedIEs.length > 0;

  // Institutions selected for export (empty = all in current filter)
  const targetIEs = useMemo(
    () => (selectedIEs.length > 0 ? selectedIEs : institutionOptions),
    [selectedIEs, institutionOptions]
  );

  const fasesRequested: Array<Exclude<FaseKey, "ambas">> = useMemo(
    () => (selFase === "ambas" ? ["inicial", "evolucion"] : [selFase]),
    [selFase]
  );

  // Count PDFs that will actually be generated (skip empty)
  const pdfPlan = useMemo(() => {
    const plan: Array<{ ie: string; fase: Exclude<FaseKey, "ambas"> }> = [];
    for (const ie of targetIEs) {
      for (const fase of fasesRequested) {
        const hasData = baseFiltered.some(
          (s) => s.institucion_educativa === ie && s.fase === FASE_DB[fase]
        );
        if (hasData) plan.push({ ie, fase });
      }
    }
    return plan;
  }, [targetIEs, fasesRequested, baseFiltered]);

  // ── PDF generation ──
  const getLogoFlags = (ie: string) => {
    const fichaInfo = fichas.find((f) => f.nombre_ie === ie);
    if (!fichaInfo) return { showLogoRlt: true, showLogoClt: true };
    const regionInfo = regions.find((r) => r.nombre === fichaInfo.region);
    if (!regionInfo) return { showLogoRlt: true, showLogoClt: true };
    return { showLogoRlt: regionInfo.mostrar_logo_rlt, showLogoClt: regionInfo.mostrar_logo_clt };
  };

  const buildReportData = (ie: string, fase: Exclude<FaseKey, "ambas">): AmbienteReportData => {
    const fichaInfo = fichas.find((f) => f.nombre_ie === ie);
    return {
      institucion: `${ie} — ${FASE_LABEL[fase]}`,
      entidadTerritorial: fichaInfo?.entidad_territorial || "",
      submissions: baseFiltered
        .filter((s) => s.institucion_educativa === ie && s.fase === FASE_DB[fase])
        .map((s) => ({ tipo_formulario: s.tipo_formulario, respuestas: s.respuestas })),
    };
  };

  const safeName = (s: string) =>
    s.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, "").replace(/\s+/g, "_");

  const handleGeneratePDF = async () => {
    if (pdfPlan.length === 0) {
      toast({ title: "Sin informes", description: "No hay datos para la selección actual.", variant: "destructive" });
      return;
    }
    if (pdfPlan.length === 1) {
      setGenerating(true);
      try {
        const { ie, fase } = pdfPlan[0];
        const reportData = buildReportData(ie, fase);
        const flags = getLogoFlags(ie);
        await generarAmbienteEscolarReportPDF(reportData, getPdfLogoSources(images), flags);
        toast({ title: "PDF generado", description: `Informe descargado — ${ie} (${FASE_LABEL[fase]})` });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      setGenerating(false);
      return;
    }
    // Multiple PDFs → ZIP with subfolders
    setBatchGenerating(true);
    setBatchProgress(0);
    try {
      const zip = new JSZip();
      let count = 0;
      for (let i = 0; i < pdfPlan.length; i++) {
        const { ie, fase } = pdfPlan[i];
        try {
          const reportData = buildReportData(ie, fase);
          const flags = getLogoFlags(ie);
          const blob = await generarAmbienteEscolarReportPDF(
            reportData,
            getPdfLogoSources(images),
            flags,
            { returnBlob: true }
          );
          if (blob) {
            const folder = fase === "inicial" ? "Inicial" : "Evolucion";
            zip.file(`${folder}/Informe_Ambiente_${FASE_LABEL[fase]}_${safeName(ie)}.pdf`, blob);
            count++;
          }
        } catch {
          // skip failed
        }
        setBatchProgress(Math.round(((i + 1) / pdfPlan.length) * 100));
      }
      if (count === 0) {
        toast({ title: "Sin informes", description: "No se pudo generar ningún informe", variant: "destructive" });
        setBatchGenerating(false);
        setBatchProgress(0);
        return;
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informes_Ambiente_Escolar_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP descargado", description: `${count} informe(s) generados` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setBatchGenerating(false);
    setBatchProgress(0);
  };



  // ── Demo PDF with fictitious data ──
  const handleDemoPDF = async () => {
    setGenerating(true);
    try {
      const freq = ["Siempre", "Casi siempre", "A veces", "Casi nunca", "Nunca"];
      const jornadas = JORNADA_OPTIONS;
      const buildFakeResponses = (likert: LikertSection[], formType: string): Record<string, any> => {
        const r: Record<string, any> = {};
        const jornadas = JORNADA_OPTIONS;
        r.jornada = jornadas[Math.floor(Math.random() * jornadas.length)];

        if (formType === "docentes") {
          r.anos_docente = ANOS_OPTIONS[Math.floor(Math.random() * ANOS_OPTIONS.length)];
          // Pick 1-3 random grados
          const numGrados = 1 + Math.floor(Math.random() * 3);
          const shuffled = [...GRADOS_COMPLETOS].sort(() => Math.random() - 0.5);
          r.grados = shuffled.slice(0, numGrados);
          r.jornadas = [jornadas[Math.floor(Math.random() * jornadas.length)]];
          // Pick 1-2 fuentes
          const numFuentes = 1 + Math.floor(Math.random() * 2);
          const shuffledF = [...FUENTES_RETROALIMENTACION].sort(() => Math.random() - 0.5);
          r.fuentes_retroalimentacion = shuffledF.slice(0, numFuentes);
        } else if (formType === "estudiantes") {
          r.anos_estudiando = ANOS_OPTIONS[Math.floor(Math.random() * ANOS_OPTIONS.length)];
          r.grado = GRADOS_ESTUDIANTE[Math.floor(Math.random() * GRADOS_ESTUDIANTE.length)];
        } else if (formType === "acudientes") {
          // Weighted pool ensuring all 14 grades appear; rare ones have fewer entries for <1% segments
          const weighted = [
            "Primera infancia",
            "Preescolar", "Preescolar",
            "1°", "1°", "2°", "2°",
            "3°","3°","3°", "4°","4°","4°", "5°","5°","5°","5°",
            "6°","6°","6°","6°", "7°","7°","7°","7°", "8°","8°","8°",
            "9°","9°","9°", "10°","10°", "11°","11°",
            "12°",
          ];
          const numGrados = 1 + Math.floor(Math.random() * 2);
          const shuffled = [...weighted].sort(() => Math.random() - 0.5);
          r.grados = shuffled.slice(0, numGrados);
        }

        for (const sec of likert) {
          for (const item of sec.items) {
            const weights = [40, 25, 20, 10, 5];
            const roll = Math.random() * 100;
            let cum = 0;
            for (let i = 0; i < 5; i++) {
              cum += weights[i];
              if (roll < cum) { r[item.id] = freq[i]; break; }
            }
          }
        }
        return r;
      };

      const fakeSubs: AmbienteReportData["submissions"] = [];
      // 12 docentes, 25 estudiantes, 8 acudientes
      for (let i = 0; i < 12; i++) fakeSubs.push({ tipo_formulario: "docentes", respuestas: buildFakeResponses(DOCENTES_LIKERT, "docentes") });
      for (let i = 0; i < 25; i++) fakeSubs.push({ tipo_formulario: "estudiantes", respuestas: buildFakeResponses(ESTUDIANTES_LIKERT, "estudiantes") });
      for (let i = 0; i < 200; i++) fakeSubs.push({ tipo_formulario: "acudientes", respuestas: buildFakeResponses(ACUDIENTES_LIKERT, "acudientes") });

      await generarAmbienteEscolarReportPDF(
        {
          institucion: "I.E. Ejemplo Ficticio de Medellín",
          entidadTerritorial: "Secretaría de Educación de Medellín",
          submissions: fakeSubs,
        },
        getPdfLogoSources(images),
        { showLogoRlt: true, showLogoClt: true }
      );
      toast({ title: "Demo PDF generado", description: "PDF de ejemplo descargado con datos ficticios" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  // ── Consolidated PDF by Cohorte (real data) ──
  const handleCohorteConsolidatedPDF = async () => {
    if (!selCohorte) return;
    const cohorte = cohortes.find((c) => c.id === selCohorte);
    if (!cohorte) return;
    setGenerating(true);
    try {
      const cohorteSubs = submissions.filter((s) => s.cohorte_id === selCohorte);
      if (cohorteSubs.length === 0) {
        toast({ title: "Sin datos", description: "Esta cohorte no tiene respuestas registradas.", variant: "destructive" });
        setGenerating(false);
        return;
      }
      const uniqueIEs = new Set(cohorteSubs.map((s) => s.institucion_educativa).filter(Boolean));
      const nIE = uniqueIEs.size;
      const header = `${cohorte.nombre} (${nIE} institucion${nIE === 1 ? "" : "es"})`;
      await generarAmbienteEscolarReportPDF(
        {
          institucion: header,
          entidadTerritorial: "",
          submissions: cohorteSubs.map((s) => ({ tipo_formulario: s.tipo_formulario, respuestas: s.respuestas })),
        },
        getPdfLogoSources(images),
        { showLogoRlt: true, showLogoClt: true }
      );
      toast({ title: "PDF generado", description: `Informe consolidado descargado — ${header}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  const renderReportBlock = (subs: RawSubmission[], label: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{subs.length} respuestas</span>
      </div>
      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Sin datos para esta selección.</p>
      ) : (
        <Tabs defaultValue="docentes">
          <TabsList className="flex-wrap h-auto gap-1">
            {FORM_TYPES.map((ft) => {
              const Icon = ft.icon;
              const count = subs.filter((s) => s.tipo_formulario === ft.key).length;
              return (
                <TabsTrigger key={ft.key} value={ft.key} className="gap-1.5">
                  <Icon className="w-4 h-4" /> {ft.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
          {FORM_TYPES.map((ft) => {
            const typeSubs = subs.filter((s) => s.tipo_formulario === ft.key);
            const freqData = computeFrequencies(typeSubs, ft.likert);
            return (
              <TabsContent key={ft.key} value={ft.key} className="space-y-6">
                {typeSubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No hay respuestas para este tipo.</p>
                ) : (
                  <>
                    <FrequencyChart data={freqData} />
                    <FrequencyTable data={freqData} />
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );

  const summaryHeader = (() => {
    const ieLabel =
      selectedIEs.length === 1
        ? selectedIEs[0]
        : selectedIEs.length > 1
          ? `${selectedIEs.length} instituciones seleccionadas`
          : `Todas las instituciones (${institutionOptions.length})`;
    const cohorteLabel =
      selCohortes.length === 1
        ? cohortes.find((c) => c.id === selCohortes[0])?.nombre
        : selCohortes.length > 1
          ? `${selCohortes.length} cohortes`
          : "Todas las cohortes";
    return { ieLabel, cohorteLabel };
  })();

  return (
    <div className="space-y-4">
      {/* Cascade filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Filtros</span>
            {hasFilters && (
              <button
                onClick={() => {
                  setSelRegions([]);
                  setSelEntidades([]);
                  setSelCohortes([]);
                  setSelectedIEs([]);
                  setSelFase("ambas");
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Región</label>
              <MultiSelect
                options={regionOptions}
                selected={selRegions}
                onChange={setSelRegions}
                placeholder="Todas las regiones"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Entidad Territorial</label>
              <MultiSelect
                options={entidadOptions}
                selected={selEntidades}
                onChange={setSelEntidades}
                placeholder="Todas las entidades"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cohorte(s)</label>
              <MultiSelect
                options={cohorteOptions}
                selected={selCohortes}
                onChange={setSelCohortes}
                placeholder="Todas las cohortes"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Institución(es)</label>
              <MultiSelect
                options={ieOptions}
                selected={selectedIEs}
                onChange={setSelectedIEs}
                placeholder="Todas las instituciones"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fase</label>
              <Select value={selFase} onValueChange={(v) => setSelFase(v as FaseKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambas">Ambas</SelectItem>
                  <SelectItem value="inicial">Inicial</SelectItem>
                  <SelectItem value="evolucion">Evolución</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Export */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Informes PDF</span>
            <Button
              size="sm"
              onClick={handleGeneratePDF}
              disabled={generating || batchGenerating || pdfPlan.length === 0}
              className="gap-1.5"
            >
              {(generating || batchGenerating) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {(generating || batchGenerating)
                ? "Generando…"
                : `Generar Informe(s) (${pdfPlan.length} PDF)`}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDemoPDF}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Demo PDF
            </Button>
          </div>

          {/* Consolidated by Cohorte */}
          <div className="flex items-center gap-3 flex-wrap pt-2 border-t">
            <Layers className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Informe consolidado por Cohorte</span>
            <Select value={selCohorte} onValueChange={setSelCohorte}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Seleccionar cohorte" />
              </SelectTrigger>
              <SelectContent>
                {cohortes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleCohorteConsolidatedPDF}
              disabled={generating || !selCohorte}
              className="gap-1.5"
            >
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Generar Informe Consolidado
            </Button>
          </div>
          {batchGenerating && (
            <Progress value={batchProgress} className="h-2" />
          )}
          {pdfPlan.length > 1 && !batchGenerating && (
            <p className="text-xs text-muted-foreground">
              Se generará un ZIP con {pdfPlan.length} informes (sub-carpetas <strong>Inicial/</strong> y <strong>Evolucion/</strong> según la fase).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Online report */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Rapport en línea</span>
            <span className="text-xs text-muted-foreground">
              {summaryHeader.ieLabel} · {summaryHeader.cohorteLabel}
            </span>
          </div>

          {selFase === "inicial" && renderReportBlock(filteredInicial, "Inicial")}
          {selFase === "evolucion" && renderReportBlock(filteredEvolucion, "Evolución")}
          {selFase === "ambas" && (
            <div className="space-y-6">
              {renderReportBlock(filteredInicial, "Inicial")}
              <div className="border-t pt-4">
                {renderReportBlock(filteredEvolucion, "Evolución")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
