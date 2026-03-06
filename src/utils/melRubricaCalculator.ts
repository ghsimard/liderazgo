/**
 * MEL Rúbricas Calculator
 * 
 * Calculates 3 KPIs based on rubrica evaluations:
 * 1. % rectores with "Intermedio" or "Avanzado" in ≥3 of 4 modules (meta 85%)
 * 2. % rectores with "Avanzado" in Module 1 AND Module 2 (meta 80%)
 * 3. % rectores with "Avanzado" in Module 3 (meta 80%)
 */

import { supabase } from "@/utils/dbClient";

// ── Types ──

export interface DirectivoRubricaResult {
  cedula: string;
  nombre: string;
  institucion: string;
  region: string;
  entidadTerritorial: string;
  /** Overall qualitative level per module (1-4 scale, null if no data) */
  moduleLevels: Record<number, string | null>; // module_number → nivel string
  moduleNumericLevels: Record<number, number | null>; // module_number → 1-4
  /** KPI 1: has Intermedio or Avanzado in ≥3 modules */
  kpi1Cumple: boolean;
  kpi1ModulesCount: number; // how many modules evaluated
  kpi1PassingCount: number; // how many with Intermedio/Avanzado
  /** KPI 2a: Avanzado in Module 1 (Autoconocimiento) */
  kpi2aCumple: boolean;
  kpi2aHasMod1: boolean;
  /** KPI 2b: Avanzado in Module 2 (Comunicación Asertiva) */
  kpi2bCumple: boolean;
  kpi2bHasMod2: boolean;
  /** KPI 3: Avanzado in Module 3 */
  kpi3Cumple: boolean;
  kpi3HasMod3: boolean;
}

export interface MelRubricaKPIs {
  kpi1: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi2a: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi2b: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi3: { numerator: number; denominator: number; percentage: number; meta: number };
}

export interface MelRubricaData {
  directivos: DirectivoRubricaResult[];
  kpis: MelRubricaKPIs;
}

// ── Helpers ──

const NIVEL_TO_NUM: Record<string, number> = {
  "sin_evidencia": 1,
  "basico": 2,
  "intermedio": 3,
  "avanzado": 4,
};

const NIVEL_LABELS: Record<string, string> = {
  "sin_evidencia": "Sin evidencia",
  "basico": "Básico",
  "intermedio": "Intermedio",
  "avanzado": "Avanzado",
};

function nivelToNum(nivel: string | null): number | null {
  if (!nivel) return null;
  return NIVEL_TO_NUM[nivel] ?? null;
}

/**
 * For each directivo+module, determine the overall level.
 * Priority: latest seguimiento > acordado_nivel
 * We take the MOST COMMON level across items in that module,
 * using the priority rule for each item.
 */
