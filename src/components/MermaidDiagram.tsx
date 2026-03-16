import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
    themeVariables: {
      primaryColor: "#1e40af",
      primaryTextColor: "#ffffff",
      primaryBorderColor: "#1e3a8a",
      lineColor: "#374151",
      secondaryColor: "#e0e7ff",
      secondaryTextColor: "#1e293b",
      tertiaryColor: "#f1f5f9",
      tertiaryTextColor: "#1e293b",
    },
  });
  mermaidInitialized = true;
}

/**
 * Parse a CSS color string to RGB. Handles #hex and rgb().
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();
  const hex3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3)
    return [
      parseInt(hex3[1] + hex3[1], 16),
      parseInt(hex3[2] + hex3[2], 16),
      parseInt(hex3[3] + hex3[3], 16),
    ];
  const hex6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
  if (hex6) return [parseInt(hex6[1], 16), parseInt(hex6[2], 16), parseInt(hex6[3], 16)];
  const rgbMatch = c.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  return null;
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

const SECTION_DARK_LABEL_RULES: Array<{ chartMarker: string; labels: string[] }> = [
  {
    chartMarker: "root((Plataforma RLT / CLT))",
    labels: [
      "Hub Encuesta 360",
      "Ambiente Escolar",
      "Satisfacciones",
      "MEL",
      "Fichas RLT",
      "Encuesta 360",
      "Enlaces",
      "Rubricas",
      "Sistema",
      "Informe de Modulo",
    ],
  },
  {
    chartMarker: "root((Enlaces))",
    labels: ["Encuesta 360 por tipo", "Ambiente Escolar por tipo"],
  },
  {
    chartMarker: "root((Informe de Modulo))",
    labels: ["Informe de Modulo"],
  },
  {
    chartMarker: "root((Ambiente Escolar))",
    labels: ["Enlaces"],
  },
  {
    chartMarker: "root((MEL))",
    labels: ["MEL 360", "MEL Rubricas"],
  },
];

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getForcedDarkLabels(chartSource: string): Set<string> {
  const normalizedChart = normalizeLabel(chartSource);
  const labels = new Set<string>();

  for (const rule of SECTION_DARK_LABEL_RULES) {
    if (!normalizedChart.includes(normalizeLabel(rule.chartMarker))) continue;
    rule.labels.forEach((label) => labels.add(normalizeLabel(label)));
  }

  return labels;
}

function shouldForceDarkLabel(value: string, forcedDarkLabels: Set<string>): boolean {
  if (forcedDarkLabels.size === 0) return false;

  const normalized = normalizeLabel(value);
  for (const target of forcedDarkLabels) {
    if (normalized === target || normalized.includes(target)) return true;
  }

  return false;
}

function applyDarkTextStyles(el: Element) {
  const existingStyle = el.getAttribute("style") || "";
  el.setAttribute("style", `${existingStyle}; fill:#000000 !important; color:#000000 !important;`);

  if (["text", "tspan", "path"].includes(el.tagName.toLowerCase())) {
    el.setAttribute("fill", "#000000");
  }
}

/**
 * Pre-injection targeted dark override for specific section labels.
 */
function forceSpecificLabelsDark(svgMarkup: string, forcedDarkLabels: Set<string>): string {
  if (forcedDarkLabels.size === 0) return svgMarkup;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;

    root.querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p").forEach((el) => {
      const rawText = (el.textContent || "").trim();
      if (!rawText || !shouldForceDarkLabel(rawText, forcedDarkLabels)) return;

      applyDarkTextStyles(el);
      el
        .querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p")
        .forEach(applyDarkTextStyles);

      const group = el.closest("g");
      if (group) {
        applyDarkTextStyles(group);
        group
          .querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p")
          .forEach(applyDarkTextStyles);
      }
    });

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgMarkup;
  }
}

/**
 * Post-render contrast fix for generic nodes.
 */
function fixTextContrast(container: HTMLElement, forcedDarkLabels: Set<string>) {
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  const shapeInfos = Array.from(svgEl.querySelectorAll("circle, ellipse, rect, path, polygon"))
    .map((shape) => {
      const fill = shape.getAttribute("fill") || (shape as HTMLElement).style?.fill || "";
      if (!fill || fill === "none" || fill === "transparent") return null;

      const rgb = parseColorToRgb(fill);
      if (!rgb) return null;

      const bbox = (shape as Element).getBoundingClientRect();
      if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null;

      return {
        bbox,
        area: bbox.width * bbox.height,
        textColor: luminance(...rgb) < 0.5 ? "#ffffff" : "#1e293b",
      };
    })
    .filter((s): s is { bbox: DOMRect; area: number; textColor: string } => Boolean(s));

  const labels = Array.from(svgEl.querySelectorAll("text, foreignObject"));

  for (const label of labels) {
    const b = (label as Element).getBoundingClientRect();
    if (!b || b.width <= 0 || b.height <= 0) continue;

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    let bestMatch: { bbox: DOMRect; area: number; textColor: string } | null = null;

    for (const shapeInfo of shapeInfos) {
      const { bbox } = shapeInfo;
      const inside = cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height;
      if (!inside) continue;
      if (!bestMatch || shapeInfo.area < bestMatch.area) bestMatch = shapeInfo;
    }

    if (!bestMatch) continue;

    const textColor = bestMatch.textColor;

    if (label.tagName.toLowerCase() === "text") {
      const svgText = label as SVGElement;
      svgText.setAttribute("fill", textColor);
      svgText.style.setProperty("fill", textColor, "important");
      svgText.querySelectorAll("tspan").forEach((tspan) => {
        (tspan as SVGElement).setAttribute("fill", textColor);
        (tspan as SVGElement).style.setProperty("fill", textColor, "important");
      });
    } else {
      (label as Element).querySelectorAll("div, span, p").forEach((el) => {
        (el as HTMLElement).style.setProperty("color", textColor, "important");
      });
    }
  }

  // Second pass: specific labels must stay dark for section consistency
  svgEl.querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p").forEach((el) => {
    const rawText = (el.textContent || "").trim();
    if (!rawText || !shouldForceDarkLabel(rawText, forcedDarkLabels)) return;

    applyDarkTextStyles(el);
    const group = el.closest("g");
    if (group) {
      applyDarkTextStyles(group);
      group.querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p").forEach(applyDarkTextStyles);
    }
  });
}

interface MermaidDiagramProps {
  chart: string;
  id: string;
}

export default function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  const forcedDarkLabels = useMemo(() => getForcedDarkLabels(chart), [chart]);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        initMermaid();
        const uniqueId = `mermaid-${id}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);
        if (!cancelled) {
          setSvg(forceSpecificLabelsDark(renderedSvg, forcedDarkLabels));
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id, forcedDarkLabels]);

  useEffect(() => {
    if (!svg || !containerRef.current) return;

    const container = containerRef.current;
    const apply = () => fixTextContrast(container, forcedDarkLabels);

    apply();
    const rafId = requestAnimationFrame(apply);
    const timeoutId = window.setTimeout(apply, 180);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [svg, forcedDarkLabels]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-border bg-muted/50 p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-foreground whitespace-pre leading-relaxed">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 rounded-lg border border-border bg-muted/30 p-8 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 rounded-lg border border-border bg-background p-4 overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
