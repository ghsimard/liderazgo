import { useEffect, useState } from "react";
import { supabase } from "@/utils/dbClient";

interface RegionData {
  id: string;
  nombre: string;
  entidad_ids: string[];
  entidad_nombres: string[];
  municipio_ids: string[];
  institucion_ids: string[];
  mostrar_logo_rlt: boolean;
  mostrar_logo_clt: boolean;
}

interface MunicipioData {
  id: string;
  nombre: string;
  entidad_territorial_id: string;
}

interface InstitucionData {
  id: string;
  nombre: string;
  municipio_id: string;
}

interface EntidadData {
  id: string;
  nombre: string;
}

export function useGeographicData() {
  const [entidades, setEntidades] = useState<EntidadData[]>([]);
  const [regiones, setRegiones] = useState<RegionData[]>([]);
  const [municipios, setMunicipios] = useState<MunicipioData[]>([]);
  const [instituciones, setInstituciones] = useState<InstitucionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Paginate large tables to stay under the 1000-row API limit.
      const fetchAll = async <T = any>(
        table: string,
        columns: string,
        pageSize = 900,
      ): Promise<T[]> => {
        const all: T[] = [];
        let from = 0;
        let to = pageSize - 1;
        let page: T[] = [];
        do {
          const { data, error } = await supabase
            .from(table as any)
            .select(columns)
            .order("id")
            .range(from, to);
          if (error) {
            console.error(`[useGeographicData] error fetching ${table}:`, error);
            break;
          }
          page = (data ?? []) as T[];
          all.push(...page);
          from += pageSize;
          to += pageSize;
        } while (page.length === pageSize);
        return all;
      };

      const [ents, regs, res, rms, ris, munis, insts] = await Promise.all([
        fetchAll<EntidadData>("entidades_territoriales", "id, nombre"),
        fetchAll<RegionData>("regiones", "*"),
        fetchAll<{ region_id: string; entidad_territorial_id: string }>(
          "region_entidades",
          "region_id, entidad_territorial_id",
        ),
        fetchAll<{ region_id: string; municipio_id: string }>(
          "region_municipios",
          "region_id, municipio_id",
        ),
        fetchAll<{ region_id: string; institucion_id: string }>(
          "region_instituciones",
          "region_id, institucion_id",
        ),
        fetchAll<MunicipioData>(
          "municipios",
          "id, nombre, entidad_territorial_id",
        ),
        fetchAll<InstitucionData>("instituciones", "id, nombre, municipio_id"),
      ]);

      setEntidades(ents);
      setMunicipios(munis);
      setInstituciones(insts);

      // Build region data with entidad IDs/names, municipio IDs and institution IDs
      const regionData: RegionData[] = regs.map((r: any) => {
        const entidadIds = res
          .filter((re: any) => re.region_id === r.id)
          .map((re: any) => re.entidad_territorial_id);
        const entidadNombres = entidadIds
          .map((eid: string) => ents.find((e: any) => e.id === eid)?.nombre)
          .filter(Boolean) as string[];
        const munIds = rms
          .filter((rm: any) => rm.region_id === r.id)
          .map((rm: any) => rm.municipio_id);
        const instIds = ris
          .filter((ri: any) => ri.region_id === r.id)
          .map((ri: any) => ri.institucion_id);
        return {
          ...r,
          mostrar_logo_rlt: r.mostrar_logo_rlt ?? true,
          mostrar_logo_clt: r.mostrar_logo_clt ?? true,
          entidad_ids: entidadIds,
          entidad_nombres: entidadNombres,
          municipio_ids: munIds,
          institucion_ids: instIds,
        };
      });
      setRegiones(regionData);
      setLoading(false);
    })();
  }, []);

  /** Get the entidad territorial names for a region (may be multiple) */
  const getEntidadesForRegion = (regionName: string): string[] => {
    const region = regiones.find((r) => r.nombre === regionName);
    return region?.entidad_nombres ?? [];
  };

  /** Legacy helper: returns single entidad name or empty string (for backward compat when only 1) */
  const getEntidadForRegion = (regionName: string): string => {
    const names = getEntidadesForRegion(regionName);
    return names.length === 1 ? names[0] : "";
  };

  /** Check if RLT logo should be shown for a region */
  const getShowLogoRlt = (regionName: string): boolean => {
    const region = regiones.find((r) => r.nombre === regionName);
    return region?.mostrar_logo_rlt ?? true;
  };

  /** Check if CLT logo should be shown for a region */
  const getShowLogoClt = (regionName: string): boolean => {
    const region = regiones.find((r) => r.nombre === regionName);
    return region?.mostrar_logo_clt ?? true;
  };

  /** Get municipio names for a region (ordered) */
  const getMunicipiosForRegion = (regionName: string): string[] => {
    const region = regiones.find((r) => r.nombre === regionName);
    if (!region) return [];
    return region.municipio_ids
      .map((mid) => municipios.find((m) => m.id === mid)?.nombre)
      .filter(Boolean)
      .sort() as string[];
  };

  /** Get institution names for a specific municipio within a region */
  const getInstitucionesForMunicipio = (regionName: string, municipioName: string): string[] => {
    const region = regiones.find((r) => r.nombre === regionName);
    if (!region) return [];
    const muni = municipios.find(
      (m) => m.nombre === municipioName && region.municipio_ids.includes(m.id)
    );
    if (!muni) return [];
    let result = instituciones.filter((i) => i.municipio_id === muni.id);
    if (region.institucion_ids.length > 0) {
      result = result.filter((i) => region.institucion_ids.includes(i.id));
    }
    return result.map((i) => i.nombre);
  };

  /** Get all institution names for a region */
  const getInstitucionesForRegion = (regionName: string): string[] => {
    const region = regiones.find((r) => r.nombre === regionName);
    if (!region) return [];
    if (region.institucion_ids.length > 0) {
      return instituciones
        .filter((i) => region.institucion_ids.includes(i.id))
        .map((i) => i.nombre);
    }
    return instituciones
      .filter((i) => region.municipio_ids.some((mid) => {
        const muni = municipios.find((m) => m.id === mid);
        return muni && i.municipio_id === muni.id;
      }))
      .map((i) => i.nombre);
  };

  /** Get municipios for an entidad territorial (for admin edit) */
  const getMunicipiosForEntidad = (entidadName: string): string[] => {
    const entidad = entidades.find((e) => e.nombre === entidadName);
    if (!entidad) return [];
    return municipios
      .filter((m) => m.entidad_territorial_id === entidad.id)
      .map((m) => m.nombre)
      .sort();
  };

  /** Get institutions for a municipio by name and entidad (for admin edit) */
  const getInstitucionesForMunicipioByEntidad = (entidadName: string, municipioName: string): string[] => {
    const entidad = entidades.find((e) => e.nombre === entidadName);
    if (!entidad) return [];
    const muni = municipios.find(
      (m) => m.nombre === municipioName && m.entidad_territorial_id === entidad.id
    );
    if (!muni) return [];
    return instituciones.filter((i) => i.municipio_id === muni.id).map((i) => i.nombre);
  };

  const entidadNames = entidades.map((e) => e.nombre).sort((a, b) => a.localeCompare(b, "es"));
  const regionNames = regiones.map((r) => r.nombre);

  return {
    loading,
    regionNames,
    entidadNames,
    getEntidadForRegion,
    getEntidadesForRegion,
    getShowLogoRlt,
    getShowLogoClt,
    getMunicipiosForRegion,
    getInstitucionesForMunicipio,
    getInstitucionesForRegion,
    getMunicipiosForEntidad,
    getInstitucionesForMunicipioByEntidad,
  };
}
