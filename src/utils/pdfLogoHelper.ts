/**
 * Centralized PDF logo utilities.
 *
 * ALL PDF generators should import from here instead of defining their own
 * `loadImageAsBase64` / `getImageNaturalSize` or ad-hoc sizing logic.
 *
 * Rules:
 * - Cover page: programme logos (RLT/CLT white) in the body, height = COVER_LOGO_H
 * - Interior pages: RLT/CLT white logos in header, height = HEADER_LOGO_H
 * - Footer (all pages): Cosmo logo, height = FOOTER_COSMO_H
 * - All logos use `_white` variants (designed for white backgrounds)
 * - Width is always computed proportionally from the natural aspect ratio
 */

import jsPDF from "jspdf";

// ── Dimension constants (mm) ──────────────────────────────────────
export const COVER_LOGO_H = 24;   // Cover page programme logos
export const HEADER_LOGO_H = 14;  // Interior page header logos
export const FOOTER_COSMO_H = 7;  // Footer Cosmo logo

// ── Image loading utilities ───────────────────────────────────────

/** Convert an image URL / imported asset to a base64 data URL */
export function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Get the natural pixel dimensions of an image */
export function getImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Load image returning both base64 and natural dimensions */
export async function loadImageWithSize(src: string): Promise<{ b64: string; width: number; height: number }> {
  const [b64, size] = await Promise.all([loadImageAsBase64(src), getImageNaturalSize(src)]);
  return { b64, width: size.width, height: size.height };
}

// ── Proportional sizing ───────────────────────────────────────────

/** Compute width (mm) for a given target height, preserving aspect ratio */
export function logoDims(naturalW: number, naturalH: number, targetH: number): { w: number; h: number } {
  return { w: (naturalW / naturalH) * targetH, h: targetH };
}

// ── Standardised logo source keys ─────────────────────────────────

/**
 * Given the `images` record from `useAppImages()`, return the standardised
 * logo source URLs that all PDF generators should use.
 *
 * Always selects the `_white` variants (designed for white/light backgrounds).
 */
export function getPdfLogoSources(images: Record<string, string>) {
  return {
    logoRLT: images.logo_rlt_white,
    logoCLT: images.logo_clt_white || images.logo_clt,
    logoCosmo: images.logo_cosmo,
  };
}

// ── Loaded logo set (ready to draw) ───────────────────────────────

export interface LoadedLogos {
  rltB64: string;
  cltB64: string;
  cosmoB64: string;
  rltSize: { width: number; height: number };
  cltSize: { width: number; height: number };
  cosmoSize: { width: number; height: number };
  showRlt: boolean;
  showClt: boolean;
}

/**
 * Load all PDF logos in parallel.
 * Skipped logos (show*=false) get empty b64 and unit size.
 */
export async function loadPdfLogos(
  sources: { logoRLT: string; logoCLT: string; logoCosmo: string },
  showRlt = true,
  showClt = true,
): Promise<LoadedLogos> {
  const UNIT = { width: 1, height: 1 };
  const [rltB64, cltB64, cosmoB64, rltSize, cltSize, cosmoSize] = await Promise.all([
    showRlt ? loadImageAsBase64(sources.logoRLT) : Promise.resolve(""),
    showClt ? loadImageAsBase64(sources.logoCLT) : Promise.resolve(""),
    loadImageAsBase64(sources.logoCosmo),
    showRlt ? getImageNaturalSize(sources.logoRLT) : Promise.resolve(UNIT),
    showClt ? getImageNaturalSize(sources.logoCLT) : Promise.resolve(UNIT),
    getImageNaturalSize(sources.logoCosmo),
  ]);
  return { rltB64, cltB64, cosmoB64, rltSize, cltSize, cosmoSize, showRlt, showClt };
}

// ── Drawing helpers ───────────────────────────────────────────────

/**
 * Draw programme logos on the cover page.
 * - 2 logos → centred together with a gap
 * - 1 logo → centred horizontally
 * - 0 logos → nothing drawn
 *
 * Returns the Y coordinate below the drawn logos.
 */
