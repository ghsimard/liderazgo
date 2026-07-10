// MEL Indicator computation for Ambiente Escolar
// Reference table: componente cumple si ΔS ≥ +5 pp OU ΔN ≤ −5 pp.
// Institución cumple si ≥ 2/3 componentes cumplen. Meta global: 80 %.
// Exigence de comparabilité muestral : variación ≤ 10 %.

import { SECTIONS_BY_FORM_KEYS, type Submission } from "./melAmbienteIndicatorTypes";

const S_OPTS = new Set(["Siempre", "Casi siempre"]);
const N_OPTS = new Set(["Nunca", "Casi nunca"]);

export interface PctSN {
  pctS: number; // 0-100
  pctN: number; // 0-100
  n: number;    // total observations counted (subs × items × non-empty)
}

export function computePctSN(subs: Submission[], itemIds: string[]): PctSN {
  let s = 0, n = 0, total = 0;
  for (const sub of subs) {
    const r = typeof sub.respuestas === "string" ? JSON.parse(sub.respuestas) : sub.respuestas;
    if (!r) continue;
    for (const id of itemIds) {
      const v = r[id];
      if (typeof v !== "string" || !v) continue;
      total++;
      if (S_OPTS.has(v)) s++;
      else if (N_OPTS.has(v)) n++;
    }
  }
  return {
    pctS: total > 0 ? (s / total) * 100 : 0,
    pctN: total > 0 ? (n / total) * 100 : 0,
    n: total,
  };
}

export interface ComponentResult {
  title: string;
  baseS: number | null;   // % Siempre/Casi siempre en línea base
  baseN: number | null;
  postS: number | null;
  postN: number | null;
  deltaS: number | null;  // pp
  deltaN: number | null;  // pp
  evaluable: boolean;
  cumple: boolean;
  nBase: number;
  nPost: number;
}

export const THRESHOLD_S_PP = 5;
export const THRESHOLD_N_PP = -5;

export function evaluateComponent(
  title: string,
  base: PctSN,
  post: PctSN
): ComponentResult {
  const evaluable = base.n > 0 && post.n > 0;
  if (!evaluable) {
    return {
      title,
      baseS: base.n > 0 ? base.pctS : null,
      baseN: base.n > 0 ? base.pctN : null,
      postS: post.n > 0 ? post.pctS : null,
      postN: post.n > 0 ? post.pctN : null,
      deltaS: null,
      deltaN: null,
      evaluable: false,
      cumple: false,
      nBase: base.n,
      nPost: post.n,
    };
  }
  const deltaS = post.pctS - base.pctS;
  const deltaN = post.pctN - base.pctN;
  return {
    title,
    baseS: base.pctS,
    baseN: base.pctN,
    postS: post.pctS,
    postN: post.pctN,
    deltaS,
    deltaN,
    evaluable: true,
    cumple: deltaS >= THRESHOLD_S_PP || deltaN <= THRESHOLD_N_PP,
    nBase: base.n,
    nPost: post.n,
  };
}

export interface InstitucionMel {
  institucion: string;
  components: ComponentResult[];       // 3 componentes: Comunicación, Prácticas, Convivencia
  componentsEvaluable: number;
  componentsCumplen: number;
  cumple: boolean;                     // ≥ 2/3 cumplen
  nBase: number;                       // # submissions totales (todos formularios)
  nPost: number;
  variacionMuestralPct: number;        // % variación entre base y post
  comparable: boolean;                 // ≤ 10 %
  incluido: boolean;                   // evaluable + comparable
}

export function computeVariacionMuestral(nBase: number, nPost: number): number {
  const maxN = Math.max(nBase, nPost);
  if (maxN === 0) return 0;
  return (Math.abs(nPost - nBase) / maxN) * 100;
}

export interface MelGlobal {
  nInstituciones: number;              // # instituciones incluidas
  nCumplen: number;
  pct: number;                         // 0-100
  meta: number;                        // 80
  metaAlcanzada: boolean;
  nExcluidasMuestra: number;           // instituciones evaluables pero descartadas por comparabilidad
  nNoEvaluables: number;               // instituciones con < 2 componentes evaluables
}

export const META_PCT = 80;

export function aggregateMel(
  rows: InstitucionMel[],
  opts: { ignorarComparabilidad?: boolean } = {}
): MelGlobal {
  const ignorar = !!opts.ignorarComparabilidad;
  const included = rows.filter((r) =>
    r.componentsEvaluable >= 2 && (ignorar || r.comparable)
  );
  const noEval = rows.filter((r) => r.componentsEvaluable < 2).length;
  const excMuestra = rows.filter(
    (r) => r.componentsEvaluable >= 2 && !r.comparable
  ).length;
  const nCumplen = included.filter((r) => r.cumple).length;
  const pct = included.length > 0 ? (nCumplen / included.length) * 100 : 0;
  return {
    nInstituciones: included.length,
    nCumplen,
    pct,
    meta: META_PCT,
    metaAlcanzada: pct >= META_PCT,
    nExcluidasMuestra: excMuestra,
    nNoEvaluables: noEval,
  };
}

// Convenience: build InstitucionMel from raw submissions (inicial + evolucion)
// using the 3 EAE components (Comunicación, Prácticas Pedagógicas, Convivencia)
// aggregated across the 3 forms (docentes + estudiantes + acudientes).
export function computeInstitucionesMel(
  institucion: string,
  subsBase: Submission[],
  subsPost: Submission[],
  itemIdsByComponent: Record<string, string[]>
): InstitucionMel {
  const components: ComponentResult[] = Object.entries(itemIdsByComponent).map(
    ([title, ids]) => {
      const b = computePctSN(subsBase, ids);
      const p = computePctSN(subsPost, ids);
      return evaluateComponent(title, b, p);
    }
  );
  const componentsEvaluable = components.filter((c) => c.evaluable).length;
  const componentsCumplen = components.filter((c) => c.cumple).length;
  const nBase = subsBase.length;
  const nPost = subsPost.length;
  const variacion = computeVariacionMuestral(nBase, nPost);
  const comparable = variacion <= 10;
  return {
    institucion,
    components,
    componentsEvaluable,
    componentsCumplen,
    cumple: componentsCumplen >= 2,
    nBase,
    nPost,
    variacionMuestralPct: variacion,
    comparable,
    incluido: componentsEvaluable >= 2 && comparable,
  };
}

// Build itemIdsByComponent by merging the 3 forms (docentes/estudiantes/acudientes)
// so an item like "com_1" from any form contributes to "Comunicación".
export function buildItemIdsByComponent(
  sectionsByForm: Record<string, { title: string; items: { id: string }[] }[]>
): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const form of SECTIONS_BY_FORM_KEYS) {
    const sections = sectionsByForm[form];
    if (!sections) continue;
    for (const sec of sections) {
      if (!out[sec.title]) out[sec.title] = new Set();
      for (const it of sec.items) out[sec.title].add(it.id);
    }
  }
  const res: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(out)) res[k] = Array.from(v);
  return res;
}
