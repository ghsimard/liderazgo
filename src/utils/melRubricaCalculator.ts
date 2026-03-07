/**
 * MEL Rúbricas Calculator
 * 
 * Dynamically calculates KPIs based on mel_kpi_config table.
 * Supports 3 formula types: item_level, module_level, module_count.
 */

import { supabase } from "@/utils/dbClient";

// ── Types ──

export interface KpiConfigRow {
  id: string;
  kpi_key: string;
  label: string;
  description: string;
  meta_percentage: number;
  formula_type: string; // 'item_level' | 'module_level' | 'module_count'
  target_item_id: string | null;
  target_module_number: number | null;
  required_level: string;
  min_modules: number | null;
  threshold_level: string | null;
  sort_order: number;
  is_active: boolean;
  color_class: string;
}

export interface DirectivoRubricaResult {
  cedula: string;
  nombre: string;
  institucion: string;
  region: string;
  entidadTerritorial: string;
  moduleLevels: Record<number, string | null>;
  moduleNumericLevels: Record<number, number | null>;
  /** Dynamic KPI results: kpi_key → { cumple, hasData } */
  kpiResults: Record<string, { cumple: boolean; hasData: boolean }>;
  // Legacy fields for backward compatibility
  kpi1Cumple: boolean;
  kpi1ModulesCount: number;
  kpi1PassingCount: number;
  kpi2aCumple: boolean;
  kpi2aHasItem: boolean;
  kpi2bCumple: boolean;
  kpi2bHasItem: boolean;
  kpi3Cumple: boolean;
  kpi3HasMod3: boolean;
}

export interface KpiResult {
  numerator: number;
  denominator: number;
  percentage: number;
  meta: number;
  label: string;
  description: string;
  color_class: string;
  kpi_key: string;
}

export interface MelRubricaKPIs {
  // Legacy indexed access
  kpi1: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi2a: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi2b: { numerator: number; denominator: number; percentage: number; meta: number };
  kpi3: { numerator: number; denominator: number; percentage: number; meta: number };
  // Dynamic list
  [key: string]: { numerator: number; denominator: number; percentage: number; meta: number; label?: string; description?: string; color_class?: string; kpi_key?: string };
}

