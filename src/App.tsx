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

import AlimentacaoPage from "./pages/manejos/AlimentacaoPage";
import Feeding from "./pages/Feeding";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Financial from "./pages/Financial";
import PondHistory from "./pages/PondHistory";
import OperationalCostsPage from "./pages/OperationalCosts";
import TechnicianFarmView from "./pages/TechnicianFarmView";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
          <Route path="/dashboard" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/farm" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Farm />
            </ProtectedRoute>
          } />
          <Route path="/stocking" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Stocking />
            </ProtectedRoute>
          } />
          <Route path="/manejos" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Manejos />
            </ProtectedRoute>
          } />
          <Route path="/manejos/biometria" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <BiometriaPage />
            </ProtectedRoute>
          } />
          <Route path="/manejos/insumos" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <InsumosPage />
            </ProtectedRoute>
          } />
          <Route path="/manejos/agua" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <AguaPage />
            </ProtectedRoute>
          } />
          <Route path="/manejos/mortalidade" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <MortalidadePage />
            </ProtectedRoute>
          } />
          <Route path="/despesca" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <DespescaPage />
            </ProtectedRoute>
          } />
          
          <Route path="/manejos/alimentacao" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <AlimentacaoPage />
            </ProtectedRoute>
          } />
          <Route path="/feeding" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Feeding />
            </ProtectedRoute>
          } />
          <Route path="/inventory" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/financial" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <Financial />
            </ProtectedRoute>
          } />
          <Route path="/operational-costs" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <OperationalCostsPage />
            </ProtectedRoute>
          } />
          <Route path="/pond-history/:pondId" element={
            <ProtectedRoute allowedUserTypes={['farm_owner']}>
              <PondHistory />
            </ProtectedRoute>
          } />
          
          {/* Rotas do Técnico */}
          <Route path="/technician/farm/:farmId" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <TechnicianFarmView />
            </ProtectedRoute>
          } />
          <Route path="/technician/farm/:farmId/feeding" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <Feeding />
            </ProtectedRoute>
          } />
          <Route path="/technician/farm/:farmId/reports" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/technician/farm/:farmId/stocking" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <Stocking />
            </ProtectedRoute>
          } />
          <Route path="/technician/farm/:farmId/manejos" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <Manejos />
            </ProtectedRoute>
          } />
          <Route path="/technician/farm/:farmId/inventory" element={
            <ProtectedRoute allowedUserTypes={['technician']}>
              <Inventory />
            </ProtectedRoute>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
