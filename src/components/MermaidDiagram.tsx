import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

const MERMAID_THEME = {
  primaryColor: "#60a5fa",
  primaryTextColor: "#000000",
  primaryBorderColor: "#3b82f6",
  lineColor: "#374151",
  secondaryColor: "#e0e7ff",
  secondaryTextColor: "#1e293b",
  tertiaryColor: "#f1f5f9",
  tertiaryTextColor: "#1e293b",
};

function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
    themeVariables: MERMAID_THEME,
  });
}

function parseColorToRgb(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();
  const hex3 = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) {
    return [
      parseInt(hex3[1] + hex3[1], 16),
      parseInt(hex3[2] + hex3[2], 16),
      parseInt(hex3[3] + hex3[3], 16),
    ];
  }

  const hex6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
  if (hex6) return [parseInt(hex6[1], 16), parseInt(hex6[2], 16), parseInt(hex6[3], 16)];

  const rgbMatch = c.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];

  return null;
}

const LIGHT_BLUE_FILL = "#93c5fd";
const LIGHT_BLUE_BORDER = "#60a5fa";

function isBlueTone(rgb: [number, number, number]): boolean {
  const [r, g, b] = rgb;
  return b >= 120 && b > r + 10 && b > g - 20;
}

function isBlueContainer(rgb: [number, number, number]): boolean {
  return isBlueTone(rgb);
}

function applyTextColor(el: Element, color: "#000000" | "#ffffff") {
  const existingStyle = el.getAttribute("style") || "";
  el.setAttribute("style", `${existingStyle}; fill:${color} !important; color:${color} !important;`);

  if (["text", "tspan", "path"].includes(el.tagName.toLowerCase())) {
    el.setAttribute("fill", color);
  }
}

/**
 * Baseline: all labels black.
 */
function forceAllLabelsBlack(svgMarkup: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
    const root = doc.documentElement;

    root.querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p").forEach((el) => {
      applyTextColor(el, "#000000");
    });

    return new XMLSerializer().serializeToString(root);
  } catch {
    return svgMarkup;
  }
}

/**
 * UI rule: every label is black, except labels inside blue nodes/circles -> white.
 */
function applyFinalLabelColors(container: HTMLElement) {
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  const shapeInfos = Array.from(svgEl.querySelectorAll("circle, ellipse, rect, path, polygon"))
    .map((shape) => {
      const computed = window.getComputedStyle(shape as Element);
      const fill = shape.getAttribute("fill") || (shape as HTMLElement).style?.fill || computed.fill || "";
      if (!fill || fill === "none" || fill === "transparent") return null;

      const rgb = parseColorToRgb(fill);
      if (!rgb) return null;

      const bbox = shape.getBoundingClientRect();
      if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null;

      return {
        shape,
        bbox,
        area: bbox.width * bbox.height,
        rgb,
        computedStroke: computed.stroke,
      };
    })
    .filter(
      (s): s is { shape: Element; bbox: DOMRect; area: number; rgb: [number, number, number]; computedStroke: string } =>
        Boolean(s)
    );

  // Force blue nodes/circles to a lighter blue in the live UI.
  for (const shapeInfo of shapeInfos) {
    if (!isBlueTone(shapeInfo.rgb)) continue;
    (shapeInfo.shape as SVGElement).setAttribute("fill", LIGHT_BLUE_FILL);
    (shapeInfo.shape as SVGElement).style.setProperty("fill", LIGHT_BLUE_FILL, "important");

    const strokeAttr = ((shapeInfo.shape as SVGElement).getAttribute("stroke") || "").toLowerCase();
    const computedStroke = (shapeInfo.computedStroke || "").toLowerCase();
    if (strokeAttr !== "none" || (computedStroke && computedStroke !== "none" && computedStroke !== "rgba(0, 0, 0, 0)")) {
      (shapeInfo.shape as SVGElement).setAttribute("stroke", LIGHT_BLUE_BORDER);
      (shapeInfo.shape as SVGElement).style.setProperty("stroke", LIGHT_BLUE_BORDER, "important");
    }

    shapeInfo.rgb = [147, 197, 253];
  }

  const labels = Array.from(svgEl.querySelectorAll("text, foreignObject"));

  for (const label of labels) {
    const b = label.getBoundingClientRect();
    if (!b || b.width <= 0 || b.height <= 0) continue;

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    let bestMatch: { shape: Element; bbox: DOMRect; area: number; rgb: [number, number, number] } | null = null;

    for (const shapeInfo of shapeInfos) {
      const { bbox } = shapeInfo;
      const inside = cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height;
      if (!inside) continue;
      if (!bestMatch || shapeInfo.area < bestMatch.area) bestMatch = shapeInfo;
    }

    const textColor: "#000000" | "#ffffff" = bestMatch && isBlueContainer(bestMatch.rgb) ? "#ffffff" : "#000000";

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
        (el as HTMLElement).style.setProperty("fill", textColor, "important");
      });
    }
  }

  // Defensive pass to remove remaining gray text everywhere.
  svgEl.querySelectorAll("text, tspan, foreignObject, foreignObject *, div, span, p").forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (tag === "text" || tag === "tspan") {
      const current = ((el as SVGElement).getAttribute("fill") || "").toLowerCase();
      if (current !== "#ffffff") {
        applyTextColor(el, "#000000");
      }
      return;
    }

    const html = el as HTMLElement;
    const currentColor = (html.style.color || "").toLowerCase();
    if (currentColor !== "rgb(255, 255, 255)" && currentColor !== "#ffffff") {
      html.style.setProperty("color", "#000000", "important");
      html.style.setProperty("fill", "#000000", "important");
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

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        initMermaid();
        const uniqueId = `mermaid-${id}-${Date.now()}`;
        const { svg: renderedSvg } = await mermaid.render(uniqueId, chart);

        if (!cancelled) {
          setSvg(forceAllLabelsBlack(renderedSvg));
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
  }, [chart, id]);

  useEffect(() => {
    if (!svg || !containerRef.current) return;

    const container = containerRef.current;
    const apply = () => applyFinalLabelColors(container);

    apply();
    const rafId = requestAnimationFrame(apply);
    const timeoutId = window.setTimeout(apply, 180);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [svg]);

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
