import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RegionData {
  id: string;
  nombre: string;
  entidad_territorial_id: string;
  entidad_nombre: string;
  municipio_ids: string[];
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
      const [eRes, rRes, rmRes, mRes, iRes] = await Promise.all([
        supabase.from("entidades_territoriales").select("id, nombre").order("nombre"),
        supabase.from("regiones").select("id, nombre, entidad_territorial_id, mostrar_logo_rlt, mostrar_logo_clt").order("nombre"),
        supabase.from("region_municipios").select("region_id, municipio_id"),
        supabase.from("municipios").select("id, nombre, entidad_territorial_id").order("nombre"),
        supabase.from("instituciones").select("id, nombre, municipio_id").order("nombre"),
      ]);

      const ents = eRes.data ?? [];
      const regs = rRes.data ?? [];
      const rms = rmRes.data ?? [];
      const munis = mRes.data ?? [];

      setEntidades(ents);
      setMunicipios(munis);
      setInstituciones(iRes.data ?? []);

      // Build region data with entidad name and municipio IDs
      const regionData: RegionData[] = regs.map((r) => {
        const entidad = ents.find((e) => e.id === r.entidad_territorial_id);
        const munIds = rms.filter((rm) => rm.region_id === r.id).map((rm) => rm.municipio_id);
        return {
          ...r,
          mostrar_logo_rlt: r.mostrar_logo_rlt ?? true,
          mostrar_logo_clt: r.mostrar_logo_clt ?? true,
          entidad_nombre: entidad?.nombre ?? "",
          municipio_ids: munIds,
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
    // Find the municipio that belongs to this region
    const muni = municipios.find(
      (m) => m.nombre === municipioName && region.municipio_ids.includes(m.id)
    );
    if (!muni) return [];
    return instituciones.filter((i) => i.municipio_id === muni.id).map((i) => i.nombre);
  };

  /** Get all institution names for a region (when there's only one municipio or no filtering needed) */
  const getInstitucionesForRegion = (regionName: string): string[] => {
    const region = regiones.find((r) => r.nombre === regionName);
    if (!region) return [];
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

  /** List of all entidad territorial names */
  const entidadNames = entidades.map((e) => e.nombre).sort((a, b) => a.localeCompare(b, "es"));

  /** List of all region names */
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
