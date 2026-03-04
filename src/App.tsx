import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AppFooter from "./components/AppFooter";

const MiPanel = lazy(() => import("./pages/MiPanel"));
const FichaRLTPage = lazy(() => import("./pages/FichaRLT"));

// Lazy-loaded pages to reduce initial bundle
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminEditFicha = lazy(() => import("./pages/AdminEditFicha"));
const Encuesta360Hub = lazy(() => import("./pages/Encuesta360Hub"));
const Encuesta360Acudiente = lazy(() => import("./pages/Encuesta360Acudiente"));
const Encuesta360Administrativo = lazy(() => import("./pages/Encuesta360Administrativo"));
const Encuesta360Autoevaluacion = lazy(() => import("./pages/Encuesta360Autoevaluacion"));
const Encuesta360Directivo = lazy(() => import("./pages/Encuesta360Directivo"));
const Encuesta360Docente = lazy(() => import("./pages/Encuesta360Docente"));
const Encuesta360Estudiante = lazy(() => import("./pages/Encuesta360Estudiante"));
const Encuesta360FinalAcudiente = lazy(() => import("./pages/Encuesta360FinalAcudiente"));
const Encuesta360FinalAdministrativo = lazy(() => import("./pages/Encuesta360FinalAdministrativo"));
const Encuesta360FinalAutoevaluacion = lazy(() => import("./pages/Encuesta360FinalAutoevaluacion"));
const Encuesta360FinalDirectivo = lazy(() => import("./pages/Encuesta360FinalDirectivo"));
const Encuesta360FinalDocente = lazy(() => import("./pages/Encuesta360FinalDocente"));
const Encuesta360FinalEstudiante = lazy(() => import("./pages/Encuesta360FinalEstudiante"));
const RubricaEvaluacion = lazy(() => import("./pages/RubricaEvaluacion"));
const DerechosContacto = lazy(() => import("./pages/DerechosContacto"));
const Contacto = lazy(() => import("./pages/Contacto"));
const Sugerencias = lazy(() => import("./pages/Sugerencias"));
const Evaluacion = lazy(() => import("./pages/Evaluacion"));
const FaqPage = lazy(() => import("./pages/FaqPage"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <RefreshCw className="animate-spin w-6 h-6 text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/ficha" element={<Suspense fallback={<Loading />}><FichaRLTPage /></Suspense>} />
                <Route path="/mi-panel" element={<MiPanel />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/ficha/:id" element={<AdminEditFicha />} />

                {/* 360° Survey Forms */}
                <Route path="/encuesta-360" element={<Encuesta360Hub />} />
                <Route path="/formulario-360-acudiente" element={<Encuesta360Acudiente />} />
                <Route path="/formulario-360-administrativo" element={<Encuesta360Administrativo />} />
                <Route path="/formulario-360-autoevaluacion" element={<Encuesta360Autoevaluacion />} />
                <Route path="/formulario-360-directivo" element={<Encuesta360Directivo />} />
                <Route path="/formulario-360-docente" element={<Encuesta360Docente />} />
                <Route path="/formulario-360-estudiante" element={<Encuesta360Estudiante />} />

                {/* 360° Final Survey Forms */}
                <Route path="/formulario-360-final-acudiente" element={<Encuesta360FinalAcudiente />} />
                <Route path="/formulario-360-final-administrativo" element={<Encuesta360FinalAdministrativo />} />
                <Route path="/formulario-360-final-autoevaluacion" element={<Encuesta360FinalAutoevaluacion />} />
                <Route path="/formulario-360-final-directivo" element={<Encuesta360FinalDirectivo />} />
                <Route path="/formulario-360-final-docente" element={<Encuesta360FinalDocente />} />
                <Route path="/formulario-360-final-estudiante" element={<Encuesta360FinalEstudiante />} />

                {/* Rubrica Evaluation */}
                <Route path="/rubrica-evaluacion" element={<RubricaEvaluacion />} />

                {/* Legal / Contact / Suggestions */}
                <Route path="/derechos-contacto" element={<DerechosContacto />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/sugerencias" element={<Sugerencias />} />
                <Route path="/evaluacion" element={<Evaluacion />} />
                <Route path="/faq" element={<FaqPage />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
          <AppFooter />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
