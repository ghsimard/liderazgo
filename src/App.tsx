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

// Lazy-loaded pages to reduce initial bundle
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminEditFicha = lazy(() => import("./pages/AdminEditFicha"));
const Encuesta360Acudiente = lazy(() => import("./pages/Encuesta360Acudiente"));
const Encuesta360Administrativo = lazy(() => import("./pages/Encuesta360Administrativo"));
const Encuesta360Autoevaluacion = lazy(() => import("./pages/Encuesta360Autoevaluacion"));
const Encuesta360Directivo = lazy(() => import("./pages/Encuesta360Directivo"));
const Encuesta360Docente = lazy(() => import("./pages/Encuesta360Docente"));
const Encuesta360Estudiante = lazy(() => import("./pages/Encuesta360Estudiante"));
const RubricaEvaluacion = lazy(() => import("./pages/RubricaEvaluacion"));
const DerechosContacto = lazy(() => import("./pages/DerechosContacto"));
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
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/ficha/:id" element={<AdminEditFicha />} />

                {/* 360° Survey Forms */}
                <Route path="/formulario-360-acudiente" element={<Encuesta360Acudiente />} />
                <Route path="/formulario-360-administrativo" element={<Encuesta360Administrativo />} />
                <Route path="/formulario-360-autoevaluacion" element={<Encuesta360Autoevaluacion />} />
                <Route path="/formulario-360-directivo" element={<Encuesta360Directivo />} />
                <Route path="/formulario-360-docente" element={<Encuesta360Docente />} />
                <Route path="/formulario-360-estudiante" element={<Encuesta360Estudiante />} />

                {/* Rubrica Evaluation */}
                <Route path="/rubrica-evaluacion" element={<RubricaEvaluacion />} />

                {/* Legal / Contact / Suggestions */}
                <Route path="/derechos-contacto" element={<DerechosContacto />} />
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
