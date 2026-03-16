import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generarPDFSpecifications } from "@/utils/specificationsPdfGenerator";
import MermaidDiagram from "@/components/MermaidDiagram";
import logoRLT from "@/assets/logo_rlt.png";
import logoCosmo from "@/assets/logo_cosmo.png";

export default function Especificaciones() {
  const [md, setMd] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const navigate = useNavigate();
  const mermaidCounter = useRef(0);

  useEffect(() => {
    fetch("/SPECIFICATIONS.md")
      .then((r) => r.text())
      .then((t) => { setMd(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await generarPDFSpecifications(md, { logoRLT, logoCosmo });
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button size="sm" onClick={handlePdf} disabled={pdfLoading}>
              <Download className="w-4 h-4 mr-2" /> {pdfLoading ? "Generando…" : "Descargar PDF"}
            </Button>
          </div>
        </div>
      </div>

      <article className="max-w-5xl mx-auto px-4 py-8 md:px-8 print:px-0 print:max-w-none">
        <div className="prose prose-slate dark:prose-invert max-w-none
          prose-headings:scroll-mt-20
          prose-h1:text-3xl prose-h1:font-bold prose-h1:text-foreground prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
          prose-h2:text-2xl prose-h2:font-semibold prose-h2:text-foreground prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:font-semibold prose-h3:text-foreground prose-h3:mt-8 prose-h3:mb-3
          prose-h4:text-lg prose-h4:font-semibold prose-h4:text-foreground prose-h4:mt-6 prose-h4:mb-2
          prose-p:text-muted-foreground prose-p:leading-7 prose-p:my-3
          prose-li:text-muted-foreground prose-li:my-1
          prose-strong:text-foreground prose-strong:font-semibold
          prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
          prose-table:border-collapse prose-table:w-full
          prose-th:bg-muted prose-th:text-foreground prose-th:font-semibold prose-th:text-left prose-th:px-4 prose-th:py-2.5 prose-th:border prose-th:border-border prose-th:text-sm
          prose-td:px-4 prose-td:py-2.5 prose-td:border prose-td:border-border prose-td:text-sm prose-td:text-muted-foreground
          prose-hr:border-border prose-hr:my-8
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const lang = className?.replace("language-", "") || "";
                const text = String(children).replace(/\n$/, "");

                if (lang === "mermaid") {
                  mermaidCounter.current += 1;
                  return (
                    <MermaidDiagram chart={text} id={`spec-${mermaidCounter.current}`} />
                  );
                }

                if (!className) {
                  return <code {...props}>{children}</code>;
                }

                return (
                  <pre className="rounded-lg border border-border bg-muted p-4 overflow-x-auto !my-4">
                    <code className="text-sm font-mono text-foreground">{text}</code>
                  </pre>
                );
              },
              tr({ children, ...props }) {
                return <tr className="even:bg-muted/30" {...props}>{children}</tr>;
              },
            }}
          >
            {md}
          </ReactMarkdown>
        </div>
      </article>

      <style>{`
        @media print {
          .sticky { display: none !important; }
          footer { display: none !important; }
          body { font-size: 11pt; }
        }
      `}</style>
    </div>
  );
}
