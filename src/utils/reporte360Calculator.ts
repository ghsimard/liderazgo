import { supabase } from "@/integrations/supabase/client";
import {
  FORM_TYPE_TO_ROLE,
  ROLE_LABELS,
  INTERNAL_ROLES,
  EXTERNAL_ROLES,
  DOMAIN_ORDER,
  COMPETENCIES_BY_DOMAIN,
  COMPETENCY_LABELS,
  REPORT_PHRASES,
} from "@/data/reporte360Phrases";

// ── Score conversion ──

const FREQUENCY_SCORES: Record<string, number> = {
  "Nunca": 2.5,
  "Pocas veces": 5,
  "Algunas veces": 7.5,
  "Siempre": 10,
};

const AGREEMENT_SCORES: Record<string, number> = {
  "Totalmente en desacuerdo": 2.5,
  "Algo en desacuerdo": 5,
  "Algo de acuerdo": 7.5,
  "Totalmente de acuerdo": 10,
};

function answerToScore(answer: string, responseType: string): number | null {
  if (answer === "No sé" || !answer) return null;
  const map = responseType === "frequency" ? FREQUENCY_SCORES : AGREEMENT_SCORES;
  return map[answer] ?? null;
}

// ── Types ──

export interface DirectivoIdentificacion {
  nombre: string;
  cedula: string;
  entidadTerritorial: string;
  institucion: string;
  codigoDane: string;
  cargo: string;
}

export interface ObservadorInfo {
  role: string;
  roleLabel: string;
  count: number;
  diasContacto: string;
}

export interface DomainScore {
  domain: string;
  domainLabel: string;
  autoScore: number;
  internosScore: number;
  externosScore: number;
}

export interface CompetencyScore {
  competency: string;
  competencyLabel: string;
  domain: string;
  autoScore: number;
  observerScore: number;
  internosScore: number;
  externosScore: number;
}

export interface ItemScore {
  competencyKey: string;
  autoScore: number;
  observerScore: number;
  phrase: string;
}

export interface Reporte360Data {
  directivo: DirectivoIdentificacion;
  observadores: ObservadorInfo[];
  domainScores: DomainScore[];
  competencyScores: CompetencyScore[];
  itemScores: ItemScore[];
  autoAvg: number;
  observerAvg: number;
}

// ── Main calculation function ──

