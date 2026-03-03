import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { supabase as cloudClient } from "@/utils/dbClient";

// Static fallback imports
import staticLogoRlt from "@/assets/logo_rlt.png";
import staticLogoRltWhite from "@/assets/logo_rlt_white.png";
// logo_clt.png removed — use logo_clt_white.png everywhere
import staticLogoCltDark from "@/assets/logo_clt_dark.png";
import staticLogoCltWhite from "@/assets/logo_clt_white.png";
import staticLogoCosmo from "@/assets/logo_cosmo.png";
import staticLogoCosmoWhite from "@/assets/logo_cosmo_white.png";
import staticLogoRltNoletters from "@/assets/logo_rlt_noletters.png";
import staticLogoCltNoletters from "@/assets/logo_clt_noletters.png";

const USE_EXPRESS = !!import.meta.env.VITE_API_URL;

export interface AppImageConfig {
  key: string;
  label: string;
  description: string;
  fallback: string;
  /** true if it's in /public rather than /src/assets */
  isPublic?: boolean;
}

export const APP_IMAGE_CONFIGS: AppImageConfig[] = [
  { key: "logo_rlt", label: "Logo RLT (fond foncé)", description: "Header formulaires 360° (fond foncé), formulaire Ficha (fond foncé), rapports rúbrica PDF", fallback: staticLogoRlt },
  { key: "logo_rlt_white", label: "Logo RLT (fond blanc)", description: "Header admin, page login, couverture PDF 360°, en-tête PDF ficha", fallback: staticLogoRltWhite },
  { key: "logo_clt", label: "Logo CLT (fond blanc)", description: "Header admin, page login, couverture PDF 360°, rapport régional rúbrica PDF", fallback: staticLogoCltWhite },
  { key: "logo_clt_dark", label: "Logo CLT (fond foncé)", description: "Header formulaire Ficha (sélecteur de région), header admin édition ficha", fallback: staticLogoCltDark },
  { key: "logo_clt_white", label: "Logo CLT (impression)", description: "En-tête PDF ficha (version impression)", fallback: staticLogoCltWhite },
  { key: "logo_cosmo", label: "Logo Cosmo Schools (fond blanc)", description: "Footer formulaires web, footer admin, footer PDF (ficha, rúbrica, 360°, régional)", fallback: staticLogoCosmo },
  { key: "logo_cosmo_white", label: "Logo Cosmo Schools (fond foncé)", description: "Footer PDF ficha (version impression, fond sombre)", fallback: staticLogoCosmoWhite },
  { key: "cover_bg", label: "Image couverture PDF", description: "Arrière-plan page 1 du rapport PDF 360° (derrière le titre principal)", fallback: "/images/cover-bg-logo.png", isPublic: true },
  { key: "lightbulb_icon", label: "Icône ampoule", description: "Boîtes d'information dans le rapport PDF 360° (sections conseils)", fallback: "/images/lightbulb-icon.png", isPublic: true },
  { key: "logo_rlt_noletters", label: "Logo RLT (sans texte)", description: "En-tête web pages (icône seule)", fallback: staticLogoRltNoletters },
  { key: "logo_clt_noletters", label: "Logo CLT (sans texte)", description: "En-tête web pages (icône seule)", fallback: staticLogoCltNoletters },
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

  if (USE_EXPRESS) {
    // Express mode — fetch from API, prefix relative paths
    const apiBase = import.meta.env.VITE_API_URL || "";
    const { data } = await apiFetch<{ images: { image_key: string; storage_path: string }[] }>("/api/images");
    if (data?.images) {
      for (const row of data.images) {
        const src = row.storage_path.startsWith("/uploads/") && apiBase
          ? `${apiBase}${row.storage_path}`
          : row.storage_path;
        result[row.image_key] = src;
      }
    }
  } else {
    // Cloud / Supabase mode — query DB directly
    const { data } = await cloudClient
      .from("app_images")
      .select("image_key, storage_path");
    if (data) {
      for (const row of data) {
        result[row.image_key] = row.storage_path;
      }
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
