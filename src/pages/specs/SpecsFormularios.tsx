import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FORM_CONFIGS,
  ITEM_COMPETENCY,
  FREQUENCY_OPTIONS_WITH_NOSABE,
  FREQUENCY_OPTIONS_NO_NOSABE,
  AGREEMENT_OPTIONS_WITH_NOSABE,
  AGREEMENT_OPTIONS_NO_NOSABE,
} from "@/data/encuesta360Data";
import {
  DOMAIN_ORDER,
  COMPETENCIES_BY_DOMAIN,
  COMPETENCY_LABELS,
  REPORT_PHRASES,
  ROLE_LABELS,
} from "@/data/reporte360Phrases";
import {
  ACUDIENTES_LIKERT,
  ESTUDIANTES_LIKERT,
  DOCENTES_LIKERT,
  FORM_TITLES as AMBIENTE_TITLES,
  FREQUENCY_OPTIONS as AMBIENTE_FREQ,
} from "@/data/ambienteEscolarData";
import {
  asistenciaForm,
  interludioForm,
  intensivoForm,
} from "@/data/satisfaccionData";

// Build weights data from the static export
import { getItemWeight } from "@/data/encuesta360Data";

const OBSERVER_ROLES = ["coor", "doce", "admi", "acud", "estu"] as const;

// Build item→competency_key mapping for the estructura table
function buildEstructura() {
  const rows: { itemNum: number; compKey: string; compBase: string; compLabel: string; domain: string; phrase: string }[] = [];
  for (let i = 1; i <= 39; i++) {
    const compKey = ITEM_COMPETENCY[i];
    const compBase = compKey.replace(/_\d+$/, "");
    const domEntry = DOMAIN_ORDER.find(d => COMPETENCIES_BY_DOMAIN[d.key]?.includes(compBase));
    rows.push({
      itemNum: i,
      compKey,
      compBase,
      compLabel: COMPETENCY_LABELS[compBase] || compBase,
      domain: domEntry?.label || "",
      phrase: REPORT_PHRASES[compKey] || "",
    });
  }
  return rows;
}

// Build weights table: one row per item_key, columns per role
function buildWeightsTable() {
  const allKeys = Object.values(ITEM_COMPETENCY);
  const unique = [...new Set(allKeys)];
  return unique.map(key => {
    const base = key.replace(/_\d+$/, "");
    const label = COMPETENCY_LABELS[base] || base;
    const weights: Record<string, number> = {};
    // Find item number for this key to use getItemWeight
    const itemNum = Object.entries(ITEM_COMPETENCY).find(([, v]) => v === key)?.[0];
    for (const role of OBSERVER_ROLES) {
      const tipo = role === "coor" ? "directivo" : role === "doce" ? "docente" : role === "admi" ? "administrativo" : role === "acud" ? "acudiente" : "estudiante";
      weights[role] = itemNum ? getItemWeight(Number(itemNum), tipo) : 1;
    }
    return { key, label, suffix: key.replace(/^.*_/, ""), weights };
  });
}

const formOrder = [
  { key: "docente", label: "Docente" },
  { key: "estudiante", label: "Estudiante" },
  { key: "directivo", label: "Directivo Par" },
  { key: "acudiente", label: "Acudiente" },
  { key: "administrativo", label: "Administrativo" },
  { key: "autoevaluacion", label: "Autoevaluación" },
];