export async function calcularReporte360(nombreDirectivo: string, institucion: string): Promise<Reporte360Data> {
  // 1. Fetch all encuestas for this directivo
  const { data: encuestas, error: encError } = await supabase
    .from("encuestas_360")
    .select("*")
    .eq("institucion_educativa", institucion);

  if (encError) throw encError;

  // Separate autoevaluacion and observer responses
  const autoEncuesta = (encuestas ?? []).find(
    (e) => e.tipo_formulario === "autoevaluacion" && e.nombre_completo === nombreDirectivo
  );

  const observerEncuestas = (encuestas ?? []).filter(
    (e) => e.tipo_formulario !== "autoevaluacion" && e.nombre_directivo === nombreDirectivo
  );

  // 2. Fetch item mapping (item_number → competency_key + response_type)
  const { data: items } = await supabase
    .from("items_360")
    .select("item_number, competency_key, response_type")
    .order("item_number");

  const itemMap = new Map<number, { competencyKey: string; responseType: string }>();
  (items ?? []).forEach((i) => {
    itemMap.set(i.item_number, { competencyKey: i.competency_key, responseType: i.response_type });
  });

  // 3. Fetch weights
  const { data: weights } = await supabase
    .from("competency_weights")
    .select("competency_key, observer_role, weight");

  const weightMap = new Map<string, number>();
  (weights ?? []).forEach((w) => {
    weightMap.set(`${w.competency_key}_${w.observer_role}`, Number(w.weight));
  });

  // 4. Fetch directivo identification from fichas_rlt
  const { data: fichas } = await supabase
    .from("fichas_rlt")
    .select("nombres_apellidos, numero_cedula, entidad_territorial, nombre_ie, codigo_dane, cargo_actual")
    .eq("nombres_apellidos", nombreDirectivo)
    .eq("nombre_ie", institucion)
    .limit(1);

  const ficha = fichas?.[0];

  const directivo: DirectivoIdentificacion = {
    nombre: ficha?.nombres_apellidos ?? nombreDirectivo,
    cedula: ficha?.numero_cedula ?? "",
    entidadTerritorial: ficha?.entidad_territorial ?? "",
    institucion: ficha?.nombre_ie ?? institucion,
    codigoDane: ficha?.codigo_dane ?? "",
    cargo: ficha?.cargo_actual ?? "",
  };

  // 5. Build observer info (count per role + dias_contacto)
  const roleGroups: Record<string, { count: number; dias: string[] }> = {};
  observerEncuestas.forEach((e) => {
    const role = FORM_TYPE_TO_ROLE[e.tipo_formulario];
    if (!role) return;
    if (!roleGroups[role]) roleGroups[role] = { count: 0, dias: [] };
    roleGroups[role].count++;
    if (e.dias_contacto) roleGroups[role].dias.push(e.dias_contacto);
  });

  const observadores: ObservadorInfo[] = Object.entries(roleGroups).map(([role, info]) => ({
    role,
    roleLabel: ROLE_LABELS[role] ?? role,
    count: info.count,
    diasContacto: getMostFrequent(info.dias),
  }));

  // 6. Calculate scores per item
  const autoResponses = (autoEncuesta?.respuestas ?? {}) as Record<string, string>;

  // Group observer responses by role
  const roleResponses: Record<string, Record<string, string>[]> = {};
  observerEncuestas.forEach((e) => {
    const role = FORM_TYPE_TO_ROLE[e.tipo_formulario];
    if (!role) return;
    if (!roleResponses[role]) roleResponses[role] = [];
    roleResponses[role].push((e.respuestas ?? {}) as Record<string, string>);
  });

  // Calculate per-item scores
  const allItemScores: ItemScore[] = [];
  const competencyItemScores: Record<string, { auto: number[]; observer: number[]; internos: number[]; externos: number[] }> = {};

  for (const [itemNumStr, itemInfo] of itemMap.entries()) {
    const itemNum = String(itemNumStr);
    const { competencyKey, responseType } = itemInfo;
    const compBase = competencyKey.split("_")[0];

    // Auto score
    const autoAnswer = autoResponses[itemNum];
    const autoScore = autoAnswer ? answerToScore(autoAnswer, responseType) : null;

    // Observer scores per role
    let weightedObsTotal = 0;
    let weightedObsWeightSum = 0;
    let internosTotal = 0;
    let internosCount = 0;
    let externosTotal = 0;
    let externosCount = 0;

    const allRoles = [...INTERNAL_ROLES, ...EXTERNAL_ROLES];
    for (const role of allRoles) {
      const responses = roleResponses[role] ?? [];
      const scores: number[] = [];
      responses.forEach((r) => {
        const s = answerToScore(r[itemNum], responseType);
        if (s !== null) scores.push(s);
      });

      if (scores.length === 0) continue;
      const avgRoleScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const w = weightMap.get(`${competencyKey}_${role}`) ?? 0;
      weightedObsTotal += w * avgRoleScore;
      weightedObsWeightSum += w;

      if (INTERNAL_ROLES.includes(role)) {
        internosTotal += avgRoleScore;
        internosCount++;
      } else {
        externosTotal += avgRoleScore;
        externosCount++;
      }
    }

    const observerScore = weightedObsWeightSum > 0 ? weightedObsTotal / weightedObsWeightSum : 0;
    const internosAvg = internosCount > 0 ? internosTotal / internosCount : 0;
    const externosAvg = externosCount > 0 ? externosTotal / externosCount : 0;

    allItemScores.push({
      competencyKey,
      autoScore: autoScore ?? 0,
      observerScore,
      phrase: REPORT_PHRASES[competencyKey] ?? "",
    });

    if (!competencyItemScores[compBase]) {
      competencyItemScores[compBase] = { auto: [], observer: [], internos: [], externos: [] };
    }
    if (autoScore !== null) competencyItemScores[compBase].auto.push(autoScore);
    competencyItemScores[compBase].observer.push(observerScore);
    competencyItemScores[compBase].internos.push(internosAvg);
    competencyItemScores[compBase].externos.push(externosAvg);
  }

  // 7. Calculate competency scores
  const competencyScores: CompetencyScore[] = [];
  const domainCompScores: Record<string, { auto: number[]; internos: number[]; externos: number[] }> = {};

  for (const [domainIdx, domainInfo] of DOMAIN_ORDER.entries()) {
    if (!domainCompScores[domainInfo.key]) {
      domainCompScores[domainInfo.key] = { auto: [], internos: [], externos: [] };
    }
    const comps = COMPETENCIES_BY_DOMAIN[domainInfo.key] ?? [];
    for (const comp of comps) {
      const scores = competencyItemScores[comp];
      const autoAvg = scores ? avg(scores.auto) : 0;
      const obsAvg = scores ? avg(scores.observer) : 0;
      const intAvg = scores ? avg(scores.internos) : 0;
      const extAvg = scores ? avg(scores.externos) : 0;

      competencyScores.push({
        competency: comp,
        competencyLabel: COMPETENCY_LABELS[comp] ?? comp,
        domain: domainInfo.key,
        autoScore: autoAvg,
        observerScore: obsAvg,
        internosScore: intAvg,
        externosScore: extAvg,
      });

      domainCompScores[domainInfo.key].auto.push(autoAvg);
      domainCompScores[domainInfo.key].internos.push(intAvg);
      domainCompScores[domainInfo.key].externos.push(extAvg);
    }
  }

  // 8. Calculate domain scores
  const domainScores: DomainScore[] = DOMAIN_ORDER.map((d) => {
    const cs = domainCompScores[d.key];
    return {
      domain: d.key,
      domainLabel: d.label,
      autoScore: cs ? avg(cs.auto) : 0,
      internosScore: cs ? avg(cs.internos) : 0,
      externosScore: cs ? avg(cs.externos) : 0,
    };
  });

  // 9. Global averages
  const allAutoScores = competencyScores.map((c) => c.autoScore).filter((s) => s > 0);
  const allObsScores = competencyScores.map((c) => c.observerScore).filter((s) => s > 0);

  return {
    directivo,
    observadores,
    domainScores,
    competencyScores,
    itemScores: allItemScores,
    autoAvg: avg(allAutoScores),
    observerAvg: avg(allObsScores),
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function getMostFrequent(arr: string[]): string {
  if (arr.length === 0) return "";
  const freq: Record<string, number> = {};
  arr.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}
