/** Shared types for the MEL global report */
export interface AggregatedMel {
  count: number;
  countWithData: number;
  countPositiveAuto: number;
  countPositiveObs: number;
  avgDeltaAuto: number;
  avgDeltaObserver: number;
  domainDeltas: { domain: string; domainLabel: string; avgDeltaAuto: number; avgDeltaInternos: number; avgDeltaExternos: number }[];
  competencyDeltas: { competency: string; competencyLabel: string; avgInicialAuto: number; avgFinalAuto: number; avgDeltaAuto: number; avgInicialObs: number; avgFinalObs: number; avgDeltaObs: number }[];
}
