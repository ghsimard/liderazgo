import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

interface RegionData {
  id: string;
  nombre: string;
  entidad_territorial_id: string;
  entidad_nombre: string;
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
      const [eRes, rRes, rmRes, riRes, mRes, iRes] = await Promise.all([
        apiFetch<any[]>("/api/geography/entidades"),
        apiFetch<any[]>("/api/geography/regiones"),
        apiFetch<any[]>("/api/geography/region-municipios"),
        apiFetch<any[]>("/api/geography/region-instituciones"),
        apiFetch<any[]>("/api/geography/municipios"),
        apiFetch<any[]>("/api/geography/instituciones"),
      ]);

      const ents = eRes.data ?? [];
      const regs = rRes.data ?? [];
      const rms = rmRes.data ?? [];
      const ris = riRes.data ?? [];
      const munis = mRes.data ?? [];

      setEntidades(ents);
      setMunicipios(munis);
      setInstituciones(iRes.data ?? []);

      // Build region data with entidad name, municipio IDs and institution IDs
      const regionData: RegionData[] = regs.map((r: any) => {
        const entidad = ents.find((e: any) => e.id === r.entidad_territorial_id);
        const munIds = rms.filter((rm: any) => rm.region_id === r.id).map((rm: any) => rm.municipio_id);
        const instIds = ris.filter((ri: any) => ri.region_id === r.id).map((ri: any) => ri.institucion_id);
        return {
          ...r,
          mostrar_logo_rlt: r.mostrar_logo_rlt ?? true,
          mostrar_logo_clt: r.mostrar_logo_clt ?? true,
          entidad_nombre: entidad?.nombre ?? "",
          municipio_ids: munIds,
          institucion_ids: instIds,
        };
      });
      setRegiones(regionData);
      setLoading(false);
    })();
  }, []);

  /** Get the entidad territorial name for a region */
  const getEntidadForRegion = (regionName: string): string => {
    const region = regiones.find((r) => r.nombre === regionName);
    return region?.entidad_nombre ?? "";
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
    getShowLogoRlt,
    getShowLogoClt,
    getMunicipiosForRegion,
    getInstitucionesForMunicipio,
    getInstitucionesForRegion,
    getMunicipiosForEntidad,
    getInstitucionesForMunicipioByEntidad,
  };
}
