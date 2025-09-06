import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Fish } from 'lucide-react';
import HarvestTab from '@/components/HarvestTab';

export default function DespescaPage() {
  const navigate = useNavigate();

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
                onClick={() => navigate('/manejos')}
                className="mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Manejos
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg">
                  <Fish className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-primary to-emerald-600 bg-clip-text text-transparent">
                  Despesca
                </h1>
              </div>
              <p className="text-slate-600">
                Gerencie as despescas e registre dados de produção
              </p>
            </div>
          </div>

          {/* Content */}
          <HarvestTab />
        </div>
      </div>
    </Layout>
  );
}