export interface MelRubricaData {
  directivos: DirectivoRubricaResult[];
  kpis: MelRubricaKPIs;
  kpiConfigs: KpiConfigRow[];
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

function determineModuleLevel(
  moduloItems: string[],
  evaluaciones: Map<string, string | null>,
  seguimientos: Map<string, { nivel: string | null; created_at: string }[]>
): string | null {
  const levels: string[] = [];
  for (const itemId of moduloItems) {
    const segs = seguimientos.get(itemId);
    if (segs && segs.length > 0) {
      const latest = segs[segs.length - 1];
      if (latest.nivel) { levels.push(latest.nivel); continue; }
    }
    const acordado = evaluaciones.get(itemId);
    if (acordado) levels.push(acordado);
  }
  if (levels.length === 0) return null;
  const freq: Record<string, number> = {};
  levels.forEach((l) => { freq[l] = (freq[l] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function determineItemLevel(
  itemId: string,
  evaluaciones: Map<string, string | null>,
  seguimientos: Map<string, { nivel: string | null; created_at: string }[]>
): string | null {
  const segs = seguimientos.get(itemId);
  if (segs && segs.length > 0) {
    const latest = segs[segs.length - 1];
    if (latest.nivel) return latest.nivel;
  }
  return evaluaciones.get(itemId) ?? null;
}

/**
 * Evaluate a single KPI for a directivo based on config.
 */
function evaluateKpi(
  config: KpiConfigRow,
  moduleLevels: Record<number, string | null>,
  moduleNumericLevels: Record<number, number | null>,
  evalMap: Map<string, string | null>,
  segMap: Map<string, { nivel: string | null; created_at: string }[]>,
  itemsByModule: Map<number, string[]>,
): { cumple: boolean; hasData: boolean } {
  const requiredNum = NIVEL_TO_NUM[config.required_level] ?? 4;

  if (config.formula_type === "item_level") {
    if (!config.target_item_id) return { cumple: false, hasData: false };
    const level = determineItemLevel(config.target_item_id, evalMap, segMap);
    if (!level) return { cumple: false, hasData: false };
    const num = nivelToNum(level);
    return { cumple: num != null && num >= requiredNum, hasData: true };
  }

  if (config.formula_type === "module_level") {
    const modNum = config.target_module_number;
    if (modNum == null) return { cumple: false, hasData: false };
    const level = moduleLevels[modNum];
    if (!level) return { cumple: false, hasData: false };
    const num = moduleNumericLevels[modNum];
    return { cumple: num != null && num >= requiredNum, hasData: true };
  }

  if (config.formula_type === "module_count") {
    const thresholdNum = NIVEL_TO_NUM[config.threshold_level ?? "intermedio"] ?? 3;
    const minMods = config.min_modules ?? 3;
    const evaluatedModules = [1, 2, 3, 4].filter((m) => moduleLevels[m] != null);
    const passingModules = [1, 2, 3, 4].filter((m) => {
      const num = moduleNumericLevels[m];
      return num != null && num >= thresholdNum;
    });
    return {
      cumple: passingModules.length >= minMods,
      hasData: evaluatedModules.length >= minMods,
    };
  }

  return { cumple: false, hasData: false };
}

// ── Main calculation ──

export async function calcularMelRubricas(
  filteredCedulas?: string[],
  regionFilter?: string
): Promise<MelRubricaData> {
  // 1. Fetch modules, items, KPI config, and group assignments
  const [{ data: modules }, { data: items }, { data: kpiConfigs }, { data: evaluaciones }, { data: seguimientos }, { data: fichas }, { data: regionsData }, { data: groupItemsData }] = await Promise.all([
    supabase.from("rubrica_modules").select("id, module_number").order("module_number"),
    supabase.from("rubrica_items").select("id, module_id").order("sort_order"),
    supabase.from("mel_kpi_config").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("rubrica_evaluaciones").select("item_id, directivo_cedula, acordado_nivel"),
    supabase.from("rubrica_seguimientos").select("item_id, directivo_cedula, nivel, created_at").order("created_at"),
    supabase.from("fichas_rlt")
      .select("numero_cedula, nombres_apellidos, nombre_ie, region, entidad_territorial, cargo_actual")
      .in("cargo_actual", ["Rector/a", "Coordinador/a"]),
    supabase.from("regiones").select("id, nombre, kpi_group_id"),
    supabase.from("mel_kpi_group_items").select("group_id, kpi_config_id, meta_override"),
  ]);

  // Determine active KPIs, potentially filtered by region's group
  let activeKpis: KpiConfigRow[] = (kpiConfigs ?? []).map(k => ({ ...k, meta_percentage: Number(k.meta_percentage) }));

  // If a region filter is set, check if it has a KPI group
  if (regionFilter) {
    const region = (regionsData ?? []).find(r => r.nombre === regionFilter);
    if (region?.kpi_group_id) {
      const groupItems = (groupItemsData ?? []).filter(gi => gi.group_id === region.kpi_group_id);
      const allowedKpiIds = new Set(groupItems.map(gi => gi.kpi_config_id));
      const metaOverrides = new Map<string, number | null>(groupItems.map(gi => [gi.kpi_config_id, gi.meta_override ? Number(gi.meta_override) : null]));
      activeKpis = activeKpis
        .filter(k => allowedKpiIds.has(k.id))
        .map(k => {
          const override = metaOverrides.get(k.id);
          return override != null ? { ...k, meta_percentage: override as number } : k;
        });
    }
  }

  const moduleMap = new Map<string, number>();
  (modules ?? []).forEach((m) => moduleMap.set(m.id, m.module_number));

  const itemsByModule = new Map<number, string[]>();
  const itemToModule = new Map<string, number>();
  (items ?? []).forEach((item) => {
    const modNum = moduleMap.get(item.module_id);
    if (modNum == null) return;
    if (!itemsByModule.has(modNum)) itemsByModule.set(modNum, []);
    itemsByModule.get(modNum)!.push(item.id);
    itemToModule.set(item.id, modNum);
  });

  // 2. Build maps
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

  const evalByDirectivo = new Map<string, Map<string, string | null>>();
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

  // 3. Get all unique cedulas
  const allCedulas = new Set<string>();
  (evaluaciones ?? []).forEach((e) => allCedulas.add(e.directivo_cedula));
  (seguimientos ?? []).forEach((s) => allCedulas.add(s.directivo_cedula));

  // 4. Calculate per-directivo
  const results: DirectivoRubricaResult[] = [];

  for (const cedula of allCedulas) {
    if (filteredCedulas && !filteredCedulas.includes(cedula)) continue;
    const fichaInfo = fichaMap.get(cedula);
    if (!fichaInfo) continue;

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

    // Evaluate all dynamic KPIs
    const kpiResults: Record<string, { cumple: boolean; hasData: boolean }> = {};
    for (const config of activeKpis) {
      kpiResults[config.kpi_key] = evaluateKpi(config, moduleLevels, moduleNumericLevels, evalMap, segMap, itemsByModule);
    }

    // Legacy compatibility
    const evaluatedModules = [1, 2, 3, 4].filter((m) => moduleLevels[m] != null);
    const passingModules = [1, 2, 3, 4].filter((m) => {
      const num = moduleNumericLevels[m];
      return num != null && num >= 3;
    });

    results.push({
      cedula,
      nombre: fichaInfo.nombre,
      institucion: fichaInfo.institucion,
      region: fichaInfo.region,
      entidadTerritorial: fichaInfo.et,
      moduleLevels,
      moduleNumericLevels,
      kpiResults,
      // Legacy
      kpi1Cumple: kpiResults["kpi1"]?.cumple ?? false,
      kpi1ModulesCount: evaluatedModules.length,
      kpi1PassingCount: passingModules.length,
      kpi2aCumple: kpiResults["kpi2a"]?.cumple ?? false,
      kpi2aHasItem: kpiResults["kpi2a"]?.hasData ?? false,
      kpi2bCumple: kpiResults["kpi2b"]?.cumple ?? false,
      kpi2bHasItem: kpiResults["kpi2b"]?.hasData ?? false,
      kpi3Cumple: kpiResults["kpi3"]?.cumple ?? false,
      kpi3HasMod3: kpiResults["kpi3"]?.hasData ?? false,
    });
  }

  // 5. Aggregate KPIs dynamically
  const dynamicKpis: Record<string, KpiResult> = {};
  for (const config of activeKpis) {
    const eligible = results.filter((r) => r.kpiResults[config.kpi_key]?.hasData);
    const pass = eligible.filter((r) => r.kpiResults[config.kpi_key]?.cumple);
    dynamicKpis[config.kpi_key] = {
      numerator: pass.length,
      denominator: eligible.length,
      percentage: eligible.length > 0 ? (pass.length / eligible.length) * 100 : 0,
      meta: config.meta_percentage,
      label: config.label,
      description: config.description,
      color_class: config.color_class,
      kpi_key: config.kpi_key,
    };
  }

  // Build legacy kpis object with dynamic fallback
  const kpis: MelRubricaKPIs = {
    kpi1: dynamicKpis["kpi1"] ?? { numerator: 0, denominator: 0, percentage: 0, meta: 85 },
    kpi2a: dynamicKpis["kpi2a"] ?? { numerator: 0, denominator: 0, percentage: 0, meta: 80 },
    kpi2b: dynamicKpis["kpi2b"] ?? { numerator: 0, denominator: 0, percentage: 0, meta: 80 },
    kpi3: dynamicKpis["kpi3"] ?? { numerator: 0, denominator: 0, percentage: 0, meta: 80 },
    ...dynamicKpis,
  };

  return {
    directivos: results,
    kpis,
    kpiConfigs: activeKpis,
  };
}

export { NIVEL_LABELS };
