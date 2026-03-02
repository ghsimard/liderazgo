import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminPage from "./pages/AdminPage";
import AdminEditFicha from "./pages/AdminEditFicha";
import Encuesta360Acudiente from "./pages/Encuesta360Acudiente";
import Encuesta360Administrativo from "./pages/Encuesta360Administrativo";
import Encuesta360Autoevaluacion from "./pages/Encuesta360Autoevaluacion";
import Encuesta360Directivo from "./pages/Encuesta360Directivo";
import Encuesta360Docente from "./pages/Encuesta360Docente";
import Encuesta360Estudiante from "./pages/Encuesta360Estudiante";
import RubricaEvaluacion from "./pages/RubricaEvaluacion";
import DerechosContacto from "./pages/DerechosContacto";
import Sugerencias from "./pages/Sugerencias";
import AppFooter from "./components/AppFooter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <div className="flex-1">
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

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <AppFooter />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
