import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Farm = lazy(() => import("./pages/Farm"));
const Stocking = lazy(() => import("./pages/Stocking"));
const Manejos = lazy(() => import("./pages/Manejos"));
const BiometriaPage = lazy(() => import("./pages/manejos/BiometriaPage"));
const InsumosPage = lazy(() => import("./pages/manejos/InsumosPage"));
const AguaPage = lazy(() => import("./pages/manejos/AguaPage"));
const MortalidadePage = lazy(() => import("./pages/manejos/MortalidadePage"));
const DespescaPage = lazy(() => import("./pages/manejos/DespescaPage"));
const AlimentacaoPage = lazy(() => import("./pages/manejos/AlimentacaoPage"));
const Feeding = lazy(() => import("./pages/Feeding"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Reports = lazy(() => import("./pages/Reports"));
const Financial = lazy(() => import("./pages/Financial"));
const PondHistory = lazy(() => import("./pages/PondHistory"));
const OperationalCostsPage = lazy(() => import("./pages/OperationalCosts"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAUpdatePrompt />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
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
            <Route path="/feeding" element={<Feeding />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/operational-costs" element={<OperationalCostsPage />} />
            <Route path="/pond-history/:pondId" element={<PondHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
