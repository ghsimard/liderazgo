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
 * Post-render fix: ensures proper text contrast on all colored nodes.
 * Strategy: collect each node group's dominant fill, then apply text color.
 * Processes deepest shapes first so the most specific shape wins.
 */
function fixTextContrast(container: HTMLElement) {
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  // Map each <g> to the fill color of its deepest colored shape
  const groupColors = new Map<Element, string>();

  // Get all shapes, sorted deepest-first by counting ancestors
  const shapes = Array.from(svgEl.querySelectorAll("circle, ellipse, rect, path, polygon"));
  
  for (const shape of shapes) {
    const fill = shape.getAttribute("fill") || (shape as HTMLElement).style?.fill || "";
    if (!fill || fill === "none" || fill === "transparent") continue;
    const rgb = parseColorToRgb(fill);
    if (!rgb) continue;

    const lum = luminance(...rgb);
    const textColor = lum < 0.5 ? "#ffffff" : "#1e293b";

    // Find the immediate parent <g> that contains this shape
    const parentG = shape.closest("g");
    if (!parentG) continue;

    // Only set if this group hasn't been set yet by a deeper shape
    if (!groupColors.has(parentG)) {
      groupColors.set(parentG, textColor);
    }
  }

  // Apply text colors
  groupColors.forEach((textColor, group) => {
    // Set on direct text children only (not text in nested sub-groups)
    for (const child of Array.from(group.children)) {
      if (child.tagName.toLowerCase() === "text" || child.tagName.toLowerCase() === "tspan") {
        (child as SVGElement).setAttribute("fill", textColor);
        (child as SVGElement).style.fill = textColor;
        // Also fix nested tspans
        child.querySelectorAll("tspan").forEach(ts => {
          (ts as SVGElement).setAttribute("fill", textColor);
          (ts as SVGElement).style.fill = textColor;
        });
      }
      if (child.tagName.toLowerCase() === "foreignobject") {
        child.querySelectorAll("div, span, p").forEach(el => {
          (el as HTMLElement).style.color = textColor;
        });
      }
    }
  });

  // Final pass: any foreignObject inside a group with a dark shape
  // (mindmap nodes often have shape + foreignObject as siblings within same g)
  svgEl.querySelectorAll("g").forEach(g => {
    const shapes = g.querySelectorAll(":scope > circle, :scope > ellipse, :scope > rect, :scope > path, :scope > polygon");
    let darkestLum = 1;
    let hasDarkShape = false;
    
    shapes.forEach(shape => {
      const fill = shape.getAttribute("fill") || (shape as HTMLElement).style?.fill || "";
      if (!fill || fill === "none" || fill === "transparent") return;
      const rgb = parseColorToRgb(fill);
      if (!rgb) return;
      const lum = luminance(...rgb);
      if (lum < darkestLum) {
        darkestLum = lum;
        hasDarkShape = true;
      }
    });

    if (hasDarkShape) {
      const textColor = darkestLum < 0.5 ? "#ffffff" : "#1e293b";
      g.querySelectorAll(":scope > foreignObject div, :scope > foreignObject span, :scope > foreignObject p").forEach(el => {
        (el as HTMLElement).style.color = textColor;
      });
      g.querySelectorAll(":scope > text, :scope > text tspan").forEach(el => {
        (el as SVGElement).setAttribute("fill", textColor);
        (el as SVGElement).style.fill = textColor;
      });
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
