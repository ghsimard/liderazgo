/** Shared types for the MEL global report */

export interface DomainIncrementPct {
  domain: string;
  domainLabel: string;
  pctPositive: number; // 0-100
  countPositive: number;
  countTotal: number;
}

export interface AggregatedMel {
  count: number;
  countWithData: number;
  countBothPhases: number;
  countPositiveAuto: number;
  countPositiveObs: number;
  avgDeltaAuto: number;
  avgDeltaObserver: number;
  domainDeltas: { domain: string; domainLabel: string; avgDeltaAuto: number; avgDeltaInternos: number; avgDeltaExternos: number; avgInicialAuto: number; avgInicialInternos: number; avgInicialExternos: number }[];
  competencyDeltas: { competency: string; competencyLabel: string; avgInicialAuto: number; avgFinalAuto: number; avgDeltaAuto: number; avgInicialObs: number; avgFinalObs: number; avgDeltaObs: number }[];
  /** % de directivos con incremento por dominio - autoevaluación */
  domainIncrementPcts: DomainIncrementPct[];
  /** % de directivos con incremento por dominio - observadores (internos + externos combinados) */
  domainIncrementPctsObserver: DomainIncrementPct[];
  globalPctPositive: number;
  globalPctPositiveObserver: number;
}
