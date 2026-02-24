import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

  // Top 8 / Bottom 8 for qualitative analysis
  const sorted = [...itemScores].sort((a, b) => b.observerScore - a.observerScore);
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
            <h3 className="text-sm font-semibold text-primary mb-3">IDENTIFICACIÓN</h3>
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
            <h3 className="text-sm font-semibold text-primary mb-3">OBSERVADORES</h3>
            <div className="flex flex-wrap gap-2">
              {observadores.map((o) => (
                <Badge key={o.role} variant="outline" className="text-xs py-1 px-3">
                  {o.roleLabel}: {o.count} — {o.diasContacto}
                </Badge>
              ))}
            </div>
          </section>

          {/* ── RESUMEN GENERAL (Bar Chart) ── */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3">RESUMEN GENERAL</h3>
            <div className="flex gap-4 text-xs mb-2">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_AUTO }} /> Directivo</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_INTERNOS }} /> Internos</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: COLOR_EXTERNOS }} /> Externos</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 10]} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Directivo" fill={COLOR_AUTO} barSize={10} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Internos" fill={COLOR_INTERNOS} barSize={10} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Externos" fill={COLOR_EXTERNOS} barSize={10} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-6 text-sm mt-2">
              <span>Autopercepción promedio: <strong>{r1(autoAvg)}/10</strong></span>
              <span>Observadores promedio: <strong>{r1(observerAvg)}/10</strong></span>
            </div>
          </section>

          {/* ── ANÁLISIS COMPARATIVO — Radar ── */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3">ANÁLISIS COMPARATIVO POR COMPETENCIAS</h3>
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

          {/* ── ANÁLISIS DE OBSERVADORES (Internos vs Externos) ── */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3">ANÁLISIS DE OBSERVADORES: INTERNOS vs EXTERNOS</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={obsBarData} margin={{ bottom: 40, left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} height={60} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                />
                <Bar dataKey="Internos" fill={COLOR_INTERNOS} barSize={12} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Externos" fill={COLOR_EXTERNOS} barSize={12} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ── ANÁLISIS CUALITATIVO ── */}
          <section>
            <h3 className="text-sm font-semibold text-primary mb-3">ANÁLISIS CUALITATIVO</h3>
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
