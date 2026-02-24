import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import type { Reporte360Data, DomainScore, CompetencyScore } from "@/utils/reporte360Calculator";
import {
  DOMAIN_ORDER,
  COMPETENCIES_BY_DOMAIN,
  COMPETENCY_LABELS,
} from "@/data/reporte360Phrases";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: Reporte360Data | null;
}

const COLOR_AUTO = "#4285F4";
const COLOR_INTERNOS = "#EA862D";
const COLOR_EXTERNOS = "#6AA84F";
const COLOR_OBSERVER = "#6AA84F";

function r1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-md px-4 py-2 mt-3">
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-xs text-muted-foreground">{children}</span>
    </div>
  );
}

const sectionTitleClass = "text-base font-bold text-foreground mb-3";

export default function AdminReporte360Viewer({ open, onOpenChange, data }: Props) {
  if (!data) return null;

  const { directivo, observadores, domainScores, competencyScores, itemScores, autoAvg, observerAvg } = data;

  // Radar data
  const radarData = competencyScores.map((c) => ({
    competency: COMPETENCY_LABELS[c.competency] ?? c.competency,
    Autopercepción: +c.autoScore.toFixed(1),
    Observadores: +c.observerScore.toFixed(1),
  }));

  // Bar data for domain summary
  const barData = domainScores.map((d) => ({
    name: d.domainLabel.replace("Gestión ", ""),
    Directivo: +d.autoScore.toFixed(1),
    Internos: +d.internosScore.toFixed(1),
    Externos: +d.externosScore.toFixed(1),
  }));

  // Observer analysis bar data
  const obsBarData = competencyScores.map((c) => ({
    name: (COMPETENCY_LABELS[c.competency] ?? c.competency).substring(0, 15),
    fullName: COMPETENCY_LABELS[c.competency] ?? c.competency,
    Internos: +c.internosScore.toFixed(1),
    Externos: +c.externosScore.toFixed(1),
  }));

  // Top 8 / Bottom 8 for qualitative analysis — exclude items with no valid observer data (score 0)
  const validItemScores = itemScores.filter((item) => item.observerScore > 0);
  const sorted = [...validItemScores].sort((a, b) => b.observerScore - a.observerScore);
  const top8 = sorted.slice(0, 8);
  const bottom8 = sorted.slice(-8).reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Informe 360° — {directivo.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-8 pr-2 pb-4">
          {/* ── IDENTIFICACIÓN ── */}
          <section>
            <h3 className={sectionTitleClass}>IDENTIFICACIÓN</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {[
                ["Directivo/a Docente", directivo.nombre],
                ["Identificación", directivo.cedula],
                ["Entidad Territorial", directivo.entidadTerritorial],
                ["Institución Educativa", directivo.institucion],
                ["Código DANE I.E.", directivo.codigoDane],
                ["Cargo", directivo.cargo],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="font-medium text-muted-foreground whitespace-nowrap">{label}:</span>
                  <span className="truncate">{val || "—"}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── OBSERVADORES ── */}
          <section>
            <h3 className={sectionTitleClass}>OBSERVADORES</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-2 font-semibold text-xs">NÚMERO DE ENCUESTADOS</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs">ROL</th>
                    <th className="text-left px-4 py-2 font-semibold text-xs">INTERACCIÓN ANTES DE LA ENCUESTA</th>
                  </tr>
                </thead>
                <tbody>
                  {observadores.map((obs, i) => {
                    const diasEntries = Object.entries(obs.diasDistribution);
                    return (
                      <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                        <td className="px-4 py-1.5 text-center">{obs.count}</td>
                        <td className="px-4 py-1.5">{obs.roleLabel}</td>
                        <td className="px-4 py-1.5">
                          {diasEntries.length === 0 ? "—" : (
                            <div className="flex gap-2">
                              {diasEntries.map(([dias, count]) => (
                                <span key={dias} className="relative border rounded px-2 pt-0.5 pb-0.5 pr-5 text-xs bg-muted/30">
                                  {dias || "—"}
                                  <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold text-foreground">
                                    {count}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <InfoBox>Las puntuaciones se calculan a partir de sus respuestas y las de los observadores.</InfoBox>
          </section>

          {/* ── RESUMEN GENERAL (Bar Chart) ── */}
          <section>
            <h3 className={sectionTitleClass}>RESUMEN GENERAL</h3>
            <div className="flex gap-4 text-xs mb-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_AUTO }} /> Directivo</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_INTERNOS }} /> Administrativo(a), coordinador(a) y docente</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_EXTERNOS }} /> Acudiente y estudiante</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 10]} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Directivo" fill={COLOR_AUTO} barSize={10} radius={[0, 3, 3, 0]}
                  label={({ x, y, width, height, value }: any) => {
                    if (!value) return null;
                    return <text x={x + width + 4} y={y + height / 2} fill={COLOR_AUTO} fontSize={9} textAnchor="start" dominantBaseline="central">{(+value).toFixed(1)}</text>;
                  }} />
                <Bar dataKey="Internos" fill={COLOR_INTERNOS} barSize={10} radius={[0, 3, 3, 0]}
                  label={({ x, y, width, height, value }: any) => {
                    if (!value) return null;
                    return <text x={x + width + 4} y={y + height / 2} fill={COLOR_INTERNOS} fontSize={9} textAnchor="start" dominantBaseline="central">{(+value).toFixed(1)}</text>;
                  }} />
                <Bar dataKey="Externos" fill={COLOR_EXTERNOS} barSize={10} radius={[0, 3, 3, 0]}
                  label={({ x, y, width, height, value }: any) => {
                    if (!value) return null;
                    return <text x={x + width + 4} y={y + height / 2} fill={COLOR_EXTERNOS} fontSize={9} textAnchor="start" dominantBaseline="central">{(+value).toFixed(1)}</text>;
                  }} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 text-sm mt-2">
              <span>Autopercepción promedio: <strong>{r1(autoAvg)}/10</strong></span>
              <span>Observadores promedio: <strong>{r1(observerAvg)}/10</strong></span>
            </div>
            <InfoBox>Analice las brechas que existen entre las puntuaciones promedio de los grupos de referencia y su puntuación en cada gestión.</InfoBox>
          </section>

          {/* ── ANÁLISIS DE LA DISTANCIA — Radar ── */}
          <section>
            <h3 className={sectionTitleClass}>ANÁLISIS DE LA DISTANCIA ENTRE EL DIRECTIVO Y LOS OBSERVADORES</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid />
                <PolarAngleAxis dataKey="competency" tick={{ fontSize: 8 }} />
                <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 8 }} />
                <Radar name="Autopercepción" dataKey="Autopercepción" stroke={COLOR_AUTO} fill={COLOR_AUTO} fillOpacity={0.15} />
                <Radar name="Observadores" dataKey="Observadores" stroke={COLOR_OBSERVER} fill={COLOR_OBSERVER} fillOpacity={0.15} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </section>

          {/* ── PUNTUACIONES POR COMPETENCIA ── */}
          <section>
            <h3 className={sectionTitleClass}>PUNTUACIONES POR COMPETENCIA</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-semibold text-xs">COMPETENCIA</th>
                    <th className="text-center px-3 py-2 font-semibold text-xs" style={{ color: COLOR_AUTO }}>AUTOEVALUACIÓN</th>
                    <th className="text-center px-3 py-2 font-semibold text-xs" style={{ color: COLOR_INTERNOS }}>DIRECTIVOS, DOCENTES Y ADMINISTRATIVOS</th>
                    <th className="text-center px-3 py-2 font-semibold text-xs" style={{ color: COLOR_EXTERNOS }}>ESTUDIANTES Y ACUDIENTES</th>
                  </tr>
                </thead>
                <tbody>
                  {competencyScores.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-3 py-1.5 text-xs">{COMPETENCY_LABELS[c.competency] ?? c.competency}</td>
                      <td className="px-3 py-1.5 text-xs text-center font-medium">{r1(c.autoScore)}</td>
                      <td className="px-3 py-1.5 text-xs text-center font-medium">{r1(c.internosScore)}</td>
                      <td className="px-3 py-1.5 text-xs text-center font-medium">{r1(c.externosScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InfoBox>Identifique sus puntuaciones altas y bajas y compárelas con las de los observadores teniendo en cuenta la brecha entre los puntajes.</InfoBox>
          </section>

          {/* ── ANÁLISIS DE OBSERVADORES ── */}
          <section>
            <h3 className={sectionTitleClass}>ANÁLISIS DE OBSERVADORES</h3>
            <div className="flex gap-4 text-xs mb-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_INTERNOS }} /> Administrativo(a), coordinador(a) y docente</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_EXTERNOS }} /> Acudiente y estudiante</span>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={obsBarData} margin={{ bottom: 80, left: 10, right: 10, top: 25 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={({ x, y, payload }: any) => (
                    <text x={x} y={y + 8} transform={`rotate(-90, ${x}, ${y + 8})`} fontSize={8} textAnchor="end" fill="#666">
                      {payload.value}
                    </text>
                  )}
                  interval={0}
                  height={80}
                />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Bar dataKey="Internos" fill={COLOR_INTERNOS} barSize={12} radius={[3, 3, 0, 0]}
                  label={({ x, y, width, value }: any) => {
                    if (!value) return null;
                    return <text x={x + width / 2} y={y - 6} fill={COLOR_INTERNOS} fontSize={7} textAnchor="middle">{(+value).toFixed(1)}</text>;
                  }} />
                <Bar dataKey="Externos" fill={COLOR_EXTERNOS} barSize={12} radius={[3, 3, 0, 0]}
                  label={({ x, y, width, value }: any) => {
                    if (!value) return null;
                    return <text x={x + width / 2} y={y - 6} fill={COLOR_EXTERNOS} fontSize={7} textAnchor="middle">{(+value).toFixed(1)}</text>;
                  }} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ── ASPECTOS DESTACADOS Y POR MEJORAR ── */}
          <section>
            <h3 className={`${sectionTitleClass} text-center`}>ASPECTOS DESTACADOS Y POR MEJORAR</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-emerald-700 mb-2">🟢 FORTALEZAS (Top 8)</h4>
                <ul className="space-y-1.5">
                  {top8.map((item, i) => (
                    <li key={i} className="text-xs flex gap-2">
                      <span className="font-medium text-emerald-600 shrink-0">{r1(item.observerScore)}</span>
                      <span className="text-muted-foreground">{item.phrase || item.competencyKey}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-amber-700 mb-2">🟡 ASPECTOS POR MEJORAR (Bottom 8)</h4>
                <ul className="space-y-1.5">
                  {bottom8.map((item, i) => (
                    <li key={i} className="text-xs flex gap-2">
                      <span className="font-medium text-amber-600 shrink-0">{r1(item.observerScore)}</span>
                      <span className="text-muted-foreground">{item.phrase || item.competencyKey}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
