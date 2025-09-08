import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";

// Lazy load all pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Farm = lazy(() => import("./pages/Farm"));
const Stocking = lazy(() => import("./pages/Stocking"));
const Manejos = lazy(() => import("./pages/Manejos"));
const BiometriaPage = lazy(() => import("./pages/manejos/BiometriaPage"));
const InsumosPage = lazy(() => import("./pages/manejos/InsumosPage"));
const AguaPage = lazy(() => import("./pages/manejos/AguaPage"));
const MortalidadePage = lazy(() => import("./pages/manejos/MortalidadePage"));
const DespescaPage = lazy(() => import("./pages/manejos/DespescaPage"));
const CustosPage = lazy(() => import("./pages/manejos/CustosPage"));
const AlimentacaoPage = lazy(() => import("./pages/manejos/AlimentacaoPage"));
const Feeding = lazy(() => import("./pages/Feeding"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Reports = lazy(() => import("./pages/Reports"));
const Financial = lazy(() => import("./pages/Financial"));
const PondHistory = lazy(() => import("./pages/PondHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen message="Carregando página..." />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/farm" element={<Farm />} />
            <Route path="/stocking" element={<Stocking />} />
            <Route path="/manejos" element={<Manejos />} />
            <Route path="/manejos/biometria" element={<BiometriaPage />} />
            <Route path="/manejos/insumos" element={<InsumosPage />} />
            <Route path="/manejos/agua" element={<AguaPage />} />
            <Route path="/manejos/mortalidade" element={<MortalidadePage />} />
            <Route path="/manejos/despesca" element={<DespescaPage />} />
            <Route path="/manejos/custos" element={<CustosPage />} />
            <Route path="/manejos/alimentacao" element={<AlimentacaoPage />} />
            <Route path="/feeding" element={<Feeding />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/financial" element={<Financial />} />
            <Route path="/pond-history/:pondId" element={<PondHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
