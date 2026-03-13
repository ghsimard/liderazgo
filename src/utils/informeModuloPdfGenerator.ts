import jsPDF from "jspdf";
import { loadImageWithSize as loadImageWithSizeHelper } from "@/utils/pdfLogoHelper";

interface LoadedImage {
  b64: string;
  widthPx: number;
  heightPx: number;
}

async function loadImageWithSize(src: string): Promise<LoadedImage> {
  const r = await loadImageWithSizeHelper(src);
  return { b64: r.b64, widthPx: r.width, heightPx: r.height };
}

/* ── Types ── */

interface EquipoMember { nombre: string; rol: string }
interface AjusteActividad { actividad: string; aciertos: string; desaciertos: string; ajustes: string }
interface SesionesProgramadas {
  coaching_individual: number; coaching_grupal: number; coaching_relacion: number;
  coaching_sombra: number; visita_individual: number; visita_grupal: number;
}
interface AcompanamientoDirectivo {
  cedula: string; nombre: string;
  coaching_individual: number; otras_coaching: number;
  visita_individual: number; visita_grupal: number;
  autoformacion: number; intercambio_pares: number;
  acompanamiento_virtual: number; observacion: string;
}
interface Estrategia { nombre: string; fortalezas: string; dificultades: string }
interface Novedad { nombre: string; institucion: string; novedad: string; fecha: string; soporte: string }

export interface InformeModuloPdfData {
  region: string;
  entidad_territorial: string;
  module_number: number;
  fecha_inicio_intensivo: string;
  fecha_fin_intensivo: string;
  fecha_inicio_interludio: string;
  fecha_fin_interludio: string;
  aprendizajes_intensivo: string;
  ajustes_actividades: AjusteActividad[];
  articulacion_intensivo: string;
  sesiones_programadas: SesionesProgramadas;
  sesiones_realizadas: SesionesProgramadas;
  razones_diferencias: string;
  acompanamiento_descripcion: string;
  acompanamiento_no_cumplido: string;
  acompanamiento_directivos: AcompanamientoDirectivo[];
  estrategias: Estrategia[];
  aprendizajes_interludio: string;
  articulacion_interludio: string;
  contexto_plan_sectorial: string;
  contexto_articulacion: string;
  novedades: Novedad[];
}

export interface DirectivoEvalPdfData {
  directivo_cedula: string;
  directivo_nombre: string;
  institucion: string;
  reto_estrategico: string;
  razon_sin_reto: string;
  avances_personal: string;
  retos_personal: string;
  avances_pedagogica: string;
  retos_pedagogica: string;
  avances_administrativa: string;
  retos_administrativa: string;
}

export interface InformePdfLogos {
  logoRLT: string;
  logoCLT: string;
  logoCosmo: string;
  showLogoRLT: boolean;
  showLogoCLT: boolean;
}

const EMPTY_SESIONES: SesionesProgramadas = {
  coaching_individual: 0, coaching_grupal: 0, coaching_relacion: 0,
  coaching_sombra: 0, visita_individual: 0, visita_grupal: 0,
};

