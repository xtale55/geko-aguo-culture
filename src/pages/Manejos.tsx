import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Droplets, Skull } from 'lucide-react';
import { BiometryTab } from '@/components/BiometryTab';
import { WaterQualityTab } from '@/components/WaterQualityTab';
import { MortalityTab } from '@/components/MortalityTab';

export default function Manejos() {
  const navigate = useNavigate();

  return (
    <Layout>
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
            <h1 className="text-3xl font-bold text-foreground">Manejos</h1>
            <p className="text-muted-foreground">
              Gerencie biometria, qualidade da água e mortalidade
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="biometry" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="biometry" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Biometria
            </TabsTrigger>
            <TabsTrigger value="water-quality" className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              Água
            </TabsTrigger>
            <TabsTrigger value="mortality" className="flex items-center gap-2">
              <Skull className="w-4 h-4" />
              Mortalidade
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
        </Tabs>
      </div>
    </Layout>
  );
}