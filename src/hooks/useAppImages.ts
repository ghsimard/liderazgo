import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Static fallback imports
import staticLogoRlt from "@/assets/logo_rlt.png";
import staticLogoRltWhite from "@/assets/logo_rlt_white.jpeg";
import staticLogoClt from "@/assets/logo_clt.png";
import staticLogoCltDark from "@/assets/logo_clt_dark.png";
import staticLogoCltWhite from "@/assets/logo_clt_white.jpeg";
import staticLogoCosmo from "@/assets/logo_cosmo.png";
import staticLogoCosmoWhite from "@/assets/logo_cosmo_white.png";

export interface AppImageConfig {
  key: string;
  label: string;
  description: string;
  fallback: string;
  /** true if it's in /public rather than /src/assets */
  isPublic?: boolean;
}

export const APP_IMAGE_CONFIGS: AppImageConfig[] = [
  { key: "logo_rlt", label: "Logo RLT", description: "Logo principal Rectores Líderes Transformadores", fallback: staticLogoRlt },
  { key: "logo_rlt_white", label: "Logo RLT (blanco)", description: "Version blanche pour fonds sombres", fallback: staticLogoRltWhite },
  { key: "logo_clt", label: "Logo CLT", description: "Logo Coordinadores Líderes Transformadores", fallback: staticLogoClt },
  { key: "logo_clt_dark", label: "Logo CLT (sombre)", description: "Version sombre du logo CLT", fallback: staticLogoCltDark },
  { key: "logo_clt_white", label: "Logo CLT (blanco)", description: "Version blanche du logo CLT", fallback: staticLogoCltWhite },
  { key: "logo_cosmo", label: "Logo Cosmo Schools", description: "Logo Cosmo Schools", fallback: staticLogoCosmo },
  { key: "logo_cosmo_white", label: "Logo Cosmo Schools (blanco)", description: "Version blanche Cosmo Schools", fallback: staticLogoCosmoWhite },
  { key: "cover_bg", label: "Image couverture PDF", description: "Arrière-plan de la page de couverture du rapport 360°", fallback: "/images/cover-bg-logo.png", isPublic: true },
  { key: "lightbulb_icon", label: "Icône ampoule", description: "Icône utilisée dans les sections info du PDF", fallback: "/images/lightbulb-icon.png", isPublic: true },
];

const FALLBACK_MAP: Record<string, string> = {};
APP_IMAGE_CONFIGS.forEach((c) => { FALLBACK_MAP[c.key] = c.fallback; });

interface AppImagesState {
  images: Record<string, string>;
  loading: boolean;
}

let cachedImages: Record<string, string> | null = null;
let cachePromise: Promise<Record<string, string>> | null = null;

function buildPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from("app-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function fetchImages(): Promise<Record<string, string>> {
  const result = { ...FALLBACK_MAP };
  const { data } = await supabase.from("app_images").select("image_key, storage_path");
  if (data) {
    for (const row of data) {
      result[row.image_key] = buildPublicUrl(row.storage_path);
    }
  }
  return result;
}

export function useAppImages(): AppImagesState {
  const [images, setImages] = useState<Record<string, string>>(cachedImages ?? FALLBACK_MAP);
  const [loading, setLoading] = useState(!cachedImages);

  useEffect(() => {
    if (cachedImages) return;
    if (!cachePromise) {
      cachePromise = fetchImages();
    }
    cachePromise.then((result) => {
      cachedImages = result;
      setImages(result);
      setLoading(false);
    });
  }, []);

  return { images, loading };
}

/** Invalidate the cache so next useAppImages call refetches */
export function invalidateAppImagesCache() {
  cachedImages = null;
  cachePromise = null;
}
