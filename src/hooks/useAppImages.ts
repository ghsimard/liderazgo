import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";

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
  { key: "logo_rlt", label: "Logo RLT", description: "Header formulaires, header admin, page login, couverture PDF 360°, en-tête PDF ficha", fallback: staticLogoRlt },
  { key: "logo_rlt_white", label: "Logo RLT (blanco)", description: "Couverture PDF 360° (fond sombre), en-tête PDF ficha (version impression)", fallback: staticLogoRltWhite },
  { key: "logo_clt", label: "Logo CLT", description: "Header formulaire Ficha (écran sélecteur de région)", fallback: staticLogoClt },
  { key: "logo_clt_dark", label: "Logo CLT (sombre)", description: "Header formulaire Ficha, header admin édition ficha (fond clair)", fallback: staticLogoCltDark },
  { key: "logo_clt_white", label: "Logo CLT (blanco)", description: "Couverture PDF 360°, en-tête PDF ficha (version impression)", fallback: staticLogoCltWhite },
  { key: "logo_cosmo", label: "Logo Cosmo Schools", description: "Footer formulaires web (fond blanc), footer admin édition ficha", fallback: staticLogoCosmo },
  { key: "logo_cosmo_white", label: "Logo Cosmo Schools (blanco)", description: "Footer PDF ficha (version impression, fond sombre)", fallback: staticLogoCosmoWhite },
  { key: "cover_bg", label: "Image couverture PDF", description: "Arrière-plan page 1 du rapport PDF 360° (derrière le titre principal)", fallback: "/images/cover-bg-logo.png", isPublic: true },
  { key: "lightbulb_icon", label: "Icône ampoule", description: "Boîtes d'information dans le rapport PDF 360° (sections conseils)", fallback: "/images/lightbulb-icon.png", isPublic: true },
];

const FALLBACK_MAP: Record<string, string> = {};
APP_IMAGE_CONFIGS.forEach((c) => { FALLBACK_MAP[c.key] = c.fallback; });

interface AppImagesState {
  images: Record<string, string>;
  loading: boolean;
}

let cachedImages: Record<string, string> | null = null;
let cachePromise: Promise<Record<string, string>> | null = null;

async function fetchImages(): Promise<Record<string, string>> {
  const result = { ...FALLBACK_MAP };
  const { data } = await apiFetch<{ images: { image_key: string; storage_path: string }[] }>("/api/images");
  if (data?.images) {
    for (const row of data.images) {
      result[row.image_key] = row.storage_path;
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