export default function SpecsFormularios() {
  const navigate = useNavigate();
  const estructura = buildEstructura();
  const weightsData = buildWeightsTable();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/specs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Specs Hub
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">Formularios</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Formularios y Preguntas</h1>
        <p className="text-muted-foreground mb-8">
          Referencia completa de todos los formularios, preguntas, estructura y ponderaciones de cada hub.
        </p>

        <Accordion type="multiple" className="space-y-4">
          {/* ─── ENCUESTA 360° ─── */}
          <AccordionItem value="360" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Hub Encuesta 360°</AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="estructura" className="mt-2">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="estructura">Estructura</TabsTrigger>
                  <TabsTrigger value="ponderaciones">Ponderaciones</TabsTrigger>
                  <TabsTrigger value="formularios">Formularios</TabsTrigger>
                  <TabsTrigger value="escalas">Escalas</TabsTrigger>
                </TabsList>

                {/* Estructura */}
                <TabsContent value="estructura">
                  <p className="text-sm text-muted-foreground mb-3">
                    Mapeo de los 39 ítems → competencias → dominios. Cada ítem mide un aspecto específico de una competencia.
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Ítem</TableHead>
                          <TableHead>Dominio</TableHead>
                          <TableHead>Competencia</TableHead>
                          <TableHead className="w-10">Nivel</TableHead>
                          <TableHead>Descriptor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estructura.map(r => (
                          <TableRow key={r.itemNum}>
                            <TableCell className="font-mono text-xs">{r.itemNum}</TableCell>
                            <TableCell className="text-xs">{r.domain}</TableCell>
                            <TableCell className="text-xs font-medium">{r.compLabel}</TableCell>
                            <TableCell className="font-mono text-xs">{r.compKey.replace(/^.*_/, "")}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.phrase}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Ponderaciones */}
                <TabsContent value="ponderaciones">
                  <p className="text-sm text-muted-foreground mb-3">
                    Pesos por ítem (competencia_nivel) y rol observador. La autoevaluación siempre tiene peso 1.0.
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competencia</TableHead>
                          <TableHead className="w-10">Niv.</TableHead>
                          {OBSERVER_ROLES.map(r => (
                            <TableHead key={r} className="text-center w-20">{ROLE_LABELS[r]}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {weightsData.map(row => (
                          <TableRow key={row.key}>
                            <TableCell className="text-xs font-medium">{row.label}</TableCell>
                            <TableCell className="font-mono text-xs">{row.suffix}</TableCell>
                            {OBSERVER_ROLES.map(r => (
                              <TableCell key={r} className="text-center font-mono text-xs">
                                {row.weights[r]?.toFixed(3)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Formularios */}
                <TabsContent value="formularios">
                  <Tabs defaultValue="docente" className="mt-2">
                    <TabsList className="flex-wrap h-auto gap-1">
                      {formOrder.map(f => (
                        <TabsTrigger key={f.key} value={f.key}>{f.label}</TabsTrigger>
                      ))}
                    </TabsList>
                    {formOrder.map(f => {
                      const config = FORM_CONFIGS[f.key];
                      if (!config) return null;
                      return (
                        <TabsContent key={f.key} value={f.key}>
                          <h4 className="font-semibold text-sm mb-1">{config.subtitle}</h4>
                          <p className="text-xs text-muted-foreground mb-4">{config.title}</p>

                          <h5 className="font-medium text-sm mb-2 text-primary">Frecuencia (1–18)</h5>
                          <ol className="list-decimal list-inside space-y-1 mb-6">
                            {config.frequencyItems.map(item => (
                              <li key={item.num} className="text-xs text-foreground">
                                <span className="font-mono text-muted-foreground mr-1">[{item.num}]</span>
                                {item.text}
                              </li>
                            ))}
                          </ol>

                          <h5 className="font-medium text-sm mb-2 text-primary">Acuerdo (19–39)</h5>
                          <ol className="list-decimal list-inside space-y-1">
                            {config.agreementItems.map(item => (
                              <li key={item.num} className="text-xs text-foreground">
                                <span className="font-mono text-muted-foreground mr-1">[{item.num}]</span>
                                {item.text}
                              </li>
                            ))}
                          </ol>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </TabsContent>

                {/* Escalas */}
                <TabsContent value="escalas">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Escala de Frecuencia</h4>
                      <p className="text-xs text-muted-foreground mb-2">Ítems 1–18</p>
                      <ul className="space-y-1">
                        {FREQUENCY_OPTIONS_WITH_NOSABE.map((o, i) => {
                          const values = [2.5, 5, 7.5, 10, null];
                          return (
                            <li key={o} className="text-xs flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-muted flex items-center justify-center font-mono text-xs">{i + 1}</span>
                              {o}
                              <span className="ml-auto font-mono text-primary">{values[i] !== null ? `→ ${values[i]}` : "→ excluido"}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Nota: La autoevaluación no incluye "No sé": {FREQUENCY_OPTIONS_NO_NOSABE.join(", ")}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Escala de Acuerdo</h4>
                      <p className="text-xs text-muted-foreground mb-2">Ítems 19–39</p>
                      <ul className="space-y-1">
                        {AGREEMENT_OPTIONS_WITH_NOSABE.map((o, i) => {
                          const values = [2.5, 5, 7.5, 10, null];
                          return (
                            <li key={o} className="text-xs flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-muted flex items-center justify-center font-mono text-xs">{i + 1}</span>
                              {o}
                              <span className="ml-auto font-mono text-primary">{values[i] !== null ? `→ ${values[i]}` : "→ excluido"}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Nota: La autoevaluación no incluye "No sé": {AGREEMENT_OPTIONS_NO_NOSABE.join(", ")}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          {/* ─── AMBIENTE ESCOLAR ─── */}
          <AccordionItem value="ambiente" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Hub Ambiente Escolar</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground mb-2">
                Escala: {AMBIENTE_FREQ.join(" · ")}
              </p>
              <Tabs defaultValue="acudientes" className="mt-2">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="acudientes">Acudientes</TabsTrigger>
                  <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
                  <TabsTrigger value="docentes">Docentes</TabsTrigger>
                </TabsList>
                {[
                  { key: "acudientes", data: ACUDIENTES_LIKERT },
                  { key: "estudiantes", data: ESTUDIANTES_LIKERT },
                  { key: "docentes", data: DOCENTES_LIKERT },
                ].map(({ key, data }) => (
                  <TabsContent key={key} value={key}>
                    <h4 className="font-semibold text-sm mb-3">{AMBIENTE_TITLES[key]}</h4>
                    {data.map(section => (
                      <div key={section.title} className="mb-4">
                        <h5 className="font-medium text-sm text-primary mb-1">{section.title}</h5>
                        <p className="text-xs text-muted-foreground mb-2 italic">{section.instruction}</p>
                        <ol className="list-decimal list-inside space-y-1">
                          {section.items.map(item => (
                            <li key={item.id} className="text-xs text-foreground">
                              <span className="font-mono text-muted-foreground mr-1">[{item.id}]</span>
                              {item.text}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </AccordionContent>
          </AccordionItem>

          {/* ─── SATISFACCIÓN ─── */}
          <AccordionItem value="satisfaccion" className="border rounded-lg px-4">
            <AccordionTrigger className="text-lg font-semibold">Hub Satisfacción</AccordionTrigger>
            <AccordionContent>
              <Tabs defaultValue="asistencia" className="mt-2">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
                  <TabsTrigger value="interludio">Interludio</TabsTrigger>
                  <TabsTrigger value="intensivo">Intensivo</TabsTrigger>
                </TabsList>
                {[asistenciaForm, interludioForm, intensivoForm].map(form => (
                  <TabsContent key={form.formType} value={form.formType}>
                    <h4 className="font-semibold text-sm mb-1">{form.title}</h4>
                    <p className="text-xs text-muted-foreground mb-4 whitespace-pre-line">{form.description}</p>
                    {form.sections.map((section, si) => (
                      <div key={si} className="mb-4">
                        <h5 className="font-medium text-sm text-primary mb-1">{section.title}</h5>
                        {section.description && (
                          <p className="text-xs text-muted-foreground mb-2 italic"
                             dangerouslySetInnerHTML={{ __html: section.description }} />
                        )}
                        {section.questions.map(q => (
                          <div key={q.key} className="mb-3">
                            {q.label && <p className="text-xs font-medium mb-1">{q.label}</p>}
                            {q.type === "radio" && q.options && (
                              <ul className="ml-4 space-y-0.5">
                                {q.options.map(o => (
                                  <li key={o.value} className="text-xs text-muted-foreground">○ {o.label}</li>
                                ))}
                              </ul>
                            )}
                            {q.type === "checkbox-max3" && q.options && (
                              <ul className="ml-4 space-y-0.5">
                                {q.options.map(o => (
                                  <li key={o.value} className="text-xs text-muted-foreground">☐ {o.label}</li>
                                ))}
                              </ul>
                            )}
                            {q.type === "likert4" && q.options && (
                              <ul className="ml-4 flex gap-3 flex-wrap">
                                {q.options.map(o => (
                                  <li key={o.value} className="text-xs text-muted-foreground">({o.value}) {o.label}</li>
                                ))}
                              </ul>
                            )}
                            {(q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") && q.rows && q.columns && (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Enunciado</TableHead>
                                      {q.columns.map(c => (
                                        <TableHead key={c.value} className="text-xs text-center">{c.label}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {q.rows.map(row => (
                                      <TableRow key={row.key}>
                                        <TableCell className="text-xs">{row.label}</TableCell>
                                        {q.columns!.map(c => (
                                          <TableCell key={c.value} className="text-center text-xs text-muted-foreground">○</TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                            {q.type === "textarea" && (
                              <div className="ml-4 border border-dashed border-border rounded p-2 text-xs text-muted-foreground italic">
                                Campo de texto libre
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
