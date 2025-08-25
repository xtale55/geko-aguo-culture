import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Droplets, Skull, Beaker, Fish } from 'lucide-react';
import { BiometryTab } from '@/components/BiometryTab';
import { WaterQualityTab } from '@/components/WaterQualityTab';
import { MortalityTab } from '@/components/MortalityTab';
import { InputApplicationTab } from '@/components/InputApplicationTab';
import HarvestTab from '@/components/HarvestTab';

export default function Manejos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("biometry");

  // Handle navigation state for tab switching
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent mb-2">
              Manejos
            </h1>
            <p className="text-slate-600">
              Gerencie biometria, qualidade da água, mortalidade, despesca e aplicação de insumos
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-14 p-1 bg-white/60 backdrop-blur-sm border border-slate-200 rounded-lg">
            <TabsTrigger value="biometry" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium text-slate-700 data-[state=active]:font-semibold transition-all rounded-md">
              <Scale className="w-4 h-4" />
              Biometria
            </TabsTrigger>
            <TabsTrigger value="water-quality" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium text-slate-700 data-[state=active]:font-semibold transition-all rounded-md">
              <Droplets className="w-4 h-4" />
              Água
            </TabsTrigger>
            <TabsTrigger value="mortality" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium text-slate-700 data-[state=active]:font-semibold transition-all rounded-md">
              <Skull className="w-4 h-4" />
              Mortalidade
            </TabsTrigger>
            <TabsTrigger value="harvest" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium text-slate-700 data-[state=active]:font-semibold transition-all rounded-md">
              <Fish className="w-4 h-4" />
              Despesca
            </TabsTrigger>
            <TabsTrigger value="inputs" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg font-medium text-slate-700 data-[state=active]:font-semibold transition-all rounded-md">
              <Beaker className="w-4 h-4" />
              Insumos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="biometry" className="mt-6">
            <BiometryTab />
          </TabsContent>
          
          <TabsContent value="water-quality" className="mt-6">
            <WaterQualityTab />
          </TabsContent>
          
          <TabsContent value="mortality" className="mt-6">
            <MortalityTab />
          </TabsContent>
          
          <TabsContent value="harvest" className="mt-6">
            <HarvestTab />
          </TabsContent>
          
          <TabsContent value="inputs" className="mt-6">
            <InputApplicationTab />
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </Layout>
  );
}