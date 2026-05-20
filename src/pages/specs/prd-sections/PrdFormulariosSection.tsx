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
  getItemWeight,
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

const OBSERVER_ROLES = ["coor", "doce", "admi", "acud", "estu"] as const;

function buildEstructura() {
  const rows: { itemNum: number; compKey: string; compBase: string; compLabel: string; domain: string; phrase: string }[] = [];
  for (let i = 1; i <= 39; i++) {
    const compKey = ITEM_COMPETENCY[i];
    const compBase = compKey.replace(/_\d+$/, "");
    const domEntry = DOMAIN_ORDER.find(d => COMPETENCIES_BY_DOMAIN[d.key]?.includes(compBase));
    rows.push({ itemNum: i, compKey, compBase, compLabel: COMPETENCY_LABELS[compBase] || compBase, domain: domEntry?.label || "", phrase: REPORT_PHRASES[compKey] || "" });
  }
  return rows;
}

function buildWeightsTable() {
  const allKeys = Object.values(ITEM_COMPETENCY);
  const unique = [...new Set(allKeys)];
  return unique.map(key => {
    const base = key.replace(/_\d+$/, "");
    const label = COMPETENCY_LABELS[base] || base;
    const weights: Record<string, number> = {};
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

export function PrdFormulariosSection() {
  const estructura = buildEstructura();
  const weightsData = buildWeightsTable();

  return (
    <div className="my-8">
      <Accordion type="multiple" className="space-y-4">
        {/* ENCUESTA 360° */}
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
              <TabsContent value="estructura">
                <p className="text-sm text-muted-foreground mb-3">Mapeo de los 39 ítems → competencias → dominios.</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-12">Ítem</TableHead><TableHead>Dominio</TableHead><TableHead>Competencia</TableHead><TableHead className="w-10">Nivel</TableHead><TableHead>Descriptor</TableHead>
                    </TableRow></TableHeader>
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
              <TabsContent value="ponderaciones">
                <p className="text-sm text-muted-foreground mb-3">Pesos por ítem y rol observador.</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Competencia</TableHead><TableHead className="w-10">Niv.</TableHead>
                      {OBSERVER_ROLES.map(r => <TableHead key={r} className="text-center w-20">{ROLE_LABELS[r]}</TableHead>)}
                    </TableRow></TableHeader>
                    <TableBody>
                      {weightsData.map(row => (
                        <TableRow key={row.key}>
                          <TableCell className="text-xs font-medium">{row.label}</TableCell>
                          <TableCell className="font-mono text-xs">{row.suffix}</TableCell>
                          {OBSERVER_ROLES.map(r => <TableCell key={r} className="text-center font-mono text-xs">{row.weights[r]?.toFixed(3)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="formularios">
                <Tabs defaultValue="docente" className="mt-2">
                  <TabsList className="flex-wrap h-auto gap-1">
                    {formOrder.map(f => <TabsTrigger key={f.key} value={f.key}>{f.label}</TabsTrigger>)}
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
                              <span className="font-mono text-muted-foreground mr-1">[{item.num}]</span>{item.text}
                            </li>
                          ))}
                        </ol>
                        <h5 className="font-medium text-sm mb-2 text-primary">Acuerdo (19–39)</h5>
                        <ol className="list-decimal list-inside space-y-1">
                          {config.agreementItems.map(item => (
                            <li key={item.num} className="text-xs text-foreground">
                              <span className="font-mono text-muted-foreground mr-1">[{item.num}]</span>{item.text}
                            </li>
                          ))}
                        </ol>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </TabsContent>
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
                    <p className="text-xs text-muted-foreground mt-2 italic">Nota: La autoevaluación no incluye "No sé": {FREQUENCY_OPTIONS_NO_NOSABE.join(", ")}</p>
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
                    <p className="text-xs text-muted-foreground mt-2 italic">Nota: La autoevaluación no incluye "No sé": {AGREEMENT_OPTIONS_NO_NOSABE.join(", ")}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {/* AMBIENTE ESCOLAR */}
        <AccordionItem value="ambiente" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Hub Ambiente Escolar</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-2">Escala: {AMBIENTE_FREQ.join(" · ")}</p>
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
                            <span className="font-mono text-muted-foreground mr-1">[{item.id}]</span>{item.text}
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

        {/* SATISFACCIÓN */}
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
                      {section.description && <p className="text-xs text-muted-foreground mb-2 italic" dangerouslySetInnerHTML={{ __html: section.description }} />}
                      {section.questions.map(q => (
                        <div key={q.key} className="mb-3">
                          {q.label && <p className="text-xs font-medium mb-1">{q.label}</p>}
                          {q.type === "radio" && q.options && (
                            <ul className="ml-4 space-y-0.5">
                              {q.options.map(o => <li key={o.value} className="text-xs text-muted-foreground">○ {o.label}</li>)}
                            </ul>
                          )}
                          {q.type === "checkbox-max3" && q.options && (
                            <ul className="ml-4 space-y-0.5">
                              {q.options.map(o => <li key={o.value} className="text-xs text-muted-foreground">☐ {o.label}</li>)}
                            </ul>
                          )}
                          {q.type === "likert4" && q.options && (
                            <ul className="ml-4 flex gap-3 flex-wrap">
                              {q.options.map(o => <li key={o.value} className="text-xs text-muted-foreground">({o.value}) {o.label}</li>)}
                            </ul>
                          )}
                          {(q.type === "grid-sino" || q.type === "grid-frequency" || q.type === "grid-logistic") && q.rows && q.columns && (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead className="text-xs">Enunciado</TableHead>
                                  {q.columns.map(c => <TableHead key={c.value} className="text-xs text-center">{c.label}</TableHead>)}
                                </TableRow></TableHeader>
                                <TableBody>
                                  {q.rows.map(row => (
                                    <TableRow key={row.key}>
                                      <TableCell className="text-xs">{row.label}</TableCell>
                                      {q.columns!.map(c => <TableCell key={c.value} className="text-center text-xs text-muted-foreground">○</TableCell>)}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                          {q.type === "textarea" && (
                            <div className="ml-4 border border-dashed border-border rounded p-2 text-xs text-muted-foreground italic">Campo de texto libre</div>
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

        {/* FICHA DE INFORMACIÓN */}
        <AccordionItem value="ficha" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Ficha de Información</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-4">Formulario de registro del directivo con 59 campos organizados en 4 secciones.</p>
            <Tabs defaultValue="personal" className="mt-2">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="personal">Datos Personales</TabsTrigger>
                <TabsTrigger value="formacion">Formación Académica</TabsTrigger>
                <TabsTrigger value="cargo">Cargo e IE</TabsTrigger>
                <TabsTrigger value="ie_detalle">Detalle IE</TabsTrigger>
              </TabsList>
              <TabsContent value="personal">
                <h4 className="font-semibold text-sm mb-3">Sección 1 — Datos Personales</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8">#</TableHead><TableHead>Campo</TableHead><TableHead className="w-20">Obligatorio</TableHead><TableHead>Validación / Opciones</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[
                      { n: 1, label: "Acepta tratamiento de datos", req: true, val: "Checkbox — debe ser marcado" },
                      { n: 2, label: "Nombres", req: true, val: "Mín. 2 caracteres" },
                      { n: 3, label: "Apellidos", req: true, val: "Mín. 2 caracteres" },
                      { n: 4, label: "Género", req: true, val: "Masculino · Femenino · No binario · Prefiero no decir" },
                      { n: 5, label: "Número de cédula", req: true, val: "Texto libre" },
                      { n: 6, label: "Fecha de nacimiento", req: true, val: "Día/Mes/Año — edad entre 18 y 70 años" },
                      { n: 7, label: "Lugar de nacimiento", req: false, val: "Texto libre" },
                      { n: 8, label: "Lengua materna", req: true, val: "Español (default) · Lengua indígena · Lengua criolla · Otra" },
                      { n: 9, label: "Otra lengua (detalle)", req: false, val: "Visible si lengua ≠ Español" },
                      { n: 10, label: "Celular personal", req: true, val: "10 dígitos exactos, con código de país (+57)" },
                      { n: 11, label: "Correo personal", req: true, val: "Email válido" },
                      { n: 12, label: "Correo institucional", req: false, val: "Email válido" },
                      { n: 13, label: "Prefiere recibir comunicaciones en", req: true, val: "Correo personal · Correo institucional" },
                      { n: 14, label: "Enfermedad base", req: true, val: "Sí · No" },
                      { n: 15, label: "Detalle enfermedad", req: false, val: "Visible si enfermedad = Sí" },
                      { n: 16, label: "Contacto de emergencia", req: false, val: "Texto libre" },
                      { n: 17, label: "Teléfono de emergencia", req: false, val: "10 dígitos, con código de país" },
                      { n: 18, label: "Discapacidad", req: true, val: "Sí · No" },
                      { n: 19, label: "Detalle discapacidad", req: false, val: "Visible si discapacidad = Sí" },
                    ].map(r => (
                      <TableRow key={r.n}>
                        <TableCell className="font-mono text-xs">{r.n}</TableCell>
                        <TableCell className="text-xs font-medium">{r.label}</TableCell>
                        <TableCell className="text-center">{r.req ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sí</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="formacion">
                <h4 className="font-semibold text-sm mb-3">Sección 2 — Formación Académica</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8">#</TableHead><TableHead>Campo</TableHead><TableHead className="w-20">Obligatorio</TableHead><TableHead>Validación / Opciones</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[
                      { n: 20, label: "Tipo de formación", req: true, val: "Normalista · Profesional · Licenciado · Otro" },
                      { n: 21, label: "Título de pregrado", req: true, val: "Texto libre" },
                      { n: 22, label: "Título de especialización", req: false, val: "Texto libre" },
                      { n: 23, label: "Título de maestría", req: false, val: "Texto libre" },
                      { n: 24, label: "Título de doctorado", req: false, val: "Texto libre" },
                      { n: 25, label: "Otros títulos", req: false, val: "Texto libre" },
                    ].map(r => (
                      <TableRow key={r.n}>
                        <TableCell className="font-mono text-xs">{r.n}</TableCell>
                        <TableCell className="text-xs font-medium">{r.label}</TableCell>
                        <TableCell className="text-center">{r.req ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sí</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="cargo">
                <h4 className="font-semibold text-sm mb-3">Sección 3 — Cargo e Institución</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8">#</TableHead><TableHead>Campo</TableHead><TableHead className="w-20">Obligatorio</TableHead><TableHead>Validación / Opciones</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[
                      { n: 26, label: "Región", req: true, val: "Lista dinámica desde BD" },
                      { n: 27, label: "Institución educativa", req: true, val: "Lista filtrada par región → entidad → municipio" },
                      { n: 28, label: "Cargo actual", req: true, val: "Rector/a · Coordinador/a · Director/a rural · Director/a de núcleo" },
                      { n: 29, label: "Tipo de vinculación", req: true, val: "Propiedad · Encargo · Provisionalidad" },
                      { n: 30, label: "Fecha vinculación al servicio", req: false, val: "Fecha" },
                      { n: 31, label: "Fecha nombramiento en cargo", req: false, val: "Fecha" },
                      { n: 32, label: "Fecha nombramiento en IE", req: false, val: "Fecha" },
                      { n: 33, label: "Estatuto", req: false, val: "2277 · 1278" },
                      { n: 34, label: "Grado escalafón", req: false, val: "Texto libre" },
                    ].map(r => (
                      <TableRow key={r.n}>
                        <TableCell className="font-mono text-xs">{r.n}</TableCell>
                        <TableCell className="text-xs font-medium">{r.label}</TableCell>
                        <TableCell className="text-center">{r.req ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sí</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="ie_detalle">
                <h4 className="font-semibold text-sm mb-3">Sección 4 — Detalle de la IE</h4>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-8">#</TableHead><TableHead>Campo</TableHead><TableHead className="w-20">Obligatorio</TableHead><TableHead>Validación / Opciones</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {[
                      { n: 35, label: "Código DANE", req: true, val: "Exactamente 12 dígitos numéricos" },
                      { n: 36, label: "Entidad territorial", req: true, val: "Lista dinámica desde BD" },
                      { n: 37, label: "Comuna / Barrio", req: false, val: "Texto libre" },
                      { n: 38, label: "Dirección sede principal", req: false, val: "Texto libre" },
                      { n: 39, label: "Sitio web", req: false, val: "Texto libre" },
                      { n: 40, label: "Teléfono IE", req: false, val: "10 dígitos, con código de país" },
                      { n: 41, label: "Zona de sede", req: true, val: "Urbana · Rural" },
                      { n: 42, label: "Sedes rurales", req: true, val: "Número" },
                      { n: 43, label: "Sedes urbanas", req: true, val: "Número" },
                      { n: 44, label: "Jornadas", req: true, val: "Checkbox múltiple: Mañana · Tarde · Nocturna · Fin de semana · Única · Completa" },
                      { n: 45, label: "Grupos étnicos", req: false, val: "Checkbox múltiple: Afrocolombianos · Indígenas · ROM · Raizales · Palenqueros · Ninguno" },
                      { n: 46, label: "Proyectos transversales", req: false, val: "Rich text editor" },
                      { n: 47, label: "Desplazamiento a la IE", req: false, val: "Texto libre" },
                      { n: 48, label: "Niveles educativos", req: true, val: "Checkbox múltiple: Preescolar · Primaria · Básica secundaria · Media · Ciclo complementario" },
                      { n: 49, label: "Tipo de bachillerato", req: true, val: "Checkbox múltiple: Académico · Técnico · Comercial · Pedagógico · Agropecuario · Industrial" },
                      { n: 50, label: "Modelo pedagógico", req: false, val: "Texto libre" },
                      { n: 51, label: "Número de docentes", req: true, val: "Número" },
                      { n: 52, label: "Número de coordinadores", req: true, val: "Número" },
                      { n: 53, label: "Número de administrativos", req: true, val: "Número" },
                      { n: 54, label: "Número de orientadores", req: true, val: "Número" },
                      { n: 55, label: "Estudiantes preescolar", req: false, val: "Número" },
                      { n: 56, label: "Estudiantes primaria", req: false, val: "Número" },
                      { n: 57, label: "Estudiantes básica secundaria", req: false, val: "Número" },
                      { n: 58, label: "Estudiantes media", req: false, val: "Número" },
                      { n: 59, label: "Estudiantes ciclo complementario", req: false, val: "Número" },
                    ].map(r => (
                      <TableRow key={r.n}>
                        <TableCell className="font-mono text-xs">{r.n}</TableCell>
                        <TableCell className="text-xs font-medium">{r.label}</TableCell>
                        <TableCell className="text-center">{r.req ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Sí</span> : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">No</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.val}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {/* RÚBRICAS */}
        <AccordionItem value="rubricas" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Hub Rúbricas</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground mb-2">Escala de 4 niveles: <span className="font-mono">Sin evidencia → Básico → Intermedio → Avanzado</span></p>
            <Tabs defaultValue="mod1" className="mt-2">
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="mod1">Módulo 1</TabsTrigger>
                <TabsTrigger value="mod2">Módulo 2</TabsTrigger>
                <TabsTrigger value="mod3">Módulo 3</TabsTrigger>
                <TabsTrigger value="mod4">Módulo 4</TabsTrigger>
              </TabsList>
              {[
                { key: "mod1", number: 1, title: "El valor de ser y de ser con otros", objective: "Desarrollar el autoconocimiento para interactuar con los demás miembros de la IE desde un enfoque apreciativo.", items: [
                  { label: "Autoconocimiento", type: "PROCESO", sin: "Aún no reconoce sus fortalezas ni sus oportunidades de mejora.", basico: "Algunas veces reconoce sus fortalezas o sus oportunidades de mejora.", intermedio: "Reconoce frecuentemente sus fortalezas, avances y oportunidades de mejora.", avanzado: "Reconoce de manera visible y constante sus fortalezas, avances y oportunidades de mejora." },
                  { label: "Enfoque apreciativo", type: "PROCESO", sin: "Aún no reconoce la importancia de ver la potencia de las situaciones y personas.", basico: "Algunas veces reconoce la importancia de ver la potencia de las situaciones y personas.", intermedio: "Reconoce con frecuencia la importancia de ver la potencia de las situaciones y personas.", avanzado: "Reconoce constantemente la importancia de resaltar la potencia de las situaciones y personas." },
                  { label: "Propósito de vida", type: "PRODUCTO", sin: "Aún no logra construir un propósito de vida.", basico: "Construye un propósito de vida, sin conexión con su liderazgo en la escuela.", intermedio: "Construye un propósito de vida y está en proceso de comprender cómo éste le puede dar sentido a su liderazgo.", avanzado: "Construye un propósito de vida que le da sentido a su liderazgo en la escuela." },
                ]},
                { key: "mod2", number: 2, title: "La reconquista pedagógica", objective: "Construir una visión compartida de la IE con la comunidad educativa.", items: [
                  { label: "Comunicación asertiva", type: "PROCESO", sin: "Aún no crea un ambiente de confianza y seguridad.", basico: "A veces tiene conversaciones con confianza y seguridad.", intermedio: "Frecuentemente tiene conversaciones con confianza y seguridad.", avanzado: "Constantemente tiene conversaciones con confianza y seguridad." },
                  { label: "Participación de la comunidad", type: "PROCESO", sin: "Aún no genera espacios de participación.", basico: "Genera espacios de participación informativa.", intermedio: "Genera espacios de participación consultiva.", avanzado: "Genera y garantiza la participación decisoria." },
                  { label: "Visión compartida con prácticas de equidad", type: "PRODUCTO", sin: "Aún no construye con otros la visión de la IE.", basico: "Construye visión sin prácticas explícitas de equidad.", intermedio: "Construye visión con prácticas de equidad con equipo.", avanzado: "Construye visión con la comunidad con prácticas de equidad." },
                ]},
                { key: "mod3", number: 3, title: "Potenciando tesoros", objective: "Revisar con su equipo de trabajo el PEI en conexión con la visión compartida.", items: [
                  { label: "Trabajo colaborativo", type: "PROCESO", sin: "Aún no implementa los principios del trabajo colaborativo.", basico: "Implementa con algunos equipos.", intermedio: "Implementa con sus equipos de trabajo.", avanzado: "Implementa con efectividad con la comunidad educativa." },
                  { label: "Revisión del PEI", type: "PROCESO", sin: "Aún no revisa la relación entre el PEI y la visión compartida.", basico: "Revisa sin considerar la visión compartida.", intermedio: "Revisa a la luz de la visión compartida con equipo.", avanzado: "Revisa con la comunidad educativa a la luz de la visión compartida." },
                  { label: "Consolidado de prácticas de equidad e inclusión", type: "PRODUCTO", sin: "Aún no consolida las prácticas.", basico: "Consolidado de una categoría del PEI.", intermedio: "Consolidado de dos categorías.", avanzado: "Consolidado de tres categorías." },
                ]},
                { key: "mod4", number: 4, title: "Tejiendo puentes", objective: "Establecer un plan de acciones en conexión con la revisión del PEI.", items: [
                  { label: "Planeación participativa", type: "PROCESO", sin: "Aún no genera espacios de participación en planeación.", basico: "Planea consultando a la comunidad.", intermedio: "Planea y toma decisiones con equipos.", avanzado: "Planea con la comunidad incluyéndola en la toma de decisiones." },
                  { label: "Plan de acción basado en evaluación institucional", type: "PRODUCTO", sin: "Aún no perfila un plan de acciones.", basico: "Perfila un plan con objetivos o metas.", intermedio: "Construye un plan con objetivo, actividades, responsables, tiempos.", avanzado: "Construye un plan completo con indicadores, metas y relación con PMI." },
                ]},
              ].map(mod => (
                <TabsContent key={mod.key} value={mod.key}>
                  <h4 className="font-semibold text-sm mb-1">Módulo {mod.number}: {mod.title}</h4>
                  <p className="text-xs text-muted-foreground mb-4 italic">{mod.objective}</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="w-32">Ítem</TableHead>
                        <TableHead className="w-16 text-center">Tipo</TableHead>
                        <TableHead>Sin evidencia</TableHead>
                        <TableHead>Básico</TableHead>
                        <TableHead>Intermedio</TableHead>
                        <TableHead>Avanzado</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {mod.items.map(item => (
                          <TableRow key={item.label}>
                            <TableCell className="text-xs font-medium align-top">{item.label}</TableCell>
                            <TableCell className="text-center align-top">
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${item.type === "PROCESO" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>{item.type}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top">{item.sin}</TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top">{item.basico}</TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top">{item.intermedio}</TableCell>
                            <TableCell className="text-xs text-foreground align-top font-medium">{item.avanzado}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
