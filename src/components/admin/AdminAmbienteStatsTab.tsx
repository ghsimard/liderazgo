import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Users, BookOpen, GraduationCap } from "lucide-react";
import { ACUDIENTES_LIKERT, ESTUDIANTES_LIKERT, DOCENTES_LIKERT, FREQUENCY_OPTIONS, type LikertSection } from "@/data/ambienteEscolarData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  const [submissions, setSubmissions] = useState<RawSubmission[]>([]);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [selectedIE, setSelectedIE] = useState("__all__");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [subRes, ieRes] = await Promise.all([
        supabase.from("encuestas_ambiente_escolar").select("institucion_educativa, tipo_formulario, respuestas"),
        supabase.from("fichas_rlt").select("nombre_ie"),
      ]);
      const subs = (subRes.data || []) as RawSubmission[];
      setSubmissions(subs);

      const ieSet = new Set<string>();
      (ieRes.data || []).forEach((r: any) => ieSet.add(r.nombre_ie));
      subs.forEach((s) => ieSet.add(s.institucion_educativa));
      setInstitutions(Array.from(ieSet).sort());
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (selectedIE === "__all__") return submissions;
    return submissions.filter((s) => s.institucion_educativa === selectedIE);
  }, [submissions, selectedIE]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Institución:</label>
        <Select value={selectedIE} onValueChange={setSelectedIE}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Todas las instituciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas las instituciones</SelectItem>
            {institutions.map((ie) => (
              <SelectItem key={ie} value={ie}>{ie}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} respuestas</span>
      </div>

      <Tabs defaultValue="docentes">
        <TabsList className="flex-wrap h-auto gap-1">
          {FORM_TYPES.map((ft) => {
            const Icon = ft.icon;
            const count = filtered.filter((s) => s.tipo_formulario === ft.key).length;
            return (
              <TabsTrigger key={ft.key} value={ft.key} className="gap-1.5">
                <Icon className="w-4 h-4" /> {ft.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        {FORM_TYPES.map((ft) => {
          const typeSubs = filtered.filter((s) => s.tipo_formulario === ft.key);
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
    </div>
  );
}
