import { useEffect, useRef, useState } from "react";
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
  if (hex3) return [parseInt(hex3[1]+hex3[1],16), parseInt(hex3[2]+hex3[2],16), parseInt(hex3[3]+hex3[3],16)];
  const hex6 = c.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/);
  if (hex6) return [parseInt(hex6[1],16), parseInt(hex6[2],16), parseInt(hex6[3],16)];
  const rgbMatch = c.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  return null;
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r/255, g/255, b/255].map(v =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Post-render fix: ensure readable text on Mermaid nodes.
 * Strategy: match each label to the shape that contains its center point.
 */
function fixTextContrast(container: HTMLElement) {
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  const shapes = Array.from(svgEl.querySelectorAll("circle, ellipse, rect, path, polygon"));

  const shapeInfos = shapes
    .map((shape) => {
      const fill = shape.getAttribute("fill") || (shape as HTMLElement).style?.fill || "";
      if (!fill || fill === "none" || fill === "transparent") return null;

      const rgb = parseColorToRgb(fill);
      if (!rgb) return null;

      let bbox: DOMRect | null = null;
      try {
        const b = (shape as unknown as SVGGraphicsElement).getBBox();
        bbox = new DOMRect(b.x, b.y, b.width, b.height);
      } catch {
        return null;
      }

      if (!bbox || bbox.width <= 0 || bbox.height <= 0) return null;

      const lum = luminance(...rgb);
      const textColor = lum < 0.5 ? "#ffffff" : "#1e293b";

      return {
        bbox,
        area: bbox.width * bbox.height,
        textColor,
      };
    })
    .filter((s): s is { bbox: DOMRect; area: number; textColor: string } => Boolean(s));

  if (!shapeInfos.length) return;

  const labels = Array.from(svgEl.querySelectorAll("text, foreignObject"));

  for (const label of labels) {
    let b: DOMRect | null = null;
    try {
      const raw = (label as unknown as SVGGraphicsElement).getBBox();
      b = new DOMRect(raw.x, raw.y, raw.width, raw.height);
    } catch {
      continue;
    }

    if (!b || b.width <= 0 || b.height <= 0) continue;

    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    let bestMatch: { bbox: DOMRect; area: number; textColor: string } | null = null;

    for (const shapeInfo of shapeInfos) {
      const { bbox } = shapeInfo;
      const inside = cx >= bbox.x && cx <= bbox.x + bbox.width && cy >= bbox.y && cy <= bbox.y + bbox.height;
      if (!inside) continue;

      if (!bestMatch || shapeInfo.area < bestMatch.area) {
        bestMatch = shapeInfo;
      }
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
          setSvg(renderedSvg);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    render();
    return () => { cancelled = true; };
  }, [chart, id]);

  // Fix text contrast on colored nodes after SVG is injected into DOM
  useEffect(() => {
    if (svg && containerRef.current) {
      fixTextContrast(containerRef.current);
    }
  }, [svg]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-border bg-muted/50 p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-foreground whitespace-pre leading-relaxed">
          {chart}
        </pre>
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