function determineModuleLevel(
  moduloItems: string[], // item IDs for this module
  evaluaciones: Map<string, string | null>, // item_id → acordado_nivel
  seguimientos: Map<string, { nivel: string | null; created_at: string }[]> // item_id → seguimientos sorted by date
): string | null {
  const levels: string[] = [];

  for (const itemId of moduloItems) {
    // Check seguimientos first (latest one)
    const segs = seguimientos.get(itemId);
    if (segs && segs.length > 0) {
      const latest = segs[segs.length - 1];
      if (latest.nivel) {
        levels.push(latest.nivel);
        continue;
      }
    }
    // Fall back to acordado
    const acordado = evaluaciones.get(itemId);
    if (acordado) {
      levels.push(acordado);
    }
  }

  if (levels.length === 0) return null;

  // Most common level
  const freq: Record<string, number> = {};
  levels.forEach((l) => { freq[l] = (freq[l] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

// ── Main calculation ──

export async function calcularMelRubricas(
  filteredCedulas?: string[]
): Promise<MelRubricaData> {
  // 1. Fetch modules and items
  const [{ data: modules }, { data: items }] = await Promise.all([
    supabase.from("rubrica_modules").select("id, module_number").order("module_number"),
    supabase.from("rubrica_items").select("id, module_id").order("sort_order"),
  ]);

  const moduleMap = new Map<string, number>(); // module_id → module_number
  (modules ?? []).forEach((m) => moduleMap.set(m.id, m.module_number));

  const itemsByModule = new Map<number, string[]>(); // module_number → item_ids
  const itemToModule = new Map<string, number>(); // item_id → module_number
  (items ?? []).forEach((item) => {
    const modNum = moduleMap.get(item.module_id);
    if (modNum == null) return;
    if (!itemsByModule.has(modNum)) itemsByModule.set(modNum, []);
    itemsByModule.get(modNum)!.push(item.id);
    itemToModule.set(item.id, modNum);
  });

  // 2. Fetch all evaluaciones and seguimientos
  const [{ data: evaluaciones }, { data: seguimientos }] = await Promise.all([
    supabase.from("rubrica_evaluaciones").select("item_id, directivo_cedula, acordado_nivel"),
    supabase.from("rubrica_seguimientos").select("item_id, directivo_cedula, nivel, created_at").order("created_at"),
  ]);

  // 3. Fetch fichas for name/region mapping
  const { data: fichas } = await supabase
    .from("fichas_rlt")
    .select("numero_cedula, nombres_apellidos, nombre_ie, region, entidad_territorial, cargo_actual")
    .in("cargo_actual", ["Rector/a", "Coordinador/a"]);

  const fichaMap = new Map<string, { nombre: string; institucion: string; region: string; et: string }>();
  (fichas ?? []).forEach((f) => {
    if (f.numero_cedula) {
      fichaMap.set(f.numero_cedula, {
        nombre: f.nombres_apellidos,
        institucion: f.nombre_ie,
        region: f.region ?? "",
        et: f.entidad_territorial ?? "",
      });
    }
  });

  // 4. Group evaluaciones and seguimientos by directivo_cedula
  const evalByDirectivo = new Map<string, Map<string, string | null>>(); // cedula → (item_id → acordado_nivel)
  (evaluaciones ?? []).forEach((e) => {
    if (!evalByDirectivo.has(e.directivo_cedula)) evalByDirectivo.set(e.directivo_cedula, new Map());
    evalByDirectivo.get(e.directivo_cedula)!.set(e.item_id, e.acordado_nivel);
  });

  const segByDirectivo = new Map<string, Map<string, { nivel: string | null; created_at: string }[]>>();
  (seguimientos ?? []).forEach((s) => {
    if (!segByDirectivo.has(s.directivo_cedula)) segByDirectivo.set(s.directivo_cedula, new Map());
    const map = segByDirectivo.get(s.directivo_cedula)!;
    if (!map.has(s.item_id)) map.set(s.item_id, []);
    map.get(s.item_id)!.push({ nivel: s.nivel, created_at: s.created_at });
  });

  // 5. Get all unique cedulas
  const allCedulas = new Set<string>();
  (evaluaciones ?? []).forEach((e) => allCedulas.add(e.directivo_cedula));
  (seguimientos ?? []).forEach((s) => allCedulas.add(s.directivo_cedula));

  // 6. Calculate per-directivo
  const results: DirectivoRubricaResult[] = [];

  for (const cedula of allCedulas) {
    // Filter if needed
    if (filteredCedulas && !filteredCedulas.includes(cedula)) continue;

    const fichaInfo = fichaMap.get(cedula);
    if (!fichaInfo) continue; // skip if no ficha

    const evalMap = evalByDirectivo.get(cedula) ?? new Map();
    const segMap = segByDirectivo.get(cedula) ?? new Map();

    const moduleLevels: Record<number, string | null> = {};
    const moduleNumericLevels: Record<number, number | null> = {};

    for (const modNum of [1, 2, 3, 4]) {
      const modItems = itemsByModule.get(modNum) ?? [];
      const level = determineModuleLevel(modItems, evalMap, segMap);
      moduleLevels[modNum] = level;
      moduleNumericLevels[modNum] = nivelToNum(level);
    }

    // KPI 1: Intermedio or Avanzado in ≥3 modules
    const evaluatedModules = [1, 2, 3, 4].filter((m) => moduleLevels[m] != null);
    const passingModules = [1, 2, 3, 4].filter((m) => {
      const num = moduleNumericLevels[m];
      return num != null && num >= 3; // Intermedio (3) or Avanzado (4)
    });

    // KPI 2a: Avanzado in Module 1 (Autoconocimiento)
    const mod1Avanzado = moduleNumericLevels[1] === 4;
    // KPI 2b: Avanzado in Module 2 (Comunicación Asertiva)
    const mod2Avanzado = moduleNumericLevels[2] === 4;
    // KPI 3: Avanzado in Module 3
    const mod3Avanzado = moduleNumericLevels[3] === 4;

    results.push({
      cedula,
      nombre: fichaInfo.nombre,
      institucion: fichaInfo.institucion,
      region: fichaInfo.region,
      entidadTerritorial: fichaInfo.et,
      moduleLevels,
      moduleNumericLevels,
      kpi1Cumple: passingModules.length >= 3,
      kpi1ModulesCount: evaluatedModules.length,
      kpi1PassingCount: passingModules.length,
      kpi2aCumple: mod1Avanzado,
      kpi2aHasMod1: moduleLevels[1] != null,
      kpi2bCumple: mod2Avanzado,
      kpi2bHasMod2: moduleLevels[2] != null,
      kpi3Cumple: mod3Avanzado,
      kpi3HasMod3: moduleLevels[3] != null,
    });
  }

  // 7. Aggregate KPIs
  // KPI 1: denominator = rectores with evaluación válida in ≥3 modules
  const kpi1Eligible = results.filter((r) => r.kpi1ModulesCount >= 3);
  const kpi1Pass = kpi1Eligible.filter((r) => r.kpi1Cumple);

  // KPI 2a: denominator = rectores evaluated in module 1
  const kpi2aEligible = results.filter((r) => r.kpi2aHasMod1);
  const kpi2aPass = kpi2aEligible.filter((r) => r.kpi2aCumple);

  // KPI 2b: denominator = rectores evaluated in module 2
  const kpi2bEligible = results.filter((r) => r.kpi2bHasMod2);
  const kpi2bPass = kpi2bEligible.filter((r) => r.kpi2bCumple);

  // KPI 3: denominator = rectores evaluated in module 3
  const kpi3Eligible = results.filter((r) => r.kpi3HasMod3);
  const kpi3Pass = kpi3Eligible.filter((r) => r.kpi3Cumple);

  return {
    directivos: results,
    kpis: {
      kpi1: {
        numerator: kpi1Pass.length,
        denominator: kpi1Eligible.length,
        percentage: kpi1Eligible.length > 0 ? (kpi1Pass.length / kpi1Eligible.length) * 100 : 0,
        meta: 85,
      },
      kpi2a: {
        numerator: kpi2aPass.length,
        denominator: kpi2aEligible.length,
        percentage: kpi2aEligible.length > 0 ? (kpi2aPass.length / kpi2aEligible.length) * 100 : 0,
        meta: 80,
      },
      kpi2b: {
        numerator: kpi2bPass.length,
        denominator: kpi2bEligible.length,
        percentage: kpi2bEligible.length > 0 ? (kpi2bPass.length / kpi2bEligible.length) * 100 : 0,
        meta: 80,
      },
      kpi3: {
        numerator: kpi3Pass.length,
        denominator: kpi3Eligible.length,
        percentage: kpi3Eligible.length > 0 ? (kpi3Pass.length / kpi3Eligible.length) * 100 : 0,
        meta: 80,
      },
    },
  };
}

export { NIVEL_LABELS };