export async function generarPDFInformeModulo(
  informes: InformeModuloPdfData[],
  equipo: Record<string, EquipoMember[]>,
  evaluaciones: DirectivoEvalPdfData[],
  logoSources: InformePdfLogos,
  options: { includeInforme: boolean; includeEvaluacion: boolean },
): Promise<void> {
  /* ── Load images ── */
  const imagePromises: Promise<LoadedImage>[] = [];
  const imageKeys: string[] = [];

  if (logoSources.showLogoRLT) { imagePromises.push(loadImageWithSize(logoSources.logoRLT)); imageKeys.push("rlt"); }
  if (logoSources.showLogoCLT) { imagePromises.push(loadImageWithSize(logoSources.logoCLT)); imageKeys.push("clt"); }
  imagePromises.push(loadImageWithSize(logoSources.logoCosmo)); imageKeys.push("cosmo");

  const loaded = await Promise.all(imagePromises);
  const imgMap: Record<string, LoadedImage> = {};
  imageKeys.forEach((k, i) => { imgMap[k] = loaded[i]; });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = 0;
  let isFirstPage = true;

  const addFooter = () => {
    const footerY = pageH - 12;
    if (imgMap.cosmo) {
      const h = 7;
      const w = h * (imgMap.cosmo.widthPx / imgMap.cosmo.heightPx);
      try { doc.addImage(imgMap.cosmo.b64, "PNG", margin, footerY - 3, w, h); } catch {}
    }
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${doc.getNumberOfPages()}`, pageW - margin, footerY, { align: "right" });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      addFooter();
      doc.addPage();
      y = 20;
    }
  };

  const newPage = () => {
    if (!isFirstPage) { addFooter(); doc.addPage(); }
    isFirstPage = false;
    y = 20;
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(30, 64, 120);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y + 5);
    y += 10;
  };

  const drawField = (label: string, value: string) => {
    if (!value) return;
    ensureSpace(12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(label, margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(value, contentW);
    for (const line of lines) {
      ensureSpace(4);
      doc.text(line, margin, y);
      y += 3.8;
    }
    y += 2;
  };

  const drawTableRow = (cells: string[], widths: number[], bold = false, bg = false) => {
    const rowH = 6;
    ensureSpace(rowH + 2);
    if (bg) {
      doc.setFillColor(235, 235, 240);
      doc.rect(margin, y - 1, contentW, rowH, "F");
    }
    doc.setFontSize(7);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(30, 30, 30);
    let x = margin;
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].length > 50 ? cells[i].substring(0, 47) + "…" : cells[i];
      doc.text(cellText, x + 1, y + 3);
      x += widths[i];
    }
    y += rowH;
  };

  /* ── COVER PAGE ── */
  y = 30;
  const LOGO_H = 28;
  const logosToDraw: { b64: string; w: number; h: number }[] = [];
  if (imgMap.rlt) { logosToDraw.push({ b64: imgMap.rlt.b64, w: LOGO_H * (imgMap.rlt.widthPx / imgMap.rlt.heightPx), h: LOGO_H }); }
  if (imgMap.clt) { logosToDraw.push({ b64: imgMap.clt.b64, w: LOGO_H * (imgMap.clt.widthPx / imgMap.clt.heightPx), h: LOGO_H }); }

  if (logosToDraw.length === 1) {
    try { doc.addImage(logosToDraw[0].b64, "PNG", pageW / 2 - logosToDraw[0].w / 2, y, logosToDraw[0].w, logosToDraw[0].h); } catch {}
    y += logosToDraw[0].h + 15;
  } else if (logosToDraw.length === 2) {
    const gap = 12;
    const totalW = logosToDraw[0].w + gap + logosToDraw[1].w;
    const sx = (pageW - totalW) / 2;
    try { doc.addImage(logosToDraw[0].b64, "PNG", sx, y, logosToDraw[0].w, logosToDraw[0].h); } catch {}
    try { doc.addImage(logosToDraw[1].b64, "PNG", sx + logosToDraw[0].w + gap, y, logosToDraw[1].w, logosToDraw[1].h); } catch {}
    y += LOGO_H + 15;
  } else {
    y += 10;
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("INFORME DE MÓDULO", pageW / 2, y, { align: "center" });
  y += 8;

  const regionName = informes[0]?.region || "—";
  const moduleNumbers = [...new Set(informes.map(i => i.module_number))].sort();
  const moduleLabel = moduleNumbers.length === 1 ? `Módulo ${moduleNumbers[0]}` : `Módulos ${moduleNumbers.join(", ")}`;

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(moduleLabel, pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(`Región: ${regionName}`, pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, y, { align: "center" });

  if (options.includeInforme && informes.length > 0) {
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const ets = [...new Set(informes.map(i => i.entidad_territorial))].join(", ");
    doc.text(`Entidad(es) Territorial(es): ${ets}`, pageW / 2, y, { align: "center" });
  }

  addFooter();

  /* ── INFORME DE MÓDULO PAGES ── */
  if (options.includeInforme) {
    for (const inf of informes) {
      newPage();

      // Section 1: Identificación
      drawSectionTitle(`1. IDENTIFICACIÓN — Módulo ${inf.module_number}`);
      drawField("Región", inf.region);
      drawField("Entidad Territorial", inf.entidad_territorial);

      const eq = equipo[`${inf.region}_${inf.module_number}`] || [];
      if (eq.length > 0) {
        ensureSpace(eq.length * 7 + 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text("Integrantes del equipo local", margin, y);
        y += 5;
        const eqW = [contentW * 0.6, contentW * 0.4];
        drawTableRow(["Nombre", "Rol"], eqW, true, true);
        for (const m of eq) drawTableRow([m.nombre, m.rol], eqW);
        y += 3;
      }

      // Section 2: Intensivo
      drawSectionTitle("2. DESARROLLO DEL INTENSIVO");
      if (inf.fecha_inicio_intensivo || inf.fecha_fin_intensivo) {
        drawField("Periodo", `${inf.fecha_inicio_intensivo || "—"} a ${inf.fecha_fin_intensivo || "—"}`);
      }
      drawField("2.1. Aprendizajes del intensivo", inf.aprendizajes_intensivo);

      if (inf.ajustes_actividades?.length > 0) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
        doc.text("2.2. Ajustes a las actividades", margin, y); y += 5;
        const ajW = [contentW * 0.25, contentW * 0.25, contentW * 0.25, contentW * 0.25];
        drawTableRow(["Actividad", "Aciertos", "Desaciertos", "Ajustes"], ajW, true, true);
        for (const a of inf.ajustes_actividades) drawTableRow([a.actividad, a.aciertos, a.desaciertos, a.ajustes], ajW);
        y += 3;
      }

      drawField("2.3. Articulación con otros actores", inf.articulacion_intensivo);

      // Section 3: Interludio
      drawSectionTitle("3. DESARROLLO DEL INTERLUDIO");
      if (inf.fecha_inicio_interludio || inf.fecha_fin_interludio) {
        drawField("Periodo", `${inf.fecha_inicio_interludio || "—"} a ${inf.fecha_fin_interludio || "—"}`);
      }

      // Sesiones table
      {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
        doc.text("3.1. Sesiones programadas y realizadas", margin, y); y += 5;
        const sW = [contentW * 0.18, contentW * 0.1, contentW * 0.1, contentW * 0.1, contentW * 0.1, contentW * 0.1, contentW * 0.1, contentW * 0.1, contentW * 0.12];
        drawTableRow(["", "C.Ind", "C.Grup", "C.Rel", "C.Somb", "Total C", "V.Ind", "V.Grup", "Total V"], sW, true, true);
        for (const key of ["sesiones_programadas", "sesiones_realizadas"] as const) {
          const s = inf[key] || EMPTY_SESIONES;
          const tC = s.coaching_individual + s.coaching_grupal + s.coaching_relacion + s.coaching_sombra;
          const tV = s.visita_individual + s.visita_grupal;
          drawTableRow([
            key === "sesiones_programadas" ? "Programadas" : "Realizadas",
            String(s.coaching_individual), String(s.coaching_grupal), String(s.coaching_relacion), String(s.coaching_sombra),
            String(tC), String(s.visita_individual), String(s.visita_grupal), String(tV),
          ], sW);
        }
        y += 3;
      }

      drawField("Razones de las diferencias", inf.razones_diferencias);
      drawField("3.2. Acompañamiento — Descripción", inf.acompanamiento_descripcion);
      drawField("Objetivos no cumplidos", inf.acompanamiento_no_cumplido);

      // Acompañamiento directivos table
      if (inf.acompanamiento_directivos?.length > 0) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
        doc.text("Registro por directivo", margin, y); y += 5;
        const adW = [contentW * 0.22, contentW * 0.08, contentW * 0.08, contentW * 0.08, contentW * 0.08, contentW * 0.08, contentW * 0.08, contentW * 0.08, contentW * 0.22];
        drawTableRow(["Directivo", "C.Ind", "Otras", "V.Ind", "V.Gr", "Auto", "Pares", "Virt", "Obs."], adW, true, true);
        for (const ad of inf.acompanamiento_directivos) {
          drawTableRow([
            ad.nombre, String(ad.coaching_individual), String(ad.otras_coaching),
            String(ad.visita_individual), String(ad.visita_grupal), String(ad.autoformacion),
            String(ad.intercambio_pares), String(ad.acompanamiento_virtual), ad.observacion || "—",
          ], adW);
        }
        y += 3;
      }

      // Estrategias
      if (inf.estrategias?.length > 0) {
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
        doc.text("Estrategias", margin, y); y += 5;
        const estW = [contentW * 0.25, contentW * 0.375, contentW * 0.375];
        drawTableRow(["Estrategia", "Fortalezas", "Dificultades"], estW, true, true);
        for (const e of inf.estrategias) drawTableRow([e.nombre, e.fortalezas || "—", e.dificultades || "—"], estW);
        y += 3;
      }

      drawField("3.3. Aprendizajes del interludio", inf.aprendizajes_interludio);
      drawField("3.4. Articulación interludio", inf.articulacion_interludio);

      // Section 4: Contexto
      drawSectionTitle("4. CONTEXTO DE POLÍTICA EDUCATIVA");
      drawField("Plan Sectorial", inf.contexto_plan_sectorial);
      drawField("Articulación con programas", inf.contexto_articulacion);

      // Section 5: Novedades
      if (inf.novedades?.length > 0) {
        drawSectionTitle("5. NOVEDADES");
        const novW = [contentW * 0.22, contentW * 0.22, contentW * 0.18, contentW * 0.18, contentW * 0.2];
        drawTableRow(["Nombre", "IE", "Novedad", "Fecha", "Soporte"], novW, true, true);
        for (const n of inf.novedades) drawTableRow([n.nombre, n.institucion, n.novedad, n.fecha, n.soporte], novW);
      }

      addFooter();
    }
  }

  /* ── EVALUACIÓN INDIVIDUAL PAGES ── */
  if (options.includeEvaluacion && evaluaciones.length > 0) {
    newPage();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("EVALUACIÓN INDIVIDUAL", pageW / 2, y, { align: "center" });
    y += 10;

    for (const ev of evaluaciones) {
      ensureSpace(50);

      // Header
      doc.setFillColor(240, 245, 255);
      doc.rect(margin, y, contentW, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 120);
      doc.text(`${ev.directivo_nombre} — CC: ${ev.directivo_cedula}`, margin + 3, y + 5.5);
      y += 10;

      if (ev.institucion) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(`Institución: ${ev.institucion}`, margin, y);
        y += 5;
      }

      drawField("1. Reto estratégico de transformación institucional", ev.reto_estrategico);
      if (ev.razon_sin_reto) drawField("Razón de no definición de reto", ev.razon_sin_reto);

      // Evaluation table
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("2. Evaluación del directivo", margin, y);
      y += 5;

      const gestions = [
        { name: "Personal", avances: ev.avances_personal, retos: ev.retos_personal },
        { name: "Pedagógica", avances: ev.avances_pedagogica, retos: ev.retos_pedagogica },
        { name: "Administrativa y Comunitaria", avances: ev.avances_administrativa, retos: ev.retos_administrativa },
      ];

      const colW = [contentW * 0.25, contentW * 0.375, contentW * 0.375];
      drawTableRow(["Gestión", "Avances", "Retos"], colW, true, true);

      for (const g of gestions) {
        // For longer texts, we need multiline rows
        const avLines = doc.splitTextToSize(g.avances || "—", colW[1] - 4);
        const retLines = doc.splitTextToSize(g.retos || "—", colW[2] - 4);
        const maxLines = Math.max(avLines.length, retLines.length, 1);
        const rowH = Math.max(maxLines * 3.5 + 3, 7);

        ensureSpace(rowH + 2);

        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y - 0.5, margin + contentW, y - 0.5);

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 120);
        doc.text(g.name, margin + 1, y + 3);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        let ly = y + 3;
        for (const line of avLines) { doc.text(line, margin + colW[0] + 1, ly); ly += 3.5; }
        ly = y + 3;
        for (const line of retLines) { doc.text(line, margin + colW[0] + colW[1] + 1, ly); ly += 3.5; }

        y += rowH;
      }

      y += 8;
    }

    addFooter();
  }

  const modulePart = moduleNumbers.length === 1 ? `M${moduleNumbers[0]}` : `M${moduleNumbers.join("-")}`;
  doc.save(`Informe_Modulo_${regionName}_${modulePart}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
