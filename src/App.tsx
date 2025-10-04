import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthConfirm from "./pages/AuthConfirm";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Farm from "./pages/Farm";
import Stocking from "./pages/Stocking";
import Manejos from "./pages/Manejos";
import BiometriaPage from "./pages/manejos/BiometriaPage";
import InsumosPage from "./pages/manejos/InsumosPage";
import AguaPage from "./pages/manejos/AguaPage";
import MortalidadePage from "./pages/manejos/MortalidadePage";
import DespescaPage from "./pages/manejos/DespescaPage";
import AvaliacaoAlimentacaoPage from "./pages/manejos/AvaliacaoAlimentacaoPage";
import AlimentacaoPage from "./pages/manejos/AlimentacaoPage";
import Feeding from "./pages/Feeding";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Financial from "./pages/Financial";
import PondHistory from "./pages/PondHistory";
import OperationalCostsPage from "./pages/OperationalCosts";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farm" element={<Farm />} />
          <Route path="/stocking" element={<Stocking />} />
          <Route path="/manejos" element={<Manejos />} />
          <Route path="/manejos/biometria" element={<BiometriaPage />} />
          <Route path="/manejos/insumos" element={<InsumosPage />} />
          <Route path="/manejos/agua" element={<AguaPage />} />
          <Route path="/manejos/mortalidade" element={<MortalidadePage />} />
          <Route path="/despesca" element={<DespescaPage />} />
          <Route path="/manejos/alimentacao" element={<AlimentacaoPage />} />
          <Route path="/manejos/avaliacao-alimentacao" element={<AvaliacaoAlimentacaoPage />} />
          <Route path="/feeding" element={<Feeding />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/operational-costs" element={<OperationalCostsPage />} />
          <Route path="/pond-history/:pondId" element={<PondHistory />} />
          <Route path="/accept-invite/:token" element={<AcceptInvite />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
