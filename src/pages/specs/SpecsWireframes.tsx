import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const screens = [
  { title: "Inicio", description: "Página principal con identificación por cédula.", path: "/" },
  { title: "Ficha RLT", description: "Formulario de información del directivo (~60 campos).", path: "/ficha" },
  { title: "Mi Panel", description: "Panel personal del directivo/evaluador.", path: "/mi-panel" },
  { title: "Hub Encuesta 360°", description: "Página central de acceso a los formularios 360°.", path: "/encuesta-360" },
  { title: "Rúbrica de Evaluación", description: "Evaluación por módulo con 4 niveles.", path: "/rubrica-evaluacion" },
  { title: "Panel Operador", description: "Panel del operador con permisos segmentados.", path: "/operador" },
  { title: "Contacto", description: "Formulario de contacto y sugerencias.", path: "/contacto" },
  { title: "FAQ", description: "Preguntas frecuentes.", path: "/faq" },
];

export default function SpecsWireframes() {
  const navigate = useNavigate();
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/specs")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Documentación
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Wireframes</h1>
        <p className="text-muted-foreground mb-8">
          Vistas estilo boceto de las pantallas principales. Cada vista es una captura en vivo de la aplicación con un filtro visual aplicado.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {screens.map((screen, i) => (
            <div key={i} className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="p-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">{screen.title}</h2>
                <p className="text-xs text-muted-foreground">{screen.description}</p>
                <code className="text-xs text-primary mt-1 block">{screen.path}</code>
              </div>
              <div
                className="relative bg-muted/20"
                style={{ height: 320 }}
              >
                {!loadedMap[i] && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                <iframe
                  src={`${baseUrl}${screen.path}`}
                  title={screen.title}
                  className="w-full h-full border-0 pointer-events-none"
                  style={{
                    filter: "grayscale(1) contrast(0.85) sepia(0.08)",
                    transform: "scale(0.6)",
                    transformOrigin: "top left",
                    width: "166.67%",
                    height: "166.67%",
                  }}
                  onLoad={() => setLoadedMap((m) => ({ ...m, [i]: true }))}
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