export function drawCoverLogos(
  doc: jsPDF,
  logos: LoadedLogos,
  opts: { y: number; pageW: number; gap?: number; targetH?: number },
): number {
  const targetH = opts.targetH ?? COVER_LOGO_H;
  const gap = opts.gap ?? 12;
  const { showRlt, showClt, rltB64, cltB64, rltSize, cltSize } = logos;
  const hasRlt = showRlt && !!rltB64;
  const hasClt = showClt && !!cltB64;

  if (!hasRlt && !hasClt) return opts.y;

  const rltDims = hasRlt ? logoDims(rltSize.width, rltSize.height, targetH) : { w: 0, h: 0 };
  const cltDims = hasClt ? logoDims(cltSize.width, cltSize.height, targetH) : { w: 0, h: 0 };

  if (hasRlt && hasClt) {
    const totalW = rltDims.w + gap + cltDims.w;
    const startX = (opts.pageW - totalW) / 2;
    doc.addImage(rltB64, "PNG", startX, opts.y, rltDims.w, rltDims.h);
    doc.addImage(cltB64, "PNG", startX + rltDims.w + gap, opts.y, cltDims.w, cltDims.h);
  } else if (hasRlt) {
    doc.addImage(rltB64, "PNG", (opts.pageW - rltDims.w) / 2, opts.y, rltDims.w, rltDims.h);
  } else {
    doc.addImage(cltB64, "PNG", (opts.pageW - cltDims.w) / 2, opts.y, cltDims.w, cltDims.h);
  }

  return opts.y + targetH;
}

/**
 * Draw RLT/CLT logos in the header of interior pages.
 * - 2 logos → left and right
 * - 1 logo → right-aligned
 */
export function drawPageHeaderLogos(
  doc: jsPDF,
  logos: LoadedLogos,
  opts: { margin: number; pageW: number; y?: number; targetH?: number },
): void {
  const targetH = opts.targetH ?? HEADER_LOGO_H;
  const logoY = opts.y ?? 8;
  const { showRlt, showClt, rltB64, cltB64, rltSize, cltSize } = logos;
  const hasRlt = showRlt && !!rltB64;
  const hasClt = showClt && !!cltB64;

  if (hasRlt && hasClt) {
    const rltDims = logoDims(rltSize.width, rltSize.height, targetH);
    const cltDims = logoDims(cltSize.width, cltSize.height, targetH);
    doc.addImage(rltB64, "PNG", opts.margin, logoY, rltDims.w, rltDims.h);
    doc.addImage(cltB64, "PNG", opts.pageW - opts.margin - cltDims.w, logoY, cltDims.w, cltDims.h);
  } else if (hasRlt) {
    const dims = logoDims(rltSize.width, rltSize.height, targetH);
    doc.addImage(rltB64, "PNG", opts.pageW - opts.margin - dims.w, logoY, dims.w, dims.h);
  } else if (hasClt) {
    const dims = logoDims(cltSize.width, cltSize.height, targetH);
    doc.addImage(cltB64, "PNG", opts.pageW - opts.margin - dims.w, logoY, dims.w, dims.h);
  }
}

/**
 * Draw the Cosmo logo + page number in the footer.
 */
export function drawFooterCosmo(
  doc: jsPDF,
  logos: LoadedLogos,
  opts: {
    margin: number;
    pageW: number;
    pageH: number;
    pageNum?: number;
    totalPages?: number;
    footerY?: number;
    targetH?: number;
  },
): void {
  const targetH = opts.targetH ?? FOOTER_COSMO_H;
  const footerY = opts.footerY ?? (opts.pageH - 14);
  const dims = logoDims(logos.cosmoSize.width, logos.cosmoSize.height, targetH);

  if (logos.cosmoB64) {
    try {
      doc.addImage(logos.cosmoB64, "PNG", opts.margin, footerY, dims.w, dims.h);
    } catch { /* ignore */ }
  }

  if (opts.pageNum != null) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const label = opts.totalPages ? `${opts.pageNum}/${opts.totalPages}` : String(opts.pageNum);
    doc.text(label, opts.pageW - opts.margin, footerY + targetH / 2 + 1, { align: "right" });
  }
}
