import { calcularReporte360, type Reporte360Data, type CompetencyScore, type DomainScore } from "./reporte360Calculator";

// ── MEL Delta Types ──

export interface MelCompetencyDelta {
  competency: string;
  competencyLabel: string;
  domain: string;
  inicialAuto: number;
  finalAuto: number;
  deltaAuto: number;
  inicialObserver: number;
  finalObserver: number;
  deltaObserver: number;
  inicialInternos: number;
  finalInternos: number;
  deltaInternos: number;
  inicialExternos: number;
  finalExternos: number;
  deltaExternos: number;
}

export interface MelDomainDelta {
  domain: string;
  domainLabel: string;
  inicialAuto: number;
  finalAuto: number;
  deltaAuto: number;
  inicialInternos: number;
  finalInternos: number;
  deltaInternos: number;
  inicialExternos: number;
  finalExternos: number;
  deltaExternos: number;
}

export interface MelAnalysisData {
  directivoNombre: string;
  institucion: string;
  inicial: Reporte360Data | null;
  final: Reporte360Data | null;
  competencyDeltas: MelCompetencyDelta[];
  domainDeltas: MelDomainDelta[];
  globalDeltaAuto: number;
  globalDeltaObserver: number;
  hasInicial: boolean;
  hasFinal: boolean;
}

// ── Main MEL calculation ──

export async function calcularMelAnalysis(
  nombreDirectivo: string,
  institucion: string
): Promise<MelAnalysisData> {
  let inicial: Reporte360Data | null = null;
  let final_: Reporte360Data | null = null;

  try {
    inicial = await calcularReporte360(nombreDirectivo, institucion, "inicial");
  } catch {
    // no inicial data
  }

  try {
    final_ = await calcularReporte360(nombreDirectivo, institucion, "final");
  } catch {
    // no final data
  }

  const competencyDeltas: MelCompetencyDelta[] = [];
  const inicialComps = inicial?.competencyScores ?? [];
  const finalComps = final_?.competencyScores ?? [];

  // Use inicial as reference, match by competency key
  const finalMap = new Map(finalComps.map((c) => [c.competency, c]));
  const allKeys = new Set([...inicialComps.map((c) => c.competency), ...finalComps.map((c) => c.competency)]);

  for (const key of allKeys) {
    const ini = inicialComps.find((c) => c.competency === key);
    const fin = finalMap.get(key);

    competencyDeltas.push({
      competency: key,
      competencyLabel: ini?.competencyLabel ?? fin?.competencyLabel ?? key,
      domain: ini?.domain ?? fin?.domain ?? "",
      inicialAuto: ini?.autoScore ?? 0,
      finalAuto: fin?.autoScore ?? 0,
      deltaAuto: (fin?.autoScore ?? 0) - (ini?.autoScore ?? 0),
      inicialObserver: ((ini?.autoScore ?? 0) + (ini?.observerScore ?? 0)) / 2,
      finalObserver: ((fin?.autoScore ?? 0) + (fin?.observerScore ?? 0)) / 2,
      deltaObserver: ((fin?.autoScore ?? 0) + (fin?.observerScore ?? 0)) / 2 - ((ini?.autoScore ?? 0) + (ini?.observerScore ?? 0)) / 2,
      inicialInternos: ini?.internosScore ?? 0,
      finalInternos: fin?.internosScore ?? 0,
      deltaInternos: (fin?.internosScore ?? 0) - (ini?.internosScore ?? 0),
      inicialExternos: ini?.externosScore ?? 0,
      finalExternos: fin?.externosScore ?? 0,
      deltaExternos: (fin?.externosScore ?? 0) - (ini?.externosScore ?? 0),
    });
  }

  // Domain deltas
  const inicialDomains = inicial?.domainScores ?? [];
  const finalDomains = final_?.domainScores ?? [];
  const finalDomMap = new Map(finalDomains.map((d) => [d.domain, d]));
  const allDomKeys = new Set([...inicialDomains.map((d) => d.domain), ...finalDomains.map((d) => d.domain)]);

  const domainDeltas: MelDomainDelta[] = [];
  for (const key of allDomKeys) {
    const ini = inicialDomains.find((d) => d.domain === key);
    const fin = finalDomMap.get(key);
    domainDeltas.push({
      domain: key,
      domainLabel: ini?.domainLabel ?? fin?.domainLabel ?? key,
      inicialAuto: ini?.autoScore ?? 0,
      finalAuto: fin?.autoScore ?? 0,
      deltaAuto: (fin?.autoScore ?? 0) - (ini?.autoScore ?? 0),
      inicialInternos: ini?.internosScore ?? 0,
      finalInternos: fin?.internosScore ?? 0,
      deltaInternos: (fin?.internosScore ?? 0) - (ini?.internosScore ?? 0),
      inicialExternos: ini?.externosScore ?? 0,
      finalExternos: fin?.externosScore ?? 0,
      deltaExternos: (fin?.externosScore ?? 0) - (ini?.externosScore ?? 0),
    });
  }

  return {
    directivoNombre: nombreDirectivo,
    institucion,
    inicial,
    final: final_,
    competencyDeltas,
    domainDeltas,
    globalDeltaAuto: (final_?.autoAvg ?? 0) - (inicial?.autoAvg ?? 0),
    globalDeltaObserver:
      ((final_?.autoAvg ?? 0) + (final_?.observerAvg ?? 0)) / 2 -
      ((inicial?.autoAvg ?? 0) + (inicial?.observerAvg ?? 0)) / 2,
    hasInicial: inicial !== null && inicial.hasResponses,
    hasFinal: final_ !== null && final_.hasResponses,
  };
}
