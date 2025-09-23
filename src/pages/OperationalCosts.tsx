import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { OperationalCosts } from '@/components/OperationalCosts';

export default function OperationalCostsPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/financial')}
                className="mb-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-primary/10 hover:to-accent/10 border border-slate-200 hover:border-primary/20 text-slate-700 hover:text-primary transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Financeiro
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-primary">
                  Custos Operacionais
                </h1>
              </div>
              <p className="text-slate-600">
                Adicione e controle todos os custos operacionais da fazenda
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => (window as any).openOperationalCostDialog?.()}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Adicionar Custo Operacional
            </Button>
          </div>
          <OperationalCosts onAddCost={() => {}} />
        </div>
      </div>
    </Layout>
  );
}